import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBoardPath = resolve(root, "data", "source-fed-case-board.json");
const defaultQueuePath = resolve(root, "..", "..", "DOGE", "slm_training", "source_queues", "aculeus_lausd_allhere_browser_capture_queue_20260516.json");

const boardPath = resolve(process.argv[2] || defaultBoardPath);
const queuePath = resolve(process.argv[3] || defaultQueuePath);
const jsPath = boardPath.replace(/\.json$/i, ".js");

if (!existsSync(boardPath)) {
  console.error(`Missing board JSON: ${boardPath}`);
  process.exit(1);
}
if (!existsSync(queuePath)) {
  console.error(`Missing browser capture queue JSON: ${queuePath}`);
  process.exit(1);
}

const library = JSON.parse(readFileSync(boardPath, "utf8"));
const queue = JSON.parse(readFileSync(queuePath, "utf8"));
const targetCaseId = "source_ca_school_board_spending";
const targetCase = (library.cases || []).find((item) => item.caseId === targetCaseId);

if (!targetCase) {
  console.error(`Missing target case: ${targetCaseId}`);
  process.exit(1);
}
if (queue.status !== "PASS" || queue.decision !== "LAUSD_ALLHERE_BROWSER_CAPTURE_QUEUE_READY") {
  console.error("Browser capture queue is not ready.");
  process.exit(1);
}

targetCase.browserCaptureTasks = (queue.tasks || []).map((task) => ({
  taskId: task.task_id,
  status: task.execution_status,
  targetRecord: task.target_record,
  recordFamily: task.record_family,
  captureMethod: task.capture_method,
  captureReason: task.capture_reason,
  evidencePosture: task.evidence_posture,
  url: task.url,
  sourceProvider: task.source_provider,
  providerLocatorTerms: task.provider_locator_terms || [],
  findingPromotionAllowed: task.finding_promotion_allowed,
  trainingConversionAllowed: task.training_conversion_allowed
}));

targetCase.commandCenter = targetCase.commandCenter || {};
targetCase.commandCenter.captureQueue = "Capture the queued public browser receipts before using provider-only locators as evidence.";
library.runStatus = {
  ...(library.runStatus || {}),
  lausdAllHereBrowserCaptureTasks: targetCase.browserCaptureTasks.length,
  lausdAllHereBrowserCaptureGate: "BROWSER_OR_MANUAL_PUBLIC_RECEIPT_REQUIRED"
};

writeFileSync(boardPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(jsPath, `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`, "utf8");

console.log(`Integrated ${targetCase.browserCaptureTasks.length} LAUSD browser capture tasks.`);
console.log(boardPath);
console.log(jsPath);
