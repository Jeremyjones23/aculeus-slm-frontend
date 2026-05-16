import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBoardPath = resolve(root, "data", "source-fed-case-board.json");
const defaultVerifierPath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_lausd_allhere_ocr_vendor_term_verifier_20260516.json");

const boardPath = resolve(process.argv[2] || defaultBoardPath);
const verifierPath = resolve(process.argv[3] || defaultVerifierPath);
const jsPath = boardPath.replace(/\.json$/i, ".js");

if (!existsSync(boardPath)) {
  console.error(`Missing board JSON: ${boardPath}`);
  process.exit(1);
}
if (!existsSync(verifierPath)) {
  console.error(`Missing LAUSD AllHere OCR verifier JSON: ${verifierPath}`);
  process.exit(1);
}

const library = JSON.parse(readFileSync(boardPath, "utf8"));
const verifier = JSON.parse(readFileSync(verifierPath, "utf8"));
const targetCaseId = "source_ca_school_board_spending";
const targetCase = (library.cases || []).find((item) => item.caseId === targetCaseId);

if (!targetCase) {
  console.error(`Missing target case: ${targetCaseId}`);
  process.exit(1);
}
if (verifier.status !== "PASS" || verifier.decision !== "LAUSD_ALLHERE_OCR_VENDOR_TERMS_VERIFIED_NARROW_SCOPE") {
  console.error("LAUSD AllHere OCR verifier is not in the narrow-scope PASS state.");
  process.exit(1);
}

const gate = verifier.evidence_gate || {};
const fact = {
  evidenceId: verifier.extract_id,
  inputRecordId: verifier.input_record_id,
  status: "citation_verified_ocr_vendor_fact",
  contractorName: "All Here Education, Inc.",
  identificationNumber: "4400011417",
  rfpNumber: "RFP 2000002930",
  fundSource: "General Funds",
  boardReport: "Board of Education Report No. 317-22/23",
  amount: "$6,200,000",
  term: "07/01/23 to 06/30/25",
  pageNumber: verifier.page_number,
  extractionSource: verifier.page_extraction_source,
  url: verifier.url,
  allowedClaimScope: "Supports only the narrow LAUSD board-report authorization facts for the listed contractor, amount, source of funds, identification number, RFP number, and initial term.",
  unsupportedScopes: verifier.blocked_claim_scopes || [],
  promotionScope: gate.promotion_scope || "narrow_official_record_reference_only"
};

targetCase.officialOcrVendorFacts = [fact];
targetCase.sources = targetCase.sources || [];

const sourceExists = targetCase.sources.some((source) => source.sourceId === fact.evidenceId);
if (!sourceExists) {
  targetCase.sources.push({
    sourceId: fact.evidenceId,
    title: "LAUSD Board Report 317-22/23 OCR vendor extract",
    type: "official_public_record",
    publisher: "LAUSD Board of Education",
    role: "official, citation_verified_ocr_vendor_fact, usable_as_evidence_for_narrow_board_report_fact",
    confidence: "narrow_ocr_vendor_fact_verified",
    visibility: "source_fed_case_board",
    url: fact.url,
    hash: "",
    excerpt: `${fact.boardReport}; ${fact.contractorName}; ${fact.identificationNumber}; ${fact.rfpNumber}; ${fact.fundSource}; ${fact.amount}; term=${fact.term}`,
    quotedExcerpt: `${fact.boardReport}; ${fact.contractorName}; ${fact.identificationNumber}; ${fact.rfpNumber}; ${fact.fundSource}; ${fact.amount}; term=${fact.term}`,
    limitation: "Supports only narrow LAUSD board-report authorization facts; it does not prove actual payment, performance, compliance, fraud, waste, intent, or liability.",
    supportLevel: "supported_narrow_ocr_vendor_fact",
    retrievalMethod: "official_pdf_pymupdf_ocr_verifier",
    pageNumber: fact.pageNumber,
    matchedTerms: verifier.verified_terms || [],
    amountCandidates: [fact.amount]
  });
}

targetCase.commandCenter = targetCase.commandCenter || {};
targetCase.commandCenter.move = "Use the verified OCR board-report fact as a narrow record lead; request the executed contract, invoices, and performance records before any broader conclusion.";
library.runStatus = {
  ...(library.runStatus || {}),
  lausdAllHereOcrVendorFacts: 1,
  lausdAllHereOcrVendorFactsGate: "NARROW_OCR_VENDOR_FACTS_VERIFIED"
};

writeFileSync(boardPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(jsPath, `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`, "utf8");

console.log("Integrated 1 LAUSD AllHere OCR vendor fact.");
console.log(boardPath);
console.log(jsPath);
