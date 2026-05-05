# SailSimplified

> Simplify SailPoint admin and user experience.

SailSimplified is a web app that wraps SailPoint Identity Security Cloud (ISC) with a simpler admin UI and an end-user experience that doesn't feel like 2012 enterprise software.

It replaces an earlier effort, **Keel** (open-core ISC dev platform), which was abandoned on 2026-05-05 in favor of a broader scope: not just a transform tester for ISC devs, but the whole admin + user surface for ISC tenants.

## Status

🚧 Early. Auth (email/password + optional Sign-in-with-SailPoint), protected dashboard placeholder, no real product features yet.

## Stack

- **Next.js 16** — App Router, Server Components
- **better-auth** — email/password + organization plugin + generic OIDC for SailPoint sign-in
- **drizzle-orm** + **@libsql/client** (SQLite, local file)
- **shadcn/ui** + **Tailwind 4**
- **Dokploy** (self-hosted VPS) + Traefik (planned)

## Local development

```bash
cp .env.example .env.local      # then fill BETTER_AUTH_SECRET (32 bytes random base64)
pnpm install
pnpm db:push                    # creates data/sailsimplified.sqlite + tables
pnpm dev                        # http://localhost:3000
```

## Configuring "Sign in with SailPoint" (OIDC)

The button is **hidden** by default. To enable it, register an OIDC application in your SailPoint ISC tenant and fill three env vars.

### 1. Register the OIDC application in ISC

In your tenant: **Admin → Global → Security Settings → API Management → New**.

- **Application type**: OIDC
- **Redirect URI**: `<BETTER_AUTH_URL>/api/auth/oauth2/callback/sailpoint`
  (e.g. `http://localhost:3000/api/auth/oauth2/callback/sailpoint` for local dev,
  or `https://sailsimplified.example.com/api/auth/oauth2/callback/sailpoint` for prod)
- **Scopes**: `openid`, `profile`, `email`
- **PKCE**: enabled
- After save, copy the generated **Client ID** and **Client Secret**.

### 2. Set the env vars

In `.env.local`:

```bash
SAILPOINT_DISCOVERY_URL=https://<your-tenant>.api.identitynow.com/.well-known/openid-configuration
SAILPOINT_CLIENT_ID=<from step 1>
SAILPOINT_CLIENT_SECRET=<from step 1>
```

### 3. Restart the dev server

The "Continue with SailPoint" button now shows above the email/password form on `/sign-in` and `/sign-up`.

If any of the three vars is empty, the integration is disabled silently and the app falls back to email/password only.

## License

MIT — see [LICENSE](LICENSE).
