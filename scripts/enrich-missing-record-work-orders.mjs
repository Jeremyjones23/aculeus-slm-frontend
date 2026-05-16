import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBoardPath = resolve(root, "data", "source-fed-case-board.json");
const defaultWorkOrderPath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_missing_record_work_orders_20260516.json");

const boardPath = resolve(process.argv[2] || defaultBoardPath);
const workOrderPath = resolve(process.argv[3] || defaultWorkOrderPath);
const jsPath = boardPath.replace(/\.json$/i, ".js");

if (!existsSync(boardPath)) {
  console.error(`Missing board JSON: ${boardPath}`);
  process.exit(1);
}
if (!existsSync(workOrderPath)) {
  console.error(`Missing work-order JSON: ${workOrderPath}`);
  process.exit(1);
}

const library = JSON.parse(readFileSync(boardPath, "utf8"));
const manifest = JSON.parse(readFileSync(workOrderPath, "utf8"));

if (manifest.status !== "PASS" || manifest.decision !== "MISSING_RECORD_WORK_ORDERS_READY_REVIEW_ONLY") {
  console.error("Missing-record work orders are not ready.");
  process.exit(1);
}
if (manifest.execution_policy?.prime_training_allowed !== false || manifest.execution_policy?.direct_finding_promotion_allowed !== false) {
  console.error("Missing-record work orders have unsafe execution flags.");
  process.exit(1);
}

library.missingRecordWorkOrders = {
  status: "queued_review_only",
  decision: manifest.decision,
  taskCount: manifest.task_count,
  tasks: (manifest.tasks || []).map((task) => ({
    taskId: task.task_id,
    caseId: task.case_id,
    recordFamily: task.record_family,
    targetRecord: task.target_record,
    providerHint: task.provider_hint,
    retrievalStatus: task.retrieval_status,
    evidencePosture: task.evidence_posture,
    findingPromotionAllowed: task.finding_promotion_allowed,
    trainingConversionAllowed: task.training_conversion_allowed
  })),
  nextAction: manifest.next_exact_action
};

writeFileSync(boardPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(jsPath, `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`, "utf8");

console.log(`Integrated missing-record work orders: ${manifest.task_count}.`);
console.log(boardPath);
console.log(jsPath);
