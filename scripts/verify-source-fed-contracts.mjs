import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildActionBriefResponse,
  buildCandidateSources,
  buildCaseBoardResponse,
  buildEvidenceRecords,
  hardenInvestigationQuery,
  validateActionBriefResponse,
  validateCandidateSource,
  validateCaseBoardResponse,
  validateEvidenceRecord,
  validateInvestigationSpec
} from "../lib/aculeus-source-fed-contracts.js";

const root = process.cwd();
const library = JSON.parse(readFileSync(resolve(root, "data", "source-fed-case-board.json"), "utf8"));

const examples = [
  {
    rawQuery: "What were red flags surrounding Urban Alchemy in California?",
    expect: ["Urban Alchemy", "California", "fraud"]
  },
  {
    rawQuery: "Let's look into the school boards in California.",
    expect: ["California school boards", "California", "specific school board"]
  }
];

const failures = [];

for (const example of examples) {
  const spec = hardenInvestigationQuery({ rawQuery: example.rawQuery });
  const issues = validateInvestigationSpec(spec);
  if (issues.length) failures.push(`${example.rawQuery}: ${issues.join("; ")}`);
  const blob = JSON.stringify(spec);
  for (const expected of example.expect) {
    if (!blob.includes(expected)) failures.push(`${example.rawQuery}: missing ${expected}`);
  }
  if (blob.includes("finding_id") || blob.includes("what_we_found")) {
    failures.push(`${example.rawQuery}: query hardener generated finding-like output`);
  }
}

if (!Array.isArray(library.cases) || library.cases.length < 4) {
  failures.push("source-fed fixture must include at least four cases");
}

for (const casePacket of library.cases || []) {
  const brief = buildActionBriefResponse(casePacket, library);
  const board = buildCaseBoardResponse(casePacket, library);
  const candidates = buildCandidateSources(casePacket);
  const evidence = buildEvidenceRecords(casePacket);

  failures.push(...validateActionBriefResponse(brief).map((issue) => `${casePacket.caseId} brief: ${issue}`));
  failures.push(...validateCaseBoardResponse(board).map((issue) => `${casePacket.caseId} board: ${issue}`));

  if (!candidates.length) failures.push(`${casePacket.caseId}: expected at least one candidate source`);
  if (!evidence.length) failures.push(`${casePacket.caseId}: expected at least one evidence record`);
  if (!board.ledger_summary || board.ledger_summary.total !== casePacket.sources.length) {
    failures.push(`${casePacket.caseId}: ledger summary total mismatch`);
  }
  if ((board.ledger_summary.usable_as_evidence || 0) !== evidence.length) {
    failures.push(`${casePacket.caseId}: ledger summary evidence count mismatch`);
  }
  if ((board.ledger_summary.candidate || 0) < candidates.length) {
    failures.push(`${casePacket.caseId}: ledger summary candidate count too low`);
  }

  for (const candidate of candidates) {
    failures.push(...validateCandidateSource(candidate).map((issue) => `${casePacket.caseId} candidate: ${issue}`));
  }
  for (const record of evidence) {
    failures.push(...validateEvidenceRecord(record).map((issue) => `${casePacket.caseId} evidence: ${issue}`));
  }

  if (candidates.some((candidate) => candidate.evidence_id !== null || candidate.promotion_status !== "candidate_lead_not_evidence")) {
    failures.push(`${casePacket.caseId}: candidate source promoted to evidence`);
  }
  if (!brief.warnings.some((warning) => /fraud|intent|illegal|misconduct|waste/i.test(warning))) {
    failures.push(`${casePacket.caseId}: Action Brief missing high-risk claim warning`);
  }
}

if (failures.length) {
  console.error(`Source-fed contract verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Source-fed contract verification passed.");
