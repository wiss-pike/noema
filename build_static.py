"""Build the public static site without Jekyll or a Git checkout."""
import argparse
import json
from pathlib import Path
from shutil import copy2, copytree

from preview import ROOT, daily_feed


def build(output):
    output.mkdir(parents=True, exist_ok=False)
    for name in ("index.html", "month.html", "daily.html", "weekly.html"):
        copy2(ROOT / name, output / name)
    copytree(ROOT / "assets", output / "assets")
    data = output / "data"
    data.mkdir()
    for name in ("papers.json", "weekly.json"):
        copy2(ROOT / "data" / name, data / name)
    (data / "daily.json").write_text(
        json.dumps(daily_feed(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="新建的静态站点目录")
    build(parser.parse_args().output)
