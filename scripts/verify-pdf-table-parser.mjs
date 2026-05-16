import { createPdfTableParseTask, parsePdfTableText, validatePdfTableParse } from "../lib/aculeus-pdf-table-parser.js";

const task = createPdfTableParseTask({
  task_id: "pdf_fixture_lahsa_contract",
  source_id: "lahsa_contract_pdf",
  title: "LAHSA contract PDF fixture",
  url: "https://example.gov/lahsa-contract.pdf"
});

const fixture = [
  "Page 1 | Row 1 | Vendor | Amount | Purpose",
  "Page 2 | Row 4 | Example Services | $42,000 | Supportive housing outreach",
  "Page 3 | Row 8 | Monitoring Note | Missing invoice attachment | Needs records request"
].join("\n");

const result = parsePdfTableText(task, fixture);
const failures = validatePdfTableParse(result);

if (result.row_count !== 3) failures.push(`expected 3 anchored rows, got ${result.row_count}`);
if (!result.candidates.some((candidate) => candidate.page_number === 2 && candidate.row_label === "Row 4")) failures.push("page 2 row 4 anchor missing");
if (result.candidates.some((candidate) => /fraud|abuse/i.test(candidate.snippet) && candidate.evidence_promotion_allowed !== false)) {
  failures.push("parser turned row text into an unsupported claim");
}

if (failures.length) {
  console.error(`PDF/table parser verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("PDF/table parser verification passed.");
