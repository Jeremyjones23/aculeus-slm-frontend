"use client";

import { useMemo, useState } from "react";

export function AculeusAdminTraceWorkbench({ queue, exportSummary }) {
  const rows = Array.isArray(queue?.rows) ? queue.rows : [];
  const [selectedId, setSelectedId] = useState(rows[0]?.trace_id || "");
  const [pendingId, setPendingId] = useState("");
  const [message, setMessage] = useState("");
  const selected = useMemo(() => rows.find((row) => row.trace_id === selectedId) || rows[0] || null, [rows, selectedId]);

  async function reviewTrace(decision) {
    if (!selected?.trace_id) return;
    setPendingId(`${selected.trace_id}:${decision}`);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/training-traces/${encodeURIComponent(selected.trace_id)}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision,
          note: decision === "approve_for_training"
            ? "Reviewer approved trace for offline SFT/preference export after source and safety gates."
            : "Reviewer blocked trace from training export pending source, citation, or posture fixes."
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || `Trace review failed with ${response.status}`);
      setMessage(`${selected.trace_id} marked ${result.trace.review_status}. Refresh to see updated export counts.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPendingId("");
    }
  }

  return (
    <section className="trace-workbench" aria-label="Reviewer trace review and training export workbench">
      <div className="trace-workbench-header">
        <div>
          <span>Reviewer queue</span>
          <h2>Trace review and training export</h2>
          <p>Production traces stay inert until a reviewer approves them for offline SFT or preference datasets.</p>
        </div>
        <div className="trace-export-actions">
          <a href="/api/admin/training-export?format=sft">SFT JSONL</a>
          <a href="/api/admin/training-export?format=preference">Preference JSONL</a>
        </div>
      </div>
      <div className="trace-workbench-grid">
        <aside className="trace-queue" aria-label="Training trace queue">
          <div className="trace-queue-metrics">
            <strong>{queue?.pending_count || 0}</strong><span>pending</span>
            <strong>{queue?.approved_count || 0}</strong><span>approved</span>
            <strong>{exportSummary?.row_count || 0}</strong><span>export rows</span>
          </div>
          {rows.length ? rows.map((row) => (
            <button
              type="button"
              key={row.trace_id}
              className={row.trace_id === selected?.trace_id ? "active" : ""}
              onClick={() => setSelectedId(row.trace_id)}
            >
              <span>{row.action}</span>
              <strong>{row.trace_id}</strong>
              <small>{row.review_status}</small>
            </button>
          )) : (
            <p className="trace-empty">No training traces are waiting in the local run store.</p>
          )}
        </aside>
        <article className="trace-detail" aria-label="Selected trace detail">
          {selected ? (
            <>
              <div className="trace-detail-title">
                <span>{selected.case_id}</span>
                <h3>{selected.action}</h3>
                <small>{selected.run_id}</small>
              </div>
              <div className="trace-stats">
                <p><span>Quality</span><strong>{selected.trace_quality_score}</strong></p>
                <p><span>Sources</span><strong>{selected.source_ledger_count}</strong></p>
                <p><span>Retrievals</span><strong>{selected.retrieval_action_count}</strong></p>
                <p><span>Verifier issues</span><strong>{selected.verifier_issue_count}</strong></p>
              </div>
              <dl className="trace-source-families">
                {Object.entries(selected.source_families || {}).length ? Object.entries(selected.source_families || {}).map(([family, count]) => (
                  <div key={family}>
                    <dt>{family}</dt>
                    <dd>{count}</dd>
                  </div>
                )) : (
                  <div>
                    <dt>source ledger</dt>
                    <dd>0</dd>
                  </div>
                )}
              </dl>
              <p className="trace-outcome">{selected.final_outcome}</p>
              <div className="trace-review-actions">
                <button
                  type="button"
                  onClick={() => reviewTrace("approve_for_training")}
                  disabled={Boolean(pendingId)}
                >
                  {pendingId.endsWith("approve_for_training") ? "Approving" : "Approve for export"}
                </button>
                <button
                  type="button"
                  onClick={() => reviewTrace("reject_for_training")}
                  disabled={Boolean(pendingId)}
                >
                  {pendingId.endsWith("reject_for_training") ? "Rejecting" : "Reject"}
                </button>
                <button
                  type="button"
                  onClick={() => reviewTrace("needs_changes")}
                  disabled={Boolean(pendingId)}
                >
                  Needs changes
                </button>
              </div>
              {message ? <p className="trace-message">{message}</p> : null}
            </>
          ) : (
            <p className="trace-empty">Start a source-fed case run to generate reviewer traces.</p>
          )}
        </article>
        <aside className="trace-gates" aria-label="Training safety gates">
          <h3>Export gates</h3>
          {selected ? Object.entries(selected.safety_gates || {}).map(([gate, passed]) => (
            <p key={gate} className={passed ? "pass" : "hold"}>
              <span>{passed ? "pass" : "hold"}</span>
              <strong>{gate.replaceAll("_", " ")}</strong>
            </p>
          )) : null}
          <div className="trace-export-summary">
            <span>Offline export only</span>
            <strong>{exportSummary?.format || "sft"}</strong>
            <small>No production update, no hosted training trigger, no user-visible model promotion.</small>
          </div>
        </aside>
      </div>
    </section>
  );
}
