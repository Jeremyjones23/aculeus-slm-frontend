import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBoardPath = resolve(root, "data", "source-fed-case-board.json");
const defaultParityPath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_sfdph_scope_parity_verifier_20260516.json");

const boardPath = resolve(process.argv[2] || defaultBoardPath);
const parityPath = resolve(process.argv[3] || defaultParityPath);
const jsPath = boardPath.replace(/\.json$/i, ".js");

if (!existsSync(boardPath)) {
  console.error(`Missing board JSON: ${boardPath}`);
  process.exit(1);
}
if (!existsSync(parityPath)) {
  console.error(`Missing SFDPH parity JSON: ${parityPath}`);
  process.exit(1);
}

const library = JSON.parse(readFileSync(boardPath, "utf8"));
const manifest = JSON.parse(readFileSync(parityPath, "utf8"));
const targetCaseId = "source_sf_drug_rehabilitation_fwa";
const targetCase = (library.cases || []).find((item) => item.caseId === targetCaseId);

if (!targetCase) {
  console.error(`Missing target case: ${targetCaseId}`);
  process.exit(1);
}
if (manifest.status !== "PASS" || manifest.decision !== "SFDPH_SCOPE_PARITY_VERIFIED_REVIEW_ONLY") {
  console.error("SFDPH scope parity manifest is not ready.");
  process.exit(1);
}
if (manifest.scope_gate?.training_conversion_allowed !== false || manifest.scope_gate?.fraud_or_intent_claim_allowed !== false) {
  console.error("SFDPH scope parity manifest has unsafe promotion flags.");
  process.exit(1);
}

const lanes = (manifest.lanes || []).map((lane) => ({
  laneId: lane.lane_id,
  status: lane.status,
  visibleFindingCount: lane.visible_finding_count,
  citationPassCount: lane.citation_pass_count,
  citationBlockedCount: lane.citation_blocked_count,
  targetedExtractCount: lane.targeted_extract_count,
  blockedCitationsHiddenFromFindings: lane.blocked_citations_hidden_from_findings,
  findingPromotionAllowed: lane.targeted_extract_finding_promotion_allowed,
  trainingConversionAllowed: lane.targeted_extract_training_conversion_allowed
}));

targetCase.sfdphScopeParity = {
  status: "review_only",
  decision: manifest.decision,
  laneCount: manifest.lane_count,
  lanes,
  evidencePosture: "citation_pass_findings_only_blocked_rows_in_audit_trail",
  blockedCitationsHiddenFromFindings: manifest.scope_gate.blocked_citation_rows_hidden_from_findings,
  findingPromotionAllowed: false,
  trainingConversionAllowed: manifest.scope_gate.training_conversion_allowed,
  fraudOrIntentClaimAllowed: manifest.scope_gate.fraud_or_intent_claim_allowed,
  nextAction: manifest.next_exact_action
};

targetCase.commandCenter = targetCase.commandCenter || {};
targetCase.commandCenter.scopeParity = "SFDPH lanes are review-only parity cases: visible findings require citation-pass rows, blocked verifier rows stay in the audit trail, and broader conclusions require stronger records.";
library.runStatus = {
  ...(library.runStatus || {}),
  sfdphScopeParityDecision: manifest.decision,
  sfdphScopeParityLanes: manifest.lane_count
};

writeFileSync(boardPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(jsPath, `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`, "utf8");

console.log(`Integrated SFDPH scope parity lanes: ${manifest.lane_count}.`);
console.log(boardPath);
console.log(jsPath);
