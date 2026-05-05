# SailSimplified

> Simplify SailPoint admin and user experience.

SailSimplified is a web app that wraps SailPoint Identity Security Cloud (ISC) with a simpler admin UI and an end-user experience that doesn't feel like 2012 enterprise software.

It replaces an earlier effort, **Keel** (open-core ISC dev platform), which was abandoned on 2026-05-05 in favor of a broader scope: not just a transform tester for ISC devs, but the whole admin + user surface for ISC tenants.

## Status

🚧 Early scaffold — repo bootstrapped 2026-05-05. No app code yet.

## Stack

Same stack as [Vulnex SaaS](https://github.com/AnasSahel/vulnex-saas):

- **Turborepo** (pnpm workspaces)
- **Next.js 16** — App Router, Server Components, Cache Components
- **better-auth 1.5+** — organization plugin
- **drizzle-orm** + **Postgres 16**
- **shadcn/ui** + **Tailwind 4**
- **Dokploy** (self-hosted VPS) + **Traefik**

## License

MIT — see [LICENSE](LICENSE).
