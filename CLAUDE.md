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

Work from the **collector workspace**: the blueprint repo (`collector-app-blueprint`), with every product cloned inside it under `products/` (`node tools/workspace.mjs setup`). Open Claude Code in the blueprint folder, not in a single app. There:

1. The **`new-change`** skill updates everything (`node tools/workspace.mjs sync`) and picks where to build. Shared changes go in `products/smokership`, which has the most features; app-only parts go in each app's niche files.
2. Build the change in `products/`, **without committing or branching there**, and try it with `npm run dev`.
   - Keep the core niche-neutral: no niche words in shared code; read niche-specific things from `niche`.
   - Shared text goes in `src/locales/*/core.json`.
   - A per-app setting or label goes in that app's niche files, and the core must work without it.
   - New Firestore data needs Erick first.
3. The **`publish`** skill runs `node tools/workspace.mjs publish`:
   - it tests the change in every product;
   - opens and merges the app-only PRs, the blueprint PR and every `Core v<N>` PR, waiting for green CI and each deploy;
   - reports the live links.

   A rerun resumes after a failure.

If you are running inside a single product repo instead of the workspace, don't attempt a shared change here (`check-core` would fail). Ask the user to open Claude Code in the workspace. The manual procedure, for the owner, is in the blueprint's `docs/10-core-sync.md` ("By hand").

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
- [ ] Shared changes: published from the workspace with `publish` (it tests every product and merges every PR).
