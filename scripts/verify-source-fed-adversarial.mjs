import {
  buildActionBriefResponse,
  buildCaseBoardResponse,
  validateActionBriefResponse,
  validateCaseBoardResponse
} from "../lib/aculeus-source-fed-contracts.js";

const adversarialCase = {
  caseId: "source_adversarial_candidate_overclaim",
  title: "Adversarial candidate and overclaim fixture",
  headline: "Adversarial fixture",
  summary: "This fixture attempts to promote candidate and unsupported claims.",
  jurisdiction: "California",
  reviewStatus: "review_required",
  legalBoundary: "Review lead only.",
  dossier: {
    findings: [
      {
        findingId: "adv_finding_1",
        whatRecordSays: "Search snippet claims fraud occurred and $9,999,999 was misspent.",
        whyItMatters: "Confidence 0.99; citation verifier status blocked_by_citation_verifier.",
        sourceIds: ["candidate_vector_1"]
      }
    ],
    claimLedger: [
      {
        claim: "Fraud occurred and intent was proven by a vector hit.",
        support: "rejected",
        limitation: "candidate-only source used as evidence; unsupported amount; overclaim language",
        nextRecord: "Reject claim and fetch official adjudicative record before any legal characterization.",
        sourceIds: ["candidate_vector_1"]
      },
      {
        claim: "A named person approved a contract on a specific date without cited record.",
        support: "weak",
        limitation: "unsupported name/date claim",
        nextRecord: "Fetch board packet, minutes, and approval record.",
        sourceIds: []
      }
    ]
  },
  sources: [
    {
      sourceId: "candidate_vector_1",
      title: "Vector search snippet about alleged fraud",
      type: "vector_hit",
      publisher: "qdrant_candidate",
      role: "candidate_only, locator_only",
      confidence: "locator_only",
      url: "https://example.invalid/vector-snippet",
      limitation: "Candidate lead requires fetch, receipt, gate, and verifier before evidence promotion.",
      supportLevel: "partially_supported",
      retrievalMethod: "qdrant_candidate"
    },
    {
      sourceId: "provider_snippet_1",
      title: "Provider search snippet with unsupported amount",
      type: "provider_search_result",
      publisher: "search_provider",
      role: "candidate_only, locator_only",
      confidence: "locator_only",
      url: "https://example.invalid/search-snippet",
      limitation: "Provider snippet is not evidence.",
      supportLevel: "partially_supported",
      retrievalMethod: "parallel_or_exa_candidate"
    }
  ],
  nextRecords: [
    {
      recordId: "missing_adjudicative_record",
      holder: "public agency or court record custodian",
      request: "Request official adjudicative record, audit finding, or contract file before any legal claim.",
      reason: "Needed to test that high-risk claims remain blocked."
    }
  ],
  sourceBoard: { sourceRunId: "adversarial_fixture" }
};

const failures = [];
const board = buildCaseBoardResponse(adversarialCase, { runStatus: { nextSpendDecision: "NO_SPEND" } });
const brief = buildActionBriefResponse(adversarialCase, { runStatus: { nextSpendDecision: "NO_SPEND" } });

const boardIssues = validateCaseBoardResponse(board);
if (!boardIssues.some((issue) => issue.includes("evidence_records must be nonempty"))) {
  failures.push("adversarial candidate-only case should not validate as a complete case board");
}
const briefIssues = validateActionBriefResponse(brief);
if (!briefIssues.some((issue) => issue.includes("where_the_evidence_is must be nonempty"))) {
  failures.push("adversarial candidate-only brief should fail missing evidence validation");
}
if (board.candidate_sources.length !== 2) failures.push("all adversarial sources should remain candidates");
if (board.evidence_records.length !== 0) failures.push("candidate-only/vector/provider snippets became evidence");
if (!board.verifier_issues.some((issue) => issue.severity === "blocking" && issue.issue_type === "candidate_only_source_used_as_evidence")) {
  failures.push("candidate-as-evidence overclaim did not create blocking verifier issue");
}
if (!brief.warnings.some((warning) => /fraud|intent|illegality|misconduct|waste/i.test(warning))) {
  failures.push("adversarial brief missing high-risk warning");
}
if (brief.what_we_found.some((finding) => finding.status === "verified" || finding.verifier_status === "passed")) {
  failures.push("adversarial finding was improperly marked verified or passed");
}

if (failures.length) {
  console.error(`Source-fed adversarial verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Source-fed adversarial verification passed.");
