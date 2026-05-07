import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth, organization } from "better-auth/plugins";
import { db } from "./db";

const sailpointTenant = process.env.SAILPOINT_TENANT;
const sailpointClientId = process.env.SAILPOINT_CLIENT_ID;
const sailpointClientSecret = process.env.SAILPOINT_CLIENT_SECRET;

export function isSailpointSsoEnabled(): boolean {
  return Boolean(
    sailpointTenant && sailpointClientId && sailpointClientSecret,
  );
}

// SailPoint ISC access tokens are JWTs. The payload typically contains
// `identity_id`, `tenant_id`, `org`, `user_name`, etc. — but the user's
// email is generally NOT in the token. We decode without signature
// verification (received over TLS from the token endpoint) and then,
// when needed, call the ISC identities API to fill in email + name.
type SailpointClaims = {
  sub?: string;
  identity_id?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  user_name?: string;
};

function decodeJwtPayload(token: string): SailpointClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error(
      "SailPoint access_token is not a JWT — opaque tokens are not supported in this build.",
    );
  }
  const payloadB64Url = parts[1];
  const padding = (4 - (payloadB64Url.length % 4)) % 4;
  const payloadB64 = (payloadB64Url + "=".repeat(padding))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const json = Buffer.from(payloadB64, "base64").toString("utf-8");
  return JSON.parse(json) as SailpointClaims;
}

type IscIdentity = {
  id?: string;
  name?: string;
  alias?: string;
  displayName?: string;
  email?: string;
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  attributes?: {
    email?: string;
    displayName?: string;
    firstname?: string;
    lastname?: string;
  };
};

async function tryFetch(
  url: string,
  accessToken: string,
  init?: RequestInit,
): Promise<IscIdentity | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
    });
    if (res.ok) {
      const body = (await res.json()) as IscIdentity | IscIdentity[];
      const identity = Array.isArray(body) ? body[0] : body;
      if (identity) {
        console.log(
          "[SailPoint] resolved identity via",
          url,
          "keys:",
          Object.keys(identity),
        );
        return identity;
      }
      console.log(
        "[SailPoint] identity endpoint",
        url,
        "→ ok but empty body",
      );
      return null;
    }
    console.log(
      "[SailPoint] identity endpoint",
      url,
      "→",
      res.status,
      res.statusText,
    );
    return null;
  } catch (err) {
    console.error("[SailPoint] identity fetch failed for", url, err);
    return null;
  }
}

async function fetchIscIdentity(
  tenant: string,
  accessToken: string,
  userName?: string,
  identityId?: string,
): Promise<IscIdentity | null> {
  // Strategy:
  // 1) Try "current user" endpoints (no ID needed) — version preference
  //    v2026 → v2025 → v3 → beta. /users/me before /identities/me because
  //    on ISC the user record carries email and the identity record may
  //    not (depends on tenant config).
  // 2) Try /identities/<id> if we have a UUID-shaped id.
  // 3) Fall back to /v2025/identities?filters=alias eq "<userName>" if the
  //    JWT only gave us a username (the SailPoint `sub` claim is the
  //    username, not the identity UUID — so direct /identities/<sub>
  //    returns 404).
  const base = `https://${tenant}.api.identitynow.com`;
  const candidates: string[] = [
    `${base}/v2026/users/me`,
    `${base}/v2025/users/me`,
    `${base}/v2026/identities/me`,
    `${base}/v2025/identities/me`,
    `${base}/v3/users/me`,
    `${base}/v3/identities/me`,
    `${base}/beta/me`,
  ];
  // /identities/<id> only makes sense for a UUID-shaped value.
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (identityId && uuidRe.test(identityId)) {
    candidates.push(
      `${base}/v2026/identities/${identityId}`,
      `${base}/v2025/identities/${identityId}`,
      `${base}/v3/identities/${identityId}`,
    );
  }
  for (const url of candidates) {
    const identity = await tryFetch(url, accessToken);
    if (identity) return identity;
  }
  // Last-resort: search identities by alias.
  if (userName) {
    const filter = encodeURIComponent(`alias eq "${userName}"`);
    const searchUrl = `${base}/v2025/identities?filters=${filter}&limit=1`;
    const identity = await tryFetch(searchUrl, accessToken);
    if (identity) return identity;
  }
  return null;
}

const sailpointConfig = isSailpointSsoEnabled()
  ? [
      {
        providerId: "sailpoint",
        clientId: sailpointClientId!,
        clientSecret: sailpointClientSecret!,
        authorizationUrl: `https://${sailpointTenant}.login.sailpoint.com/oauth/authorize`,
        tokenUrl: `https://${sailpointTenant}.api.identitynow.com/oauth/token`,
        scopes: [],
        pkce: true,
        getUserInfo: async (tokens: { accessToken: string }) => {
          const claims = decodeJwtPayload(tokens.accessToken);
          // Diagnostic: log the claim keys so missing fields are visible in logs.
          // Values are NOT logged — keys only — to avoid leaking secrets.
          console.log(
            "[SailPoint] JWT claim keys:",
            Object.keys(claims),
          );

          // SailPoint's `sub` claim is the username, not the identity UUID.
          // We keep both — userName is used for alias-based search fallback,
          // identityId is used for /identities/<id> lookups when it really
          // is a UUID.
          const userName = claims.user_name ?? claims.sub;
          const identityId = claims.identity_id;
          const id = identityId ?? claims.sub;
          let email = claims.email;
          let name =
            claims.preferred_username ?? claims.name ?? claims.user_name;

          if (id && (!email || !name)) {
            const identity = await fetchIscIdentity(
              sailpointTenant!,
              tokens.accessToken,
              userName,
              identityId,
            );
            if (identity) {
              email =
                email ??
                identity.email ??
                identity.emailAddress ??
                identity.attributes?.email;
              const composed = [
                identity.firstName ?? identity.attributes?.firstname,
                identity.lastName ?? identity.attributes?.lastname,
              ]
                .filter(Boolean)
                .join(" ");
              name =
                name ??
                identity.displayName ??
                identity.attributes?.displayName ??
                identity.name ??
                (composed.length > 0 ? composed : undefined);
            }
          }

          if (!id) {
            throw new Error(
              `SailPoint sign-in: access_token JWT had no 'sub' or 'identity_id' claim. JWT keys: ${Object.keys(
                claims,
              ).join(", ")}`,
            );
          }
          if (!email) {
            throw new Error(
              "SailPoint sign-in: could not resolve user email — JWT had no 'email' claim and the ISC identity endpoints did not return one either.",
            );
          }

          return {
            id,
            email,
            name: name ?? email,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
      },
    ]
  : [];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  plugins: [
    organization(),
    ...(sailpointConfig.length
      ? [genericOAuth({ config: sailpointConfig })]
      : []),
  ],
});

export type Session = typeof auth.$Infer.Session;
