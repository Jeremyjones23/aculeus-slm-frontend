import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createSmokeAuthHeaders } from "./smoke-auth-headers.mjs";

const base = (process.argv[2] || process.env.ACULEUS_DEPLOY_URL || "https://aculeus-slm-frontend.vercel.app").replace(/\/+$/, "");
const providerCapUsd = Number(process.env.ACULEUS_LIVE_PROVIDER_CAP_USD || "0.12");
const headers = createSmokeAuthHeaders({
  userId: process.env.ACULEUS_SMOKE_USER_ID || "postdeploy_live_provider_operator",
  email: process.env.ACULEUS_SMOKE_EMAIL || "operator@aculeus.local",
  role: process.env.ACULEUS_SMOKE_ROLE || "operator"
});

const results = [];

assert(providerCapUsd > 0 && providerCapUsd < 0.25, "live provider smoke cap must be greater than 0 and below $0.25");

const runStart = await fetch(`${base}/api/runs/start`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    lead: "Capped live provider smoke: official homelessness spending source discovery",
    userId: headers["x-clerk-user-id"],
    caseRecord: {
      caseId: `live_provider_smoke_${Date.now()}`,
      title: "Capped live provider smoke",
      lead: "Official homelessness spending source discovery",
      jurisdiction: "California",
      summary: "Production smoke that intentionally runs capped live provider retrieval and verifies candidate-only persistence."
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
    rawQuery: "California homelessness audit contract spending official records",
    enableNetwork: true,
    providerCapUsd,
    maxTasks: 2,
    maxResults: 1
  })
});
const providerJson = await readJson(provider);
const summary = providerJson?.ledger_entry?.result_summary || {};
record("provider_search_live", {
  status: provider.status,
  ok: providerJson?.ok,
  mode: providerJson?.result?.mode,
  paidSpend: summary.paid_spend_incurred,
  estimatedSpendUsd: summary.estimated_spend_usd || 0,
  providerCapUsd: summary.provider_cap_usd || 0,
  providerCallsExecuted: summary.provider_calls_executed,
  candidateCount: providerJson?.dedupe?.candidates?.length || 0,
  traceId: providerJson?.training_trace?.trace_id
});
assert(provider.status === 200 && providerJson?.ok, "live provider route failed");
assert(providerJson?.result?.mode === "paid_provider_candidate_execution", "provider route did not run live mode");
assert(summary.paid_spend_incurred === true && summary.provider_calls_executed === true, "live provider call/spend flags missing");
assert(Number(summary.estimated_spend_usd || 0) > 0, "live provider estimated spend missing");
assert(Number(summary.estimated_spend_usd || 0) <= providerCapUsd, "live provider estimated spend exceeded cap");
assert((providerJson?.dedupe?.candidates?.length || 0) > 0, "live provider returned no candidate leads");
assert((providerJson?.dedupe?.candidates || []).every((item) => item.evidence_id === null && item.evidence_promotion_allowed === false), "provider candidates escaped evidence gate");
assert(providerJson?.training_trace?.trace_id, "live provider trace ref missing");

const board = await fetch(`${base}/api/runs/${encodeURIComponent(runId)}/case-board`, { headers });
const boardJson = await readJson(board);
const caseBoard = boardJson?.caseBoard || {};
const providerRows = (caseBoard.sourceLedger || []).filter((entry) => entry.entry_type === "provider_search");
const promoted = (caseBoard.evidenceRail || []).filter((entry) => entry?.evidence_promotion_allowed === true || entry?.usable_as_evidence === true);
record("case_board", {
  status: board.status,
  ok: boardJson?.ok,
  providerLedgerRows: providerRows.length,
  candidateQueueCount: caseBoard.candidateQueue?.length || 0,
  promotedEvidenceCount: promoted.length
});
assert(board.status === 200 && boardJson?.ok, "case board failed");
assert(providerRows.length >= 1, "provider ledger row did not persist");
assert((caseBoard.candidateQueue?.length || 0) > 0, "provider candidates not visible in case board queue");
assert(promoted.length === 0, "live provider smoke promoted evidence");

const packet = {
  ok: true,
  base,
  runId,
  providerCapUsd,
  estimatedProviderSpendUsd: summary.estimated_spend_usd || 0,
  results
};
const outDir = process.env.ACULEUS_SMOKE_ARTIFACT_DIR || join(process.cwd(), "qa-artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `postdeploy-live-provider-smoke-${Date.now()}.json`);
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
