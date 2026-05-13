# Simplified Identity — repo-level instructions

Public web app, will deploy to Dokploy when there's something to ship. Full state and stack live in the Simplified Identity project memory + hub note `vault/Projects/Simplified Identity/Simplified Identity.md` — read those first for context, don't duplicate here.

Pitch : **Simplify SailPoint admin and user experience.** Replaces Keel (abandoned 2026-05-05). Originally bootstrapped under the name "SailSimplified" — renamed to "Simplified Identity" 2026-05-05; the old name is preserved in historical commits/issues but should not appear in new content.

## Decisions — mandatory ADR

**Every non-trivial technical decision gets an ADR in `vault/Projects/Simplified Identity/` before implementation.**

- Path: `vault/Projects/Simplified Identity/YYYY-MM-DD-<slug>.md`
- Frontmatter: `type: analysis`, `project: simplified-identity`, `date: YYYY-MM-DD`, `status: active` → `done` at merge, `tags`
- Structure (mirror existing Vulnex ADRs as templates — e.g. `vault/Projects/Vulnex/2026-04-16-page-structure-decision.md`):
  - `> Projet : [[Simplified Identity]]`
  - `## TL;DR` — the decision + its price in 2–4 lines
  - `## Principes` — the guiding rules
  - `## Options évaluées` — table with For / Against / Verdict
  - `## Recommandation détaillée` — what exactly
  - `## Plan` — implementation steps
  - `## Gaps & revisites` — what's deferred and why
  - `## Suivi` — issues to open, docs to update

**Workflow:**
1. Before touching code for a decision, write the ADR (minimum TL;DR + options + chosen).
2. Reference the ADR path in the PR description under a `## Decisions` section.
3. On merge, flip `status: active` → `done`.

**What counts as "non-trivial":**
- New DB column / table / index
- New auth flow, hook, middleware
- New external service integration (SDK choice, API surface design)
- Architecture split decisions (where a layer lives, what package owns it)
- Non-obvious security tradeoffs (what to leak, what not to)
- UX flows that lock in a pattern for future pages

**What to skip (no ADR needed):**
- Icon fix, copy tweak, styling
- Bugfix that just restores intended behavior
- Mechanical refactor (rename, extract, reorder)
- Following an existing pattern documented elsewhere

If unsure → lean toward writing the ADR.

## Workflow

- issue → branch → PR → merge. Pas de commit direct sur `main`.
- EN pour GitHub (issues, PRs, commits, code), FR en conversation Claude.
- Smoke test UI-driven sur chaque PR (parcours UI réel ; CLI fallback uniquement si pas de surface UI).
- **Après merge d'une PR, mettre à jour `main` localement** (`git checkout main && git pull`) avant d'enchaîner sur autre chose. Le dev server sur :3200 tourne sur la working copy principale — sans `pull`, il continue de servir l'ancienne version et toute branche suivante part d'une base périmée.

## Dev server

- Ce projet tourne sur le **port 3200** (pas le 3000 par défaut de Next). Le `-p 3200` est désormais embarqué dans le script `dev` de `apps/web/package.json` — pas besoin de l'ajouter en CLI.
- Le dev server d'Anas tourne en permanence sur ce port — ne pas relancer aveuglément `pnpm dev`. Vérifier d'abord `lsof -i tcp:3200` ; si actif, l'utiliser directement à `http://localhost:3200`.
- Si tu dois redémarrer, tuer le process existant explicitement avant.
- Depuis la racine : `pnpm dev` passe par Turbo et lance `apps/web`. Pour cibler directement : `pnpm --filter web dev`.

## Worktrees — partager la DB et l'env avec la working copy principale

Quand on lance un 2e dev server depuis un worktree (`pnpm --filter web dev -- -p 3201`) pour comparer une branche en cours avec `main` côté :3200, deux fichiers gitignored manquent par défaut dans le worktree :

- `apps/web/.env.local` — secrets (better-auth, ISC OAuth client, etc.)
- `apps/web/data/simplified-identity.sqlite` — DB libsql (org, session, tokens ISC)

**Convention : les symlinker depuis la working copy principale**, pour réutiliser la même session OAuth et les mêmes données sans re-onboarding.

```sh
# Depuis la racine du worktree
ln -s /Users/anas/brain/projects/products/simplified-identity/apps/web/.env.local apps/web/.env.local
mkdir -p apps/web/data
ln -s /Users/anas/brain/projects/products/simplified-identity/apps/web/data/simplified-identity.sqlite apps/web/data/simplified-identity.sqlite
```

À savoir :
- libsql en fichier = single-writer, multi-reader. Un `SQLITE_BUSY` momentané est possible si les deux dev servers écrivent en même temps — inoffensif pour un compare visuel, à éviter pour des actions provisioning concurrentes.
- La session better-auth est partagée (cookie `localhost`, le port ne joue pas) — pas besoin de re-login sur :3201.
- Cleanup à la fin : `rm` les symlinks dans le worktree, ça ne touche jamais les fichiers source.
- Ne **jamais** copier ces fichiers (la copie diverge et brouille les tests) — uniquement symlink.

## Monorepo

Repo organisé en pnpm + Turbo workspaces depuis le 2026-05-12 (cf. ADR `vault/Projects/Simplified Identity/2026-05-12-monorepo-split.md`).

```
apps/web/                          # Next.js (toute l'UI + auth + DB)
packages/sailpoint-client/         # client HTTP ISC pur (pas de DB, opts injectées)
packages/transforms/               # moteur transforms (engine + evaluator + recipe + graph + usages walker)
```

Règles d'imports :
- `apps/web` consomme `@simplified-identity/sailpoint-client` et `@simplified-identity/transforms`.
- Les packages ne dépendent **pas** l'un de l'autre. Si une dépendance se profile, refacto avant de la laisser entrer (cf. boundary refinement de PR 4 où `usages.ts` a dû basculer de `sailpoint-client` vers `transforms`).
- `apps/web/lib/sailpoint/` ne contient plus que **deux shims** (`client.ts`, `transforms-api.ts`) qui wrappent les packages purs avec la résolution token DB-backed. Toute nouvelle logique ISC qui peut être pure va dans `packages/sailpoint-client/`, pas dans le shim.

Packages shipent du TS source (pas de step `tsc` côté package en v0) — Turbopack côté Next transpile.

## Stack

Voir [README](README.md). Identique à Vulnex SaaS — réutiliser les patterns établis là-bas (better-auth org plugin, drizzle snake_case DB, Dokploy compose, healthchecks IPv4 `127.0.0.1`).
