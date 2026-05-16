import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBoardPath = resolve(root, "data", "source-fed-case-board.json");
const defaultTemplatePath = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_lausd_allhere_public_records_request_templates_20260516.json");

const boardPath = resolve(process.argv[2] || defaultBoardPath);
const templatePath = resolve(process.argv[3] || defaultTemplatePath);
const jsPath = boardPath.replace(/\.json$/i, ".js");

if (!existsSync(boardPath)) {
  console.error(`Missing board JSON: ${boardPath}`);
  process.exit(1);
}
if (!existsSync(templatePath)) {
  console.error(`Missing request template JSON: ${templatePath}`);
  process.exit(1);
}

const library = JSON.parse(readFileSync(boardPath, "utf8"));
const manifest = JSON.parse(readFileSync(templatePath, "utf8"));
const targetCaseId = "source_ca_school_board_spending";
const targetCase = (library.cases || []).find((item) => item.caseId === targetCaseId);

if (!targetCase) {
  console.error(`Missing target case: ${targetCaseId}`);
  process.exit(1);
}
if (manifest.status !== "PASS" || manifest.decision !== "LAUSD_ALLHERE_PUBLIC_RECORDS_REQUEST_TEMPLATES_READY_FOR_HUMAN_REVIEW") {
  console.error("Public-records request template manifest is not ready.");
  process.exit(1);
}

targetCase.publicRecordsRequestPacket = {
  status: "ready_for_human_review",
  officialPraPageUrl: manifest.official_pra_page_url,
  officialPraEmail: manifest.official_pra_email,
  templateCount: manifest.template_count,
  templateTopics: manifest.template_topics || [],
  evidencePosture: "request_templates_only_not_evidence",
  findingPromotionAllowed: manifest.finding_promotion_allowed,
  trainingConversionAllowed: manifest.training_conversion_allowed,
  nextAction: manifest.next_exact_action
};

targetCase.commandCenter = targetCase.commandCenter || {};
targetCase.commandCenter.publicRecords = "Use the PRA request packet for exact contract, invoice, performance, and OIG index records; ingest responses through the response-intake contract.";
library.runStatus = {
  ...(library.runStatus || {}),
  lausdAllHerePublicRecordsTemplateCount: manifest.template_count,
  lausdAllHerePublicRecordsGate: "READY_FOR_HUMAN_REVIEW_NOT_EVIDENCE"
};

writeFileSync(boardPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(jsPath, `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`, "utf8");

console.log(`Integrated ${manifest.template_count} LAUSD public-records request template topics.`);
console.log(boardPath);
console.log(jsPath);
