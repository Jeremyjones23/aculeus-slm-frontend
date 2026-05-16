import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createLocalProductRepository } from "../lib/aculeus-product-store.js";

const storeDir = mkdtempSync(join(tmpdir(), "aculeus-trace-review-"));
const repo = createLocalProductRepository({ storeDir });

try {
  repo.saveRun({
    runId: "run_trace_review",
    caseId: "case_trace_review",
    status: "ready_for_trace_review",
    trainingTraces: [{
      trace_id: "trace_review_1",
      run_id: "run_trace_review",
      case_id: "case_trace_review",
      action: "provider_search",
      review_status: "needs_human_review_before_training",
      training_conversion_allowed: false,
      direct_model_answer_used: false,
      candidate_snippets_treated_as_evidence: false,
      public_safe: true
    }]
  });

  const approved = repo.reviewTrainingTrace("trace_review_1", {
    decision: "approve_for_training",
    reviewed_by: "reviewer_trace_unit",
    note: "Trace has source ledger, cost, verifier, and no promotion leakage."
  });
  if (approved.review_status !== "approved_for_sft_preference_pool") throw new Error("approved trace did not move to approved status");
  if (approved.training_conversion_allowed !== true || approved.sft_preference_pool_eligible !== true) throw new Error("approved trace did not become training-eligible");
  if (approved.user_visible_promotion_allowed !== false || approved.direct_model_promotion_allowed !== false) throw new Error("approved trace allowed model/user-visible promotion");

  const saved = repo.getRun("run_trace_review");
  const savedTrace = saved.trainingTraces.find((trace) => trace.trace_id === "trace_review_1");
  if (!savedTrace || savedTrace.review_status !== "approved_for_sft_preference_pool") throw new Error("reviewed trace was not persisted on run");

  repo.saveRun({
    runId: "run_trace_reject",
    caseId: "case_trace_review",
    trainingTraces: [{
      trace_id: "trace_review_2",
      run_id: "run_trace_reject",
      case_id: "case_trace_review",
      action: "finding_generation",
      review_status: "needs_human_review_before_training",
      training_conversion_allowed: false,
      public_safe: true
    }]
  });
  const rejected = repo.reviewTrainingTrace("trace_review_2", {
    decision: "reject_for_training",
    reviewed_by: "reviewer_trace_unit",
    note: "Insufficient citation support."
  });
  if (rejected.review_status !== "rejected_for_training") throw new Error("rejected trace did not move to rejected status");
  if (rejected.training_conversion_allowed !== false || rejected.sft_preference_pool_eligible !== false) throw new Error("rejected trace became training eligible");

  let missingFailed = false;
  try {
    repo.reviewTrainingTrace("trace_missing", { decision: "approve_for_training" });
  } catch {
    missingFailed = true;
  }
  if (!missingFailed) throw new Error("missing trace review did not fail");

  console.log("Training trace review verification passed.");
} finally {
  rmSync(storeDir, { recursive: true, force: true });
}
