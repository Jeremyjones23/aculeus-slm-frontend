import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAdminRunSummary, validateAdminRunSummary } from "../lib/aculeus-admin-console.js";
import { canReviewEvidence, getRequestUser, ROLES } from "../lib/access-control.js";

const summary = buildAdminRunSummary({
  runs: [{
    runId: "run_admin_1",
    caseId: "case_admin_1",
    workspace_id: "workspace_admin",
    status: "ready",
    exports: [{ export_id: "export_1" }],
    ledger: [
      { ledger_entry_id: "ledger_1", status: "found", result: { actual_spend_usd: 0.12 } },
      {
        ledger_entry_id: "ledger_provider_1",
        entry_type: "provider_search",
        status: "fetched",
        labels: ["provider", "locator_only"],
        result_summary: {
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
if (summary.rows[0].provider_spend_alert !== "provider_spend_near_cap") throw new Error("admin provider spend alert not raised");

const denied = getRequestUser(new Request("http://aculeus.local/api/admin/runs"), { ACULEUS_AUTH_MODE: "production" });
if (canReviewEvidence(denied)) throw new Error("unauthenticated production admin request was allowed");
const admin = getRequestUser(new Request("http://aculeus.local/api/admin/runs", {
  headers: {
    "x-clerk-user-id": "admin_1",
    "x-aculeus-role": ROLES.admin,
    "x-aculeus-approval-status": "approved"
  }
}), { ACULEUS_AUTH_MODE: "production" });
if (!canReviewEvidence(admin)) throw new Error("approved admin was not allowed to review evidence/admin runs");

const page = readFileSync(join(process.cwd(), "app", "admin", "page.jsx"), "utf8");
for (const phrase of ["Run audit visibility", "Failures", "Exports", "Ledger", "Provider spend", "Provider cap", "Spend Alert"]) {
  if (!page.includes(phrase)) throw new Error(`admin page missing phrase: ${phrase}`);
}

console.log("Admin console verification passed.");
