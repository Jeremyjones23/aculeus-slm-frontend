import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBoardPath = resolve(root, "data", "source-fed-case-board.json");
const defaultLookupPath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_ca_sos_calaccess_entity_lookup_20260516.json");
const defaultWorkOrdersPath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_calaccess_followup_work_orders_20260516.json");
const defaultAtomPath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_calaccess_filing_atom_packet_20260516.json");
const defaultVerifierPath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_calaccess_filing_atom_verifier_20260516.json");

const boardPath = resolve(process.argv[2] || defaultBoardPath);
const lookupPath = resolve(process.argv[3] || defaultLookupPath);
const workOrdersPath = resolve(process.argv[4] || defaultWorkOrdersPath);
const atomPath = resolve(process.argv[5] || defaultAtomPath);
const verifierPath = resolve(process.argv[6] || defaultVerifierPath);
const jsPath = boardPath.replace(/\.json$/i, ".js");

if (!existsSync(boardPath)) {
  console.error(`Missing board JSON: ${boardPath}`);
  process.exit(1);
}
if (!existsSync(lookupPath)) {
  console.error(`Missing CAL-ACCESS lookup JSON: ${lookupPath}`);
  process.exit(1);
}

const library = JSON.parse(readFileSync(boardPath, "utf8"));
const manifest = JSON.parse(readFileSync(lookupPath, "utf8"));
const workOrders = existsSync(workOrdersPath) ? JSON.parse(readFileSync(workOrdersPath, "utf8")) : null;
const atomPacket = existsSync(atomPath) ? JSON.parse(readFileSync(atomPath, "utf8")) : null;
const atomVerifier = existsSync(verifierPath) ? JSON.parse(readFileSync(verifierPath, "utf8")) : null;
const targetCaseId = "source_becerra_chirla";
const targetCase = (library.cases || []).find((item) => item.caseId === targetCaseId);

if (!targetCase) {
  console.error(`Missing target case: ${targetCaseId}`);
  process.exit(1);
}
if (manifest.status !== "PASS" || manifest.decision !== "CALACCESS_ENTITY_LOOKUP_HASH_ONLY_READY") {
  console.error("CAL-ACCESS entity lookup manifest is not ready.");
  process.exit(1);
}
if (manifest.raw_rows_persisted !== false || manifest.finding_promotion_allowed !== false || manifest.training_conversion_allowed !== false || manifest.linkage_or_influence_claim_allowed !== false) {
  console.error("CAL-ACCESS entity lookup has unsafe promotion flags.");
  process.exit(1);
}
if (workOrders && (workOrders.status !== "PASS" || workOrders.finding_promotion_allowed !== false || workOrders.training_conversion_allowed !== false || workOrders.prime_training_allowed !== false)) {
  console.error("CAL-ACCESS follow-up work orders have unsafe flags.");
  process.exit(1);
}
if (atomPacket && (atomPacket.status !== "PASS" || atomPacket.raw_rows_persisted !== false || atomPacket.linkage_or_influence_claim_allowed !== false)) {
  console.error("CAL-ACCESS filing atom packet has unsafe flags.");
  process.exit(1);
}
if (atomVerifier && (atomVerifier.status !== "PASS" || atomVerifier.linkage_or_influence_claim_allowed !== false)) {
  console.error("CAL-ACCESS filing atom verifier has unsafe flags.");
  process.exit(1);
}

targetCase.calaccessEntityLookup = {
  status: "review_only",
  decision: manifest.decision,
  tables: manifest.tables || [],
  terms: manifest.terms || [],
  totalMatches: manifest.total_matches,
  rawRowsPersisted: manifest.raw_rows_persisted,
  findingPromotionAllowed: manifest.finding_promotion_allowed,
  trainingConversionAllowed: manifest.training_conversion_allowed,
  linkageOrInfluenceClaimAllowed: manifest.linkage_or_influence_claim_allowed,
  lookups: (manifest.lookups || []).map((lookup) => ({
    table: lookup.table,
    status: lookup.status,
    rowCountScanned: lookup.row_count_scanned,
    headerColumnCount: lookup.header_column_count,
    matchCount: lookup.match_count
  })),
  followupTaskCount: workOrders?.task_count || 0,
  followupTasks: (workOrders?.tasks || []).map((task) => ({
    taskId: task.task_id,
    sourceTable: task.source_table,
    rowNumber: task.row_number,
    evidencePosture: task.evidence_posture,
    retrievalStatus: task.retrieval_status,
    targetRecord: task.target_record,
    findingPromotionAllowed: task.finding_promotion_allowed,
    trainingConversionAllowed: task.training_conversion_allowed,
    linkageOrInfluenceClaimAllowed: task.linkage_or_influence_claim_allowed
  })),
  filingAtomDecision: atomPacket?.decision || null,
  filingAtomVerifierDecision: atomVerifier?.decision || null,
  filingAtomCount: atomPacket?.atom_count || 0,
  exactTargetEntityMatches: atomVerifier?.exact_target_entity_match_count || 0,
  surnameOnlyNonTargetCount: atomVerifier?.surname_only_non_target_count || 0,
  filingAtoms: (atomPacket?.atoms || []).map((atom) => ({
    atomId: atom.atom_id,
    filingId: atom.filing_id,
    formType: atom.form_type,
    candidateName: atom.candidate_name,
    exactTargetEntityMatch: atom.exact_target_entity_match,
    entityMatchScope: atom.entity_match_scope,
    allowedClaimScope: atom.allowed_claim_scope,
    linkageOrInfluenceClaimAllowed: false
  })),
  publicOutputRule: manifest.public_output_rule,
  nextAction: workOrders?.next_exact_action || manifest.next_exact_action
};

targetCase.commandCenter = targetCase.commandCenter || {};
targetCase.commandCenter.calaccessLookup = "CAL-ACCESS produced hash-only locator matches; linkage, influence, intent, or misconduct claims remain blocked pending linked official records.";
library.runStatus = {
  ...(library.runStatus || {}),
  calaccessEntityLookupDecision: manifest.decision,
  calaccessEntityLookupMatches: manifest.total_matches,
  calaccessFollowupWorkOrders: workOrders?.task_count || 0,
  calaccessFilingAtoms: atomPacket?.atom_count || 0,
  calaccessExactTargetMatches: atomVerifier?.exact_target_entity_match_count || 0
};

writeFileSync(boardPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(jsPath, `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`, "utf8");

console.log(`Integrated CAL-ACCESS entity lookup matches: ${manifest.total_matches}.`);
console.log(boardPath);
console.log(jsPath);
