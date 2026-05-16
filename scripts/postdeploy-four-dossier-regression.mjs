import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = (process.argv[2] || process.env.ACULEUS_DEPLOY_URL || "https://aculeus-slm-frontend.vercel.app").replace(/\/+$/, "");
const liveProvider = process.env.ACULEUS_LIVE_PROVIDER_REGRESSION === "true";
const providerCapUsd = Number(process.env.ACULEUS_PROVIDER_REGRESSION_CAP_USD || (liveProvider ? "0.12" : "0"));
const headers = {
  "content-type": "application/json",
  "x-clerk-user-id": process.env.ACULEUS_SMOKE_USER_ID || "postdeploy_four_dossier_operator",
  "x-aculeus-email": process.env.ACULEUS_SMOKE_EMAIL || "operator@aculeus.local",
  "x-aculeus-role": process.env.ACULEUS_SMOKE_ROLE || "operator",
  "x-aculeus-approval-status": "approved"
};

const cases = [
  {
    caseId: "prod_la_homelessness_fwa",
    query: "LA homelessness and where the fraud, waste, and abuse is",
    jurisdiction: "Los Angeles, California"
  },
  {
    caseId: "prod_ca_school_board_spending",
    query: "CA school board meetings and what they are spending money on",
    jurisdiction: "California"
  },
  {
    caseId: "prod_sf_drug_rehabilitation_fwa",
    query: "San Francisco drug rehabilitation program and where the fraud is",
    jurisdiction: "San Francisco, California"
  },
  {
    caseId: "prod_becerra_chirla",
    query: "Xavier Bacerra and his connection to CHIRLA",
    jurisdiction: "California"
  }
];

const outcomes = [];
let estimatedProviderSpendUsd = 0;

for (const item of cases) {
  const run = await postJson("/api/runs/start", {
    lead: item.query,
    userId: headers["x-clerk-user-id"],
    caseRecord: {
      caseId: `${item.caseId}_${Date.now()}`,
      title: item.query,
      lead: item.query,
      jurisdiction: item.jurisdiction,
      summary: "Production deployed four-dossier regression scenario."
    }
  });
  const runId = run?.run?.runId;
  assert(run?.ok && runId, `${item.caseId}: run start failed`);

  const official = await postJson("/api/official-api-search", {
    runId,
    rawQuery: item.query,
    caseId: item.caseId,
    enableNetwork: true,
    maxTasks: 4,
    maxResults: 1
  });
  assert(official?.ok, `${item.caseId}: official API search failed`);

  const provider = await postJson("/api/provider-search", {
    runId,
    rawQuery: item.query,
    caseId: item.caseId,
    enableNetwork: liveProvider,
    providerCapUsd,
    maxTasks: liveProvider ? 2 : 4,
    maxResults: 1
  });
  assert(provider?.ok, `${item.caseId}: provider search failed`);
  estimatedProviderSpendUsd += Number(provider?.ledger_entry?.result_summary?.estimated_spend_usd || 0);

  const board = await getJson(`/api/runs/${encodeURIComponent(runId)}/case-board`);
  const caseBoard = board?.caseBoard || {};
  const promoted = (caseBoard.evidenceRail || []).filter((entry) => entry?.evidence_promotion_allowed === true || entry?.usable_as_evidence === true);
  const outcome = {
    caseId: item.caseId,
    runId,
    officialMode: official?.result?.mode,
    officialRecordCount: official?.result?.record_count || 0,
    officialCandidateCount: official?.dedupe?.candidates?.length || 0,
    providerMode: provider?.result?.mode,
    providerCandidateCount: provider?.dedupe?.candidates?.length || 0,
    providerEstimatedSpendUsd: provider?.ledger_entry?.result_summary?.estimated_spend_usd || 0,
    officialTraceId: official?.training_trace?.trace_id,
    providerTraceId: provider?.training_trace?.trace_id,
    sourceLedgerCount: caseBoard.sourceLedger?.length || 0,
    candidateQueueCount: caseBoard.candidateQueue?.length || 0,
    evidenceRailCount: caseBoard.evidenceRail?.length || 0,
    promotedEvidenceCount: promoted.length
  };
  outcomes.push(outcome);

  assert(outcome.officialTraceId, `${item.caseId}: official trace ref missing`);
  assert(outcome.providerTraceId, `${item.caseId}: provider trace ref missing`);
  assert(outcome.sourceLedgerCount >= 2, `${item.caseId}: source ledger missing retrieval rows`);
  assert(outcome.candidateQueueCount > 0, `${item.caseId}: candidate queue is empty`);
  assert(outcome.promotedEvidenceCount === 0, `${item.caseId}: evidence was auto-promoted`);
  assert(outcome.providerMode === (liveProvider ? "paid_provider_candidate_execution" : "paid_provider_dry_run"), `${item.caseId}: provider mode mismatch`);
}

if (!liveProvider) assert(estimatedProviderSpendUsd === 0, "dry provider regression incurred spend");
if (liveProvider) assert(estimatedProviderSpendUsd <= providerCapUsd * cases.length, "live provider regression exceeded total cap");

const packet = {
  ok: true,
  base,
  liveProvider,
  providerCapUsd,
  estimatedProviderSpendUsd: Number(estimatedProviderSpendUsd.toFixed(4)),
  caseCount: cases.length,
  outcomes
};
const outDir = process.env.ACULEUS_SMOKE_ARTIFACT_DIR || join(process.cwd(), "qa-artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `postdeploy-four-dossier-regression-${Date.now()}.json`);
writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...packet, artifactPath: outPath }, null, 2));

async function postJson(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const json = await readJson(response);
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(json).slice(0, 500)}`);
  return json;
}

async function getJson(path) {
  const response = await fetch(`${base}${path}`, { headers });
  const json = await readJson(response);
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(json).slice(0, 500)}`);
  return json;
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text.slice(0, 800) };
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
