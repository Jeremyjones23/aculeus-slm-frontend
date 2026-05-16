import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildAdminRunSummary,
  buildTrainingExportDataset,
  buildTrainingTraceReviewQueue,
  validateAdminRunSummary,
  validateTrainingExportDataset,
  validateTrainingTraceReviewQueue
} from "../lib/aculeus-admin-console.js";
import { canReviewEvidence, createSmokeSignature, getRequestUser, ROLES } from "../lib/access-control.js";

const summary = buildAdminRunSummary({
  runs: [{
    runId: "run_admin_1",
    caseId: "case_admin_1",
    workspace_id: "workspace_admin",
    status: "ready",
    exports: [{ export_id: "export_1" }],
    trainingTraces: [
      {
        trace_id: "trace_admin_approved",
        run_id: "run_admin_1",
        case_id: "case_admin_1",
        action: "provider_search",
        review_status: "approved_for_sft_preference_pool",
        reviewed: true,
        training_conversion_allowed: true,
        direct_model_answer_used: false,
        candidate_snippets_treated_as_evidence: false,
        source_ledger: [{ entry_type: "provider_search", source_family: "provider_candidate" }],
        retrieval_actions: [{ task_type: "provider_search" }],
        verifier_results: { issues: [] },
        public_safe: true
      },
      {
        trace_id: "trace_admin_pending",
        run_id: "run_admin_1",
        case_id: "case_admin_1",
        action: "receipt_fetch",
        review_status: "needs_human_review_before_training",
        training_conversion_allowed: false,
        source_ledger: [],
        retrieval_actions: [],
        public_safe: true
      }
    ],
    ledger: [
      { ledger_entry_id: "ledger_1", status: "found", result: { actual_spend_usd: 0.12 } },
      {
        ledger_entry_id: "ledger_provider_1",
        entry_type: "provider_search",
        status: "fetched",
        labels: ["provider", "locator_only"],
        created_at: "2026-05-16T12:00:00.000Z",
        result_summary: {
          provider: "parallel",
          provider_calls_executed: true,
          paid_spend_incurred: true,
          estimated_spend_usd: 0.2,
          provider_cap_usd: 0.25
        }
      },
      { ledger_entry_id: "ledger_2", status: "failed_fetch" }
    ],
    updatedAt: "2026-05-16T12:00:00.000Z"
  }]
});
const issues = validateAdminRunSummary(summary);
if (issues.length) throw new Error(`Admin summary failed validation:\n${issues.join("\n")}`);
if (summary.run_count !== 1 || summary.failure_count !== 1 || summary.export_count !== 1) throw new Error("admin summary counts incorrect");
if (summary.estimated_spend_usd !== 0.32) throw new Error("admin spend summary incorrect");
if (summary.provider_cost_summary.estimated_spend_usd !== 0.2) throw new Error("admin provider spend summary incorrect");
if (summary.provider_cost_summary.provider_cap_usd !== 0.25) throw new Error("admin provider cap summary incorrect");
if (summary.provider_cost_summary.alert_count !== 1) throw new Error("admin provider alert count incorrect");
if (summary.provider_budget_totals.by_day[0]?.day !== "2026-05-16") throw new Error("admin provider day budget total missing");
if (summary.provider_budget_totals.by_workspace[0]?.workspace_id !== "workspace_admin") throw new Error("admin provider workspace budget total missing");
if (summary.provider_budget_totals.by_provider[0]?.provider !== "parallel") throw new Error("admin provider budget total missing provider name");
if (summary.rows[0].provider_spend_alert !== "provider_spend_near_cap") throw new Error("admin provider spend alert not raised");
const traceQueue = buildTrainingTraceReviewQueue({
  runs: [{
    runId: "run_admin_1",
    caseId: "case_admin_1",
    trainingTraces: summaryInputTraceFixture()
  }]
});
const traceIssues = validateTrainingTraceReviewQueue(traceQueue);
if (traceIssues.length) throw new Error(`trace review queue invalid:\n${traceIssues.join("\n")}`);
if (traceQueue.approved_count !== 1 || traceQueue.pending_count !== 1 || traceQueue.exportable_count !== 1) throw new Error("trace review queue counts incorrect");
const exportDataset = buildTrainingExportDataset({ runs: [{ runId: "run_admin_1", caseId: "case_admin_1", trainingTraces: summaryInputTraceFixture() }] }, { format: "sft" });
const exportIssues = validateTrainingExportDataset(exportDataset);
if (exportIssues.length) throw new Error(`training export dataset invalid:\n${exportIssues.join("\n")}`);
if (exportDataset.row_count !== 1 || exportDataset.rows[0].trace_id !== "trace_admin_approved") throw new Error("training export admitted wrong trace set");

const denied = getRequestUser(new Request("http://aculeus.local/api/admin/runs"), { ACULEUS_AUTH_MODE: "production" });
if (canReviewEvidence(denied)) throw new Error("unauthenticated production admin request was allowed");
const timestamp = String(Date.now());
const admin = getRequestUser(new Request("http://aculeus.local/api/admin/runs", {
  headers: {
    "x-clerk-user-id": "admin_1",
    "x-aculeus-email": "admin@example.com",
    "x-aculeus-role": ROLES.admin,
    "x-aculeus-approval-status": "approved",
    "x-aculeus-smoke-ts": timestamp,
    "x-aculeus-smoke-signature": createSmokeSignature({
      userId: "admin_1",
      email: "admin@example.com",
      role: ROLES.admin,
      approvalStatus: "approved",
      timestamp
    }, "admin_console_secret")
  }
}), { ACULEUS_AUTH_MODE: "production", ACULEUS_SMOKE_SECRET: "admin_console_secret" });
if (!canReviewEvidence(admin)) throw new Error("approved admin was not allowed to review evidence/admin runs");

const page = readFileSync(join(process.cwd(), "app", "admin", "page.jsx"), "utf8");
for (const phrase of ["Run audit visibility", "Failures", "Exports", "Ledger", "Provider spend", "Provider cap", "Spend Alert", "Provider budget totals", "By provider", "AculeusAdminTraceWorkbench", "Reviewed SFT export", "Reviewed preference export"]) {
  if (!page.includes(phrase)) throw new Error(`admin page missing phrase: ${phrase}`);
}
const component = readFileSync(join(process.cwd(), "components", "aculeus-admin-trace-workbench.jsx"), "utf8");
for (const phrase of ["Trace review and training export", "Reviewer notes required", "matchesTraceFilter", "Approve for export", "Offline export only", "No production update"]) {
  if (!component.includes(phrase)) throw new Error(`trace workbench missing phrase: ${phrase}`);
}
const route = readFileSync(join(process.cwd(), "app", "api", "admin", "training-export", "route.js"), "utf8");
for (const phrase of ["buildTrainingExportDataset", "content-disposition", "x-aculeus-production-update-allowed"]) {
  if (!route.includes(phrase)) throw new Error(`training export route missing phrase: ${phrase}`);
}
const reviewRoute = readFileSync(join(process.cwd(), "app", "api", "admin", "training-traces", "[traceId]", "review", "route.js"), "utf8");
for (const phrase of ["trace_review_note_required", "note.length < 12"]) {
  if (!reviewRoute.includes(phrase)) throw new Error(`trace review route missing phrase: ${phrase}`);
}

console.log("Admin console verification passed.");

function summaryInputTraceFixture() {
  return [
    {
      trace_id: "trace_admin_approved",
      run_id: "run_admin_1",
      case_id: "case_admin_1",
      action: "provider_search",
      review_status: "approved_for_sft_preference_pool",
      reviewed: true,
      training_conversion_allowed: true,
      direct_model_answer_used: false,
      candidate_snippets_treated_as_evidence: false,
      source_ledger: [{ entry_type: "provider_search", source_family: "provider_candidate" }],
      retrieval_actions: [{ task_type: "provider_search" }],
      verifier_results: { issues: [] },
      public_safe: true
    },
    {
      trace_id: "trace_admin_pending",
      run_id: "run_admin_1",
      case_id: "case_admin_1",
      action: "receipt_fetch",
      review_status: "needs_human_review_before_training",
      training_conversion_allowed: false,
      source_ledger: [],
      retrieval_actions: [],
      public_safe: true
    }
  ];
}
