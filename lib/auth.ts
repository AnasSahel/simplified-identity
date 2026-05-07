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
  displayName?: string;
  email?: string;
  attributes?: { email?: string; displayName?: string; firstname?: string; lastname?: string };
};

async function fetchIscIdentity(
  tenant: string,
  accessToken: string,
  identityId?: string,
): Promise<IscIdentity | null> {
  // Try the canonical "current user" endpoint first, then fall back to
  // /v3/identities/<id> if we got an id from the JWT.
  const candidates = [
    `https://${tenant}.api.identitynow.com/v3/identities/me`,
    `https://${tenant}.api.identitynow.com/beta/me`,
    ...(identityId
      ? [`https://${tenant}.api.identitynow.com/v3/identities/${identityId}`]
      : []),
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
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
      } else {
        console.log(
          "[SailPoint] identity endpoint",
          url,
          "→",
          res.status,
          res.statusText,
        );
      }
    } catch (err) {
      console.error("[SailPoint] identity fetch failed for", url, err);
    }
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

          const id = claims.sub ?? claims.identity_id;
          let email = claims.email;
          let name =
            claims.preferred_username ?? claims.name ?? claims.user_name;

          if (id && (!email || !name)) {
            const identity = await fetchIscIdentity(
              sailpointTenant!,
              tokens.accessToken,
              id,
            );
            if (identity) {
              email =
                email ??
                identity.email ??
                identity.attributes?.email;
              const composed = [
                identity.attributes?.firstname,
                identity.attributes?.lastname,
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
              `SailPoint sign-in: access_token JWT had no 'sub'/'identity_id' claim. JWT keys: ${Object.keys(
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
