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

// SailPoint ISC access tokens are JWTs but they do NOT carry the user's
// email or display name — those live on the identity record. We resolve
// them at sign-in time by calling the tenant's /oauth/userinfo endpoint
// (returns 200 without any specific scope) and fall back to versioned
// identity APIs (which require scopes) if userinfo is ever unavailable.

type SailpointClaims = {
  sub?: string;
  identity_id?: string;
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
  uid?: string;
  alias?: string;
  name?: string;
  displayName?: string;
  email?: string;
  emailAddress?: string;
  firstname?: string;
  lastname?: string;
  firstName?: string;
  lastName?: string;
  attributes?: {
    email?: string;
    displayName?: string;
    firstname?: string;
    lastname?: string;
  };
};

async function fetchIdentityPayload(
  url: string,
  accessToken: string,
): Promise<IscIdentity | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as IscIdentity | IscIdentity[];
    const identity = Array.isArray(body) ? body[0] : body;
    return identity ?? null;
  } catch {
    return null;
  }
}

async function resolveIscIdentity(
  tenant: string,
  accessToken: string,
  userName?: string,
): Promise<IscIdentity | null> {
  const base = `https://${tenant}.api.identitynow.com`;
  // /oauth/userinfo works on the same OAuth bearer with no extra scope and
  // returns the full identity payload — that's the primary path.
  // The /v2025/identities endpoints are kept as a fallback; they require
  // a scope to be granted on the OAuth client (e.g. sp:scopes:default).
  const direct = await fetchIdentityPayload(
    `${base}/oauth/userinfo`,
    accessToken,
  );
  if (direct) return direct;

  const meFallback = await fetchIdentityPayload(
    `${base}/v2025/identities/me`,
    accessToken,
  );
  if (meFallback) return meFallback;

  if (userName) {
    const filter = encodeURIComponent(`alias eq "${userName}"`);
    const search = await fetchIdentityPayload(
      `${base}/v2025/identities?filters=${filter}&limit=1`,
      accessToken,
    );
    if (search) return search;
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
        scopes: ["sp:scopes:default"],
        pkce: true,
        getUserInfo: async (tokens: { accessToken: string }) => {
          const claims = decodeJwtPayload(tokens.accessToken);
          const userName = claims.user_name ?? claims.sub;

          const identity = await resolveIscIdentity(
            sailpointTenant!,
            tokens.accessToken,
            userName,
          );
          if (!identity) {
            throw new Error(
              "SailPoint sign-in: /oauth/userinfo did not return an identity. Verify the OAuth client is enabled and the user is authorized on this tenant.",
            );
          }

          const id = identity.id ?? claims.identity_id ?? identity.uid;
          const email = identity.email ?? identity.emailAddress;
          const composed = [
            identity.firstName ?? identity.firstname,
            identity.lastName ?? identity.lastname,
          ]
            .filter(Boolean)
            .join(" ");
          const name =
            identity.displayName ??
            identity.attributes?.displayName ??
            identity.name ??
            (composed.length > 0 ? composed : undefined) ??
            identity.alias ??
            email;

          if (!id) {
            throw new Error(
              "SailPoint sign-in: identity payload had no usable 'id'.",
            );
          }
          if (!email) {
            throw new Error(
              "SailPoint sign-in: identity payload had no 'email'.",
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
