#!/usr/bin/env python3
"""Build public/catalog.json from data/sample.json.

Columns follow the attribute order in src/niche/niche.json, plus id, name,
scores and image. Ids are stable: data/ids.json maps each item's natural key
to its id, and new items get the next number.

    python3 scripts/build_catalog.py
"""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NICHE = json.loads((ROOT / "src/niche/niche.json").read_text())
SOURCE = ROOT / "data/sample.json"
IDS = ROOT / "data/ids.json"
OUT = ROOT / "public/catalog.json"
PREFIX = NICHE["idPrefix"]


def normalize(attr, value):
    if value is None or value == "":
        return [] if attr["type"] == "list" else ("" if attr["type"] in ("text", "enum") else None)
    if attr["type"] == "number":
        return value if isinstance(value, (int, float)) else None
    if attr["type"] == "list":
        return [str(v).strip() for v in value if str(v).strip()]
    value = str(value).strip()
    if attr["type"] == "enum" and value not in attr["enumValues"]:
        return ""
    return value


def main():
    rows_in = json.loads(SOURCE.read_text())
    ids = json.loads(IDS.read_text()) if IDS.exists() else {}
    next_n = max((int(re.sub(r"\D", "", v)) for v in ids.values()), default=0) + 1
    attrs = NICHE["attributes"]
    keys = ["id", "name"] + [a["key"] for a in attrs] + ["scores", "image"]
    dropped = Counter()
    rows = []
    for item in rows_in:
        key, name = item.get("key"), str(item.get("name", "")).strip()
        if not key or not name:
            dropped["missing key or name"] += 1
            continue
        if key not in ids:
            ids[key] = f"{PREFIX}{next_n}"
            next_n += 1
        rows.append([ids[key], name] + [normalize(a, item.get(a["key"])) for a in attrs]
                    + [item.get("scores", []), item.get("image")])
    rows.sort(key=lambda r: int(re.sub(r"\D", "", r[0])))
    OUT.write_text(json.dumps({"keys": keys, "rows": rows}, ensure_ascii=False, separators=(",", ":")) + "\n")
    IDS.write_text(json.dumps(dict(sorted(ids.items(), key=lambda kv: int(re.sub(r"\D", "", kv[1])))), indent=2) + "\n")
    print(f"read {len(rows_in)} · wrote {len(rows)} · with images {sum(1 for r in rows if r[-1])}")
    for reason, n in dropped.items():
        print(f"dropped {n}: {reason}")


if __name__ == "__main__":
    main()
