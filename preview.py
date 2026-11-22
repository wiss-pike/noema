"""Serve the site locally, including the JSON feed normally built by Pages."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent


def daily_feed():
    meta = json.loads((ROOT / "_data/daily_meta.json").read_bytes())
    files = sorted((ROOT / "_data/editions").glob("*.json"), reverse=True)
    editions = [json.loads(path.read_bytes()) for path in files]
    if editions:
        meta["updated"] = editions[0]["date"]
    return {**meta, "items": editions}


class Preview(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path != "/data/daily.json":
            return super().do_GET()
        body = json.dumps(daily_feed(), ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8000), partial(Preview, directory=ROOT))
    print("http://127.0.0.1:8000", flush=True)
    server.serve_forever()
