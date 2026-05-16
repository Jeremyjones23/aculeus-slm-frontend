import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBoardPath = resolve(root, "data", "source-fed-case-board.json");
const defaultVerifierPath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_lacity_lahsa_contract_pdf_field_atom_verifier_20260516.json");

const boardPath = resolve(process.argv[2] || defaultBoardPath);
const verifierPath = resolve(process.argv[3] || defaultVerifierPath);
const jsPath = boardPath.replace(/\.json$/i, ".js");

if (!existsSync(boardPath)) {
  console.error(`Missing board JSON: ${boardPath}`);
  process.exit(1);
}
if (!existsSync(verifierPath)) {
  console.error(`Missing LAHSA contract PDF atom verifier JSON: ${verifierPath}`);
  process.exit(1);
}

const library = JSON.parse(readFileSync(boardPath, "utf8"));
const verifier = JSON.parse(readFileSync(verifierPath, "utf8"));
const targetCase = (library.cases || []).find((item) => item.caseId === "source_la_homelessness_fwa");

if (!targetCase) {
  console.error("Missing target case: source_la_homelessness_fwa");
  process.exit(1);
}
if (verifier.status !== "PASS" || verifier.decision !== "LACITY_LAHSA_CONTRACT_PDF_FIELD_ATOMS_VERIFIED_NARROW_SCOPE") {
  console.error("LAHSA contract PDF atom verifier is not in the narrow-scope PASS state.");
  process.exit(1);
}

const facts = (verifier.atoms || [])
  .filter((atom) => atom.status === "verified_narrow_contract_summary_fact")
  .map((atom) => ({
    evidenceId: atom.atom_id,
    status: atom.status,
    contractId: atom.contract_id,
    entity: atom.entity,
    verifiedAmountCandidates: atom.verified_amount_candidates || [],
    amendmentCandidates: atom.amendment_candidates || [],
    rejectedSmallAmountCandidates: atom.rejected_small_amount_candidates || [],
    pageCount: atom.page_count,
    textCharCount: atom.text_char_count,
    url: atom.url,
    contentSha256: atom.content_sha256,
    excerptSha256: atom.excerpt_sha256,
    allowedClaimScope: atom.accepted_claim_scope,
    unsupportedScopes: ["fraud", "waste", "abuse", "payment impropriety", "contract breach", "program performance", "service quality", "training conversion"],
    trainingConversionAllowed: atom.training_conversion_allowed
  }));

if (facts.length < 8) {
  console.error(`Expected at least 8 verified LAHSA contract PDF facts, got ${facts.length}.`);
  process.exit(1);
}

targetCase.officialLacityLahsaContractPdfFacts = facts;
targetCase.sources = targetCase.sources || [];
const existingSourceIds = new Set(targetCase.sources.map((source) => source.sourceId));
const newSources = facts
  .filter((fact) => !existingSourceIds.has(fact.evidenceId))
  .map((fact) => ({
    sourceId: fact.evidenceId,
    title: `LA City Clerk contract C-140706 PDF atom - ${fact.verifiedAmountCandidates[0] || "amount candidate"}`,
    type: "official_public_record",
    publisher: "Los Angeles City Clerk",
    role: "official, citation_verified_contract_summary_fact, usable_as_evidence_for_narrow_contract_summary_atom",
    confidence: "narrow_contract_summary_atom_verified",
    visibility: "source_fed_case_board",
    url: fact.url,
    hash: fact.contentSha256,
    excerpt: `${fact.contractId}; ${fact.entity}; amount_candidates=${fact.verifiedAmountCandidates.join(", ")}; amendments=${fact.amendmentCandidates.join(", ")}`,
    quotedExcerpt: `${fact.contractId}; ${fact.entity}; amount_candidates=${fact.verifiedAmountCandidates.join(", ")}; amendments=${fact.amendmentCandidates.join(", ")}`,
    limitation: "Supports only narrow LA City Clerk contract-summary field atoms; it does not prove fraud, payment impropriety, performance, service quality, intent, or liability.",
    supportLevel: "supported_narrow_contract_summary_atom",
    retrievalMethod: "official_pdf_pymupdf_field_atom_verifier",
    pageNumber: null,
    matchedTerms: ["C-140706", "LAHSA", "Los Angeles Homeless Services Authority"],
    amountCandidates: fact.verifiedAmountCandidates
  }));

targetCase.sources = [...targetCase.sources, ...newSources];
targetCase.commandCenter = targetCase.commandCenter || {};
targetCase.commandCenter.move = "Use verified City Clerk contract-summary atoms as narrow LAHSA contract facts; request invoices, monitoring records, and performance files before any broader conclusion.";
library.runStatus = {
  ...(library.runStatus || {}),
  lacityLahsaContractPdfFacts: facts.length,
  lacityLahsaContractPdfFactsGate: "NARROW_LACITY_LAHSA_CONTRACT_PDF_FACTS_VERIFIED"
};

writeFileSync(boardPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(jsPath, `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`, "utf8");

console.log(`Integrated ${facts.length} LAHSA contract PDF facts.`);
console.log(boardPath);
console.log(jsPath);
