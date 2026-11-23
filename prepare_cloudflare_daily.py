"""Merge a validated edition into a Cloudflare Pages deployment directory."""
import argparse
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.request import Request, urlopen
from urllib.parse import urlsplit

from publish_daily import validate


def update_feed(site, assets, edition):
    date = validate(edition)
    host = urlsplit(site)
    if host.scheme != "https" or not host.netloc.endswith(".pages.dev") or host.path not in ("", "/") or host.query or host.fragment:
        raise ValueError("Use the production https://<project>.pages.dev origin.")
    target = assets / "data" / "daily.json"
    if not target.is_file() or not (assets / "index.html").is_file():
        raise ValueError("Provide the built Noema directory.")
    request = Request(
        site.rstrip("/") + "/data/daily.json",
        headers={"Accept": "application/json", "Cache-Control": "no-cache"},
    )
    with urlopen(request, timeout=20) as response:
        feed = json.load(response)
    items = feed["items"]
    if not isinstance(items, list) or any(not isinstance(item.get("date"), str) for item in items):
        raise ValueError("Invalid live archive. The local bundle was not modified.")
    for item in items:
        if item["date"] == date:
            if item == edition:
                return False
            raise ValueError("That date is already published. Compare the editions before replacing it.")
    items.append(edition)
    items.sort(key=lambda item: item["date"], reverse=True)
    feed["updated"] = items[0]["date"]
    feed["missing"] = [entry for entry in feed.get("missing", []) if entry["date"] != date]
    with NamedTemporaryFile(mode="w", encoding="utf-8", dir=target.parent, delete=False) as stream:
        temporary = Path(stream.name)
        json.dump(feed, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    temporary.replace(target)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", help="Cloudflare Pages production origin")
    parser.add_argument("assets", type=Path, help="Extracted public deployment bundle")
    parser.add_argument("edition", type=Path, help="Single edition JSON")
    args = parser.parse_args()
    with args.edition.open(encoding="utf-8-sig") as file:
        edition = json.load(file)
    changed = update_feed(args.site, args.assets, edition)
    print("Prepared; deploy the bundle to publish." if changed else "Edition is already live.")
