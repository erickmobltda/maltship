# Maltship

> Discover, rate and collect whisky. Built from the [collector-app-blueprint](https://github.com/erickmobltda/collector-app-blueprint).

**Live:** <https://maltship.erickmob.dev> · **Core:** shared with [Watcheship](https://github.com/erickmobltda/watcheship) and every other [product](https://github.com/erickmobltda/collector-app-blueprint/blob/main/PRODUCTS.md); version in `CORE_VERSION`

## Features

- **Discover:** the whole catalog (20 sample whiskies for now) with accent-insensitive search and filters by style, distillery, country and region. Filters live in the URL.
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
- **Catalog:** a static `public/catalog.json` built from `data/sample.json` by `npm run catalog`. Ids in `data/ids.json` never change. Search runs in the browser and costs no Firestore reads.
- **Images:** none yet; every item shows the bottle placeholder (`src/niche/Placeholder.tsx`).
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

## Renaming the brand

The internal id `whisky` (Firestore namespace) never changes. The brand name does, and lives in:
1. `src/locales/{en,pt-BR}/niche.json` → `brand.name`, `brand.tagline`, `credits`, `age.refused`;
2. `index.html` → `<title>`, `og:title`, `description` (the title is replaced at runtime);
3. `package.json` → `name`.

For a new subdomain as well:
- `gh repo rename`;
- change the Pages custom domain and the Cloudflare CNAME;
- add the new domain to Firebase Auth's authorized domains;
- update the my_readmes index.

## Required env (repo secrets)

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
npm run typecheck && npm run lint && npm test && npm run i18n:check && npm run build
npm run catalog                  # rebuild public/catalog.json after editing data/sample.json
```

To run against the emulators:
1. Copy `erickmob-api/firebase/firestore.rules` into a temp dir with a `firebase.json` that enables `auth` (9099) and `firestore` (8080).
2. Run `firebase emulators:start --only auth,firestore --project demo-erickmob`.
3. Start the app:

```bash
VITE_USE_EMULATORS=true VITE_FIREBASE_PROJECT_ID=demo-erickmob VITE_FIREBASE_API_KEY=fake \
  VITE_FIREBASE_APP_ID=fake VITE_FIREBASE_AUTH_DOMAIN=localhost npm run dev
```

To seed the demo account, in production or in the emulator (set `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` and `GCLOUD_PROJECT=demo-erickmob` for the latter):

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.secrets/erickmob-migration/firebase-sa.json npm run reset-demo
```
