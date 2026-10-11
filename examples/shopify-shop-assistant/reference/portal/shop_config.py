"""Encrypted, independent Shopify demo configuration. No customer/order access."""
import copy
import re
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from sqlalchemy import delete

from ...core.errors import ApiError
from ..admin.dependencies import ensure_role
from ..admin.service import audit
from ..admin.models import SystemSetting
from .demo_config import StrictModel, load_settings, public_catalog, channel_ready
from .live_config import read_record, write

KEY = "portal.shopify_demos"
SCOPES = "read_products,read_markets,read_inventory,unauthenticated_read_product_listings,unauthenticated_read_product_inventory"
VERSION = "2026-10"


def shop_domain(value):
    parts = urlsplit(value.strip() if "://" in value else "https://" + value.strip())
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or parts.username or parts.password or parts.port not in (None, 443) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*\.myshopify\.com", host):
        raise ValueError("Use the store's canonical xxx.myshopify.com domain")
    return host


class ShopStore(StrictModel):
    id: str = Field(pattern=r"^[a-z0-9-]{1,40}$")
    shop: str = "kasamila.myshopify.com"
    title: str = Field(default="Kasamila", max_length=100)
    names: dict[str, str] = Field(default_factory=dict, max_length=15)
    enabled: bool = False
    avatar: str = Field(default="", max_length=48)
    channel: str = Field(default="", max_length=48)
    voice: str = Field(default="", max_length=100)
    persona: str = Field(default="Help shoppers find suitable products naturally, without pressure.", max_length=4000)
    guardrails: str = Field(default="Do not invent discounts, stock, shipping promises or refund terms.", max_length=4000)
    selection: str = Field(default="all", pattern=r"^(all|selected)$")
    collections: list[str] = Field(default_factory=list, max_length=1000)
    categories: list[str] = Field(default_factory=list, max_length=1000)
    products: list[str] = Field(default_factory=list, max_length=5000)
    default_country: str = Field(default="US", pattern=r"^[A-Z]{2}$")
    sync_seconds: int = Field(default=60, ge=15, le=600)
    embed_origins: list[str] = Field(default_factory=list, max_length=20)
    market_notes: dict[str, str] = Field(default_factory=dict, max_length=250)

    @model_validator(mode="after")
    def normalize(self):
        self.shop = shop_domain(self.shop)
        for origins in self.embed_origins:
            p = urlsplit(origins)
            if p.scheme != "https" or p.username or p.password or p.port not in (None, 443) or origins != "https://" + (p.hostname or "") or not re.fullmatch(r"[a-zA-Z0-9.-]+", p.hostname or ""):
                raise ValueError("Embed origins must be exact HTTPS origins, without paths or wildcards")
        for ids, kind in ((self.collections, "Collection"), (self.products, "Product")):
            if any(not re.fullmatch(r"gid://shopify/" + kind + r"/\d+", ident) for ident in ids):
                raise ValueError("Select valid Shopify product/collection IDs")
        if any(not re.fullmatch(r"gid://shopify/TaxonomyCategory/[a-zA-Z0-9-]+", ident) for ident in self.categories):
            raise ValueError("Select valid Shopify taxonomy category IDs")
        if any(not re.fullmatch(r"[A-Z]{2}", country) or len(note) > 8000 for country, note in self.market_notes.items()):
            raise ValueError("Use two-letter country codes and notes up to 8000 characters")
        return self


class ShopSettings(StrictModel):
    client_id: str = Field(default="", max_length=250)
    client_secret: str = Field(default="", max_length=500)
    clear_client_secret: bool = False
    stores: list[ShopStore] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def unique(self):
        if len({s.id for s in self.stores}) != len(self.stores) or len({s.shop for s in self.stores}) != len(self.stores):
            raise ValueError("Duplicate store ID or Shopify domain")
        return self


def load(db):
    return read_record(db, KEY) or ShopSettings().model_dump()


def store_for(value, ident):
    store = next((s for s in value["stores"] if s["id"] == ident), None)
    if not store:
        raise ApiError(404, "shop_not_found", "Shopify demo not found")
    return store


def redacted(value):
    result = copy.deepcopy(value)
    result["client_secret_configured"] = bool(result.pop("client_secret", ""))
    result.pop("clear_client_secret", None)
    for store in result["stores"]:
        store["authorized"] = bool(store.pop("authorization", None))
        store.pop("storefront_token", None)
        store.pop("webhooks", None)
        store.pop("webhook_event", None)
    return result


def save(db, request, admin, payload):
    ensure_role(admin, "superadmin")
    old = read_record(db, KEY, lock=True) or ShopSettings().model_dump()
    value, demos = payload.model_dump(), load_settings(db)
    value["client_secret"] = "" if value.pop("clear_client_secret") else value["client_secret"] or old["client_secret"]
    actors = {row["id"]: row for row in public_catalog(db)["avatars"]}
    for store in value["stores"]:
        previous = next((s for s in old["stores"] if s["id"] == store["id"]), {})
        if previous.get("shop") == store["shop"] and old["client_id"] == value["client_id"] and old["client_secret"] == value["client_secret"]:
            for key in ("authorization", "storefront_token", "webhooks", "webhook_event"):
                if key in previous:
                    store[key] = previous[key]
        if store["enabled"]:
            channel = next((c for c in demos["channels"] if c["id"] == store["channel"]), {})
            if store["avatar"] not in actors or store["channel"] not in actors[store["avatar"]]["channels"] or channel.get("provider") != "qwen" or not channel_ready(channel) or not channel.get("model", "").startswith("qwen3.8-"):
                raise ApiError(422, "shop_configuration_invalid", "Choose a published avatar and its Qwen 3.8 realtime tool-capable channel")
            if store["selection"] == "selected" and not (store["products"] or store["collections"] or store["categories"]):
                raise ApiError(422, "shop_selection_empty", "Select at least one collection or product")
    for previous in old["stores"]:
        retained = next((s for s in value["stores"] if s["id"] == previous["id"]), None)
        if not retained or retained["shop"] != previous["shop"] or not retained.get("authorization"):
            db.execute(delete(SystemSetting).where(SystemSetting.key.like("portal.shop.cache." + previous["id"] + ".%")))
    write(db, KEY, value, admin.identity.user.id)
    audit(db, request, admin, "settings.portal_shopify_updated", "system_setting", KEY, metadata={"stores": len(value["stores"])})
    db.commit()
    return redacted(value)
