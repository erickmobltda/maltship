#!/usr/bin/env bash
# Download the raw catalog sources into data/raw/ (git-ignored) and check their checksums.
#   bash scripts/niche/fetch_sources.sh && python3 scripts/niche/build_items.py && npm run catalog
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p data/raw

fetch() { # kaggle-dataset file sha256
  local dir="data/raw/${1//\//_}"
  if [ ! -f "$dir/$2" ]; then
    mkdir -p "$dir"
    curl -fsSL -o "$dir/d.zip" "https://www.kaggle.com/api/v1/datasets/download/$1"
    unzip -oq "$dir/d.zip" -d "$dir" && rm "$dir/d.zip"
  fi
  echo "$3  $dir/$2" | shasum -a 256 -c -
}

# Whisky Advocate reviews (scraper re-run of Jan 2021); only name, category and score are used.
fetch neilcosgrove/scotch-whiskey-reviews-update-2020 scotch_review2020.csv 9fe15ccff7fbfc4287dde3dcfeb9865052dc1dac0e154a4dff2514c0fa9a28cf
# Japanese bottle names (the reviews themselves are not used).
fetch koki25ando/japanese-whisky-review japanese_whisky_review.csv 116af1f36a7655e3e696ffc0ef79cd85418c12a916167fefc7bf1a75b935f2e0
