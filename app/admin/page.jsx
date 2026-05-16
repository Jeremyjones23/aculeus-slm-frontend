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
      </section>
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
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
