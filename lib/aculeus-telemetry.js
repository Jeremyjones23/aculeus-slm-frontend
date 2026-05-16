export function buildTelemetrySnapshot(runs = [], options = {}) {
  const thresholds = {
    provider_spend_usd: Number(options.providerSpendUsd ?? options.provider_spend_usd ?? 10),
    verifier_failures: Number(options.verifierFailures ?? options.verifier_failures ?? 3),
    queue_backlog: Number(options.queueBacklog ?? options.queue_backlog ?? 20),
    crawler_failures: Number(options.crawlerFailures ?? options.crawler_failures ?? 2)
  };
  const events = runs.flatMap(runTelemetryEvents);
  const metrics = {
    run_count: runs.length,
    run_states: countBy(runs.map((run) => run.lifecycle?.state || run.status || "unknown")),
    provider_spend_usd: sumEvents(events, "provider_spend_usd"),
    verifier_failures: events.filter((event) => event.event_type === "verifier_failure").reduce((sum, event) => sum + event.count, 0),
    queue_backlog: events.filter((event) => event.event_type === "candidate_backlog").reduce((sum, event) => sum + event.count, 0),
    crawler_failures: events.filter((event) => event.event_type === "crawler_failure").length
  };
  return {
    schema_version: "aculeus_telemetry_snapshot.v1",
    created_at: options.createdAt || new Date().toISOString(),
    thresholds,
    metrics,
    events,
    alerts: evaluateAlerts(metrics, thresholds),
    public_safe: true
  };
}

export function validateTelemetrySnapshot(snapshot = {}) {
  const issues = [];
  if (snapshot.schema_version !== "aculeus_telemetry_snapshot.v1") issues.push("telemetry schema mismatch");
  if (!snapshot.metrics || !snapshot.thresholds) issues.push("telemetry missing metrics or thresholds");
  if (!Array.isArray(snapshot.events) || !Array.isArray(snapshot.alerts)) issues.push("telemetry events/alerts missing");
  if (JSON.stringify(snapshot).match(/api[_-]?key|authorization|secret|raw_text/i)) issues.push("telemetry leaked blocked material");
  return issues;
}

function runTelemetryEvents(run) {
  const events = [{
    event_type: "run_state",
    run_id: run.runId,
    case_id: run.caseId,
    state: run.lifecycle?.state || run.status || "unknown"
  }];
  for (const entry of run.ledger || []) {
    const spend = Number(entry.result?.actual_spend_usd || entry.result?.estimated_spend_usd || entry.actual_spend_usd || 0);
    if (spend > 0) events.push({ event_type: "provider_spend", run_id: run.runId, provider_spend_usd: spend });
    const verifierIssues = entry.result?.verifier?.issues || entry.verifier?.issues || entry.validation_issues || [];
    if (Array.isArray(verifierIssues) && verifierIssues.length) {
      events.push({ event_type: "verifier_failure", run_id: run.runId, count: verifierIssues.length });
    }
    if (/crawler/i.test(entry.entry_type || "") && /failed|blocked/i.test(entry.status || "")) {
      events.push({ event_type: "crawler_failure", run_id: run.runId, status: entry.status });
    }
    if (Array.isArray(entry.candidates) && entry.candidates.length) {
      events.push({ event_type: "candidate_backlog", run_id: run.runId, count: entry.candidates.length });
    }
  }
  return events;
}

function evaluateAlerts(metrics, thresholds) {
  return [
    alertIf("provider_spend_exceeded", metrics.provider_spend_usd > thresholds.provider_spend_usd, metrics.provider_spend_usd, thresholds.provider_spend_usd),
    alertIf("verifier_failures_exceeded", metrics.verifier_failures > thresholds.verifier_failures, metrics.verifier_failures, thresholds.verifier_failures),
    alertIf("queue_backlog_exceeded", metrics.queue_backlog > thresholds.queue_backlog, metrics.queue_backlog, thresholds.queue_backlog),
    alertIf("crawler_failures_exceeded", metrics.crawler_failures > thresholds.crawler_failures, metrics.crawler_failures, thresholds.crawler_failures)
  ].filter(Boolean);
}

function alertIf(alert_type, condition, observed, threshold) {
  return condition ? { alert_type, severity: "warning", observed, threshold, status: "triggered" } : null;
}

function countBy(values) {
  return values.reduce((counts, value) => ({ ...counts, [value]: (counts[value] || 0) + 1 }), {});
}

function sumEvents(events, field) {
  return Number(events.reduce((sum, event) => sum + Number(event[field] || 0), 0).toFixed(4));
}
