"""Build data/items.json (the catalog source) from the downloaded datasets.

Then `npm run catalog` (the shared scripts/build_catalog.py) turns it into
public/catalog.json.

Sources (bash scripts/niche/fetch_sources.sh downloads the raw ones to data/raw/):
  Whisky Advocate reviews  2,247 Scotch reviews (Kaggle, neilcosgrove re-run of 2021).
                           Only the name, category and score are used: the review
                           text is the magazine's writing and is never copied.
  Japanese bottle names    Kaggle koki25ando/japanese-whisky-review (names only).
  data/whisky_classified.csv  flavour of 86 distilleries, 0 to 4 (Whisky Classified, D. Wishart).
  data/distilleries.json   Scotch distilleries by region, hand-curated.
  data/sample.json         the first 20 items (k1..k20): kept, so no rating or collection loses its item.
  data/images.json         licensed photos (scripts/niche/fetch_images.py), if present.

Reviews of the same bottle (same name, ABV aside) are merged: it keeps every score.

Usage: bash scripts/niche/fetch_sources.sh && python3 scripts/niche/build_items.py && npm run catalog
(fetch_images.py reads data/items.json: after it, run build_items.py and npm run catalog again.)
"""

import csv
import json
import re
import unicodedata
from collections import Counter, OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
RAW = ROOT / "data/raw"
ADVOCATE = RAW / "neilcosgrove_scotch-whiskey-reviews-update-2020/scotch_review2020.csv"
JAPANESE = RAW / "koki25ando_japanese-whisky-review/japanese_whisky_review.csv"

ABV = re.compile(r"[,(]?\s*(\d{2}(?:\.\d+)?)\s*%\)?\s*$")
AGE = re.compile(r"\b(\d{1,2})[\s-]*years?[\s-]*old\b", re.I)
STYLES = {
    "Single Malt Scotch": "single_malt",
    "Blended Malt Scotch Whisky": "blended_malt",
    "Blended Scotch Whisky": "blend",
}
# Word in the name → cask, in display order.
CASKS = [
    (r"sherry|oloroso|pedro xim[eé]nez|\bPX\b|fino|amontillado|manzanilla|palo cortado", "Sherry"),
    (r"\bport\b(?! (ellen|charlotte|askaig))|\bruby\b|\btawny\b", "Port"),
    (r"madeira", "Madeira"),
    (r"sauternes|tokaji|\bwine\b|barolo|bordeaux|burgundy|marsala|\bclaret\b|chardonnay", "Wine"),
    (r"\brum\b", "Rum"),
    (r"cognac|armagnac", "Brandy"),
    (r"mizunara", "Mizunara"),
    (r"virgin oak|new oak", "Virgin oak"),
    (r"bourbon", "Bourbon"),
]
# Bottlers and blend brands: when a name starts with one, it is the brand.
BRANDS = [
    "Gordon & MacPhail", "Duncan Taylor", "Compass Box", "Wemyss", "Douglas Laing", "Exclusive Malts",
    "Signatory", "Murray McDavid", "That Boutique-y Whisky Company", "Cadenhead", "Adelphi", "Hunter Laing",
    "Berry Bros", "Blackadder", "Mackillop's", "Master of Malt", "Scott's Selection", "Chieftain's",
    "Old Malt Cask", "Big Peat", "Elements of Islay", "Johnnie Walker", "Chivas Regal", "Chivas", "Dewar's",
    "Ballantine's", "Cutty Sark", "Famous Grouse", "Grant's", "Buchanan's", "Monkey Shoulder", "Black Bottle",
    "Shackleton", "Usquaebach", "Haig", "Royal Salute", "Old Parr", "Whyte & Mackay", "Teacher's", "J&B",
    "Clan Campbell", "Antiquary", "Sheep Dip", "Timorous Beastie", "Scallywag", "Rock Oyster",
]
FLAVOURS = {  # Whisky Classified column → flavour value
    "Body": "full_body", "Sweetness": "sweet", "Smoky": "smoky", "Medicinal": "medicinal",
    "Tobacco": "tobacco", "Honey": "honey", "Spicy": "spicy", "Winey": "winey", "Nutty": "nutty",
    "Malty": "malty", "Fruity": "fruity", "Floral": "floral",
}
CLASSIFIED_NAMES = {  # spelling in Whisky Classified → our distillery name
    "ArranIsleOf": "Arran", "Belvenie": "Balvenie", "Laphroig": "Laphroaig", "Craigallechie": "Craigellachie",
    "Craigganmore": "Cragganmore", "Knochando": "Knockando", "OldFettercairn": "Fettercairn",
    "OldPulteney": "Pulteney", "GlenDeveronMacduff": "Glen Deveron", "AnCnoc": "Knockdhu",
    "Isle of Jura": "Jura",
}
# Whisky Advocate name (normalized) → sample key, so k1..k20 keep their ids.
SAMPLE_MATCH = {
    "lagavulin 16 year old": "lagavulin-16",
    "laphroaig 10 year old": "laphroaig-10",
    "macallan 12 year old double cask": "macallan-12-double-cask",
    "glenfiddich 12 year old": "glenfiddich-12",
    "talisker 10 year old": "talisker-10",
    "ardbeg 10 year old": "ardbeg-10",
    "glenlivet 12 year old": "glenlivet-12",
    "oban 14 year old": "oban-14",
    "highland park 12 year old": "highland-park-12",
    "johnnie walker black label 12 year old": "johnnie-walker-black",
    "dalmore 12 year old": "dalmore-12",
    "balvenie doublewood 12 year old": "balvenie-12-doublewood",
    "springbank 10 year old": "springbank-10",
    "bunnahabhain 12 year old": "bunnahabhain-12",
    "yamazaki 12 year old": "yamazaki-12",
    "hibiki japanese harmony": "hibiki-harmony",
}
JAPANESE_SKIP = re.compile(r"\bgin\b|gift pack|litre|\b\d+cl\b", re.I)


def compact(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", fold(text))


def fold(text: str) -> str:
    text = unicodedata.normalize("NFD", text.replace("’", "'"))
    return "".join(c for c in text if not unicodedata.combining(c)).lower()


def split_abv(name: str) -> tuple[str, float | None]:
    name = name.strip().rstrip(",").strip()
    m = ABV.search(name)
    if not m:
        return name.strip(), None
    return name[: m.start()].strip(" ,-"), float(m.group(1))


def normalized(name: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"^the\s+", "", fold(name))).strip()


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", fold(text)).strip("-")


def most_common(values):
    values = [v for v in values if v not in (None, "")]
    return Counter(values).most_common(1)[0][0] if values else None


def load_distilleries() -> list[tuple[str, str, str]]:
    """(compact alias, distillery, region), longest alias first."""
    data = json.loads((ROOT / "data/distilleries.json").read_text())
    out = []
    for region, entries in data.items():
        if region.startswith("_"):
            continue
        for entry in entries:
            names = [entry] if isinstance(entry, str) else entry
            out += [(compact(n), names[0], region) for n in names]
    return sorted(out, key=lambda t: -len(t[0]))


def load_flavours() -> dict[str, list[str]]:
    flavours = {}
    with open(ROOT / "data/whisky_classified.csv", newline="") as f:
        for row in csv.DictReader(f):
            name = CLASSIFIED_NAMES.get(row["Distillery"], row["Distillery"])
            flavours[compact(name)] = [v for col, v in FLAVOURS.items() if int(row[col]) >= 3]
    return flavours


def find_distillery(name: str, distilleries) -> tuple[str, str]:
    """The distillery named earliest in the bottle name (longest alias on a tie)."""
    text = compact(name)
    found = [(text.find(alias), -len(alias), d, r) for alias, d, r in distilleries if alias in text]
    if not found:
        return "", ""
    _, _, distillery, region = min(found)
    return distillery, region


def find_brand(name: str) -> str:
    text = compact(re.sub(r"^the\s+", "", name, flags=re.I))
    return next((b for b in BRANDS if text.startswith(compact(b))), "")


def find_cask(name: str) -> str:
    return ", ".join(label for pattern, label in CASKS if re.search(pattern, name, re.I))


def age_of(name: str) -> int:
    m = AGE.search(name)
    return int(m.group(1)) if m else 0


def advocate(distilleries, flavours) -> "OrderedDict[str, dict]":
    items: "OrderedDict[str, dict]" = OrderedDict()
    with open(ADVOCATE, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name, abv = split_abv(row["name"])
            key = normalized(name)
            item = items.get(slug(key))
            if item is None:
                distillery, region = find_distillery(name, distilleries)
                style = STYLES.get(row["category"], "other")
                if style != "single_malt":  # blends name regions and distilleries they only borrow from
                    distillery, region = "", ""
                item = items[slug(key)] = {
                    "key": SAMPLE_MATCH.get(key, slug(key)),
                    "name": name,
                    "distillery": distillery,
                    "brand": find_brand(name) or distillery,
                    "country": "Scotland",
                    "region": region,
                    "style": style,
                    "flavour": flavours.get(compact(distillery), []),
                    "age": age_of(name),
                    "abvs": [],
                    "cask": find_cask(name),
                    "scores": [],
                }
            item["abvs"].append(abv)
            if row["review.point"].isdigit():
                item["scores"].append(int(row["review.point"]))
    return items


def japanese_style(name: str) -> str:
    if re.search(r"coffey grain", name, re.I):
        return "other"
    if re.search(r"pure malt|all malt|taketsuru|coffey malt", name, re.I):
        return "blended_malt"
    if re.search(r"yamazaki|hakushu", name, re.I):
        return "single_malt"
    return "blend"


def japanese() -> "OrderedDict[str, dict]":
    items: "OrderedDict[str, dict]" = OrderedDict()
    with open(JAPANESE, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if JAPANESE_SKIP.search(row["Bottle_name"]):
                continue
            name, abv = split_abv(row["Bottle_name"].strip())
            key = normalized(name)
            if slug(key) in items:
                continue
            style = japanese_style(name)
            distillery = row["Brand"] if style == "single_malt" else ""
            items[slug(key)] = {
                "key": SAMPLE_MATCH.get(key, slug(key)),
                "name": name,
                "distillery": distillery,
                "brand": row["Brand"],
                "country": "Japan",
                "region": "",
                "style": style,
                "flavour": [],
                "age": age_of(name),
                "abvs": [abv],
                "cask": find_cask(name),
                "scores": [],
            }
    return items


def build() -> list[dict]:
    distilleries, flavours = load_distilleries(), load_flavours()
    sample = {s["key"]: s for s in json.loads((ROOT / "data/sample.json").read_text())}
    out = []
    for item in [*advocate(distilleries, flavours).values(), *japanese().values()]:
        item["abv"] = most_common(item.pop("abvs"))
        manual = sample.pop(item["key"], None)
        if manual:  # the sample's hand-entered facts fill what the dataset lacks
            for field, value in manual.items():
                if item.get(field) in (None, "", 0, []):
                    item[field] = value
        out.append(item)
    out += [{**s, "flavour": [], "scores": []} for s in sample.values()]
    return out


def main():
    items = build()
    # Photos found by scripts/niche/fetch_images.py: item key → image number.
    images = json.loads((ROOT / "data/images.json").read_text()) if (ROOT / "data/images.json").exists() else {}
    for item in items:
        item["image"] = images.get(item["key"])
    (ROOT / "data/items.json").write_text(
        "[\n" + ",\n".join(json.dumps(i, ensure_ascii=False) for i in items) + "\n]\n"
    )
    print(f"items {len(items)} · with distillery {sum(1 for i in items if i['distillery'])} · "
          f"with region {sum(1 for i in items if i['region'])} · with flavour {sum(1 for i in items if i['flavour'])} · "
          f"with scores {sum(1 for i in items if i['scores'])}")


if __name__ == "__main__":
    main()
