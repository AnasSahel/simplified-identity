import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  searchIdentities,
  type IdentitySearchHit,
  type SearchIdentitiesParams,
} from "@/lib/sailpoint/identities-api";

import {
  csvHeaderLine,
  csvLineFromRow,
  toRow,
} from "../../../(app)/sailpoint/identities/_lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 250;
const MAX_ROWS = 50_000;
const BOM = "﻿";

const VALID_RISK_VALUES = new Set(["low", "medium", "high", "critical"]);

function filterParamsFromUrl(url: URL): SearchIdentitiesParams {
  const sp = url.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const profile = (sp.get("profile") ?? "").trim() || null;
  const lcsRaw = (sp.get("lcs") ?? "").trim().toLowerCase();
  const department = (sp.get("department") ?? "").trim() || null;
  const riskRaw = (sp.get("risk") ?? "").trim().toLowerCase();
  const risk = VALID_RISK_VALUES.has(riskRaw) ? riskRaw : null;

  return {
    q,
    profileId: profile,
    lcs: lcsRaw || null,
    department,
    risk,
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
}

function filenameFor(filters: SearchIdentitiesParams): string {
  const date = new Date().toISOString().slice(0, 10);
  const parts: string[] = [];
  if (filters.q) parts.push(`q-${slug(filters.q)}`);
  if (filters.profileId) parts.push(`profile-${slug(filters.profileId)}`);
  if (filters.lcs) parts.push(`lcs-${slug(filters.lcs)}`);
  if (filters.department) parts.push(`department-${slug(filters.department)}`);
  if (filters.risk) parts.push(`risk-${slug(filters.risk)}`);
  const summary = parts.length ? parts.join("_") : "all";
  return `identities-${summary}-${date}.csv`.slice(0, 100);
}

function errorCsv(status: number, message: string): string {
  // One-line CSV body so the browser surfaces the failure as a downloadable
  // file rather than an unstyled error page. The error marker uses the same
  // `# ERROR:` prefix as a mid-stream failure for symmetry.
  return (
    BOM +
    csvHeaderLine() +
    "\r\n" +
    `# ERROR: ${status} ${message.replace(/[\r\n]+/g, " ")}\r\n`
  );
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response(errorCsv(401, "Unauthenticated"), {
      status: 401,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Export-Status": "error",
      },
    });
  }

  const url = new URL(request.url);
  const filters = filterParamsFromUrl(url);
  const userId = session.user.id;
  const filename = filenameFor(filters);

  // Probe the first page synchronously so we can surface auth / permission /
  // not-connected as a real HTTP status before we commit to a streaming body.
  const firstPage = await searchIdentities(userId, {
    ...filters,
    limit: PAGE_SIZE,
    offset: 0,
  });

  if (!firstPage.ok) {
    return new Response(errorCsv(firstPage.status, firstPage.message), {
      status: firstPage.status >= 400 ? firstPage.status : 502,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Export-Status": "error",
      },
    });
  }

  // Narrow the union here so the closure below sees a plain success-shape.
  const firstData: IdentitySearchHit[] = firstPage.data;
  const total = firstPage.total ?? firstData.length;
  // We know up-front whether the dataset exceeds the cap; this lets the
  // client surface "capped" without inspecting the body. Mid-stream errors
  // (which we *cannot* signal in headers since the response status is
  // already committed to 200) are still readable from the body's trailing
  // `# ERROR:` marker.
  const isCapped = total > MAX_ROWS;
  const encoder = new TextEncoder();
  let emitted = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(BOM + csvHeaderLine() + "\r\n"));

        function pushPage(rows: IdentitySearchHit[]): boolean {
          const remaining = MAX_ROWS - emitted;
          const slice =
            rows.length > remaining ? rows.slice(0, remaining) : rows;
          if (slice.length === 0) return false;
          const chunk =
            slice.map((hit) => csvLineFromRow(toRow(hit))).join("\r\n") +
            "\r\n";
          controller.enqueue(encoder.encode(chunk));
          emitted += slice.length;
          return rows.length <= remaining;
        }

        const firstFits = pushPage(firstData);
        if (!firstFits) {
          controller.close();
          return;
        }

        let offset = firstData.length;
        while (
          emitted < MAX_ROWS &&
          firstData.length === PAGE_SIZE &&
          offset < total
        ) {
          const page = await searchIdentities(userId, {
            ...filters,
            limit: PAGE_SIZE,
            offset,
          });
          if (!page.ok) {
            controller.enqueue(
              encoder.encode(
                `# ERROR: ${page.status} ${page.message.replace(
                  /[\r\n]+/g,
                  " ",
                )}\r\n`,
              ),
            );
            break;
          }
          const fits = pushPage(page.data);
          if (!fits) break;
          if (page.data.length < PAGE_SIZE) break;
          offset += page.data.length;
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Export-Status": isCapped ? "capped" : "ok",
      "X-Export-Cap": String(MAX_ROWS),
      "X-Export-Total": String(total),
    },
  });
}
