import { buildAdminRunSummary } from "@/lib/aculeus-admin-console.js";
import { readLocalStore } from "@/lib/aculeus-product-store.js";

export const metadata = {
  title: "Aculeus Admin"
};

export default function AdminPage() {
  const summary = buildAdminRunSummary(readLocalStore());
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
      </section>
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
