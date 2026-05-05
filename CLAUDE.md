# SailSimplified — repo-level instructions

Public web app, will deploy to Dokploy when there's something to ship. Full state and stack live in the SailSimplified project memory + hub note `vault/Projects/SailSimplified/SailSimplified.md` — read those first for context, don't duplicate here.

Pitch : **Simplify SailPoint admin and user experience.** Replaces Keel (abandoned 2026-05-05).

## Decisions — mandatory ADR

**Every non-trivial technical decision gets an ADR in `vault/Projects/SailSimplified/` before implementation.**

- Path: `vault/Projects/SailSimplified/YYYY-MM-DD-<slug>.md`
- Frontmatter: `type: analysis`, `project: sailsimplified`, `date: YYYY-MM-DD`, `status: active` → `done` at merge, `tags`
- Structure (mirror existing Vulnex ADRs as templates — e.g. `vault/Projects/Vulnex/2026-04-16-page-structure-decision.md`):
  - `> Projet : [[SailSimplified]]`
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

## Stack

Voir [README](README.md). Identique à Vulnex SaaS — réutiliser les patterns établis là-bas (better-auth org plugin, drizzle snake_case DB, Dokploy compose, healthchecks IPv4 `127.0.0.1`).
