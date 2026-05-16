import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const scenarios = [
  {
    caseId: "source_la_homelessness_fwa",
    query: "LA homelessness and where the fraud, waste, and abuse is"
  },
  {
    caseId: "source_ca_school_board_spending",
    query: "CA school board meetings and what they are spending money on"
  },
  {
    caseId: "source_sf_drug_rehabilitation_fwa",
    query: "San Francisco drug rehabilitation program and where the fraud is"
  },
  {
    caseId: "source_becerra_chirla",
    query: "Xavier Bacerra and his connection to CHIRLA"
  }
];

const port = 4521;
const storeDir = mkdtempSync(join(tmpdir(), "aculeus-four-case-store-"));
const receiptDir = mkdtempSync(join(tmpdir(), "aculeus-four-case-receipts-"));
const tempTraceDir = mkdtempSync(join(tmpdir(), "aculeus-four-case-traces-"));
const tracePath = process.env.ACULEUS_TRAINING_TRACE_PATH || join(tempTraceDir, "traces.jsonl");
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const hasBuild = existsSync(join(process.cwd(), ".next", "BUILD_ID"));
const command = hasBuild ? "start" : "dev";
const child = spawn(process.execPath, [nextBin, command, "-p", String(port), "-H", "127.0.0.1"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ACULEUS_PRODUCT_STORE_DIR: storeDir,
    ACULEUS_RECEIPT_STORE_DIR: receiptDir,
    ACULEUS_TRAINING_TRACE_PATH: tracePath
  },
  stdio: "ignore"
});

try {
  await retry(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    if (!response.ok) throw new Error(`Next ${command} server not ready: ${response.status}`);
  }, 100, 300);

  const outcomes = [];
  for (const scenario of scenarios) {
    const run = await postJson("/api/runs/start", {
      lead: scenario.query,
      caseId: scenario.caseId
    });
    const runId = run.run?.runId;
    if (!runId) throw new Error(`${scenario.caseId}: run start did not return runId`);
    const official = await postJson("/api/official-api-search", {
      runId,
      rawQuery: scenario.query,
      caseId: scenario.caseId,
      enableNetwork: process.env.ACULEUS_DRY_OFFICIAL_REGRESSION !== "1",
      maxTasks: 5,
      maxResults: 2
    });
    const provider = await postJson("/api/provider-search", {
      runId,
      rawQuery: scenario.query,
      caseId: scenario.caseId,
      enableNetwork: process.env.ACULEUS_LIVE_PROVIDER_REGRESSION === "1",
      providerCapUsd: Number(process.env.ACULEUS_PROVIDER_REGRESSION_CAP_USD || 0.25),
      maxTasks: 4,
      maxResults: 2
    });
    outcomes.push({ scenario, runId, official, provider });
  }

  const store = JSON.parse(readFileSync(join(storeDir, "local-store.json"), "utf8"));
  const traceRows = existsSync(tracePath)
    ? readFileSync(tracePath, "utf8").trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
    : store.runs.flatMap((run) => run.trainingTraces || []);
  const failures = [];
  const liveOfficialExpected = process.env.ACULEUS_DRY_OFFICIAL_REGRESSION !== "1";
  const liveProviderExpected = process.env.ACULEUS_LIVE_PROVIDER_REGRESSION === "1";
  for (const { scenario, runId, official, provider } of outcomes) {
    const run = store.runs.find((item) => item.runId === runId);
    if (!official.ok || official.mode !== "official_api_search_operator") failures.push(`${scenario.caseId}: official endpoint failed`);
    if (!provider.ok || provider.mode !== "provider_search_operator") failures.push(`${scenario.caseId}: provider endpoint failed`);
    if (official.result?.official_api_calls_executed !== liveOfficialExpected) failures.push(`${scenario.caseId}: official API live/dry mode mismatch`);
    if (official.result?.paid_spend_incurred !== false || official.result?.actual_spend_usd !== 0) failures.push(`${scenario.caseId}: official API incurred spend`);
    if (provider.result?.provider_calls_executed !== liveProviderExpected) failures.push(`${scenario.caseId}: provider live/dry mode mismatch`);
    if (Number(provider.result?.estimated_spend_usd || 0) > Number(provider.result?.provider_cap_usd || 0)) failures.push(`${scenario.caseId}: provider spend exceeded cap`);
    if (!official.dedupe?.candidates?.length) failures.push(`${scenario.caseId}: no official candidates`);
    if (!provider.dedupe?.candidates?.length) failures.push(`${scenario.caseId}: no provider candidates`);
    if (official.dedupe?.candidates?.some(candidateEscapedGate)) failures.push(`${scenario.caseId}: official candidate escaped candidate-only gate`);
    if (provider.dedupe?.candidates?.some(candidateEscapedGate)) failures.push(`${scenario.caseId}: provider candidate escaped candidate-only gate`);
    if (!official.dedupe?.candidates?.every(hasQualityScore)) failures.push(`${scenario.caseId}: official candidates missing quality score`);
    if (!provider.dedupe?.candidates?.every(hasQualityScore)) failures.push(`${scenario.caseId}: provider candidates missing quality score`);
    if (!run?.ledger?.some((entry) => entry.entry_type === "official_api_search")) failures.push(`${scenario.caseId}: run ledger missing official result set`);
    if (!run?.ledger?.some((entry) => entry.entry_type === "provider_search")) failures.push(`${scenario.caseId}: run ledger missing provider result set`);
    if (!run?.trainingTraces?.some((trace) => trace.trace_id === official.training_trace?.trace_id)) failures.push(`${scenario.caseId}: run missing official trace ref`);
    if (!run?.trainingTraces?.some((trace) => trace.trace_id === provider.training_trace?.trace_id)) failures.push(`${scenario.caseId}: run missing provider trace ref`);
    if (!traceRows.some((row) => row.case_id === scenario.caseId && row.action === "official_api_search")) failures.push(`${scenario.caseId}: substrate trace missing official event`);
    if (!traceRows.some((row) => row.case_id === scenario.caseId && row.action === "provider_search")) failures.push(`${scenario.caseId}: substrate trace missing provider event`);
  }
  if (traceRows.length < scenarios.length * 2) failures.push(`trace export expected at least ${scenarios.length * 2} rows, got ${traceRows.length}`);
  if (traceRows.some((row) => row.training_conversion_allowed !== false || row.direct_model_answer_used !== false || row.candidate_snippets_treated_as_evidence !== false)) {
    failures.push("trace export violated offline SFT/RL guardrails");
  }
  if (!traceRows.every((row) => row.case_spec && Array.isArray(row.retrieval_actions) && Array.isArray(row.source_ledger))) {
    failures.push("trace export missing SFT/RL substrate fields");
  }
  if (failures.length) throw new Error(failures.join("\n"));
  console.log(`Next operator four-case live regression passed. Trace rows: ${traceRows.length}. Trace path: ${tracePath}`);
} finally {
  child.kill();
  await sleep(300);
  rmSync(storeDir, { recursive: true, force: true });
  rmSync(receiptDir, { recursive: true, force: true });
  if (!process.env.ACULEUS_TRAINING_TRACE_PATH) rmSync(dirname(tracePath), { recursive: true, force: true });
  rmSync(tempTraceDir, { recursive: true, force: true });
}

async function postJson(path, body) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

function candidateEscapedGate(candidate) {
  return candidate.evidence_id !== null || candidate.evidence_promotion_allowed !== false || candidate.candidate_only_until_receipted !== true;
}

function hasQualityScore(candidate) {
  return Number.isFinite(candidate.source_quality_score);
}

async function retry(fn, attempts, delay) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await sleep(delay);
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
