import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBoardPath = resolve(root, "data", "source-fed-case-board.json");
const defaultVerifierPath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_state_local_row_citation_verifier_20260516.json");

const boardPath = resolve(process.argv[2] || defaultBoardPath);
const verifierPath = resolve(process.argv[3] || defaultVerifierPath);
const jsPath = boardPath.replace(/\.json$/i, ".js");

if (!existsSync(boardPath)) {
  console.error(`Missing board JSON: ${boardPath}`);
  process.exit(1);
}
if (!existsSync(verifierPath)) {
  console.error(`Missing state/local row verifier JSON: ${verifierPath}`);
  process.exit(1);
}

const library = JSON.parse(readFileSync(boardPath, "utf8"));
const verifier = JSON.parse(readFileSync(verifierPath, "utf8"));

if (verifier.status !== "PASS" || verifier.decision !== "STATE_LOCAL_ROW_FIELD_ATOMS_CITATION_VERIFIED_NARROW_SCOPE") {
  console.error("State/local row verifier is not in the narrow-scope PASS state.");
  process.exit(1);
}

const facts = (verifier.verifier_results || []).filter((result) => result.status === "PASS").map((result) => {
  const atoms = result.approved_atoms || {};
  return {
    evidenceId: result.evidence_id,
    locatorId: result.locator_id,
    status: "citation_verified_state_local_row_fact",
    surface: atoms.surface || result.surface || "",
    sourceFamily: atoms.source_family || "",
    datasetOrResourceId: atoms.dataset_or_resource_id || "",
    rowHash: atoms.row_hash || "",
    rowIndex: atoms.row_index || "",
    sampleFields: atoms.sample_fields || {},
    url: result.url,
    allowedClaimScope: result.allowed_claim_scope,
    unsupportedScopes: result.unsupported_scopes || []
  };
});

if (!facts.length) {
  console.error("No verified state/local row facts found.");
  process.exit(1);
}

library.officialStateLocalRowFacts = facts;
library.runStatus = {
  ...(library.runStatus || {}),
  stateLocalRowFacts: facts.length,
  stateLocalRowFactsGate: "NARROW_STATE_LOCAL_ROW_FACTS_VERIFIED"
};

writeFileSync(boardPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(jsPath, `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`, "utf8");

console.log(`Integrated ${facts.length} state/local row facts.`);
console.log(boardPath);
console.log(jsPath);
