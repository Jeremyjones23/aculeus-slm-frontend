import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createSmokeAuthHeaders } from "./smoke-auth-headers.mjs";

const base = (process.argv[2] || process.env.ACULEUS_DEPLOY_URL || "https://aculeus-slm-frontend.vercel.app").replace(/\/+$/, "");
const providerCapUsd = Number(process.env.ACULEUS_ADMIN_PROVIDER_CAP_USD || "0.12");
const headers = createSmokeAuthHeaders({
  userId: process.env.ACULEUS_SMOKE_USER_ID || "postdeploy_admin_operator",
  email: process.env.ACULEUS_SMOKE_EMAIL || "admin@aculeus.local",
  role: process.env.ACULEUS_SMOKE_ROLE || "admin"
});

const results = [];

const denied = await fetch(`${base}/api/admin/runs`);
const deniedJson = await readJson(denied);
record("admin_without_headers", { status: denied.status, error: deniedJson?.error });
assert(denied.status === 403, "admin API did not deny unauthenticated production request");

const runStart = await fetch(`${base}/api/runs/start`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    lead: "Admin provider spend smoke: LA homelessness public spending source discovery",
    userId: headers["x-clerk-user-id"],
    caseRecord: {
      caseId: `admin_provider_spend_smoke_${Date.now()}`,
      title: "Admin provider spend smoke",
      lead: "LA homelessness public spending source discovery",
      jurisdiction: "Los Angeles, California",
      summary: "Production admin smoke for provider spend, cap, call count, and near-cap alert visibility."
    }
  })
});
const runJson = await readJson(runStart);
const runId = runJson?.run?.runId;
record("run_start", { status: runStart.status, ok: runJson?.ok, runId });
assert(runStart.status === 200 && runJson?.ok && runId, "run start failed");

const provider = await fetch(`${base}/api/provider-search`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    runId,
    rawQuery: "LAHSA homelessness contract audits official records spending",
    enableNetwork: true,
    providerCapUsd,
    maxTasks: 2,
    maxResults: 1
  })
});
const providerJson = await readJson(provider);
const providerSummary = providerJson?.ledger_entry?.result_summary || {};
record("provider_search_live", {
  status: provider.status,
  ok: providerJson?.ok,
  mode: providerJson?.result?.mode,
  paidSpend: providerSummary.paid_spend_incurred,
  estimatedSpendUsd: providerSummary.estimated_spend_usd || 0,
  providerCapUsd: providerSummary.provider_cap_usd || 0,
  candidateCount: providerJson?.dedupe?.candidates?.length || 0
});
assert(provider.status === 200 && providerJson?.ok, "provider search failed");
assert(providerSummary.paid_spend_incurred === true, "provider smoke did not incur expected capped spend");
assert(Number(providerSummary.estimated_spend_usd || 0) > 0, "provider estimated spend missing");
assert(Number(providerSummary.estimated_spend_usd || 0) <= providerCapUsd, "provider estimated spend exceeded cap");

const admin = await fetch(`${base}/api/admin/runs`, { headers });
const adminJson = await readJson(admin);
const summary = adminJson?.admin || {};
const row = (summary.rows || []).find((item) => item.run_id === runId);
record("admin_with_headers", {
  status: admin.status,
  ok: adminJson?.ok,
  runCount: summary.run_count,
  providerSpendUsd: summary.provider_cost_summary?.estimated_spend_usd,
  providerCapUsd: summary.provider_cost_summary?.provider_cap_usd,
  alertCount: summary.provider_cost_summary?.alert_count,
  rowAlert: row?.provider_spend_alert,
  rowProviderSpendUsd: row?.provider_estimated_spend_usd,
  rowProviderCapUsd: row?.provider_cap_usd,
  rowProviderCallCount: row?.provider_call_count
});
assert(admin.status === 200 && adminJson?.ok, "admin API failed for approved admin");
assert(row, "admin summary did not include seeded run");
assert(Number(row.provider_estimated_spend_usd || 0) > 0, "admin row missing provider spend");
assert(Number(row.provider_cap_usd || 0) === providerCapUsd, "admin row missing provider cap");
assert(Number(row.provider_call_count || 0) > 0, "admin row missing provider call count");
assert(row.provider_spend_alert === "provider_spend_near_cap", "admin row did not raise near-cap provider alert");
assert((summary.provider_cost_summary?.alerts || []).some((alert) => alert.run_id === runId), "admin provider alert summary missing seeded run");

const packet = {
  ok: true,
  base,
  runId,
  providerCapUsd,
  estimatedProviderSpendUsd: providerSummary.estimated_spend_usd || 0,
  adminProviderAlert: row.provider_spend_alert,
  results
};
const outDir = process.env.ACULEUS_SMOKE_ARTIFACT_DIR || join(process.cwd(), "qa-artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `postdeploy-admin-smoke-${Date.now()}.json`);
writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...packet, artifactPath: outPath }, null, 2));

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text.slice(0, 800) };
  }
}

function record(check, data) {
  results.push({ check, ...data });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
