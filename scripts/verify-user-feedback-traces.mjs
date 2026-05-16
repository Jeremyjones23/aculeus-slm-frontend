import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { buildUserFeedbackSignal, validateUserFeedbackSignal } from "../lib/aculeus-user-feedback.js";

const signal = buildUserFeedbackSignal({
  runId: "run_feedback_unit",
  caseId: "case_feedback_unit",
  type: "opened_evidence"
});
const signalIssues = validateUserFeedbackSignal(signal);
if (signalIssues.length) throw new Error(`Feedback signal validation failed:\n${signalIssues.join("\n")}`);

const port = 4522;
const storeDir = mkdtempSync(join(tmpdir(), "aculeus-feedback-store-"));
const receiptDir = mkdtempSync(join(tmpdir(), "aculeus-feedback-receipts-"));
const tempTraceDir = mkdtempSync(join(tmpdir(), "aculeus-feedback-traces-"));
const tracePath = join(tempTraceDir, "traces.jsonl");
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
if (!existsSync(join(process.cwd(), ".next", "BUILD_ID"))) {
  const build = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8"
  });
  if (build.status !== 0) {
    throw new Error(`User feedback route verifier could not create a production build.\n${build.stdout}\n${build.stderr}`);
  }
}
const command = "start";
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

  const run = await postJson("/api/runs/start", {
    lead: "Trace user feedback against official public-record source trail.",
    caseId: "case_feedback_route"
  });
  const runId = run.run?.runId;
  if (!runId) throw new Error("run start did not return run id");

  const feedback = await postJson(`/api/runs/${runId}/feedback`, {
    type: "saved_or_exported",
    note: "Operator saved the case board for review."
  });
  if (!feedback.ok) throw new Error("feedback route failed");
  if (feedback.feedback?.training_conversion_allowed !== false) throw new Error("feedback enabled automatic training conversion");
  if (feedback.training_trace?.review_status !== "needs_human_review_before_training") throw new Error("feedback trace ref missing review gate");

  const store = JSON.parse(readFileSync(join(storeDir, "local-store.json"), "utf8"));
  const savedRun = store.runs.find((item) => item.runId === runId);
  if (!savedRun?.ledger?.some((entry) => entry.entry_type === "user_feedback" && entry.feedback?.feedback_type === "saved_or_exported")) {
    throw new Error("feedback ledger entry was not persisted");
  }
  if (!savedRun?.trainingTraces?.some((trace) => trace.trace_id === feedback.training_trace.trace_id)) {
    throw new Error("feedback trace ref was not attached to run");
  }

  const traceRows = readFileSync(tracePath, "utf8").trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const feedbackTrace = traceRows.find((row) => row.action === "user_feedback" && row.run_id === runId);
  if (!feedbackTrace) throw new Error("feedback trace row missing from substrate");
  if (feedbackTrace.user_feedback?.saved_or_exported !== true) throw new Error("feedback trace missing saved/exported signal");
  if (!feedbackTrace.score_payload || feedbackTrace.training_conversion_allowed !== false) {
    throw new Error("feedback trace missing score payload or offline-training gate");
  }

  const ui = readFileSync(join(process.cwd(), "components", "aculeus-workspace-sections.jsx"), "utf8");
  for (const phrase of ["User feedback is saved for offline review.", "Opened evidence", "Saved/exported", "Flag hallucination", "Dismiss finding"]) {
    if (!ui.includes(phrase)) throw new Error(`feedback UI missing phrase: ${phrase}`);
  }

  console.log("User feedback trace verification passed.");
} finally {
  child.kill();
  await sleep(300);
  rmSync(storeDir, { recursive: true, force: true });
  rmSync(receiptDir, { recursive: true, force: true });
  rmSync(dirname(tracePath), { recursive: true, force: true });
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
