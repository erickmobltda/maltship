#!/usr/bin/env bash
# Upload data/raw/images/*.webp (scripts/niche/fetch_images.py) to the Cloudflare R2 bucket erickmob-cdn,
# served at https://cdn.erickmob.dev/maltship/<n>.webp. Needs `npx wrangler login` (owner only).
set -euo pipefail
cd "$(dirname "$0")/../.."
list=$(mktemp)
python3 -c 'import json, pathlib; print(json.dumps([{"key": "maltship/" + p.name, "file": str(p)} for p in sorted(pathlib.Path("data/raw/images").glob("*.webp"))]))' > "$list"
npx -y wrangler@4 r2 bulk put erickmob-cdn --remote --filename "$list" \
  --content-type image/webp --cache-control "public, max-age=31536000, immutable"
