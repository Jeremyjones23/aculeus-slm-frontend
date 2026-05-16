import { dirname, join } from "node:path";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const existingPort = 4280;
const port = 4516;
const storeDir = mkdtempSync(join(tmpdir(), "aculeus-next-operator-store-"));
const receiptDir = mkdtempSync(join(tmpdir(), "aculeus-next-operator-receipts-"));
const tracePath = join(mkdtempSync(join(tmpdir(), "aculeus-next-operator-traces-")), "traces.jsonl");
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const hasBuild = existsSync(join(process.cwd(), ".next", "BUILD_ID"));
let child = null;
let activePort = existingPort;
let isolatedStore = false;

try {
  if (hasBuild || !(await isReady(existingPort))) {
    activePort = port;
    isolatedStore = true;
    const command = hasBuild ? "start" : "dev";
    child = spawn(process.execPath, [nextBin, command, "-p", String(port), "-H", "127.0.0.1"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ACULEUS_PRODUCT_STORE_DIR: storeDir,
        ACULEUS_RECEIPT_STORE_DIR: receiptDir,
        ACULEUS_TRAINING_TRACE_PATH: tracePath
      },
      stdio: "ignore"
    });
    await retry(async () => {
      const response = await fetch(`http://127.0.0.1:${activePort}/`);
      if (!response.ok) throw new Error(`Next app not ready: ${response.status}`);
    }, 80, 250);
  }

  const runResponse = await fetch(`http://127.0.0.1:${activePort}/api/runs/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      lead: "LA homelessness and public spending control gaps",
      caseId: "source_la_homelessness_fwa"
    })
  });
  if (!runResponse.ok) throw new Error(`run start failed: ${runResponse.status}`);
  const runPayload = await runResponse.json();
  const runId = runPayload.run?.runId;
  if (!runId) throw new Error("run start did not return runId");

  const official = await postJson(activePort, "/api/official-api-search", {
    runId,
    rawQuery: "LA homelessness and public spending control gaps",
    caseId: "source_la_homelessness_fwa",
    enableNetwork: false,
    maxTasks: 4,
    maxResults: 2
  });
  const providers = await postJson(activePort, "/api/provider-search", {
    runId,
    rawQuery: "LA homelessness and public spending control gaps",
    caseId: "source_la_homelessness_fwa",
    enableNetwork: false,
    providerCapUsd: 0,
    maxTasks: 4,
    maxResults: 2
  });

  const failures = [];
  if (!official.ok || official.mode !== "official_api_search_operator") failures.push("official API route did not return operator result");
  if (!providers.ok || providers.mode !== "provider_search_operator") failures.push("provider route did not return operator result");
  if (!official.dedupe?.candidates?.length) failures.push("official route missing candidate queue entries");
  if (!providers.dedupe?.candidates?.length) failures.push("provider route missing candidate queue entries");
  if (official.dedupe?.candidates?.some((item) => item.evidence_id !== null || item.evidence_promotion_allowed !== false)) failures.push("official candidate escaped candidate-only gate");
  if (providers.dedupe?.candidates?.some((item) => item.evidence_id !== null || item.evidence_promotion_allowed !== false)) failures.push("provider candidate escaped candidate-only gate");
  if (!official.dedupe?.candidates?.every((item) => Number.isFinite(item.source_quality_score))) failures.push("official candidates missing source quality score");
  if (!providers.dedupe?.candidates?.every((item) => Number.isFinite(item.source_quality_score))) failures.push("provider candidates missing source quality score");
  if (!official.ledger_entry || !providers.ledger_entry) failures.push("operator routes did not return ledger entries");
  if (!official.training_trace?.trace_id || !providers.training_trace?.trace_id) failures.push("operator routes did not return training trace refs");

  if (isolatedStore) {
    const store = JSON.parse(readFileSync(join(storeDir, "local-store.json"), "utf8"));
    const savedRun = store.runs.find((item) => item.runId === runId);
    if (!savedRun?.ledger?.some((entry) => entry.entry_type === "official_api_search")) failures.push("run ledger missing official API entry");
    if (!savedRun?.ledger?.some((entry) => entry.entry_type === "provider_search")) failures.push("run ledger missing provider search entry");
    if (!savedRun?.trainingTraces?.length) failures.push("run missing training trace refs");
    const traceRows = existsSync(tracePath)
      ? readFileSync(tracePath, "utf8").trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
      : savedRun.trainingTraces || [];
    if (traceRows.length < 2) failures.push("training trace export missing route events");
    if (traceRows.some((row) => row.training_conversion_allowed !== false || row.direct_model_answer_used !== false)) failures.push("training trace violated offline-training guard");
  }
  if (failures.length) throw new Error(failures.join("\n"));
  console.log("Next operator route verification passed.");
} finally {
  child?.kill();
  await sleep(300);
  rmSync(storeDir, { recursive: true, force: true });
  rmSync(receiptDir, { recursive: true, force: true });
  rmSync(dirname(tracePath), { recursive: true, force: true });
}

async function postJson(portValue, path, body) {
  const response = await fetch(`http://127.0.0.1:${portValue}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
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

async function isReady(portValue) {
  try {
    const response = await fetch(`http://127.0.0.1:${portValue}/`);
    return response.ok;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
