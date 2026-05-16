export function buildAdminRunSummary(store = {}) {
  const runs = Array.isArray(store.runs) ? store.runs : [];
  const rows = runs.map((run) => {
    const providerCost = providerCostForRun(run);
    return {
      run_id: run.runId,
      case_id: run.caseId,
      workspace_id: run.workspace_id || run.workspaceId || "workspace_default",
      status: run.status || run.lifecycle?.state || "unknown",
      ledger_count: Array.isArray(run.ledger) ? run.ledger.length : 0,
      failure_count: Array.isArray(run.ledger) ? run.ledger.filter((entry) => /failed|blocked/i.test(String(entry.status))).length : 0,
      export_count: countExports(run),
      estimated_spend_usd: sumSpend([run]),
      provider_estimated_spend_usd: providerCost.estimated_spend_usd,
      provider_cap_usd: providerCost.provider_cap_usd,
      provider_call_count: providerCost.provider_call_count,
      provider_spend_alert: providerCost.alert,
      updated_at: run.updatedAt || run.updated_at || null
    };
  });
  const providerCostSummary = buildProviderCostSummary(rows);
  return {
    schema_version: "aculeus_admin_run_summary.v1",
    run_count: runs.length,
    failure_count: runs.filter(hasFailure).length,
    export_count: runs.reduce((sum, run) => sum + countExports(run), 0),
    estimated_spend_usd: sumSpend(runs),
    provider_cost_summary: providerCostSummary,
    rows,
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
    if (!Number.isFinite(row.provider_estimated_spend_usd || 0)) issues.push(`${row.run_id}: provider spend invalid`);
    if (!["ok", "provider_spend_near_cap", "provider_spend_over_cap"].includes(row.provider_spend_alert || "ok")) issues.push(`${row.run_id}: provider spend alert invalid`);
  }
  if (!summary.provider_cost_summary || !Number.isFinite(summary.provider_cost_summary.estimated_spend_usd)) issues.push("admin summary missing provider cost summary");
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
    return ledgerSum + extractSpend(entry);
  }, 0) : 0), 0);
  return Number(total.toFixed(4));
}

function providerCostForRun(run = {}) {
  const ledger = Array.isArray(run.ledger) ? run.ledger : [];
  const providerEntries = ledger.filter((entry) => {
    const labels = Array.isArray(entry.labels) ? entry.labels : [];
    return entry.entry_type === "provider_search" || labels.includes("provider") || entry.result_summary?.provider_calls_executed === true;
  });
  const estimatedSpend = providerEntries.reduce((sum, entry) => sum + extractSpend(entry), 0);
  const capUsd = providerEntries.reduce((sum, entry) => sum + extractCap(entry), 0);
  const providerCallCount = providerEntries.filter((entry) => entry.result_summary?.provider_calls_executed || entry.result_summary?.paid_spend_incurred).length;
  const alert = providerSpendAlert(estimatedSpend, capUsd);
  return {
    estimated_spend_usd: roundMoney(estimatedSpend),
    provider_cap_usd: roundMoney(capUsd),
    provider_call_count: providerCallCount,
    alert
  };
}

function buildProviderCostSummary(rows = []) {
  const estimatedSpend = rows.reduce((sum, row) => sum + Number(row.provider_estimated_spend_usd || 0), 0);
  const capUsd = rows.reduce((sum, row) => sum + Number(row.provider_cap_usd || 0), 0);
  const providerCallCount = rows.reduce((sum, row) => sum + Number(row.provider_call_count || 0), 0);
  const alerts = rows
    .filter((row) => row.provider_spend_alert && row.provider_spend_alert !== "ok")
    .map((row) => ({
      run_id: row.run_id,
      case_id: row.case_id,
      alert: row.provider_spend_alert,
      estimated_spend_usd: row.provider_estimated_spend_usd,
      provider_cap_usd: row.provider_cap_usd
    }));
  return {
    estimated_spend_usd: roundMoney(estimatedSpend),
    provider_cap_usd: roundMoney(capUsd),
    remaining_cap_usd: roundMoney(Math.max(0, capUsd - estimatedSpend)),
    provider_call_count: providerCallCount,
    alert_count: alerts.length,
    alerts
  };
}

function providerSpendAlert(estimatedSpend, capUsd) {
  if (!Number.isFinite(capUsd) || capUsd <= 0) return "ok";
  if (estimatedSpend > capUsd) return "provider_spend_over_cap";
  if (estimatedSpend / capUsd >= 0.8) return "provider_spend_near_cap";
  return "ok";
}

function extractSpend(entry = {}) {
  const spend = Number(
    entry.actual_spend_usd
    ?? entry.result?.actual_spend_usd
    ?? entry.result?.estimated_spend_usd
    ?? entry.result_summary?.actual_spend_usd
    ?? entry.result_summary?.estimated_spend_usd
    ?? 0
  );
  return Number.isFinite(spend) ? spend : 0;
}

function extractCap(entry = {}) {
  const cap = Number(entry.provider_cap_usd ?? entry.result?.provider_cap_usd ?? entry.result_summary?.provider_cap_usd ?? 0);
  return Number.isFinite(cap) ? cap : 0;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(4));
}
