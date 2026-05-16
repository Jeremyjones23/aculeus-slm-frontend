export function buildAdminRunSummary(store = {}) {
  const runs = Array.isArray(store.runs) ? store.runs : [];
  return {
    schema_version: "aculeus_admin_run_summary.v1",
    run_count: runs.length,
    failure_count: runs.filter(hasFailure).length,
    export_count: runs.reduce((sum, run) => sum + countExports(run), 0),
    estimated_spend_usd: sumSpend(runs),
    rows: runs.map((run) => ({
      run_id: run.runId,
      case_id: run.caseId,
      workspace_id: run.workspace_id || run.workspaceId || "workspace_default",
      status: run.status || run.lifecycle?.state || "unknown",
      ledger_count: Array.isArray(run.ledger) ? run.ledger.length : 0,
      failure_count: Array.isArray(run.ledger) ? run.ledger.filter((entry) => /failed|blocked/i.test(String(entry.status))).length : 0,
      export_count: countExports(run),
      estimated_spend_usd: sumSpend([run]),
      updated_at: run.updatedAt || run.updated_at || null
    })),
    public_safe: true
  };
}

export function validateAdminRunSummary(summary = {}) {
  const issues = [];
  if (summary.schema_version !== "aculeus_admin_run_summary.v1") issues.push("admin summary schema mismatch");
  if (!Number.isFinite(summary.run_count)) issues.push("admin summary missing run count");
  if (!Array.isArray(summary.rows)) issues.push("admin summary rows missing");
  for (const row of summary.rows || []) {
    if (!row.run_id || !row.case_id || !row.workspace_id) issues.push("admin row missing identifiers");
    if (!Number.isFinite(row.ledger_count) || !Number.isFinite(row.failure_count)) issues.push(`${row.run_id}: admin row counts invalid`);
  }
  if (JSON.stringify(summary).match(/api[_-]?key|authorization|secret|raw_text/i)) issues.push("admin summary leaked blocked material");
  return issues;
}

function hasFailure(run) {
  return Array.isArray(run.ledger) && run.ledger.some((entry) => /failed|blocked/i.test(String(entry.status)));
}

function countExports(run) {
  return Array.isArray(run.exports) ? run.exports.length : Array.isArray(run.exportPackets) ? run.exportPackets.length : 0;
}

function sumSpend(runs) {
  const total = runs.reduce((sum, run) => sum + (Array.isArray(run.ledger) ? run.ledger.reduce((ledgerSum, entry) => {
    const spend = Number(entry.actual_spend_usd || entry.result?.actual_spend_usd || entry.result?.estimated_spend_usd || 0);
    return ledgerSum + (Number.isFinite(spend) ? spend : 0);
  }, 0) : 0), 0);
  return Number(total.toFixed(4));
}
