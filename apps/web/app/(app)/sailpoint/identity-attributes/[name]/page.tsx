import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { StateView } from "@/components/ui/state-view";
import { Tabs } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import {
  getAttributeUsageInIdentityProfiles,
  getAttributeUsageInTransforms,
  getIdentityAttribute,
  getIdentityAttributeValueDistribution,
} from "@/lib/sailpoint/identity-attributes-api";

import { DetailShell } from "../../../_components/detail-shell";
import { AttributeDetailHeader } from "./_components/attribute-detail-header";
import { AttributeOverview } from "./_components/attribute-overview";
import { TransformsTab } from "./_components/transforms-tab";
import { ValuesTab } from "./_components/values-tab";

type TabId = "overview" | "transforms" | "values";
const TABS: TabId[] = ["overview", "transforms", "values"];

const VALUES_LIMIT = 20;

function tabFromParam(value: string | undefined): TabId {
  return (TABS as readonly string[]).includes(value ?? "")
    ? (value as TabId)
    : "overview";
}

function PermissionDenied({ resource }: { resource: string }) {
  return (
    <StateView
      intent="forbidden"
      size="sm"
      title={`No permission to read ${resource}`}
      description="Ask an administrator to grant the corresponding ISC scope on this tenant."
    />
  );
}

function TabFailure({
  status,
  resource,
  message,
}: {
  status: number;
  resource: string;
  message: string;
}) {
  if (status === 403) return <PermissionDenied resource={resource} />;
  return (
    <StateView
      intent="api_error"
      size="sm"
      title={`Couldn't load ${resource}`}
      description={message}
      detail={status > 0 ? String(status) : undefined}
      action={null}
    />
  );
}

/**
 * Identity Attribute detail page (issue #147).
 *
 * Three URL-driven tabs: Overview / Transforms / Sample values.
 *
 * Fetch shape:
 *   - The attribute itself is the only "fatal" call — a 404 falls back to
 *     `notFound()`, anything else renders a full-page StateView.
 *   - The other three reads (profile mappings, transform usages, value
 *     distribution) run in parallel with the attribute fetch so the page
 *     stays snappy even on tabs that don't consume the result. Each
 *     failure is contained to its own tab via `TabFailure`.
 *   - Value distribution is only fetched on its own tab — it's the only
 *     call that hits `/v2025/search` (a heavier endpoint), so we don't
 *     spend the round-trip when the user is on Overview / Transforms.
 *
 * The breadcrumb back-target is `/sailpoint/identity-attributes`. Until
 * the list page (#146) ships, that route 404s — which is the expected
 * pre-merge state.
 */
export default async function IdentityAttributeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { name } = await params;
  const { tab: tabParam } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const attributeName = decodeURIComponent(name);
  const tab = tabFromParam(tabParam);
  const userId = session.user.id;

  // Parallelise the reads. Value distribution is only fetched on its own
  // tab — see fetch-shape docstring above.
  const [attributeResult, profilesResult, transformsResult, valuesResult] =
    await Promise.all([
      getIdentityAttribute(userId, attributeName),
      getAttributeUsageInIdentityProfiles(userId, attributeName),
      getAttributeUsageInTransforms(userId, attributeName),
      tab === "values"
        ? getIdentityAttributeValueDistribution(userId, attributeName, {
            limit: VALUES_LIMIT,
          })
        : Promise.resolve(null),
    ]);

  if (!attributeResult.ok) {
    if (attributeResult.status === 404) notFound();
    return (
      <DetailShell
        back={{
          href: "/sailpoint/identity-attributes",
          label: "All identity attributes",
        }}
        header={null}
      >
        {attributeResult.status === 403 ? (
          <PermissionDenied resource="this identity attribute" />
        ) : (
          <StateView
            intent={
              attributeResult.status === 0
                ? "not_connected"
                : attributeResult.status === 401
                  ? "auth_failed"
                  : "api_error"
            }
            title={
              attributeResult.status === 0
                ? "Connect your SailPoint tenant"
                : attributeResult.status === 401
                  ? "SailPoint session expired"
                  : "SailPoint API error"
            }
            description={
              attributeResult.status === 0
                ? "Sign in with SailPoint to load this identity attribute from your tenant."
                : attributeResult.status === 401
                  ? "Your access to SailPoint was revoked or has expired. Sign in again to continue."
                  : "The request failed. Try again, or contact your administrator if it persists."
            }
            detail={
              attributeResult.status >= 400
                ? `${attributeResult.status} ${attributeResult.message}`
                : undefined
            }
          />
        )}
      </DetailShell>
    );
  }

  const transformsCount = transformsResult.ok
    ? new Set(transformsResult.data.map((t) => t.transformId)).size
    : null;

  const basePath = `/sailpoint/identity-attributes/${encodeURIComponent(attributeName)}`;

  return (
    <DetailShell
      back={{
        href: "/sailpoint/identity-attributes",
        label: "All identity attributes",
      }}
      header={<AttributeDetailHeader attribute={attributeResult.data} />}
      tabs={
        <Tabs
          size="md"
          value={tab}
          hrefFor={(k) =>
            k === "overview" ? basePath : `${basePath}?tab=${k}`
          }
          aria-label="Identity attribute sections"
          items={[
            { key: "overview", label: "Overview" },
            {
              key: "transforms",
              label: "Transforms",
              count: transformsCount,
            },
            { key: "values", label: "Sample values" },
          ]}
        />
      }
    >
      {tab === "overview" && (
        <AttributeOverview
          attribute={attributeResult.data}
          profilesResult={profilesResult}
          transformsResult={transformsResult}
        />
      )}

      {tab === "transforms" &&
        (transformsResult.ok ? (
          <TransformsTab usages={transformsResult.data} />
        ) : (
          <TabFailure
            status={transformsResult.status}
            resource="transforms"
            message={transformsResult.message}
          />
        ))}

      {tab === "values" &&
        (valuesResult === null ? null : valuesResult.ok ? (
          <ValuesTab values={valuesResult.data} limit={VALUES_LIMIT} />
        ) : (
          <TabFailure
            status={valuesResult.status}
            resource="sample values"
            message={valuesResult.message}
          />
        ))}
    </DetailShell>
  );
}
