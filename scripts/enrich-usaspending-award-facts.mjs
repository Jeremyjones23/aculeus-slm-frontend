import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBoardPath = resolve(root, "data", "source-fed-case-board.json");
const defaultVerifierPath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_usaspending_citation_verifier_lahsa_20260516.json");

const boardPath = resolve(process.argv[2] || defaultBoardPath);
const verifierPath = resolve(process.argv[3] || defaultVerifierPath);
const jsPath = boardPath.replace(/\.json$/i, ".js");

if (!existsSync(boardPath)) {
  console.error(`Missing board JSON: ${boardPath}`);
  process.exit(1);
}
if (!existsSync(verifierPath)) {
  console.error(`Missing USAspending verifier JSON: ${verifierPath}`);
  process.exit(1);
}

const library = JSON.parse(readFileSync(boardPath, "utf8"));
const verifier = JSON.parse(readFileSync(verifierPath, "utf8"));
const targetCaseId = "source_la_homelessness_fwa";
const targetCase = (library.cases || []).find((item) => item.caseId === targetCaseId);

if (!targetCase) {
  console.error(`Missing target case: ${targetCaseId}`);
  process.exit(1);
}
if (verifier.status !== "PASS" || verifier.decision !== "USASPENDING_AWARD_FIELD_ATOMS_CITATION_VERIFIED_NARROW_SCOPE") {
  console.error("USAspending verifier is not in the narrow-scope PASS state.");
  process.exit(1);
}

const facts = (verifier.verifier_results || []).filter((result) => result.status === "PASS").map((result) => {
  const atoms = result.approved_atoms || {};
  return {
    evidenceId: result.evidence_id,
    locatorId: result.locator_id,
    status: "citation_verified_award_fact",
    recipientName: atoms.recipient_name || "",
    awardAmount: atoms.award_amount || "",
    awardingAgency: atoms.awarding_agency || "",
    awardId: atoms.award_id || "",
    startDate: atoms.start_date || "",
    endDate: atoms.end_date || "",
    url: result.url,
    allowedClaimScope: result.allowed_claim_scope,
    unsupportedScopes: result.unsupported_scopes || []
  };
});

if (!facts.length) {
  console.error("No verified USAspending award facts found.");
  process.exit(1);
}

const existingSourceIds = new Set((targetCase.sources || []).map((source) => source.sourceId));
const newSources = facts
  .filter((fact) => !existingSourceIds.has(fact.evidenceId))
  .map((fact) => ({
    sourceId: fact.evidenceId,
    title: `USAspending award - ${fact.recipientName}`,
    type: "official_public_record",
    publisher: "USAspending",
    role: "official, citation_verified_award_fact, usable_as_evidence_for_award_field_atoms",
    confidence: "narrow_award_fact_verified",
    visibility: "source_fed_case_board",
    url: fact.url,
    hash: "",
    excerpt: `${fact.recipientName}; ${fact.awardAmount}; ${fact.awardingAgency}; award_id=${fact.awardId}`,
    quotedExcerpt: `${fact.recipientName}; ${fact.awardAmount}; ${fact.awardingAgency}; award_id=${fact.awardId}`,
    limitation: "Supports only the narrow official USAspending award-listing field atoms; does not support broader allegations.",
    supportLevel: "supported_narrow_award_fact",
    retrievalMethod: "official_api_usaspending",
    pageNumber: null,
    matchedTerms: ["USAspending", fact.recipientName].filter(Boolean),
    amountCandidates: [fact.awardAmount].filter(Boolean)
  }));

targetCase.officialAwardFacts = facts;
targetCase.sources = [...(targetCase.sources || []), ...newSources];
targetCase.commandCenter = targetCase.commandCenter || {};
targetCase.commandCenter.move = "Review USAspending award-listing facts as narrow federal award records; keep performance, compliance, and misconduct claims gated.";
library.runStatus = {
  ...(library.runStatus || {}),
  usaspendingAwardFacts: facts.length,
  usaspendingAwardFactsGate: "NARROW_AWARD_FACTS_VERIFIED"
};

writeFileSync(boardPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(jsPath, `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`, "utf8");

console.log(`Integrated ${facts.length} USAspending award facts.`);
console.log(boardPath);
console.log(jsPath);
