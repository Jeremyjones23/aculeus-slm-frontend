import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBoardPath = resolve(root, "data", "source-fed-case-board.json");
const defaultScopePath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_chirla_official_record_scope_verifier_20260516.json");

const boardPath = resolve(process.argv[2] || defaultBoardPath);
const scopePath = resolve(process.argv[3] || defaultScopePath);
const jsPath = boardPath.replace(/\.json$/i, ".js");

if (!existsSync(boardPath)) {
  console.error(`Missing board JSON: ${boardPath}`);
  process.exit(1);
}
if (!existsSync(scopePath)) {
  console.error(`Missing CHIRLA scope JSON: ${scopePath}`);
  process.exit(1);
}

const library = JSON.parse(readFileSync(boardPath, "utf8"));
const manifest = JSON.parse(readFileSync(scopePath, "utf8"));
const targetCaseId = "source_becerra_chirla";
const targetCase = (library.cases || []).find((item) => item.caseId === targetCaseId);

if (!targetCase) {
  console.error(`Missing target case: ${targetCaseId}`);
  process.exit(1);
}
if (manifest.status !== "PASS" || manifest.decision !== "CHIRLA_OFFICIAL_RECORD_SCOPE_VERIFIED_REVIEW_ONLY") {
  console.error("CHIRLA official-record scope manifest is not ready.");
  process.exit(1);
}
if (manifest.scope_gate?.training_conversion_allowed !== false || manifest.scope_gate?.quid_pro_quo_or_intent_claim_allowed !== false) {
  console.error("CHIRLA official-record scope manifest has unsafe promotion flags.");
  process.exit(1);
}

const lanes = (manifest.lanes || []).map((lane) => ({
  laneId: lane.lane_id,
  status: lane.status,
  officialRecordCount: lane.official_record_count,
  visibleFindingCount: lane.visible_finding_count,
  citationPassCount: lane.citation_pass_count,
  weakOrRejectedClaimCount: lane.weak_or_rejected_claim_count,
  unsupportedLinkageRejected: lane.unsupported_linkage_rejected,
  trainingConversionAllowed: lane.training_conversion_allowed,
  sourceBodiesPersisted: lane.raw_source_bodies_persisted,
  modelFindingsGenerated: lane.model_findings_generated
}));

targetCase.chirlaOfficialRecordScope = {
  status: "review_only",
  decision: manifest.decision,
  laneCount: manifest.lane_count,
  lanes,
  evidencePosture: "official_records_only_no_linkage_or_intent_claim",
  unsupportedLinkageRejected: manifest.scope_gate.unsupported_linkage_claim_rejected,
  trainingConversionAllowed: manifest.scope_gate.training_conversion_allowed,
  sourceBodiesPersisted: manifest.scope_gate.source_bodies_persisted,
  modelFindingsGenerated: manifest.scope_gate.model_generated_findings_allowed,
  quidProQuoOrIntentClaimAllowed: manifest.scope_gate.quid_pro_quo_or_intent_claim_allowed,
  nextAction: manifest.next_exact_action
};

targetCase.commandCenter = targetCase.commandCenter || {};
targetCase.commandCenter.officialRecordScope = "IRS TEOS and CA SOS records can support official-record references; alleged linkage or intent remains rejected without stronger official records.";
library.runStatus = {
  ...(library.runStatus || {}),
  chirlaOfficialRecordScopeDecision: manifest.decision,
  chirlaOfficialRecordScopeLanes: manifest.lane_count
};

writeFileSync(boardPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(jsPath, `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`, "utf8");

console.log(`Integrated CHIRLA official-record scope lanes: ${manifest.lane_count}.`);
console.log(boardPath);
console.log(jsPath);
