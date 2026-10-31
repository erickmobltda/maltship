# CLAUDE.md — working on a collector app

This repo is one **product** of the collector-app family: Smokership (cigars), Maltship (whisky), Watcheship (watches), and any future one. All products share one **core**, maintained in [collector-app-blueprint](https://github.com/erickmobltda/collector-app-blueprint), and differ only in their **niche layer**. This file is part of the core and is identical in every product. App-specific facts (brand, catalog, Firestore namespace, live URL) are in this repo's `README.md` and `src/niche/niche.json`.

Collaborators may be new to software. Explain what you're doing in plain words, prefer small steps, and say clearly when something needs Erick, the owner. People-facing guides: `START_HERE.md` (PT-BR) and `START_HERE.en.md`.

## Read first

1. `README.md` (this app) and `src/niche/niche.json` (its attributes, tags, owned-list options).
2. `.core-manifest.json` → `nichePaths`: the files you may edit **in this repo**.
3. For anything bigger than a small fix, the blueprint docs: `docs/01-product.md` (features), `docs/02-architecture.md` (layout, `NicheConfig`), `docs/03-domain-model.md` (Firestore), `docs/10-core-sync.md` (how core changes travel).

## Core or niche? Decide before editing

| You want to… | Where | How |
|---|---|---|
| Change this app's catalog, labels, texts, colours, logo, age gate, tags, attributes | **niche** files in this repo: `src/niche/**`, `src/locales/*/niche.json`, `data/**`, `public/**`, `scripts/niche/**`, `scripts/demo-seed.json`, `index.html`, `README.md`, `CHANGELOG.md` | Normal branch + PR here |
| Change how *every* app works: a screen, a hook, a component, shared text in `src/locales/*/core.json`, scripts, config, CI | **core**, in the blueprint | See below. **Never edit a core file here**: CI (`scripts/check-core.mjs`) fails |
| Store new data in Firestore (a new field or collection) | rules in **erickmob-api** (private, owner only) + core | Don't guess: write the exact data shape and why in the PR, and ask Erick to change the rules first |

### A feature for every product (the usual case)

All repos sit side by side, e.g. `collector/collector-app-blueprint`, `collector/maltship`, `collector/smokership`, `collector/watcheship`. Run blueprint commands from the blueprint folder; it needs no `npm install` (only Node, git and gh).

**Before you start**
1. In the blueprint: `git switch main && git pull`, then `node tools/core-sync.mjs status`.
   - If a product shows an open `Core v<N>` PR, it isn't on the latest core yet. If its CI is green, merge it; otherwise fix it first. Never start a core change from a product that's behind.
2. Pick the **base app**, where you build the feature: `git switch main && git pull` there. Its `CORE_VERSION` must equal the blueprint's `core/CORE_VERSION`.
3. Does the feature need **new data in Firestore** (a new field, list or collection)? Then the rules in erickmob-api must change first. That's Erick's part: stop and write him the exact data shape and why.

**Build it**

4. In the base app, create a branch, build the feature and test it (`npm run dev`, both languages, 390 px). `check-core` will fail here; that's expected. **`git add` every new file** (no commit needed): `pull` only copies files git knows about.
5. Keep the core niche-neutral. No niche words (cigar, whisky, watch…) in core code; read niche-specific things from `niche` (`src/niche/config.ts`).
   - Shared text goes in `src/locales/*/core.json`.
   - If the feature needs a **per-app setting or label** (a new field in `niche.json` or a key in `locales/*/niche.json`):
     - make the core work without it: a safe default, or the feature hidden when it's missing;
     - open one small **niche PR in each product** that adds its value;
     - merge those first. Extra settings are harmless to the old core.
6. **Try it in a second product** with a different niche (Smokership has scores and wide images; Maltship and Watcheship don't):
   1. Use a checkout of it with no uncommitted work.
   2. Run `node tools/core-sync.mjs apply ../<other-app>`, then `npm install` and the checks there. Look at it in `npm run dev`.
   3. Undo with `git checkout -- . && git clean -fd` in that app. This throws away everything `apply` changed or added there.

**Release it**

7. In the blueprint, on a new branch: `node tools/core-sync.mjs pull ../<base-app>`.
   - It refuses if the base app is behind, or has new files not added to git. It tells you what to fix.
   - It sets `core/CORE_VERSION` to the next number.
8. Add `## Core v<N> — YYYY-MM-DD` to the blueprint's `CHANGELOG.md`, with one bullet per change. Run `node tools/core-sync.mjs check --base origin/main`, then open the blueprint PR. Its CI checks the version number.
   - If someone else's core change merges first, the check asks for a new number. Merge `main` into your branch, set `core/CORE_VERSION` to the number it asks for, and rename the CHANGELOG heading.
9. In the base app, drop the feature branch (`git switch main`, then `git branch -D <branch>`). The change comes back through the sync like everywhere else.

**Ship it**

10. After the blueprint PR is merged: `node tools/core-sync.mjs status`. If the `Core v<N>` PRs didn't appear (the automatic sync needs a token Erick sets up), run `node tools/core-sync.mjs push`.
11. Merge the `Core v<N>` PRs **one at a time** when their CI is green, and open each live site after its deploy (about 1 minute).

## Rules

- **Every user-visible string in both languages.** Text added by core code goes in `src/locales/{en,pt-BR}/core.json` (part of the core); text that differs per niche goes in `.../niche.json`; `t('key')` for core, `t('niche:key')` for niche. `npm run i18n:check` must pass.
- **Firestore paths only through `paths` in `src/lib/firebase.ts`.** Every document carries `niche`; dates are ISO strings; never write `undefined`.
- **Branch → PR → merge when CI is green.** Never commit to `main`. One feature per PR; describe what changed and how you tested it.
- **Never**: deploy by hand, change Firebase/DNS/Cloudflare/secrets, run `npm run reset-demo` against production, commit `.env.local` or any key, delete user data. Those are Erick's.
- Match the surrounding code style; keep changes small; don't refactor what the task doesn't need.

## Commands

```bash
npm install
npm run dev                # http://localhost:5173 — needs .env.local (values from Erick; template: .env.example)
npm run typecheck && npm run lint && npm test && npm run i18n:check && node scripts/check-core.mjs && npm run build
npm run catalog            # rebuild public/catalog.json after editing data/ (runs Python via scripts/python.mjs)
```

Prerequisites: Node 20+, git, gh, and **Python 3** (for `npm run catalog`).

Local dev talks to the **real** Firebase project. Use your own test account (Erick creates accounts; sign-up is off). Your test ratings and follows are visible to other users: undo them in the app when done (rating dialog → Delete, Unfollow, remove from the collection).

Catalog data: the current items are **samples** (real brands, illustrative specs) until a licensed dataset is chosen. When adding items, follow the existing shape in `data/` and the allowed values in `src/niche/niche.json`; say in the PR where the facts came from.

## Definition of done

- [ ] All commands above pass.
- [ ] Tried it in the browser at phone width (390 px) and on desktop, in **both** languages, signed in and signed out.
- [ ] The "Try the demo" account still works (it can't use social features by design).
- [ ] PR open with a short description and screenshots for UI changes; CHANGELOG line for anything users notice.
- [ ] Core changes: followed "A feature for every product" above (tested in two products, `pull` and `check` passed, `Core v<N>` PRs merged one at a time).
