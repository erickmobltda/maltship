"""Find licensed bottle photos on Open Food Facts and prepare them for the image CDN.

Open Food Facts photos are CC BY-SA 3.0: each one is credited on the item page
(data/image_credits.json → catalog column imageCredit). A product matches an
item when every word of the item's name is in the product's name or brand, and
the product's name adds at most one other word.

Writes:
  data/raw/images/<n>.webp     the photos to upload (git-ignored)
  data/images.json             item key → image number (read by build_items.py)
  data/image_credits.json      image number → {author, license, url}
  data/image_backgrounds.json  image number → edge colour, or null
Image numbers never change once given: the CDN caches them forever.

Needs Pillow:
  python3 -m venv /tmp/img && /tmp/img/bin/pip install pillow
  /tmp/img/bin/python scripts/niche/fetch_images.py
  python3 scripts/niche/build_items.py && npm run catalog
Then upload data/raw/images/ to the R2 bucket erickmob-cdn under <app>/ (see README).
"""

import io
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent
OFF = ROOT / "data/raw/openfoodfacts.json"
OUT = ROOT / "data/raw/images"
IMAGES = ROOT / "data/images.json"
CREDITS = ROOT / "data/image_credits.json"
BACKGROUNDS = ROOT / "data/image_backgrounds.json"
AGENT = "Maltship-catalog/1.0 (https://maltship.erickmob.dev)"
SEARCH = "https://search.openfoodfacts.org/search?q=categories_tags:%22en:whisky%22&page_size=100&page={}&fields=code,product_name,brands,images"
MAX_WIDTH = 600
REJECTED = {  # products whose front photo is not the front (checked by eye)
    "5010494296280": "back of the box",
    "5014218776256": "back label",
    "5010504100309": "back label",
}
STOP = {
    "the", "year", "years", "old", "yo", "yrs", "ans", "an", "jahre", "whisky", "whiskey", "scotch", "single",
    "malt", "de", "cl", "ml", "y", "o", "s", "blended", "aged", "d", "age", "edition", "original", "distillery",
    "kentucky", "straight", "bourbon",
}


def get(url: str) -> bytes:
    for attempt in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": AGENT}), timeout=60).read()
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2)


def text(value) -> str:
    return " ".join(value) if isinstance(value, list) else (value or "")


def words(value: str) -> set[str]:
    value = unicodedata.normalize("NFD", value.lower().replace("’", "'"))
    value = "".join(c for c in value if not unicodedata.combining(c))
    value = re.sub(r"\d+(\.\d+)?\s*(º|°|%|cl|ml|l\b)", "", value)  # strength and size are not part of the name
    return set(re.findall(r"[a-z]+|\d+", value)) - STOP


def products() -> list[dict]:
    if not OFF.exists():
        hits, page = [], 1
        while True:
            batch = json.loads(get(SEARCH.format(page))).get("hits", [])
            hits += batch
            if len(batch) < 100:
                break
            page += 1
        OFF.write_text(json.dumps(hits))
    return json.loads(OFF.read_text())


def front(product: dict) -> tuple[str, str] | None:
    """(400 px front photo url, its uploader), or None."""
    images = product.get("images") or {}
    key = next((k for k in sorted(images) if k.startswith("front_")), None)
    if not key or not images[key].get("rev"):
        return None
    code = product["code"]
    path = "/".join([code[0:3], code[3:6], code[6:9], code[9:]]) if len(code) > 8 else code
    uploader = (images.get(str(images[key].get("imgid"))) or {}).get("uploader") or "Open Food Facts contributors"
    return f"https://images.openfoodfacts.org/images/products/{path}/{key}.{images[key]['rev']}.400.jpg", uploader


def match(items: list[dict], candidates: list[dict]) -> dict[str, dict]:
    indexed = [(words(text(p.get("product_name"))), words(text(p.get("brands"))), p) for p in candidates]
    found = {}
    for item in items:
        name = words(item["name"])
        if len(name) < 2:
            continue
        fits = [(len(pn - name), p) for pn, pb, p in indexed if name <= pn | pb and len(pn - name) <= 1]
        if fits:
            found[item["key"]] = min(fits, key=lambda f: f[0])[1]
    return found


def bucket(p):
    return (p[0] // 16, p[1] // 16, p[2] // 16)


def background(img: Image.Image) -> str | None:
    """Same rule as the Smokership script: the edge colour that covers at least half of the edge."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    edge = [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)] + [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)]
    if any(p[3] < 250 for p in edge):
        return None
    top, n = Counter(bucket(p) for p in edge).most_common(1)[0]
    if n / len(edge) < 0.5:
        return None
    r, g, b, _ = Counter(p for p in edge if bucket(p) == top).most_common(1)[0][0]
    return f"#{r:02x}{g:02x}{b:02x}"


def main():
    items = json.loads((ROOT / "data/items.json").read_text())
    candidates = [p for p in products() if text(p.get("product_name")) and front(p) and p["code"] not in REJECTED]
    found = match(items, candidates)
    credits = json.loads(CREDITS.read_text()) if CREDITS.exists() else {}
    backgrounds = json.loads(BACKGROUNDS.read_text()) if BACKGROUNDS.exists() else {}
    number_of = {c["url"]: int(n) for n, c in credits.items()}
    next_n = max(map(int, credits), default=0) + 1
    images = {}
    OUT.mkdir(parents=True, exist_ok=True)
    for key, product in sorted(found.items()):
        page = f"https://world.openfoodfacts.org/product/{product['code']}"
        if page not in number_of:
            number_of[page], next_n = next_n, next_n + 1
        n = number_of[page]
        images[key] = n
        out = OUT / f"{n}.webp"
        if not out.exists():
            url, uploader = front(product)
            img = Image.open(io.BytesIO(get(url))).convert("RGB")
            if img.width > MAX_WIDTH:
                img = img.resize((MAX_WIDTH, round(img.height * MAX_WIDTH / img.width)), Image.LANCZOS)
            img.save(out, "WEBP", quality=80, method=6)
            credits[str(n)] = {"author": f"{uploader} (Open Food Facts)", "license": "CC BY-SA 3.0", "url": page}
            backgrounds[str(n)] = background(img)
    IMAGES.write_text(json.dumps(dict(sorted(images.items())), indent=2) + "\n")
    CREDITS.write_text(json.dumps(dict(sorted(credits.items(), key=lambda kv: int(kv[0]))), indent=2, ensure_ascii=False) + "\n")
    BACKGROUNDS.write_text(json.dumps(dict(sorted(backgrounds.items(), key=lambda kv: int(kv[0]))), indent=0) + "\n")
    print(f"products with a photo {len(candidates)} · items with a photo {len(images)} · images {len(set(images.values()))}")


if __name__ == "__main__":
    main()
