"""Portal Shopify app, anonymous assistant, merchant OAuth and embed pages."""
import asyncio
import base64
import hashlib
import json
import logging
import secrets
import time
from pathlib import Path
from urllib.parse import urlencode, urlsplit

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from pydantic import Field
from sqlalchemy import delete, select

from ...core.encryption import open_json, seal_json
from ...core.errors import ApiError
from ...core.rate_limit import InMemoryRateLimiter
from ...db.session import get_session_factory
from ..admin.dependencies import AdminIdentity, AdminCsrfIdentity, ensure_role
from ..admin.models import SystemSetting
from ..admin.service import audit
from ..identity.dependencies import DatabaseSession
from ..identity.models import utcnow
from ..runtime.models import RuntimeSession
from .demo_config import StrictModel, load_settings, public_catalog, PROVIDERS
from .demo_providers import ProviderSetupError
from .live_config import read_record, write
from .livestream import origin, base, cookie_domain, clear_cookie, create_obs_runtime
from .shop_config import KEY, SCOPES, ShopSettings, load, redacted, save, store_for, shop_domain
from .shop_client import remote, verify_oauth, verify_webhook, verified_shop_alias, context, METADATA
from .shop_catalog import PREFIX, snapshot, tools, visible, product_detail, client_for, warm_catalogs, refresh_tasks
from .shop_voice import ShopVoice, ShopAudioPump, ShopSpeechGate, instructions
from .schemas import PortalLocale
from .demo_startup import VoiceAdmission, prepare_voice, activate_voice

router = APIRouter(include_in_schema=False)
logger = logging.getLogger("uvicorn.error.portal.shopify")
ROOT = Path(__file__).resolve().parents[3] / "web/portal"
limiter = InMemoryRateLimiter()
COOKIE = "kasamila_shop_oauth"
active = {}
connections = {}
catalog_warmer = None


@router.on_event("startup")
async def start_catalog_warmer():
    global catalog_warmer
    from ...core.config import get_settings
    if get_settings().environment == "production":
        catalog_warmer = asyncio.create_task(warm_catalogs())


@router.on_event("shutdown")
async def stop_catalog_warmer():
    tasks = [t for t in [catalog_warmer, *refresh_tasks.values()] if t]
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


def response(value):
    return JSONResponse(value, headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})


def public_store(db, ident):
    value = load(db)
    store = store_for(value, ident)
    actors = {row["id"]: row for row in public_catalog(db)["avatars"]}
    actor = actors.get(store["avatar"])
    if not store["enabled"] or not store.get("authorization") or not actor or store["channel"] not in actor["channels"]:
        raise ApiError(503, "shop_unavailable", "The merchant has not published this assistant")
    return store, actor


@router.get("/portal/apps/shopify")
def page():
    return FileResponse(ROOT / "shopify.html", headers={"Cache-Control": "no-store"})


@router.get("/portal/apps/shopify/widget.js")
def widget():
    # Public module only. Merchant data remains inside the allowlisted iframe.
    return FileResponse(ROOT / "shopify-widget.js", media_type="text/javascript", headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300"})


@router.get("/portal/apps/shopify/embed")
def embed(request: Request, db: DatabaseSession, store: str, view: bool = False):
    configured, _ = public_store(db, store)
    ancestors = " ".join(["'self'", *configured["embed_origins"]])
    # Published playback accesses its immediate parent. Keep it same-origin
    # without changing the SDK or granting access to the merchant document.
    return FileResponse(ROOT / ("shopify.html" if view else "shopify-embed.html"), headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "frame-ancestors " + ancestors, "X-Frame-Options": "", "X-Robots-Tag": "noindex"})


@router.get("/api/v1/admin/portal/shopify/manage")
def admin_page(admin: AdminIdentity):
    ensure_role(admin, "superadmin", "operator", "auditor")
    return FileResponse(ROOT / "shopify-admin.html", headers={"Cache-Control": "no-store", "X-Robots-Tag": "noindex"})


@router.get("/api/v1/admin/portal/shopify/settings")
def settings(request: Request, admin: AdminIdentity, db: DatabaseSession):
    ensure_role(admin, "superadmin", "operator", "auditor")
    return response({"settings": redacted(load(db)), "can_edit": admin.grant.role == "superadmin", "callback": base(request) + "/portal/apps/shopify/oauth/callback", "webhook": base(request) + "/portal/apps/shopify/webhooks", "scopes": SCOPES})


@router.put("/api/v1/admin/portal/shopify/settings")
def update(request: Request, payload: ShopSettings, admin: AdminCsrfIdentity, db: DatabaseSession):
    return response(save(db, request, admin, payload))


class StoreRequest(StrictModel):
    store: str = Field(pattern=r"^[a-z0-9-]{1,40}$")
    consent: bool = False


def begin_auth(request, payload, db, admin_mode=False):
    source = origin(request)
    if not payload.consent:
        raise ApiError(422, "shop_consent_required", "Agree to merchant authorization first")
    if not limiter.check("oauth:" + (request.client.host if request.client else ""), 10, 600).allowed:
        raise ApiError(429, "shop_limited", "Try again later")
    value = load(db)
    store = store_for(value, payload.store)
    if not value["client_id"] or not value["client_secret"]:
        raise ApiError(422, "shop_app_required", "Configure Shopify Client ID and Secret in Admin")
    bind, nonce = secrets.token_urlsafe(24), secrets.token_urlsafe(24)
    row = db.get(SystemSetting, KEY)
    write(db, "portal.shopify.oauth." + nonce, {"expires": time.time() + 600}, row.updated_by_user_id)
    state = seal_json({"nonce": nonce, "bind": hashlib.sha256(bind.encode()).hexdigest(), "expires": time.time() + 600, "shop": store["shop"], "store": store["id"], "client_id": value["client_id"], "return_origin": source, "admin": admin_mode}, "portal-shopify-oauth")
    redirect = base(request) + "/portal/apps/shopify/oauth/callback"
    url = f"https://{store['shop']}/admin/oauth/authorize?" + urlencode({"client_id": value["client_id"], "scope": SCOPES, "redirect_uri": redirect, "state": state})
    result = response({"url": url})
    clear_cookie(result, COOKIE, "/portal/apps/shopify/oauth")
    result.set_cookie(COOKIE, bind, max_age=600, httponly=True, secure=source.startswith("https:"), samesite="lax", path="/portal/apps/shopify/oauth", **cookie_domain())
    return result


@router.post("/api/v1/admin/portal/shopify/authorize")
def authorize_admin(request: Request, payload: StoreRequest, admin: AdminCsrfIdentity, db: DatabaseSession):
    ensure_role(admin, "superadmin")
    return begin_auth(request, payload, db, True)


@router.post("/portal/apps/shopify/authorize")
def authorize_merchant(request: Request, payload: StoreRequest, db: DatabaseSession):
    return begin_auth(request, payload, db)


@router.get("/portal/apps/shopify/oauth/callback")
async def callback(request: Request, db: DatabaseSession):
    target, result = base(request) + "/portal/apps/shopify", "shop_auth_failed"
    try:
        params = list(request.query_params.multi_items())
        values = dict(params)
        value = load(db)
        if not verify_oauth(params, value["client_secret"]):
            raise ValueError("Invalid Shopify signature")
        data = open_json(values.get("state", ""), "portal-shopify-oauth")
        canonical = shop_domain(values["shop"])
        if data["expires"] < time.time() or abs(time.time() - int(values["timestamp"])) > 600 or data["client_id"] != value["client_id"] or not secrets.compare_digest(data["bind"], hashlib.sha256(request.cookies.get(COOKIE, "").encode()).hexdigest()):
            raise ValueError("Invalid OAuth binding")
        from .livestream import allowed_origins
        if data["return_origin"] not in allowed_origins(request):
            raise ValueError("Invalid return host")
        target = data["return_origin"] + ("/api/v1/admin/portal/shopify/manage" if data["admin"] else "/portal/apps/shopify")
        key = "portal.shopify.oauth." + data["nonce"]
        record = read_record(db, key, lock=True)
        if not record or record["expires"] < time.time():
            raise ValueError("State already used")
        db.execute(delete(SystemSetting).where(SystemSetting.key == key))
        db.commit()
        if not values.get("code") or len(values["code"]) > 4096:
            raise ValueError("Missing code")
        token = await remote(f"https://{canonical}/admin/oauth/access_token", {"client_id": value["client_id"], "client_secret": value["client_secret"], "code": values["code"], "expiring": 1})
        if not set(SCOPES.split(",")).issubset(set(token.get("scope", "").split(","))) or not token.get("refresh_token"):
            raise ApiError(422, "shop_permissions_required", "Approve the configured Shopify scopes and expiring offline access")
        token["expires_at"] = time.time() + token["expires_in"]
        if canonical != data["shop"]:
            token["shop_id"] = await verified_shop_alias(data["shop"], canonical, token["access_token"])
        current = read_record(db, KEY, lock=True)
        saved = store_for(current, data["store"])
        if saved["shop"] != data["shop"] or current["client_id"] != data["client_id"] or current["client_secret"] != value["client_secret"]:
            raise ValueError("Configuration changed")
        if any(s["id"] != saved["id"] and s["shop"] == canonical for s in current["stores"]):
            raise ApiError(409, "shop_duplicate", "This shop is already configured")
        if canonical != data["shop"]:
            saved["shop_aliases"] = sorted(set(saved.get("shop_aliases", []) + [data["shop"]]))
            saved["shop"] = canonical
        saved["authorization"] = token
        saved.pop("storefront_token", None)
        saved["webhook_event"] = secrets.token_hex(16)
        write(db, KEY, current, db.get(SystemSetting, KEY).updated_by_user_id)
        result = "shop_authorized"
    except Exception as error:
        db.rollback()
        if isinstance(error, ApiError):
            result = error.code
    result = RedirectResponse(target + "?result=" + result, status_code=303)
    clear_cookie(result, COOKIE, "/portal/apps/shopify/oauth")
    result.headers.update({"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})
    return result


@router.post("/api/v1/admin/portal/shopify/disconnect")
def disconnect(request: Request, payload: StoreRequest, admin: AdminCsrfIdentity, db: DatabaseSession):
    ensure_role(admin, "superadmin")
    value = read_record(db, KEY, lock=True)
    store = store_for(value, payload.store)
    for key in ("authorization", "storefront_token", "webhooks"):
        store.pop(key, None)
    store["enabled"] = False
    db.execute(delete(SystemSetting).where(SystemSetting.key.like(PREFIX + store["id"] + ".%")))
    write(db, KEY, value, admin.identity.user.id)
    audit(db, request, admin, "settings.portal_shopify_disconnected", "system_setting", KEY, metadata={"store": store["id"]})
    db.commit()
    return response({"ok": True})


@router.post("/api/v1/admin/portal/shopify/sync")
async def synchronize(request: Request, payload: StoreRequest, admin: AdminCsrfIdentity, db: DatabaseSession):
    ensure_role(admin, "superadmin")
    store = store_for(load(db), payload.store)
    client = client_for(store["id"])
    await client.register_webhooks(base(request) + "/portal/apps/shopify/webhooks")
    _, data = await snapshot(store["id"], store["default_country"], "en", force=True)
    return response({"products": [{k: p[k] for k in ("id", "title", "category", "collections")} for p in data["products"]], "collections": data["collections"], "countries": data["localization"]["availableCountries"], "synced_at": data["synced_at"], "webhooks": True})


@router.get("/api/v1/admin/portal/shopify/catalog")
def admin_catalog(admin: AdminIdentity, db: DatabaseSession, store: str):
    ensure_role(admin, "superadmin", "operator", "auditor")
    from .shop_catalog import catalog_key
    configured = store_for(load(db), store)
    data = read_record(db, catalog_key(configured, configured["default_country"], "en")) or {}
    return response({"products": [{k: p[k] for k in ("id", "title", "category", "collections")} for p in data.get("products", [])], "collections": data.get("collections", []), "countries": data.get("localization", {}).get("availableCountries", []), "synced_at": data.get("synced_at")})


@router.post("/portal/apps/shopify/webhooks")
async def webhook(request: Request, db: DatabaseSession):
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 2 * 1024 * 1024:
            raise ApiError(413, "shop_payload_too_large", "Webhook too large")
    value = load(db)
    if not verify_webhook(bytes(body), request.headers.get("X-Shopify-Hmac-Sha256", ""), value["client_secret"]):
        return JSONResponse({"error": "invalid_signature"}, status_code=401)
    try:
        shop = shop_domain(request.headers.get("X-Shopify-Shop-Domain", ""))
    except ValueError:
        return JSONResponse({"error": "invalid_shop"}, status_code=400)
    topic = request.headers.get("X-Shopify-Topic", "")
    allowed = {"app/uninstalled", "products/create", "products/update", "products/delete", "collections/create", "collections/update", "collections/delete", "shop/update", "markets/create", "markets/update", "markets/delete", "inventory_levels/update", "customers/data_request", "customers/redact", "shop/redact"}
    if topic not in allowed:
        return response({"ok": True})
    value = read_record(db, KEY, lock=True)
    store = next((s for s in value["stores"] if s["shop"] == shop), None)
    if store:
        db.execute(delete(SystemSetting).where(SystemSetting.key.like(PREFIX + store["id"] + ".%")))
        if topic == "shop/redact":
            value["stores"].remove(store)
        elif topic == "app/uninstalled":
            for key in ("authorization", "storefront_token", "webhooks"):
                store.pop(key, None)
            store["enabled"] = False
        elif topic not in ("customers/data_request", "customers/redact"):
            store["webhook_event"] = secrets.token_hex(16)
        write(db, KEY, value, db.get(SystemSetting, KEY).updated_by_user_id)
    # This app stores no customer/order data, chat transcripts or webhook bodies.
    return response({"ok": True})


@router.get("/portal/apps/shopify/catalog")
def catalog(db: DatabaseSession):
    result = []
    for store in load(db)["stores"]:
        try:
            configured, actor = public_store(db, store["id"])
            result.append({**{k: configured[k] for k in ("id", "title", "names", "shop", "default_country")}, "avatar": actor})
        except ApiError:
            pass
    return response({"stores": result})


@router.get("/portal/apps/shopify/merchants")
def merchants(db: DatabaseSession):
    return response({"stores": [{"id": s["id"], "shop": host} for s in load(db)["stores"] for host in [s["shop"], *s.get("shop_aliases", [])]]})


@router.get("/portal/apps/shopify/product")
async def product(request: Request, db: DatabaseSession, store: str, product: str, country: str = "US", lang: PortalLocale = "en"):
    import re
    public_store(db, store)
    if not re.fullmatch(r"gid://shopify/Product/\d+", product) or not re.fullmatch(r"[A-Z]{2}", country):
        raise ApiError(422, "shop_query_invalid", "Invalid product request")
    if not limiter.check("product:" + (request.client.host if request.client else ""), 60, 60).allowed:
        raise ApiError(429, "shop_limited", "Try again later")
    return response({"product": await product_detail(store, product, country, lang)})


@router.get("/portal/apps/shopify/countries")
async def countries(request: Request, db: DatabaseSession, store: str, lang: PortalLocale = "en"):
    configured, _ = public_store(db, store)
    if not limiter.check("countries:" + (request.client.host if request.client else ""), 60, 60).allowed:
        raise ApiError(429, "shop_limited", "Try again later")
    data = await client_for(store).storefront(METADATA, context("US", lang))
    return response({"countries": data["localization"]["availableCountries"]})


@router.get("/portal/apps/shopify/products")
async def products(request: Request, db: DatabaseSession, store: str, country: str = "US", lang: PortalLocale = "en", offset: int = 0, query: str = ""):
    configured, _ = public_store(db, store)
    import re
    if not re.fullmatch(r"[A-Za-z]{2}", country) or not 0 <= offset <= 50000 or len(query) > 200:
        raise ApiError(422, "shop_query_invalid", "Invalid catalogue request")
    if not limiter.check("catalog:" + (request.client.host if request.client else ""), 60, 60).allowed:
        raise ApiError(429, "shop_limited", "Try again later")
    _, data = await snapshot(store, country.upper(), lang, background=True)
    candidates = [p for p in data["products"] if visible(configured, p) and (not query or query.casefold() in (p["title"] + " " + p["description"]).casefold())]
    return response({"products": candidates[offset:offset + 24], "total": len(candidates), "next_offset": offset + 24 if offset + 24 < len(candidates) else None, "shop": data["shop"], "countries": data["localization"]["availableCountries"], "synced_at": data["synced_at"]})


class BuyerRequest(StoreRequest):
    country: str = Field(default="US", pattern=r"^[A-Z]{2}$")
    locale: PortalLocale = "en"


class CartRequest(BuyerRequest):
    product: str = Field(pattern=r"^gid://shopify/Product/\d+$")
    variant: str = Field(pattern=r"^gid://shopify/ProductVariant/\d+$")
    quantity: int = Field(default=1, ge=1, le=10)


@router.post("/portal/apps/shopify/cart")
async def checkout(request: Request, payload: CartRequest, db: DatabaseSession):
    origin(request)
    public_store(db, payload.store)
    if not limiter.check("cart:" + request.client.host, 10, 60).allowed:
        raise ApiError(429, "shop_limited", "Try again later")
    client = client_for(payload.store)
    data = await client.storefront('query {localization {availableCountries {isoCode}}}')
    if payload.country not in {c["isoCode"] for c in data["localization"]["availableCountries"]}:
        raise ApiError(422, "shop_country_unavailable", "Country is not supported")
    product = await product_detail(payload.store, payload.product, payload.country, payload.locale)
    variant = next((v for v in product["variants"] if v["id"] == payload.variant and v["availableForSale"]), None)
    if not variant:
        raise ApiError(409, "shop_product_unavailable", "Selected variant is no longer for sale")
    rule = variant.get("quantityRule") or {}
    if payload.quantity < rule.get("minimum", 1) or (rule.get("maximum") is not None and payload.quantity > rule["maximum"]) or payload.quantity % rule.get("increment", 1):
        raise ApiError(422, "shop_quantity_invalid", "Choose a quantity allowed by this variant")
    data = await client.storefront('mutation($input:CartInput!,$country:CountryCode!,$language:LanguageCode!) @inContext(country:$country,language:$language){cartCreate(input:$input){cart{id checkoutUrl} userErrors{code field message}}}', {**context(payload.country, payload.locale), "input": {"buyerIdentity": {"countryCode": payload.country}, "lines": [{"merchandiseId": payload.variant, "quantity": payload.quantity}]}})
    result = data["cartCreate"]
    if result["userErrors"] or not result.get("cart"):
        raise ApiError(409, "shop_cart_failed", "Shopify could not create this cart")
    url = result["cart"]["checkoutUrl"]
    hostname = urlsplit(url).hostname or ""
    metadata = await client.storefront('query {shop{primaryDomain{url}}}')
    allowed = {client.host, urlsplit(metadata["shop"]["primaryDomain"]["url"]).hostname}
    if urlsplit(url).scheme != "https" or hostname not in allowed:
        raise ApiError(502, "shop_cart_failed", "Unexpected checkout destination")
    return response({"checkout_url": url, "product": product})


@router.post("/portal/apps/shopify/sessions")
def start(request: Request, payload: BuyerRequest, db: DatabaseSession):
    source = origin(request)
    if not payload.consent:
        raise ApiError(422, "shop_consent_required", "Accept conversation data processing first")
    store, _ = public_store(db, payload.store)
    if not limiter.check("start:" + request.client.host, 6, 600).allowed:
        raise ApiError(429, "shop_limited", "Try again later")
    runtime = create_obs_runtime(request, store, db)
    ticket_data = {"nonce": secrets.token_urlsafe(24), "expires": time.time() + 120, "store": store["id"], "shop": store["shop"], "country": payload.country, "locale": payload.locale, "origin": source, "ip": request.client.host, "runtime_session": runtime["runtime"]["session_id"]}
    ticket = seal_json(ticket_data, "portal-shopify-chat")
    return response({**runtime, "ticket": ticket, "preparation": prepare_voice(ticket_data, "portal-shopify-chat")})


@router.post("/portal/apps/shopify/voice-ticket")
def voice_admission(request: Request, payload: VoiceAdmission, db: DatabaseSession):
    return response(activate_voice(request, payload, db, "portal-shopify-chat", origin(request)))


async def wait_for_inactivity(last_input, send, *, clock=time.monotonic, sleep=asyncio.sleep):
    while True:
        await sleep(max(.1, 120-(clock()-last_input())))
        if clock()-last_input() >= 120:
            await send({"type": "idle"})
            return


class ShopConnection:
    """Keep the existing voice/Runtime session through a brief browser disconnect."""
    grace_seconds = 20

    def __init__(self, ws, ticket):
        self.ws, self.ticket = ws, ticket
        self.changed = asyncio.Event()
        self.closed = asyncio.Event()
        self.detached_at = None
        self.resumes = 0

    def detach(self, ws):
        if self.ws is ws:
            self.ws = None
            self.detached_at = time.monotonic()
            self.changed.clear()

    async def attach(self, ws):
        if self.closed.is_set() or (self.detached_at is not None and time.monotonic()-self.detached_at >= self.grace_seconds):
            raise ValueError("Reconnect window ended")
        old, self.ws = self.ws, ws
        self.detached_at = None
        self.resumes += 1
        self.changed.set()
        if old and old is not ws:
            try:
                await old.close()
            except Exception:
                pass

    async def send_json(self, event):
        ws = self.ws
        if ws is None:
            return  # Never queue/replay stale audio while the shopper is offline.
        try:
            await ws.send_json(event)
        except (WebSocketDisconnect, OSError, RuntimeError):
            self.detach(ws)

    async def receive_text(self):
        while not self.closed.is_set():
            ws = self.ws
            if ws is None:
                remaining = self.grace_seconds-(time.monotonic()-self.detached_at)
                await asyncio.wait_for(self.changed.wait(), max(.01, remaining))
                continue
            try:
                raw = await ws.receive_text()
                if ws is self.ws:
                    return raw
            except (WebSocketDisconnect, OSError, RuntimeError):
                self.detach(ws)
        raise WebSocketDisconnect()

    async def close(self):
        self.closed.set()
        self.changed.set()
        if self.ws:
            try:
                await self.ws.close()
            except Exception:
                pass


@router.websocket("/portal/apps/shopify/socket")
async def socket(ws: WebSocket):
    ticket, transport, owns = None, None, False
    peer = None
    tasks = []
    opened_at, close_reason = time.monotonic(), "peer_closed"
    try:
        await ws.accept()
        first = json.loads(await asyncio.wait_for(ws.receive_text(), 10))
        if len(first.get("ticket", "")) > 4096:
            raise ValueError("Ticket too large")
        ticket = open_json(first.get("ticket", ""), "portal-shopify-chat")
        if ticket["origin"] != ws.headers.get("origin") or ticket["ip"] != ws.client.host:
            raise ValueError("Invalid browser binding")
        existing = connections.get(ticket["nonce"])
        if first.get("resume") and existing and existing.ticket == ticket:
            # Only the still-live, originally authenticated session can resume.
            # Its original idle/Runtime/600-second deadlines never move.
            if not limiter.check("resume:" + ticket["nonce"], 12, 60).allowed:
                raise ValueError("Reconnect limit")
            if hasattr(existing, "audio"):
                existing.audio.clear()
            await existing.transport.input({"type": "interrupt", "audio_end_ms": 0})
            await existing.attach(ws)
            await existing.send_json({"type": "ready", "input_rate": existing.transport.input_rate, "resumed": True})
            logger.info("shop_session_resumed count=%d", existing.resumes)
            await existing.closed.wait()
            return
        if first.get("resume") or ticket["expires"] < time.time() or not limiter.check("ticket:" + ticket["nonce"], 1, 600).allowed:
            raise ValueError("Invalid or reused ticket")
        with get_session_factory()() as db:
            runtime = db.scalar(select(RuntimeSession).where(RuntimeSession.session_id == ticket["runtime_session"]))
            if not runtime or runtime.status != "active" or runtime.expires_at <= utcnow() or runtime.origin != ticket["origin"]:
                raise ValueError("Runtime no longer active")
            owns = True
            store, _ = public_store(db, ticket["store"])
            demos = load_settings(db)
        if store["shop"] != ticket["shop"] or len(active) >= demos["max_concurrent_sessions"]:
            raise ValueError("Store changed or busy")
        # Validate country before any audio/model requests.
        _, catalogue = await snapshot(store["id"], ticket["country"], ticket["locale"], background=True)
        avatar = next(a for a in demos["avatars"] if a["id"] == store["avatar"])
        channel = next(c for c in demos["channels"] if c["id"] == store["channel"])
        async def tool(name, args):
            with get_session_factory()() as db:
                current, _ = public_store(db, ticket["store"])
                if current["shop"] != ticket["shop"]:
                    raise ApiError(409, "shop_configuration_changed", "Store configuration changed")
            return await tools(ticket["store"], ticket["country"], ticket["locale"], name, args)
        index = [{"id": p["id"], "title": p["title"]} for p in catalogue["products"] if visible(store, p)][:80]
        prompt = instructions(store, avatar, ticket["locale"], ticket["country"]) + "\nCatalogue index (identifiers only; retrieve facts before claims): " + json.dumps(index, ensure_ascii=False)
        transport = ShopVoice(channel, prompt, store["voice"] or avatar["voices"].get(channel["id"]), PROVIDERS["qwen"], tool=tool,
                              catalogue=[p for p in catalogue["products"] if visible(store, p)], checked_at=catalogue["synced_at"]*1000)
        active[ticket["nonce"]] = store["id"]
        await transport.connect()
        peer = ShopConnection(ws, ticket)
        peer.transport = transport
        peer.audio = ShopAudioPump(transport, peer.send_json, gate=ShopSpeechGate())
        connections[ticket["nonce"]] = peer
        last_input = time.monotonic()
        async def receive():
            nonlocal last_input, close_reason
            limit = InMemoryRateLimiter()
            while True:
                raw = await peer.receive_text()
                if len(raw) > 70000 or not limit.check("frames", 100, 1).allowed:
                    raise ValueError("Message limit")
                item = json.loads(raw)
                if item.get("type") == "ping":
                    await peer.send_json({"type": "pong"})
                    continue
                if item.get("type") == "leave":
                    close_reason = "shop_user_left"
                    return
                if item.get("type") == "audio":
                    pcm = base64.b64decode(item.get("data", ""), validate=True)
                    if not pcm or len(pcm) % 2 or len(pcm) > 32768:
                        raise ValueError("Invalid PCM")
                    if peer.audio.offer(pcm):
                        last_input = time.monotonic()
                        if limit.check("speech-activity", 1, 5).allowed:
                            await peer.send_json({"type": "user_activity"})
                    continue
                elif item.get("type") == "text":
                    if not isinstance(item.get("text"), str) or not 1 <= len(item["text"].strip()) <= 2000:
                        raise ValueError("Invalid text")
                    if not limit.check("text", 30, 60).allowed:
                        await peer.send_json({"type": "warning", "code": "shop_limited"})
                        continue
                    last_input = time.monotonic()
                    peer.audio.clear()
                elif item.get("type") == "activity":
                    if limit.check("activity", 30, 60).allowed:
                        last_input = time.monotonic()
                    continue
                elif item.get("type") == "product_context":
                    if not limit.check("context", 20, 60).allowed or item.get("product") not in {p["id"] for p in catalogue["products"] if visible(store, p)}:
                        raise ValueError("Invalid product context")
                    last_input = time.monotonic()
                elif item.get("type") == "interrupt":
                    peer.audio.clear()
                    item["audio_end_ms"] = max(0, min(int(item.get("audio_end_ms", 0)), 600000))
                elif item.get("type") == "audio_end":
                    peer.audio.finish()
                else:
                    raise ValueError("Unknown input")
                await transport.input(item)
        async def emit():
            nonlocal last_input, close_reason
            async for event in transport.events():
                if event["type"] in ("user_activity", "user_text"):
                    last_input = time.monotonic()
                await peer.send_json(event)
                if event["type"] == "error":
                    close_reason = event["code"]
                    return
            close_reason = "shop_provider_closed"
            await peer.send_json({"type": "error", "code": close_reason})
        async def idle_event(event):
            nonlocal close_reason
            close_reason = "shop_idle"
            await peer.send_json(event)
        tasks = [asyncio.create_task(receive()), asyncio.create_task(emit()), asyncio.create_task(peer.audio.run()), asyncio.create_task(wait_for_inactivity(lambda: last_input, idle_event))]
        completed, _ = await asyncio.wait(tasks, timeout=600, return_when=asyncio.FIRST_COMPLETED)
        if not completed:
            close_reason = "shop_session_limit"
            await peer.send_json({"type": "ended", "code": close_reason})
        for task in completed:
            task.result()
    except (Exception, WebSocketDisconnect) as error:
        close_reason = error.code if isinstance(error, (ApiError, ProviderSetupError)) else type(error).__name__
        try:
            await (peer or ws).send_json({"type": "error", "code": error.code if isinstance(error, (ApiError, ProviderSetupError)) else "shop_connection_failed"})
        except Exception:
            pass
    finally:
        if owns:
            logger.info("shop_session_closed reason=%s seconds=%d resumes=%d", close_reason, time.monotonic()-opened_at, peer.resumes if peer else 0)
        if peer:
            connections.pop(ticket["nonce"], None)
            await peer.close()
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        if transport:
            try:
                await transport.close()
            except Exception:
                pass
        if ticket and owns:
            active.pop(ticket["nonce"], None)
            from .demos import finish_runtime
            try:
                await asyncio.to_thread(finish_runtime, ticket["runtime_session"], ticket["origin"])
            except Exception:
                pass
        try:
            await ws.close()
        except Exception:
            pass
