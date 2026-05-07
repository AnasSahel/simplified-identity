_(repo-local notes — not deployed)_

## SailPoint OAuth scopes gotcha

When configuring an OAuth client in SailPoint ISC API Management for the
authorization code flow:

1. **`sp:scopes:default` is NOT the scope you want for `/v2025/*` reads.**
   Its description in the ISC UI is "Accordez l'accès aux API qui ne nécessitent
   aucune autorisation." — i.e. public APIs only. Tokens issued with this scope
   will get `403 Forbidden` from any `/v2025/transforms`, `/v2025/identities`, etc.

2. **Use `sp:scopes:all`.** With the user's role-based permissions on the tenant
   (e.g. ORG_ADMIN, IDENTITY_ADMIN, or similar), the token then carries everything
   the user can already do via the ISC UI.

3. **Do NOT enable both `sp:scopes:all` and `sp:scopes:default` at the same time.**
   On at least some tenants (`up-group-sb` confirmed 2026-05-07), having both
   toggled ON makes the `/oauth/authorize` endpoint return
   `error=invalid_scope&error_description=OAuth+2.0+Parameter:+scope` — the
   request never even reaches the user-consent step. Keep only `sp:scopes:all` ON
   on the client config.

4. The `scope` claim in the issued JWT can show up as a base64-encoded short
   value (e.g. `["BA=="]`) instead of the human-readable scope string. That's
   ISC's internal encoding — does not mean the scope wasn't applied. Trust the
   API behavior, not the JWT scope claim shape, when debugging.
