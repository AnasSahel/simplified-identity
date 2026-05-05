import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth, organization } from "better-auth/plugins";
import { db } from "./db";

const sailpointDiscoveryUrl = process.env.SAILPOINT_DISCOVERY_URL;
const sailpointClientId = process.env.SAILPOINT_CLIENT_ID;
const sailpointClientSecret = process.env.SAILPOINT_CLIENT_SECRET;

export function isSailpointSsoEnabled(): boolean {
  return Boolean(
    sailpointDiscoveryUrl && sailpointClientId && sailpointClientSecret,
  );
}

const sailpointConfig = isSailpointSsoEnabled()
  ? [
      {
        providerId: "sailpoint",
        discoveryUrl: sailpointDiscoveryUrl!,
        clientId: sailpointClientId!,
        clientSecret: sailpointClientSecret!,
        scopes: ["openid", "profile", "email"],
        pkce: true,
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
