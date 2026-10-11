"""Shopify GraphQL adapter. Hosts, scopes and queries are application-owned."""
import asyncio
import base64
import hashlib
import hmac
import html
import re
import time
from urllib.parse import urlencode

import httpx

from ...core.errors import ApiError
from .shop_config import VERSION, SCOPES, shop_domain

locks = {}


def plain(value):
    return html.unescape(re.sub(r"<[^>]*>", " ", value or "")).strip()


def verify_oauth(params, secret):
    if len(params) != len(set(k for k, _ in params)):
        return False
    values = dict(params)
    digest = values.pop("hmac", "")
    values.pop("signature", None)
    message = "&".join(f"{k}={v}" for k, v in sorted(values.items()))
    expected = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    return bool(secret and digest) and hmac.compare_digest(digest, expected)


def verify_webhook(body, signature, secret):
    expected = base64.b64encode(hmac.new(secret.encode(), body, hashlib.sha256).digest()).decode()
    return bool(secret and signature) and hmac.compare_digest(signature, expected)


async def remote(url, payload, headers=None):
    async with httpx.AsyncClient(timeout=25, follow_redirects=False) as client:
        for attempt in range(3):
            try:
                response = await client.post(url, json=payload, headers=headers or {})
            except httpx.HTTPError:
                raise ApiError(502, "shop_network_error", "Shopify connection failed") from None
            if response.status_code == 429 or response.status_code >= 500:
                if attempt < 2:
                    await asyncio.sleep(min(5, 1 + attempt * 2))
                    continue
                raise ApiError(503, "shop_limited", "Shopify is temporarily busy")
            if response.status_code in (401, 403):
                raise ApiError(401, "shop_auth_required", "Authorize the store and required scopes")
            if not response.is_success:
                raise ApiError(502, "shop_upstream_error", "Shopify rejected this request")
            data = response.json()
            if data.get("errors"):
                codes = [e.get("extensions", {}).get("code") for e in data["errors"] if isinstance(e, dict)]
                if "THROTTLED" in codes and attempt < 2:
                    await asyncio.sleep(2 + attempt)
                    continue
                raise ApiError(502, "shop_query_error", "Shopify query unavailable; check app permissions and API version")
            return data


class Shopify:
    def __init__(self, store, settings, persist, reload=None):
        self.store, self.settings, self.persist = store, settings, persist
        self.reload = reload
        self.host = shop_domain(store["shop"])

    def latest(self):
        if self.reload:
            self.store.update(self.reload())

    async def admin_token(self):
        async with locks.setdefault(self.host, asyncio.Lock()):
            self.latest()
            token = self.store.get("authorization")
            if not token:
                raise ApiError(401, "shop_auth_required", "Authorize the store first")
            if token.get("expires_at", 0) < time.time() + 90:
                if not token.get("refresh_token"):
                    raise ApiError(401, "shop_auth_required", "Authorize the store again")
                result = await remote(f"https://{self.host}/admin/oauth/access_token", {"client_id": self.settings["client_id"], "client_secret": self.settings["client_secret"], "grant_type": "refresh_token", "refresh_token": token["refresh_token"]})
                token.update(result, expires_at=time.time() + result["expires_in"])
                await self.persist(authorization=token)
            return token["access_token"]

    async def admin(self, query, variables=None):
        data = await remote(f"https://{self.host}/admin/api/{VERSION}/graphql.json", {"query": query, "variables": variables or {}}, {"X-Shopify-Access-Token": await self.admin_token()})
        return data["data"]

    async def storefront(self, query, variables=None):
        # A separate lock avoids recursively acquiring the offline-token lock.
        async with locks.setdefault(self.host + ":storefront", asyncio.Lock()):
            self.latest()
            token = await self.storefront_token()
        data = await remote(f"https://{self.host}/api/{VERSION}/graphql.json", {"query": query, "variables": variables or {}}, {"X-Shopify-Storefront-Access-Token": token})
        return data["data"]

    async def storefront_token(self):
        if not self.store.get("authorization"):
            raise ApiError(401, "shop_auth_required", "Authorize the store first")
        token = self.store.get("storefront_token")
        if not token:
            result = (await self.admin('mutation { storefrontAccessTokenCreate(input:{title:"Kasamila realtime shop assistant"}) { storefrontAccessToken {accessToken} userErrors {field message} } }'))["storefrontAccessTokenCreate"]
            if result.get("userErrors") or not result.get("storefrontAccessToken"):
                raise ApiError(422, "shop_storefront_required", "Enable Storefront API access and publish products to the app's sales channel")
            token = result["storefrontAccessToken"]["accessToken"]
            self.store["storefront_token"] = token
            await self.persist(storefront_token=token)
        return token

    async def connection(self, root, query, variables=None, storefront=False):
        variables = dict(variables or {}, after=None)
        values, seen = [], set()
        for _ in range(1000):
            page = (await (self.storefront if storefront else self.admin)(query, variables))[root]
            values.extend(page["nodes"])
            info = page["pageInfo"]
            if not info["hasNextPage"]:
                return values
            if not info["endCursor"] or info["endCursor"] in seen:
                break
            variables["after"] = info["endCursor"]
            seen.add(info["endCursor"])
        raise ApiError(502, "shop_catalog_incomplete", "Shopify pagination did not finish; no partial catalogue was published")

    async def register_webhooks(self, callback):
        existing = await self.connection("webhookSubscriptions", 'query($after:String){webhookSubscriptions(first:100,after:$after){nodes{id topic uri} pageInfo{hasNextPage endCursor}}}')
        registered = []
        for topic in ("APP_UNINSTALLED", "PRODUCTS_CREATE", "PRODUCTS_UPDATE", "PRODUCTS_DELETE", "COLLECTIONS_CREATE", "COLLECTIONS_UPDATE", "COLLECTIONS_DELETE", "SHOP_UPDATE", "MARKETS_CREATE", "MARKETS_UPDATE", "MARKETS_DELETE", "INVENTORY_LEVELS_UPDATE"):
            if not any(r["topic"] == topic and r.get("uri") == callback for r in existing):
                result = (await self.admin('mutation($topic:WebhookSubscriptionTopic!,$input:WebhookSubscriptionInput!){webhookSubscriptionCreate(topic:$topic,webhookSubscription:$input){webhookSubscription{id} userErrors{field message}}}', {"topic": topic, "input": {"uri": callback}}))["webhookSubscriptionCreate"]
                if result.get("userErrors"):
                    raise ApiError(422, "shop_webhook_required", "Enable the app's webhook scopes; retry synchronization")
            registered.append(topic)
        await self.persist(webhooks=registered)

    async def markets(self, country):
        regions = 'nodes{... on MarketRegionCountry{code name currency{currencyCode}}} ' + PAGE
        # Bound requested Admin query cost; nested connections multiply cost.
        fields = 'id name status type currencySettings{baseCurrency{currencyCode} localCurrencies roundingEnabled} priceInclusions{inclusiveDutiesPricingStrategy inclusiveTaxPricingStrategy} delivery{shipping{isEnabled}} conditions{conditionTypes regionsCondition{regions(first:50){' + regions + '}}}'
        markets = await self.connection("markets", 'query($after:String){markets(first:10,after:$after){nodes{' + fields + '} ' + PAGE + '}}')
        result = []
        for market in markets:
            conditions = market.get("conditions") or {}
            condition = conditions.get("regionsCondition") or {}
            region = condition.get("regions")
            seen = set()
            while region and region["pageInfo"]["hasNextPage"]:
                cursor = region["pageInfo"]["endCursor"]
                if not cursor or cursor in seen:
                    raise ApiError(502, "shop_catalog_incomplete", "Market pagination did not finish")
                seen.add(cursor)
                page = (await self.admin('query($id:ID!,$after:String){market(id:$id){conditions{regionsCondition{regions(first:250,after:$after){' + regions + '}}}}}', {"id": market["id"], "after": cursor}))["market"]["conditions"]["regionsCondition"]["regions"]
                region["nodes"].extend(page["nodes"])
                region["pageInfo"] = page["pageInfo"]
            # Country matching alone cannot resolve B2B/location/channel conditions.
            types = conditions.get("conditionTypes") or []
            if market["status"] == "ACTIVE" and region and any(r.get("code") == country for r in region["nodes"]):
                result.append({**{k: market[k] for k in ("name", "status", "currencySettings", "priceInclusions", "delivery")}, "countries": region["nodes"], "additional_conditions": types, "note": "Country-matching market configuration; inheritance and additional conditions are resolved by Shopify. Storefront prices and checkout are authoritative."})
        return result


PAGE = "pageInfo {hasNextPage endCursor}"
PRODUCT_FIELDS = '''id title handle description productType vendor tags availableForSale onlineStoreUrl updatedAt
 priceRange{minVariantPrice{amount currencyCode} maxVariantPrice{amount currencyCode}}
 featuredImage{url altText} options{name values}
 collections(first:100){nodes{id title} pageInfo{hasNextPage endCursor}}
 variants(first:100){nodes{id title sku barcode weight weightUnit requiresShipping taxable quantityAvailable quantityRule{minimum maximum increment} availableForSale currentlyNotInStock selectedOptions{name value} price{amount currencyCode} compareAtPrice{amount currencyCode} image{url altText}} pageInfo{hasNextPage endCursor}}
 media(first:100){nodes{mediaContentType alt previewImage{url altText} ... on MediaImage{image{url altText}} ... on Video{sources{url mimeType}} ... on ExternalVideo{embedUrl} ... on Model3d{sources{url mimeType}}} pageInfo{hasNextPage endCursor}}'''
PRODUCTS = 'query($after:String,$country:CountryCode!,$language:LanguageCode!) @inContext(country:$country,language:$language){products(first:50,after:$after){nodes{' + PRODUCT_FIELDS + '} ' + PAGE + '}}'
PRODUCT = 'query($id:ID!,$country:CountryCode!,$language:LanguageCode!) @inContext(country:$country,language:$language){product(id:$id){' + PRODUCT_FIELDS + '}}'
METADATA = '''query($country:CountryCode!,$language:LanguageCode!) @inContext(country:$country,language:$language){
 shop{name description primaryDomain{url} shipsToCountries refundPolicy{title body url} shippingPolicy{title body url} privacyPolicy{title body url} termsOfService{title body url}}
 localization{availableCountries{isoCode name currency{isoCode name symbol}} country{isoCode name currency{isoCode}} availableLanguages{isoCode name}}}'''
COLLECTIONS = 'query($after:String,$country:CountryCode!,$language:LanguageCode!) @inContext(country:$country,language:$language){collections(first:100,after:$after){nodes{id title handle description image{url altText}} ' + PAGE + '}}'


def context(country, locale):
    return {"country": country, "language": {"zh": "ZH_CN"}.get(locale, locale.upper())}


async def complete_product(client, product, variables):
    fields = {"variants": "id title sku barcode weight weightUnit requiresShipping taxable quantityAvailable quantityRule{minimum maximum increment} availableForSale currentlyNotInStock selectedOptions{name value} price{amount currencyCode} compareAtPrice{amount currencyCode} image{url altText}", "collections": "id title", "media": "mediaContentType alt previewImage{url altText} ... on MediaImage{image{url altText}} ... on Video{sources{url mimeType}} ... on ExternalVideo{embedUrl} ... on Model3d{sources{url mimeType}}"}
    for key, projection in fields.items():
        connection = product[key]
        seen = set()
        while connection["pageInfo"]["hasNextPage"]:
            after = connection["pageInfo"]["endCursor"]
            if not after or after in seen:
                raise ApiError(502, "shop_catalog_incomplete", "Product pagination did not finish")
            seen.add(after)
            query = 'query($id:ID!,$after:String,$country:CountryCode!,$language:LanguageCode!) @inContext(country:$country,language:$language){product(id:$id){' + key + '(first:100,after:$after){nodes{' + projection + '} ' + PAGE + '}}}'
            result = (await client.storefront(query, {**variables, "id": product["id"], "after": after}))["product"]
            if not result:
                raise ApiError(404, "shop_product_unavailable", "Product is no longer published")
            page = result[key]
            connection["nodes"].extend(page["nodes"])
            connection["pageInfo"] = page["pageInfo"]
    return product


def selected(store, product, category=None):
    return store["selection"] == "all" or product["id"] in store["products"] or any(c["id"] in store["collections"] for c in product["collections"]["nodes"]) or (category or {}).get("id") in store.get("categories", [])


def public_product(product, category=None):
    return {**{k: product[k] for k in ("id", "title", "handle", "description", "productType", "vendor", "tags", "availableForSale", "onlineStoreUrl", "updatedAt", "priceRange", "featuredImage", "options")}, "collections": product["collections"]["nodes"], "variants": product["variants"]["nodes"], "media": product["media"]["nodes"], "category": category}
