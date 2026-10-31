# Start here

*Português: [START_HERE.md](START_HERE.md)*

Welcome! This guide is for people who want to build features here **with the help of Claude** (Claude Code), even without much programming experience. Claude reads [`CLAUDE.md`](CLAUDE.md) for the technical rules; this page is for you.

## 1. What this is

This repo is one app in a family of **collector apps**:

| App | Niche | Repo |
|---|---|---|
| Smokership | cigars | `erickmobltda/smokership` |
| Maltship | whisky | `erickmobltda/maltship` |
| Watcheship | watches | `erickmobltda/watcheship` |

They all do the same things: show a **catalog**, let people mark items as **owned** or **wished**, **rate** them, and follow each other in a small **social** feed. In English and Portuguese.

All the apps share the same **core** (the common code). Each one has only its own **niche layer** (catalog, texts, colours, logo). The core lives in another repo, the **blueprint** (`erickmobltda/collector-app-blueprint`), and reaches every app automatically. The list of apps is in the blueprint's `PRODUCTS.md`.

## 2. Words you'll see (in plain terms)

| Word | What it means |
|---|---|
| **Repo** (repository) | The project folder, with the full history of every change, stored on GitHub. |
| **Clone** | Downloading a copy of the repo to your computer. |
| **Branch** | A parallel copy where you change things without affecting the official version (`main`). |
| **Commit** | A saved "photo" of your changes, with a short description. |
| **PR** (pull request) | A request to bring the changes of a branch into `main`. Others can review, comment and approve it. |
| **CI** | Automatic checks that run on every PR (tests, formatting, translations…). Green = OK; red = something to fix. |
| **Merge** | Accepting the PR: the changes go into `main`. |
| **Deploy** | Putting the new version on the internet. Here it happens **automatically** after a merge to `main`. |
| **Firebase / Firestore** | Google's service the apps use for login (Firebase Auth) and to store data (Firestore). |
| **Rules** | The Firestore security rules: who can read and write what. They live in a private repo (`erickmob-api`), cared for by Erick. |
| **i18n** | Translation: every text in the app exists in English and Portuguese. |
| **Core / niche** | Core = code shared by every app. Niche = what's specific to this app. |
| **Catalog** | The item list (cigars, whiskies, watches…), in `data/` and `public/catalog.json`. |

## 3. Setting up (once)

1. **Accounts:** a GitHub account, and ask Erick to add you to the repos. Also ask Erick for a **login for the apps** (sign-up is closed).
2. **Install:** [Node.js](https://nodejs.org) (the LTS version), [Python 3](https://www.python.org/downloads/), [Git](https://git-scm.com), the [GitHub CLI](https://cli.github.com) (`gh`, then `gh auth login`) and [Claude Code](https://claude.com/claude-code).
3. **Download the workspace:** the blueprint, with every app inside it.
   ```bash
   gh repo clone erickmobltda/collector-app-blueprint
   cd collector-app-blueprint
   node tools/workspace.mjs setup
   ```
4. **Configuration:** ask Erick for each app's `.env.local` file (it's the address of the Firebase project; it isn't committed). Save each one as `products/<app>/.env.local`.
5. **Run an app:** `cd products/smokership`, then `npm run dev`, and open <http://localhost:5173>. You'll see the app on your computer, talking to the real database.

Tip: Claude can do all of this for you. Open Claude Code in the `collector-app-blueprint` folder and say "set up the workspace; I already have the .env.local files from Erick".

## 4. How to ask Claude for a feature

Open Claude Code in the **`collector-app-blueprint`** folder and describe **what** you want and **why**, as you'd explain it to a person. A good request has:

- **The goal:** "I want people to be able to sort the catalog by name, not just by score."
- **Where it shows up:** "on the Discover screen, next to the filters".
- **Who it's for:** only this app, or **every** app? (That changes where the change is made; Claude knows how to handle both.)
- **How you'll know it's done:** "when I pick 'Name', the list goes A→Z, in both languages".

Examples:
- "Add 5 more whiskies to the catalog: [list]. Keep the current format."
- "Change the main colour of this app to a darker blue."
- "In every app, show the number of items on the user's profile." (core change)
- "I want to add a 'price paid' field to owned items." (new data → Claude will prepare the proposal and ask you to talk to Erick about the rules)

Claude builds it and shows it to you running. When you like it, say **"publish"**. Claude confirms, then:
- tests the change in every app;
- opens and merges all the pull requests;
- waits for each app to deploy;
- tells you where it went, with links to each live app.

If anything fails, nothing is published until it's fixed. If it stops halfway, ask Claude to publish again: it continues where it stopped.

While testing, remember the app on your computer uses the **real** database: delete your test ratings, follows and collection items when you're done.

## 5. What you can do alone, and what needs Erick

| You (with Claude) | Erick |
|---|---|
| Create branches, change code and texts, open PRs, in this app and in the blueprint | Firebase, domains, secrets, servers |
| Publish changes: Claude tests them in every app, then merges and deploys them (the `publish` skill) | Security rules (`erickmob-api`): new data in Firestore |
| Add or fix catalog items, translations, colours | Create accounts, reset the demo account in production |
| Propose changes to the core (in the blueprint) | Create a new app or new repo |

When in doubt, open the PR and ask Erick there.

## 6. When something goes wrong

- **CI went red on the PR:** open the PR on GitHub, click the failed check, copy the error, and give it to Claude: "CI failed with this error, fix it." The most common ones:
  - `check-core`: someone edited a shared file directly in this app's repo. Make shared changes from the workspace, and `publish` takes care of it.
  - `i18n:check`: a text is missing in one of the languages.
- **The app won't open locally:** check that `.env.local` exists and that you ran `npm install`. Ask Claude: "npm run dev isn't working, here's the error."
- **Something broke in production after a merge:** tell Erick right away. A PR that undoes the merge (a "revert") fixes it quickly; Claude can prepare it.

## 7. Where to learn more

- This app's `README.md`: what's specific to it.
- The blueprint (`erickmobltda/collector-app-blueprint`): `START_HERE.en.md`, `PRODUCTS.md` and the `docs/` folder, with how the whole family works.
