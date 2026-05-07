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

// SailPoint ISC access tokens are JWTs with identity claims in the payload.
// We decode without signature verification — the token was just received from
// SailPoint's token endpoint over TLS, so the source is trusted.
type SailpointClaims = {
  sub?: string;
  identity_id?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
};

function decodeJwtPayload(token: string): SailpointClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error(
      "SailPoint access_token is not a JWT. Opaque tokens are not supported in this build (see ADR 004 follow-ups).",
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
          const id = claims.sub ?? claims.identity_id;
          const email = claims.email;
          const name =
            claims.preferred_username ?? claims.name ?? claims.email;
          if (!id || !email || !name) {
            throw new Error(
              "SailPoint access_token JWT did not include the expected 'sub'/'identity_id', 'email', and name claims.",
            );
          }
          return {
            id,
            email,
            name,
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
