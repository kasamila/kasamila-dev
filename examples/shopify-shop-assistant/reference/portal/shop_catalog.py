"""Tenant-isolated catalogue snapshots with webhook invalidation and live detail reads."""
import asyncio
import hashlib
import json
import time
import weakref
from datetime import datetime, timezone

from ...core.errors import ApiError
from ...db.session import get_session_factory
from ..admin.models import SystemSetting
from .live_config import read_record, write
from .shop_config import KEY, load, store_for
from .shop_client import Shopify, context, PRODUCTS, PRODUCT, PRODUCT_FIELDS, METADATA, COLLECTIONS, complete_product, public_product, selected, plain

sync_locks = {}
PREFIX = "portal.shop.cache."
refresh_tasks = {}
recent_contexts = {}
fact_cache = {}
fact_locks = weakref.WeakValueDictionary()


def refresh_later(ident, country, locale):
    key = (ident, country, locale)
    if key in refresh_tasks or len(refresh_tasks) >= 32:
        return
    async def refresh():
        try:
            await snapshot(ident, country, locale, force=True)
        except Exception:
            pass  # Existing verified catalogue remains dated; live facts still fail closed.
        finally:
            refresh_tasks.pop(key, None)
    refresh_tasks[key] = asyncio.create_task(refresh())


async def warm_catalogs():
    """Refresh recently used contexts outside the shopper's response path."""
    while True:
        try:
            with get_session_factory()() as db:
                stores = [s for s in load(db)["stores"] if s["enabled"] and s.get("authorization")]
            for store in stores:
                contexts = {(store["default_country"], "zh"), (store["default_country"], "en")}
                contexts.update((country, locale) for (ident, country, locale), seen in list(recent_contexts.items()) if ident == store["id"] and seen > time.time()-600)
                for country, locale in contexts:
                    await snapshot(store["id"], country, locale)
        except asyncio.CancelledError:
            raise
        except Exception:
            pass
        await asyncio.sleep(15)


def catalog_key(store, country, locale):
    return PREFIX + store["id"] + "." + hashlib.sha256((store["shop"] + country + locale).encode()).hexdigest()[:20]


def fingerprint(store):
    return hashlib.sha256(json.dumps({key: store.get(key) for key in ("shop", "webhook_event", "authorization", "storefront_token")}, sort_keys=True).encode()).hexdigest()


def client_for(ident):
    with get_session_factory()() as db:
        settings = load(db)
    store = store_for(settings, ident)
    def reload():
        with get_session_factory()() as db:
            current = load(db)
            saved = store_for(current, ident)
            if saved["shop"] != store["shop"] or any(current[k] != settings[k] for k in ("client_id", "client_secret")) or not saved.get("authorization"):
                raise ApiError(409, "shop_configuration_changed", "Shop configuration changed")
            return saved
    async def persist(**changes):
        with get_session_factory()() as db:
            current = read_record(db, KEY, lock=True)
            saved = store_for(current, ident)
            if saved["shop"] != store["shop"] or any(current[k] != settings[k] for k in ("client_id", "client_secret")) or not saved.get("authorization"):
                raise ApiError(409, "shop_configuration_changed", "Shop configuration changed")
            # A webhook's invalidation marker must survive a token refresh.
            saved.update(changes)
            write(db, KEY, current, db.get(SystemSetting, KEY).updated_by_user_id)
        store.update(changes)
    return Shopify(store, settings, persist, reload)


async def snapshot(ident, country, locale="en", force=False, background=False):
    recent_contexts[(ident, country, locale)] = time.time()
    if len(recent_contexts) > 128:
        recent_contexts.pop(min(recent_contexts, key=recent_contexts.get), None)
    client = client_for(ident)
    key = catalog_key(client.store, country, locale)
    # Background refresh must not hold up a conversation behind its network I/O.
    # Prices/stock are still revalidated by conversation_products/product_detail.
    if background and not force:
        with get_session_factory()() as db:
            cached = read_record(db, key)
        if cached and cached["fingerprint"] == fingerprint(client.store) and cached["synced_at"] + 300 > time.time():
            if cached["synced_at"] + client.store["sync_seconds"] <= time.time():
                refresh_later(ident, country, locale)
            return client, cached
    async with sync_locks.setdefault(key, asyncio.Lock()):
        client = client_for(ident)
        with get_session_factory()() as db:
            cached = read_record(db, key)
        if not force and cached and cached["fingerprint"] == fingerprint(client.store) and cached["synced_at"] + client.store["sync_seconds"] > time.time():
            return client, cached
        if background and not force and cached and cached["fingerprint"] == fingerprint(client.store) and cached["synced_at"] + 300 > time.time():
            refresh_later(ident, country, locale)
            return client, cached
        variables = context(country, locale)
        metadata = await client.storefront(METADATA, variables)
        countries = metadata["localization"]["availableCountries"]
        if country not in {row["isoCode"] for row in countries}:
            raise ApiError(422, "shop_country_unavailable", "Select a country supported by this shop")
        products = await client.connection("products", PRODUCTS, variables, storefront=True)
        for product in products:
            await complete_product(client, product, variables)
        collections = await client.connection("collections", COLLECTIONS, variables, storefront=True)
        categories = await client.connection("products", 'query($after:String){products(first:100,after:$after,query:"status:active"){nodes{id category{id fullName}} pageInfo{hasNextPage endCursor}}}')
        taxonomy = {row["id"]: row.get("category") for row in categories}
        value = {"shop": metadata["shop"], "localization": metadata["localization"], "collections": collections,
                 "markets": await client.markets(country),
                 "products": [public_product(p, taxonomy.get(p["id"])) for p in products], "synced_at": time.time(), "fingerprint": fingerprint(client.store)}
        with get_session_factory()() as db:
            current = store_for(load(db), ident)
            if fingerprint(current) != value["fingerprint"]:
                raise ApiError(409, "shop_configuration_changed", "Catalogue changed while synchronizing; retry")
            write(db, key, value, db.get(SystemSetting, KEY).updated_by_user_id)
        return client, value


def visible(store, product):
    return store["selection"] == "all" or product["id"] in store["products"] or any(c["id"] in store["collections"] for c in product["collections"]) or (product.get("category") or {}).get("id") in store.get("categories", [])


async def product_detail(ident, product_id, country, locale):
    client = client_for(ident)
    metadata = await client.storefront(METADATA, context(country, locale))
    if country not in {c["isoCode"] for c in metadata["localization"]["availableCountries"]}:
        raise ApiError(422, "shop_country_unavailable", "Select a country supported by this shop")
    variables = {**context(country, locale), "id": product_id}
    product = (await client.storefront(PRODUCT, variables))["product"]
    if not product:
        raise ApiError(404, "shop_product_unavailable", "Product is no longer available in this country")
    await complete_product(client, product, context(country, locale))
    category = (await client.admin('query($id:ID!){product(id:$id){category{id fullName}}}', {"id": product_id})).get("product", {})
    category = (category or {}).get("category")
    if not selected(client.store, product, category):
        raise ApiError(404, "shop_product_unavailable", "Product is outside this demo's selection")
    return public_product(product, category)


async def conversation_products(ident, ids, country, locale):
    """One Storefront query for up to three candidates; reuse for 20 seconds.

    Checkout deliberately uses product_detail instead of this conversational cache.
    Every read rechecks merchant selection and webhook/credential invalidation.
    """
    client, data = await snapshot(ident, country, locale, background=True)
    if country not in {c["isoCode"] for c in data["localization"]["availableCountries"]}:
        raise ApiError(422, "shop_country_unavailable", "Country is no longer available")
    approved = {p["id"]: p for p in data["products"] if visible(client.store, p)}
    ids = list(dict.fromkeys(ids))[:3]
    if any(i not in approved for i in ids):
        raise ApiError(404, "shop_product_unavailable", "Product is outside this demo's selection")
    key = (ident, country, locale, fingerprint(client.store), tuple(ids))
    lock = fact_locks.setdefault(key, asyncio.Lock())
    async with lock:
        now = time.time()
        if key in fact_cache and fact_cache[key][0] > now:
            return fact_cache[key][1]
        query = 'query($ids:[ID!]!,$country:CountryCode!,$language:LanguageCode!) @inContext(country:$country,language:$language){nodes(ids:$ids){... on Product{' + PRODUCT_FIELDS + '}}}'
        nodes = (await client.storefront(query, {**context(country, locale), "ids": ids}))["nodes"]
        products = []
        for p in nodes:
            if p:
                await complete_product(client, p, context(country, locale))
                products.append(public_product(p, approved[p["id"]].get("category")))
        with get_session_factory()() as db:
            current = store_for(load(db), ident)
        if fingerprint(current) != fingerprint(client.store):
            raise ApiError(409, "shop_configuration_changed", "Store changed while checking products")
        products = [p for p in products if visible(current, p)]
        result = {"products": products, "country": country, "checked_at": datetime.now(timezone.utc).isoformat()}
        fact_cache[key] = (time.time()+20, result)
        for p in products:
            fact_cache[(*key[:-1], (p["id"],))] = (time.time()+20, {**result, "products": [p]})
        while len(fact_cache) > 256:
            fact_cache.pop(next(iter(fact_cache)))
        return result


async def tools(ident, country, locale, name, arguments):
    if name == "get_product":
        product_id = arguments.get("product_id", "")
        if not isinstance(product_id, str) or not product_id.startswith("gid://shopify/Product/") or not product_id.rsplit("/", 1)[-1].isdigit():
            raise ApiError(422, "shop_product_unavailable", "Use an ID returned by search_catalog")
        return await conversation_products(ident, [product_id], country, locale)
    if name == "get_shop_policies":
        client = client_for(ident)
        metadata = await client.storefront(METADATA, context(country, locale))
        if country not in {c["isoCode"] for c in metadata["localization"]["availableCountries"]}:
            raise ApiError(422, "shop_country_unavailable", "Country is no longer available")
        shop = metadata["shop"]
        return {"shop": {key: ({**value, "body": plain(value.get("body"))} if isinstance(value, dict) and "body" in value else value) for key, value in shop.items()}, "country": country, "markets": await client.markets(country), "merchant_country_notes": client.store["market_notes"].get(country, ""), "checkout_verifies_shipping_tax_and_discounts": True, "checked_at": datetime.now(timezone.utc).isoformat()}
    if name != "search_catalog":
        raise ApiError(422, "shop_tool_invalid", "Unknown store tool")
    client, data = await snapshot(ident, country, locale, background=True)
    query = arguments.get("query", "")
    if not isinstance(query, str) or len(query) > 200:
        raise ApiError(422, "shop_tool_invalid", "Search text too long")
    query = query.casefold().strip()
    words = query.split()
    candidates = [p for p in data["products"] if visible(client.store, p)]
    def score(product):
        title = product["title"].casefold()
        text = " ".join([title, product["description"], product["productType"], *product["tags"], *[c["title"] for c in product["collections"]], (product.get("category") or {}).get("fullName", "")]).casefold()
        return (100 if query and query in title else 0) + sum(10 if word in title else 1 if word in text else 0 for word in words)
    candidates.sort(key=score, reverse=True)
    if query:
        candidates = [p for p in candidates if score(p)]
    if not candidates:
        return {"products": [], "total_matches": 0, "country": country, "checked_at": datetime.now(timezone.utc).isoformat()}
    result = await conversation_products(ident, [p["id"] for p in candidates[:3]], country, locale)
    return {**result, "total_matches": len(candidates)}
