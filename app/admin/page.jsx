import { AculeusAdminTraceWorkbench } from "@/components/aculeus-admin-trace-workbench.jsx";
import { buildAdminRunSummary, buildTrainingExportDataset, buildTrainingTraceReviewQueue } from "@/lib/aculeus-admin-console.js";
import { canReviewEvidence, getVerifiedRequestUser } from "@/lib/access-control.js";
import { getProductRepository } from "@/lib/aculeus-product-store.js";
import { headers } from "next/headers";

export const metadata = {
  title: "Aculeus Admin"
};

export default async function AdminPage() {
  const user = await getVerifiedRequestUser({ headers: await headers() });
  if (!canReviewEvidence(user)) {
    return (
      <main className="admin-shell">
        <section className="admin-header">
          <p className="eyebrow">Admin console</p>
          <h1>Access denied</h1>
          <p>Approved reviewer, operator, or admin access is required to open the Aculeus audit console.</p>
        </section>
      </main>
    );
  }
  const store = await getProductRepository().readStore();
  const summary = buildAdminRunSummary(store);
  const traceQueue = buildTrainingTraceReviewQueue(store, { limit: 40 });
  const exportSummary = buildTrainingExportDataset(store, { format: "sft", limit: 500 });
  return (
    <main className="admin-shell">
      <section className="admin-header">
        <p className="eyebrow">Admin console</p>
        <h1>Run audit visibility</h1>
        <p>Review runs, spend, failures, exports, and ledger volume before any pilot promotion.</p>
      </section>
      <section className="admin-metrics" aria-label="Admin metrics">
        <article><span>Runs</span><strong>{summary.run_count}</strong></article>
        <article><span>Failures</span><strong>{summary.failure_count}</strong></article>
        <article><span>Exports</span><strong>{summary.export_count}</strong></article>
        <article><span>Spend</span><strong>${summary.estimated_spend_usd.toFixed(2)}</strong></article>
        <article><span>Provider spend</span><strong>${summary.provider_cost_summary.estimated_spend_usd.toFixed(2)}</strong></article>
        <article><span>Provider cap</span><strong>${summary.provider_cost_summary.provider_cap_usd.toFixed(2)}</strong></article>
        <article><span>Provider calls</span><strong>{summary.provider_cost_summary.provider_call_count}</strong></article>
        <article><span>Spend alerts</span><strong>{summary.provider_cost_summary.alert_count}</strong></article>
      </section>
      <section className="admin-actions" aria-label="Admin downloads">
        <a href="/api/admin/shadow-eval?limit=60">Shadow eval JSON</a>
        <a href="/api/admin/training-export?format=sft">Reviewed SFT export</a>
        <a href="/api/admin/training-export?format=preference">Reviewed preference export</a>
      </section>
      <section className="admin-budget-totals" aria-label="Provider budget totals">
        <BudgetColumn title="By day" rows={summary.provider_budget_totals.by_day} labelKey="day" />
        <BudgetColumn title="By workspace" rows={summary.provider_budget_totals.by_workspace} labelKey="workspace_id" />
        <BudgetColumn title="By provider" rows={summary.provider_budget_totals.by_provider} labelKey="provider" />
      </section>
      <AculeusAdminTraceWorkbench queue={traceQueue} exportSummary={exportSummary} />
      {summary.provider_cost_summary.alerts.length > 0 ? (
        <section className="admin-alerts" aria-label="Provider spend alerts">
          <h2>Provider spend alerts</h2>
          <ul>
            {summary.provider_cost_summary.alerts.map((alert) => (
              <li key={`${alert.run_id}-${alert.alert}`}>
                <strong>{alert.alert}</strong>
                <span>{alert.run_id}</span>
                <span>${alert.estimated_spend_usd.toFixed(2)} / ${alert.provider_cap_usd.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="admin-table" aria-label="Run audit table">
        <table>
          <thead>
            <tr>
              <th>Run</th>
              <th>Case</th>
              <th>Workspace</th>
              <th>Status</th>
              <th>Ledger</th>
              <th>Failures</th>
              <th>Exports</th>
              <th>Provider Spend</th>
              <th>Provider Cap</th>
              <th>Spend Alert</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.run_id}>
                <td>{row.run_id}</td>
                <td>{row.case_id}</td>
                <td>{row.workspace_id}</td>
                <td>{row.status}</td>
                <td>{row.ledger_count}</td>
                <td>{row.failure_count}</td>
                <td>{row.export_count}</td>
                <td>${row.provider_estimated_spend_usd.toFixed(2)}</td>
                <td>${row.provider_cap_usd.toFixed(2)}</td>
                <td>{row.provider_spend_alert}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function BudgetColumn({ title, rows, labelKey }) {
  return (
    <article>
      <h2>{title}</h2>
      {(rows.length ? rows : [{ [labelKey]: "none", estimated_spend_usd: 0, provider_cap_usd: 0, provider_call_count: 0 }]).slice(0, 6).map((row) => (
        <p key={row[labelKey]}>
          <span>{row[labelKey]}</span>
          <strong>${row.estimated_spend_usd.toFixed(2)}</strong>
          <small>{row.provider_call_count} calls / ${row.provider_cap_usd.toFixed(2)} cap</small>
        </p>
      ))}
    </article>
  );
}
