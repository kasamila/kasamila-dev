import re
from urllib.parse import urlsplit
VERSION = "2026-10"
SCOPES = 'read_products,read_markets,read_inventory,unauthenticated_read_product_listings,unauthenticated_read_product_inventory'

def shop_domain(value):
    parts = urlsplit(value.strip() if "://" in value else "https://" + value.strip())
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or parts.username or parts.password or parts.port not in (None, 443) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*\.myshopify\.com", host):
        raise ValueError("Use the store's canonical xxx.myshopify.com domain")
    return host


