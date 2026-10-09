"""Authorize the channel owner in a local browser, saving a private token file."""
import asyncio
import json
import os
import secrets
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from dotenv import load_dotenv
from host.platforms import authorization_url, exchange

load_dotenv()
platform = os.environ["LIVE_PLATFORM"]
callback = os.getenv("OAUTH_CALLBACK", "http://127.0.0.1:8765/oauth/callback")
url = urlsplit(callback)
if url.scheme != "http" or url.hostname != "127.0.0.1" or url.path != "/oauth/callback":
    raise SystemExit("This local example requires a 127.0.0.1 HTTP OAuth callback")
state = secrets.token_urlsafe(32)
result = {}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # OAuth codes must not enter access logs.

    def do_GET(self):
        query = parse_qs(urlsplit(self.path).query)
        valid = urlsplit(self.path).path == url.path and secrets.compare_digest(query.get("state", [""])[0], state)
        if valid and query.get("code"):
            result["code"] = query["code"][0]
        self.send_response(200 if result else 400)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(b"Authorization received. Return to the terminal." if result else b"Authorization rejected.")


server = HTTPServer(("127.0.0.1", url.port or 8765), Handler)
server.timeout = 300
config = {"client_id": os.environ["OAUTH_CLIENT_ID"], "client_secret": os.environ["OAUTH_CLIENT_SECRET"]}
webbrowser.open(authorization_url(platform, config["client_id"], callback, state))
server.handle_request()
server.server_close()
if not result:
    raise SystemExit("Authorization was not completed")
token = asyncio.run(exchange(platform, config, result["code"], callback))
target = Path(os.getenv("PLATFORM_TOKEN_FILE", "platform-token.json"))
target.write_text(json.dumps(token), encoding="utf-8")
target.chmod(0o600)
print("Channel authorized; token saved privately. No token is printed.")
