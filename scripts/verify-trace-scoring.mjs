import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { appendTrainingTrace, buildTrainingTrace } from "../lib/aculeus-training-trace-exporter.js";
import { scoreProductionTrace, validateTraceScore } from "../lib/aculeus-trace-scoring.js";

const trace = buildTrainingTrace({
  trace_id: "trace_scoring_fixture",
  caseId: "case_trace_scoring",
  runId: "run_trace_scoring",
  action: "official_api_search",
  caseSpec: {
    case_scope: "public-records investigation",
    official_api_targets: ["USAspending"],
    search_queries: ["official contract audit records"]
  },
  retrievalActions: [{ provider: "official_api", source: "USAspending", query: "contract awards" }],
  sourceLedger: [{
    ledger_entry_id: "ledger_trace_1",
    entry_type: "official_api_search",
    status: "found",
    labels: ["official", "candidate_only"],
    receipt_id: "receipt_1",
    content_hash: "sha256:abc",
    public_safe: true
  }],
  gapAnalysis: { missing_records: ["monitoring records"] },
  findings: [{
    finding_id: "finding_trace_1",
    claim: "Official record exists and needs receipt-backed review.",
    evidence_ids: ["evidence_1"],
    confidence: "bounded"
  }],
  verifierResults: { issues: [] },
  userFeedback: { useful: true, opened_evidence: true, saved_or_exported: true },
  costLatency: { actual_spend_usd: 0, provider_cap_usd: 0.25, latency_ms: 1200 },
  finalOutcome: "candidate_trace_ready_for_human_review",
  api_key: "must_be_removed"
});

const issues = validateTraceScore(trace);
if (issues.length) throw new Error(`Trace score validation failed:\n${issues.join("\n")}`);
if (trace.api_key) throw new Error("trace sanitizer leaked api_key");
if (trace.training_conversion_allowed !== false) throw new Error("trace enabled automatic training conversion");
if (trace.score_payload.reviewed !== false) throw new Error("trace score must be unreviewed by default");
if (!trace.score_payload.promotion_gate.requires_human_review) throw new Error("trace score missing human-review gate");
if (!Number.isFinite(trace.trace_quality_score) || trace.trace_quality_score <= 0) throw new Error("trace quality score missing");

const badTrace = buildTrainingTrace({
  trace_id: "trace_bad_fixture",
  direct_model_answer_used: true,
  candidate_snippets_treated_as_evidence: true,
  userFeedback: { flagged_hallucination: true },
  verifierResults: { issues: [{ severity: "blocking", issue_type: "uncited_claim" }] }
});
const badScore = scoreProductionTrace({ ...badTrace, direct_model_answer_used: true, candidate_snippets_treated_as_evidence: true });
if (!badScore.penalties.some((penalty) => penalty.reason === "candidate_snippets_treated_as_evidence")) {
  throw new Error("trace scoring did not penalize candidate-as-evidence behavior");
}
if (badScore.training_conversion_allowed !== false) throw new Error("bad trace enabled training conversion");

const tempDir = mkdtempSync(join(tmpdir(), "aculeus-trace-scoring-"));
const tracePath = join(tempDir, "traces.jsonl");
const ref = appendTrainingTrace(trace, { path: tracePath });
if (!ref.score || ref.review_status !== "needs_human_review_before_training") throw new Error("append trace ref missing score/review status");
if (!existsSync(tracePath)) throw new Error("trace file was not written");
const row = JSON.parse(readFileSync(tracePath, "utf8").trim());
if (!row.score_payload || row.training_conversion_allowed !== false) throw new Error("written trace missing score payload or guard");
if (JSON.stringify(row).match(/must_be_removed|api_key|authorization|secret/i)) throw new Error("written scored trace leaked sensitive text");

console.log("Trace scoring verification passed.");
