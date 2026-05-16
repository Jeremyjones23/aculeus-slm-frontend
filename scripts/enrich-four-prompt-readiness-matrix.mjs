import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBoardPath = resolve(root, "data", "source-fed-case-board.json");
const defaultMatrixPath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_four_prompt_readiness_matrix_20260516.json");

const boardPath = resolve(process.argv[2] || defaultBoardPath);
const matrixPath = resolve(process.argv[3] || defaultMatrixPath);
const jsPath = boardPath.replace(/\.json$/i, ".js");

if (!existsSync(boardPath)) {
  console.error(`Missing board JSON: ${boardPath}`);
  process.exit(1);
}
if (!existsSync(matrixPath)) {
  console.error(`Missing four-prompt matrix JSON: ${matrixPath}`);
  process.exit(1);
}

const library = JSON.parse(readFileSync(boardPath, "utf8"));
const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));

if (matrix.status !== "PASS" || matrix.decision !== "FOUR_PROMPT_SOURCE_FED_READINESS_PASS_REVIEW_ONLY") {
  console.error("Four-prompt readiness matrix is not ready.");
  process.exit(1);
}
if (matrix.case_count !== 4 || !Array.isArray(matrix.rows)) {
  console.error("Four-prompt readiness matrix does not cover four cases.");
  process.exit(1);
}

library.fourPromptReadiness = {
  status: "review_only",
  decision: matrix.decision,
  caseCount: matrix.case_count,
  truthIndexArtifactCount: matrix.source_of_truth?.truth_index_artifact_count,
  rows: matrix.rows.map((row) => ({
    caseId: row.case_id,
    topic: row.topic,
    status: row.status,
    findingCount: row.finding_count,
    sourceCount: row.source_count,
    findingPromotionPosture: row.finding_promotion_posture,
    trainingConversionAllowed: row.training_conversion_allowed
  })),
  nextAction: matrix.next_exact_action
};

writeFileSync(boardPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(jsPath, `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`, "utf8");

console.log(`Integrated four-prompt readiness cases: ${matrix.case_count}.`);
console.log(boardPath);
console.log(jsPath);
