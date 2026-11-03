# Catalog backfill: where the whiskies come from

The first catalog had 20 hand-made sample whiskies. On 2026-11-03 it was replaced by **2,196 whiskies** built from public datasets. This file explains where each fact comes from, how the data was merged, and how to rebuild it.

## Sources

| Source | What we take | Licence |
|---|---|---|
| [Whisky Advocate reviews](https://www.kaggle.com/datasets/neilcosgrove/scotch-whiskey-reviews-update-2020) (Kaggle, 2,247 Scotch reviews, January 2021 re-run of `koki25ando/22000-scotch-whisky-reviews`) | Name, category, score. ABV and age are read from the name | Labelled CC0 on Kaggle, but it was scraped from Whisky Advocate, so the real licence is unclear. The owner accepted the risk (as with Cigar Aficionado in Smokership). **Only facts are used; the review text is never copied** |
| [Japanese whisky reviews](https://www.kaggle.com/datasets/koki25ando/japanese-whisky-review) (Kaggle) | Bottle name and brand only (the reviews are not used) | Same as above |
| `data/whisky_classified.csv`: *Whisky Classified* by David Wishart (86 distilleries, flavour 0–4) | The flavour profile of the distillery | Academic dataset, no licence stated |
| `data/distilleries.json` | Scotch distilleries by region (Islay, Speyside…) and the names they are bottled under (Longrow → Springbank) | Hand-curated from public facts |
| [Open Food Facts](https://world.openfoodfacts.org) | Bottle photos | CC BY-SA 3.0: each photo's author and licence are shown on the item page |
| `data/sample.json` | The first 20 items (`k1`…`k20`) | Our own |

## How the data was merged

`scripts/niche/build_items.py` does it, with no extra Python packages.

1. **One item per bottle name.** Reviews of the same name (ABV aside) merge into one item that keeps every score. Batches with their own name stay separate.
2. **From the name:**
   - ABV is the trailing `, 43%`;
   - age is `NN year old` (0 means no age statement);
   - the cask comes from words such as sherry, port, wine or rum.
3. **Style** comes from the category: Single Malt, Blended Malt or Blend. For Japanese bottles it is guessed from the name (Yamazaki/Hakushu are single malts, "Pure Malt" is a blended malt).
4. **Distillery and region** come from the first distillery named in the bottle name, including independent bottlings ("Gordon & MacPhail (distilled at Mortlach)…"). Blends get none, because they name regions they only borrow from.
5. **Flavour profile:** the *Whisky Classified* notes scored 3 or 4 for that distillery (e.g. Lagavulin → full body, smoky, medicinal). Only Scotch single malts from the 86 distilleries have one.
6. **Brand:** the independent bottler or blend name when the name starts with one (Compass Box, Johnnie Walker…), else the distillery.
7. **The 20 samples keep their ids.** When a sample is found in the dataset, the dataset's facts win and the sample only fills the gaps. Buffalo Trace, Maker's Mark, Redbreast 12 and Jameson are not in the datasets (they are not Scotch), so they keep their hand-written specs.
8. **Photos:** `scripts/niche/fetch_images.py` matches Open Food Facts products to items by name. Every word of the item's name must be in the product's name or brand, and the product may add at most one word. Three photos that showed the back of the bottle are excluded by hand (`REJECTED`).

## Result

| | Items |
|---|---|
| Whisky Advocate | 2,138 |
| Japanese bottles | 42 |
| Former samples found in the datasets | 16 |
| Former samples kept as they were | 4 |
| **Total** | **2,196** |
| With a Whisky Advocate score | 2,148 |
| With distillery / region | 1,703 / 1,684 |
| With a flavour profile | 1,148 |
| With a photo | 42 (40 photos) |

## Known limits

- Mostly Scotch. Bourbon, Irish and other countries are only the 4 samples.
- The scores are from 2021 or earlier. Prices are not imported: they were US prices from 2018 to 2021.
- The flavour profile is the distillery's typical style, not the bottle's own.
- Few photos: Open Food Facts mostly covers supermarket bottles.

## Rebuild

```bash
bash scripts/niche/fetch_sources.sh                 # downloads to data/raw/ (git-ignored), checks sha256
python3 scripts/niche/build_items.py                # → data/items.json
/tmp/img/bin/python scripts/niche/fetch_images.py   # optional, needs Pillow: photos → data/raw/images/
python3 scripts/niche/build_items.py && npm run catalog
bash scripts/niche/upload_images.sh                 # owner only: photos → R2 bucket erickmob-cdn
python3 -m unittest discover -s scripts/niche       # tests of these scripts
```

Ids in `data/ids.json` never change. Image numbers never point to another photo (the CDN caches them for a year), so never delete `data/image_credits.json` before running `fetch_images.py` again.
