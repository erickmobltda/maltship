# Maltship

> Discover, rate and collect whisky. Built from the [collector-app-blueprint](https://github.com/erickmobltda/collector-app-blueprint).

**Live:** <https://maltship.erickmob.dev> · **Core:** shared with [Watcheship](https://github.com/erickmobltda/watcheship) and every other [product](https://github.com/erickmobltda/collector-app-blueprint/blob/main/PRODUCTS.md); version in `CORE_VERSION`


**New here?** Read [START_HERE.md](START_HERE.md) (português) or [START_HERE.en.md](START_HERE.en.md) (English). AI agents: [CLAUDE.md](CLAUDE.md).

## Features

- **Discover:** the whole catalog (about 2,200 whiskies) with accent-insensitive search and filters by style, flavour profile, Whisky Advocate score, distillery, country and region. Filters live in the URL.
- **Item page:** specs, community average, everyone's ratings.
  - **Own it** goes on your *Shelf*, with quantity and sealed/open.
  - **Wish it** goes on your wishlist.
- **Ratings:** half stars, up to 6 tasting notes, comments and a "tasted on" date. Ratings are public and can be liked.
- **Social:**
  - public profiles at `/u/<handle>`, with follow, followers and following;
  - feeds: *Following* and *Everyone*;
  - find people by name or `@handle`.
- **Privacy:** your shelf and your wishlist are hidden from others until you turn them on in *Shelf* or *Settings*. Each owned or wished item also stores `visible`, so hiding single items can be added later without migrating data.
- **Languages:** English and Português. You choose; signed-in users keep the choice.
- **Access:** an 18+ age gate. Accounts are invite-only, plus a "Try the demo" account. The demo has no social features and its data is reset with `npm run reset-demo`.

## Stack

- **Front:** React 18, Vite 5, TypeScript (strict), Tailwind, TanStack Query, i18next (`core` + `niche` namespaces).
- **Auth + DB:** Firebase Auth and Firestore in the shared `erickmob-apps` project, under `apps/whisky/`. The rules live in [erickmob-api/firebase](https://github.com/erickmobltda/erickmob-api/tree/main/firebase) (`tests/collector.cases.js`).
- **Catalog:** a static `public/catalog.json` built by `npm run catalog` from `data/items.json`. **Where the data comes from and how it was merged: [data/BACKFILL.md](data/BACKFILL.md).** `scripts/niche/build_items.py` makes it from:
  - the Whisky Advocate reviews on Kaggle (`neilcosgrove/scotch-whiskey-reviews-update-2020`): name, category and score only, never the review text;
  - Japanese bottle names (Kaggle `koki25ando/japanese-whisky-review`);
  - `data/whisky_classified.csv` (flavour of 86 distilleries, *Whisky Classified* by David Wishart) and `data/distilleries.json` (Scotch distilleries by region, hand-curated);
  - `data/sample.json`, the first 20 items, kept so `k1`…`k20` never change.

  Ids in `data/ids.json` never change. Search runs in the browser and costs no Firestore reads. The scraped sources' licence is unclear; only facts (names, scores, specs) are used.
- **Images:** bottle photos from Open Food Facts (CC BY-SA 3.0), found by `scripts/niche/fetch_images.py` for the few bottles it has. Each photo's author and licence are shown on the item page (`data/image_credits.json`). Photos are served from the Cloudflare R2 bucket `erickmob-cdn` at `https://cdn.erickmob.dev/maltship/{n}.webp`. The others show the bottle placeholder (`src/niche/Placeholder.tsx`).
- **Hosting:** GitHub Pages via `.github/workflows/pages.yml` (`actions/deploy-pages`).

### Firestore paths (`apps/whisky/…`)

| Path | What |
|---|---|
| `users/{uid}/settings/main` | language (private) |
| `users/{uid}/ratings/{itemId}` | the demo account's ratings (private) |
| `profiles/{uid}`, `handles/{handle}` | public profile and its unique handle |
| `collections/{uid}/owned/{itemId}` | shelf: `quantity`, `visible`, `extra.status` |
| `collections/{uid}/wishlist/{itemId}` | wishlist: `visible` |
| `ratings/{uid}_{itemId}` (+ `likes/{uid}`) | shared ratings and likes (`likeCount`) |
| `follows/{follower}_{followee}` | follows (counts come from `count()` queries) |

## Core vs niche

The app splits into the shared core and a niche layer:
- **Niche** (edit here, with a normal PR): `src/niche/` (`niche.json`, `Logo`, `Placeholder`, `theme.css`), `src/locales/*/niche.json`, `data/`, `public/`, `scripts/demo-seed.json`, `index.html`, this README and the CHANGELOG.
- **Core** (everything else): it lives in [collector-app-blueprint/core](https://github.com/erickmobltda/collector-app-blueprint/tree/main/core) and arrives here as a `Core v<N>` PR. Don't edit core files in this repo: CI runs `scripts/check-core.mjs` and fails. To change the core, follow the blueprint's [docs/10](https://github.com/erickmobltda/collector-app-blueprint/blob/main/docs/10-core-sync.md).

## Renaming the brand (owner only)

The internal id `whisky` (Firestore namespace) never changes. The brand name does, and lives in:
1. `src/locales/{en,pt-BR}/niche.json` → `brand.name`, `brand.tagline`, `credits`, `age.refused`;
2. `index.html` → `<title>`, `og:title`, `description` (the title is replaced at runtime);
3. `package.json` → `name`.

For a new subdomain as well:
- `gh repo rename`;
- change the Pages custom domain and the Cloudflare CNAME;
- add the new domain to Firebase Auth's authorized domains;
- update the my_readmes index.

## Required env (repo secrets, owner only)

Collaborators get the same four values from Erick as a `.env.local` file; they are not committed.


| Variable | Source |
|---|---|
| `VITE_FIREBASE_API_KEY` | `firebase apps:sdkconfig WEB <appId> --project erickmob-apps` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `erickmob-apps.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `erickmob-apps` |
| `VITE_FIREBASE_APP_ID` | the web app `maltship` |

## Develop

```bash
npm install
npm run dev                      # against production Firebase (needs .env.local, see .env.example)
npm run typecheck && npm run lint && npm test && npm run i18n:check && node scripts/check-core.mjs && npm run build
npm run catalog                  # rebuild public/catalog.json from data/items.json
python3 -m unittest discover -s scripts/niche   # tests of the catalog scripts
```

Rebuild the catalog from its sources:

```bash
bash scripts/niche/fetch_sources.sh      # downloads to data/raw/ (git-ignored), checks sha256
python3 scripts/niche/build_items.py     # → data/items.json
/tmp/img/bin/python scripts/niche/fetch_images.py   # optional, needs Pillow: photos → data/raw/images/
python3 scripts/niche/build_items.py && npm run catalog
bash scripts/niche/upload_images.sh      # owner only: photos → R2 bucket erickmob-cdn (cdn.erickmob.dev)
```

The emulators need the rules file from the private erickmob-api repo, so this part is **owner only**. To run against the emulators:
1. Copy `erickmob-api/firebase/firestore.rules` into a temp dir with a `firebase.json` that enables `auth` (9099) and `firestore` (8080).
2. Run `firebase emulators:start --only auth,firestore --project demo-erickmob`.
3. Start the app:

```bash
VITE_USE_EMULATORS=true VITE_FIREBASE_PROJECT_ID=demo-erickmob VITE_FIREBASE_API_KEY=fake \
  VITE_FIREBASE_APP_ID=fake VITE_FIREBASE_AUTH_DOMAIN=localhost npm run dev
```

**Owner only:** to seed the demo account, in production or in the emulator (set `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` and `GCLOUD_PROJECT=demo-erickmob` for the latter):

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.secrets/erickmob-migration/firebase-sa.json npm run reset-demo
```
