import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createSmokeAuthHeaders } from "./smoke-auth-headers.mjs";

const base = (process.argv[2] || process.env.ACULEUS_PREVIEW_URL || process.env.ACULEUS_DEPLOY_URL || "").replace(/\/+$/, "");
if (!base) {
  throw new Error("Usage: node scripts/postdeploy-smoke.mjs <deploy-url> or set ACULEUS_PREVIEW_URL");
}

const runLiveProvider = process.env.ACULEUS_LIVE_PROVIDER_SMOKE === "true";
const providerCapUsd = Number(process.env.ACULEUS_PROVIDER_CAP_USD || "0.25");
const headers = createSmokeAuthHeaders({
  userId: process.env.ACULEUS_SMOKE_USER_ID || "postdeploy_operator",
  email: process.env.ACULEUS_SMOKE_EMAIL || "operator@aculeus.local",
  role: process.env.ACULEUS_SMOKE_ROLE || "operator"
});

const results = [];

const root = await fetch(`${base}/`);
const rootText = await root.text();
record("root", {
  status: root.status,
  containsAculeus: /Aculeus/i.test(rootText)
});
assert(root.status === 200 && /Aculeus/i.test(rootText), "root page failed");

const blockedSession = await fetch(`${base}/api/session`);
const blockedSessionJson = await readJson(blockedSession);
record("session_without_headers", {
  status: blockedSession.status,
  authMode: blockedSessionJson?.authMode,
  workspaceAccess: blockedSessionJson?.workspaceAccess
});
assert(blockedSession.status === 401, "session auth boundary failed");

const session = await fetch(`${base}/api/session`, { headers });
const sessionJson = await readJson(session);
record("session_with_headers", {
  status: session.status,
  authMode: sessionJson?.authMode,
  workspaceAccess: sessionJson?.workspaceAccess
});
assert(session.status === 200 && sessionJson?.workspaceAccess === true, "approved session failed");

const runStart = await fetch(`${base}/api/runs/start`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    lead: "Post-deploy smoke: LA homelessness public spending candidate review",
    userId: headers["x-clerk-user-id"],
    caseRecord: {
      caseId: `postdeploy_smoke_${Date.now()}`,
      title: "Post-deploy smoke LA homelessness",
      lead: "LA homelessness public spending candidate review",
      jurisdiction: "Los Angeles, California",
      summary: "Post-deploy smoke case for API, provider, trace, and candidate persistence."
    }
  })
});
const runJson = await readJson(runStart);
const runId = runJson?.run?.runId;
record("run_start", {
  status: runStart.status,
  ok: runJson?.ok,
  runId,
  adapterMode: runJson?.run?.adapter?.mode
});
assert(runStart.status === 200 && runJson?.ok && runId, "run start failed");

const officialJson = await postJson("official_api_search", `${base}/api/official-api-search`, {
  runId,
  enableNetwork: true,
  maxTasks: 3,
  maxResults: 1
});
assert(officialJson?.ok === true, "official API search failed");

const providerJson = await postJson("provider_search", `${base}/api/provider-search`, {
  runId,
  enableNetwork: runLiveProvider,
  providerCapUsd,
  maxTasks: runLiveProvider ? 1 : 2,
  maxResults: 1,
  rawQuery: "LA homelessness public spending official records fraud waste abuse"
});
assert(providerJson?.ok === true, "provider search failed");
assert(providerJson?.ledger_entry?.result_summary?.paid_spend_incurred === runLiveProvider, "provider spend flag mismatch");

const board = await fetch(`${base}/api/runs/${encodeURIComponent(runId)}/case-board`, { headers });
const boardJson = await readJson(board);
const caseBoard = boardJson?.caseBoard || {};
const promoted = (caseBoard.evidenceRail || []).filter((entry) => entry?.evidence_promotion_allowed === true || entry?.usable_as_evidence === true);
record("case_board", {
  status: board.status,
  ok: boardJson?.ok,
  sourceLedgerCount: caseBoard.sourceLedger?.length || 0,
  candidateQueueCount: caseBoard.candidateQueue?.length || 0,
  evidenceRailCount: caseBoard.evidenceRail?.length || 0,
  promotedEvidenceCount: promoted.length
});
assert(board.status === 200 && boardJson?.ok, "case board failed");
assert((caseBoard.sourceLedger?.length || 0) >= 2, "source ledger did not persist retrieval entries");
assert(promoted.length === 0, "candidate-only smoke unexpectedly promoted evidence");

const packet = {
  ok: true,
  base,
  runId,
  liveProvider: runLiveProvider,
  estimatedProviderSpendUsd: providerJson?.ledger_entry?.result_summary?.estimated_spend_usd || 0,
  results
};

const outDir = process.env.ACULEUS_SMOKE_ARTIFACT_DIR || join(process.cwd(), "qa-artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `postdeploy-smoke-${Date.now()}.json`);
writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...packet, artifactPath: outPath }, null, 2));

async function postJson(check, url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const json = await readJson(response);
  record(check, {
    status: response.status,
    ok: json?.ok,
    mode: json?.result?.mode,
    recordCount: json?.result?.record_count,
    candidateCount: json?.dedupe?.candidates?.length || 0,
    paidSpend: json?.ledger_entry?.result_summary?.paid_spend_incurred,
    estimatedSpendUsd: json?.ledger_entry?.result_summary?.estimated_spend_usd || 0,
    traceId: json?.training_trace?.trace_id
  });
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

function record(check, data) {
  results.push({ check, ...data });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
