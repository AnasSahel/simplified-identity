import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// better-auth core tables — names and columns are dictated by the lib.
// Keep camelCase here on purpose (lib expectation), exception to the
// snake_case-DB rule.

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("activeOrganizationId"),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// better-auth organization plugin tables

export const organization = sqliteTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  metadata: text("metadata"),
});

export const member = sqliteTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

export const invitation = sqliteTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  inviterId: text("inviterId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// App-domain tables — snake_case columns, camelCase TS keys
// (cf. CLAUDE.md + memory feedback_drizzle_snake_case_db).

/**
 * Identity-attribute drift snapshot (issue #207).
 *
 * One row per identity attribute that the snapshot has computed a
 * null-population ratio for. Snapshot is written by the
 * `refreshIdentityAttributeDrift` server action (manual button on the
 * list page; future cron). The UI surfaces (KPI strip card 4, row
 * badge, `?scope=drift` filter, detail KPI) all read from this table —
 * no SailPoint API call on render.
 *
 * Tier thresholds (locked by the ADR
 * `vault/Projects/Simplified Identity/2026-05-14-identity-attribute-drift-strategy.md`):
 *   - `ok`      : nullRatio < 0.05
 *   - `warning` : 0.05 ≤ nullRatio ≤ 0.20
 *   - `danger`  : nullRatio > 0.20
 *
 * `mappingProfileIds` records which identity profiles mapped the
 * attribute at capture time — surfaced for future debug (per-profile
 * breakdown, snapshot invalidation when the mapping changes) without
 * costing an extra read on the hot path.
 */
export const identityAttributeDriftSnapshot = sqliteTable(
  "identity_attribute_drift_snapshot",
  {
    attributeName: text("attribute_name").primaryKey(),
    populatedCount: integer("populated_count").notNull(),
    totalCount: integer("total_count").notNull(),
    nullRatio: real("null_ratio").notNull(),
    tier: text("tier", { enum: ["ok", "warning", "danger"] }).notNull(),
    mappingProfileIds: text("mapping_profile_ids", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    capturedAt: integer("captured_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    tierIdx: index("idx_drift_snapshot_tier").on(table.tier),
  }),
);

/**
 * Per-tenant configuration knobs. One row per user since the data layer
 * is per-user (every SailPoint fetcher takes `userId`); better-auth's
 * organization plugin is enabled but no resource is currently scoped by
 * org id. Columns are nullable on purpose — a tenant with no row reads
 * defaults from the corresponding constant. Future issues #107 / #108
 * add `externalProfileIds` and `preboardLcsNames` columns here.
 */
export const tenantSettings = sqliteTable("tenant_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  aggregationFreshnessThresholdHours: integer(
    "aggregation_freshness_threshold_hours",
  ),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

/**
 * Per-user "quick samples" attached to a SailPoint transform (issue #69,
 * Phase 2 — hybrid auto-extract + user-saved). One row per saved sample;
 * the Test tab in the transform editor renders these as clickable chips
 * that pre-fill the INPUT textarea.
 *
 * Auto-extracted samples (e.g. `lookup` table keys) live in code, not
 * here — see `@simplified-identity/transforms` `extractAutoSamples`.
 * This table only stores values the user explicitly clicked "Save as
 * sample" on after a successful Run.
 *
 * Scoping is per-user (every fetcher in this app is already userId-keyed)
 * — never cross-user, even within the same org. Values can carry PII
 * (employee IDs, emails) so leakage would be a real privacy issue.
 *
 * `transformId` is the opaque ISC transform id (string). "new" transforms
 * (not yet persisted) have no stable id and therefore can't be saved
 * against — the editor masks the "Save as sample" button in that mode.
 */
export const transformSample = sqliteTable(
  "transform_samples",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    transformId: text("transform_id").notNull(),
    value: text("value").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    userTransformIdx: index("idx_transform_samples_user_transform").on(
      table.userId,
      table.transformId,
    ),
  }),
);
