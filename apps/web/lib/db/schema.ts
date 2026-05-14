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
 * Per-source audit log (issues #270 / #271).
 *
 * Append-only timeline of mutations originated from this app's UI for a
 * given ISC source. Complements the ISC events index (which captures
 * connector-side activity but loses the better-auth `userId` of the
 * human initiator). The Activity tab merges both streams at read time
 * via `listSourceActivity`.
 *
 * Schema locked by the ADR
 * `vault/Projects/Simplified Identity/2026-05-14-sources-activity-audit-shape.md`
 * (D2 + D4 + D6):
 *  - `sourceName` denormalised so the row stays readable after the
 *    source is renamed or deleted in ISC.
 *  - `actorUserId` FK with `onDelete: "set null"` — keep audit trail
 *    even if the user is removed; UI falls back to `actorLabelFallback`.
 *  - `severity` stored at write time, not derived from `action`, so a
 *    later re-classification doesn't rewrite history.
 *  - `beforeSnapshot` / `afterSnapshot` are JSON blobs persisted on
 *    write; sensitive keys (passwords, tokens, …) are redacted by
 *    `appendSourceAuditEvent` before insertion.
 *  - `metadata` is free-form per action — `{ taskId, durationMs, ... }`.
 *  - `occurredAt` decoupled from `createdAt` so deferred / backfilled
 *    inserts stay possible (none in v1, but the schema allows it).
 */
export const sourceAuditEvent = sqliteTable(
  "source_audit_event",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    sourceName: text("source_name").notNull(),
    action: text("action", {
      enum: [
        "source.renamed",
        "source.owner_changed",
        "source.description_updated",
        "source.aggregation_triggered",
        "source.connection_tested",
        "source.connector_attributes_updated",
        "source.schema_drift_detected",
        "source.paused",
        "source.resumed",
        "source.deleted",
      ],
    }).notNull(),
    severity: text("severity", {
      enum: ["info", "warning", "danger"],
    }).notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorLabelFallback: text("actor_label_fallback"),
    summary: text("summary").notNull(),
    beforeSnapshot: text("before_snapshot"),
    afterSnapshot: text("after_snapshot"),
    metadata: text("metadata"),
    occurredAt: integer("occurred_at").notNull(),
    createdAt: integer("created_at")
      .$defaultFn(() => Date.now())
      .notNull(),
  },
  (table) => ({
    sourceIdx: index("idx_source_audit_source").on(
      table.sourceId,
      table.occurredAt,
    ),
    actionIdx: index("idx_source_audit_action").on(table.action),
    actorIdx: index("idx_source_audit_actor").on(table.actorUserId),
    occurredAtIdx: index("idx_source_audit_occurred_at").on(table.occurredAt),
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
