import { dirname, join } from "node:path";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const existingPort = 4280;
const port = 4531;
const storeDir = mkdtempSync(join(tmpdir(), "aculeus-canonical-api-store-"));
const receiptDir = mkdtempSync(join(tmpdir(), "aculeus-canonical-api-receipts-"));
const tracePath = join(mkdtempSync(join(tmpdir(), "aculeus-canonical-api-traces-")), "traces.jsonl");
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const hasBuild = existsSync(join(process.cwd(), ".next", "BUILD_ID"));
let child = null;
let activePort = existingPort;

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

async function isReady(portValue) {
  try {
    const response = await fetch(`http://127.0.0.1:${portValue}/`);
    return response.ok;
  } catch {
    return false;
  }
}

try {
  if (hasBuild || !(await isReady(existingPort))) {
    activePort = port;
    const command = hasBuild ? "start" : "dev";
    child = spawn(process.execPath, [nextBin, command, "-p", String(port), "-H", "127.0.0.1"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ACULEUS_PRODUCT_STORE_DIR: storeDir,
        ACULEUS_RECEIPT_STORE_DIR: receiptDir,
        ACULEUS_TRAINING_TRACE_PATH: tracePath,
        ACULEUS_PRODUCT_STORE_MODE: "local"
      },
      stdio: "ignore"
    });
    await retry(async () => {
      const response = await fetch(`http://127.0.0.1:${activePort}/`);
      if (!response.ok) throw new Error(`Next app not ready: ${response.status}`);
    }, 100, 250);
  }

  const created = await postJson("/api/cases", {
    title: "Canonical public records case",
    lead: "CA school board meetings and public spending oversight",
    jurisdiction: "California"
  });
  const caseId = created.case?.caseId;
  if (!caseId) throw new Error("POST /api/cases did not return case.caseId");

  const runCreated = await postJson(`/api/cases/${caseId}/runs`, {
    userId: "canonical-api-verifier"
  });
  const runId = runCreated.run?.runId;
  if (!runId) throw new Error("POST /api/cases/:id/runs did not return run.runId");
  if (runCreated.run.caseId !== caseId) throw new Error("case-scoped run did not preserve caseId");
  if (runCreated.run.lifecycle?.state !== "planning") throw new Error("case-scoped run did not initialize planning lifecycle");
  if (runCreated.run.lifecycle?.terminal !== false) throw new Error("new run lifecycle should not be terminal");

  await sleep(1500);
  const runFetched = await getJson(`/api/runs/${runId}`);
  if (runFetched.run?.runId !== runId) throw new Error("GET /api/runs/:id did not return the saved run");
  if (!["ready", "insufficient", "blocked"].includes(runFetched.run.lifecycle?.state)) {
    throw new Error("GET /api/runs/:id did not advance to a terminal lifecycle state");
  }
  for (const state of ["planning", "retrieving", "verifying"]) {
    if (!runFetched.run.lifecycle?.checkpoints?.some((checkpoint) => checkpoint.state === state)) {
      throw new Error(`lifecycle missing ${state} checkpoint`);
    }
  }

  const official = await postJson("/api/official-api-search", {
    runId,
    rawQuery: "CA school board meetings and public spending oversight",
    caseId,
    enableNetwork: false,
    maxTasks: 3,
    maxResults: 2
  });
  if (!official.ok || !official.ledger_entry) throw new Error("official API search did not create a ledger entry");

  const ledger = await getJson(`/api/runs/${runId}/ledger`);
  if (!ledger.ledger?.some((entry) => entry.entry_type === "official_api_search")) {
    throw new Error("GET /api/runs/:id/ledger missing official_api_search row");
  }

  const board = await getJson(`/api/runs/${runId}/case-board`);
  if (board.caseBoard?.runId !== runId) throw new Error("case-board response missing runId");
  if (!board.caseBoard?.candidateQueue?.length) throw new Error("case-board response missing candidate queue");
  if (board.caseBoard?.invariants?.candidates_are_evidence !== false) {
    throw new Error("case-board invariant allowed candidates as evidence");
  }

  const exportPacket = await getJson(`/api/runs/${runId}/export`);
  if (exportPacket.export?.runId !== runId) throw new Error("export packet missing runId");
  if (exportPacket.export?.publicSafe !== true) throw new Error("export packet is not marked public-safe");
  if (!exportPacket.export?.payload?.limitations?.some((item) => item.includes("candidate leads"))) {
    throw new Error("export packet missing candidate-only limitation");
  }

  const retryResult = await postJson(`/api/runs/${runId}/retry`, {
    taskType: "official_api",
    taskId: "official_api_retry"
  });
  if (retryResult.run?.lifecycle?.state !== "retrieving") throw new Error("retry endpoint did not reopen retrieval lifecycle");
  if (retryResult.ledger_entry?.status !== "retry_queued") throw new Error("retry endpoint did not emit retry ledger row");

  const cancelled = await postJson(`/api/runs/${runId}/cancel`, {
    reason: "canonical_api_verifier"
  });
  if (cancelled.run?.lifecycle?.state !== "cancelled") throw new Error("cancel endpoint did not cancel lifecycle");
  if (cancelled.run?.lifecycle?.terminal !== true) throw new Error("cancelled lifecycle should be terminal");
  const cancelledBoard = await getJson(`/api/runs/${runId}/case-board`);
  if (!cancelledBoard.caseBoard?.failedSources?.some((entry) => entry.entry_type === "task_retry")) {
    throw new Error("case-board did not preserve retry/failed-source visibility");
  }

  console.log("Canonical case/run API verification passed.");
} finally {
  child?.kill();
  await sleep(300);
  rmSync(storeDir, { recursive: true, force: true });
  rmSync(receiptDir, { recursive: true, force: true });
  rmSync(dirname(tracePath), { recursive: true, force: true });
}

async function postJson(path, body) {
  const response = await fetch(`http://127.0.0.1:${activePort}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function getJson(path) {
  const response = await fetch(`http://127.0.0.1:${activePort}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}
