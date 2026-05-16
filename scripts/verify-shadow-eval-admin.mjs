import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPilotShadowEvalReport } from "../lib/aculeus-pilot-shadow-eval.js";

const traces = [
  trace("trace_shadow_admin_1", "run_shadow_admin_1", "case_shadow_admin_1", "official_api_search", "official_api_search"),
  trace("trace_shadow_admin_2", "run_shadow_admin_1", "case_shadow_admin_1", "provider_search", "provider_search"),
  trace("trace_shadow_admin_3", "run_shadow_admin_2", "case_shadow_admin_2", "receipt_fetch", "receipt_fetch")
];

const report = buildPilotShadowEvalReport(traces, {
  candidateModelId: "candidate_shadow_admin_test",
  traceLimit: 3,
  store: "fixture_training_traces"
});

if (report.schema_version !== "aculeus_shadow_eval_report.v1") throw new Error("shadow admin report schema mismatch");
if (report.user_visible_promotion_allowed !== false) throw new Error("shadow admin report allowed user-visible promotion");
if (report.input_trace_count !== 3 || report.input_run_count !== 2 || report.metrics.case_count !== 2) throw new Error("shadow admin report counts incorrect");
if (report.status !== "shadow_passed_no_user_promotion") throw new Error("shadow admin report did not pass no-promotion gate");

const route = readFileSync(join(process.cwd(), "app", "api", "admin", "shadow-eval", "route.js"), "utf8");
for (const phrase of ["canReviewEvidence", "training_traces", "content-disposition", "user_visible_promotion_allowed"]) {
  if (!route.includes(phrase)) throw new Error(`shadow eval route missing phrase: ${phrase}`);
}

const page = readFileSync(join(process.cwd(), "app", "admin", "page.jsx"), "utf8");
if (!page.includes("Shadow eval JSON") || !page.includes("/api/admin/shadow-eval?limit=60")) {
  throw new Error("admin page missing shadow eval download link");
}

console.log("Shadow eval admin verification passed.");

function trace(id, runId, caseId, action, entryType) {
  return {
    id,
    run_id: runId,
    case_id: caseId,
    trace_type: action,
    payload: {
      trace_id: id,
      run_id: runId,
      case_id: caseId,
      action,
      source_ledger: [{ entry_type: entryType, labels: [entryType] }],
      retrieval_actions: [{ task_type: entryType, source_id: entryType }],
      training_conversion_allowed: false,
      public_safe: true
    }
  };
}
