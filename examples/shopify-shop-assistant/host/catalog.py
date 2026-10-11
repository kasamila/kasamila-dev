"""Read an authorized store's published catalogue; never print server credentials."""
import argparse
import asyncio
import json
import os
import time
from .client import Shopify, PRODUCTS, METADATA, context, complete_product, public_product

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--shop', required=True)
    parser.add_argument('--country', default='US')
    parser.add_argument('--language', default='en')
    args = parser.parse_args()
    token = os.getenv('SHOPIFY_ACCESS_TOKEN')
    if not token: raise SystemExit('Set an authorized SHOPIFY_ACCESS_TOKEN in your server environment')
    store = {'shop': args.shop, 'authorization': {'access_token': token, 'expires_at': time.time()+600}, 'storefront_token': os.getenv('SHOPIFY_STOREFRONT_TOKEN')}
    async def persist(**changes): store.update(changes)
    client = Shopify(store, {}, persist)
    variables = context(args.country, args.language)
    metadata = await client.storefront(METADATA, variables)
    if args.country not in {r['isoCode'] for r in metadata['localization']['availableCountries']}:
        raise SystemExit('Choose a country supported by this store')
    products = await client.connection('products', PRODUCTS, variables, storefront=True)
    for product in products: await complete_product(client, product, variables)
    print(json.dumps({'shop': metadata['shop'], 'localization': metadata['localization'], 'markets': await client.markets(args.country), 'products': [public_product(p) for p in products]}, ensure_ascii=False))

if __name__ == '__main__': asyncio.run(main())
