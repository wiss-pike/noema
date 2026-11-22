"""Validate and publish a Noema daily edition using the signed-in GitHub CLI."""
import argparse
import base64
import json
import re
import subprocess
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

REPO = "wiss-pike/noema"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def validate(day):
    require(isinstance(day, dict), "日报须为 JSON 对象")
    stamp = day.get("date", "")
    require(isinstance(stamp, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", stamp),
            "date 须为 YYYY-MM-DD")
    date.fromisoformat(stamp)
    for key in ("lead", "window", "note"):
        require(key not in day or isinstance(day[key], str), key + " 须为文本")
    entries = day.get("entries")
    require(isinstance(entries, list) and entries, "entries 须至少包含一条新闻")
    for number, entry in enumerate(entries, 1):
        label = f"第 {number} 条"
        require(isinstance(entry, dict) and nonempty(entry.get("title")), label + "缺标题")
        require(nonempty(entry.get("category")), label + "缺分类")
        points = entry.get("points")
        require(isinstance(points, list) and points and all(map(nonempty, points)), label + "缺事实要点")
        sources = entry.get("sources")
        require(isinstance(sources, list) and sources, label + "缺来源")
        has_link = False
        for source in sources:
            require(isinstance(source, dict) and nonempty(source.get("label")), label + "缺来源名称")
            if not source.get("url"):
                continue
            require(isinstance(source["url"], str), label + "的链接须为文本")
            url = urlsplit(source["url"])
            require(url.scheme == "https" and url.hostname, label + "的来源须有 HTTPS 链接")
            has_link = True
        require(has_link, label + "至少需要一个可查证的 HTTPS 来源")
    return stamp


def publish(day):
    stamp = validate(day)
    endpoint = f"repos/{REPO}/contents/_data/editions/{stamp}.json"
    existing = subprocess.run(["gh", "api", endpoint + "?ref=main"], capture_output=True)
    body = (json.dumps(day, indent=2, ensure_ascii=False) + "\n").encode()
    payload = {"message": f"Publish Noema daily edition {stamp}", "branch": "main",
               "content": base64.b64encode(body).decode()}
    if existing.returncode == 0:
        old = json.loads(existing.stdout)
        if json.loads(base64.b64decode(old["content"])) == day:
            print("该期内容已提交")
            return
        payload["sha"] = old["sha"]
    elif b"HTTP 404" not in existing.stderr:
        raise SystemExit(existing.stderr.decode(errors="replace"))
    subprocess.run(["gh", "api", "--method", "PUT", endpoint, "--input", "-", "--silent"],
                   input=json.dumps(payload).encode(), check=True)
    print(f"已提交，发布地址 https://wiss-pike.github.io/noema/daily.html?d={stamp}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("edition", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        edition = json.loads(args.edition.read_bytes())
        if args.check:
            print(validate(edition))
        else:
            publish(edition)
    except (OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")
