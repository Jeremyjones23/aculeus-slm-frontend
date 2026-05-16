import { buildTelemetrySnapshot, validateTelemetrySnapshot } from "../lib/aculeus-telemetry.js";

const snapshot = buildTelemetrySnapshot([
  {
    runId: "run_telemetry_1",
    caseId: "case_telemetry_1",
    lifecycle: { state: "ready" },
    ledger: [
      { entry_type: "provider_search", status: "found", result: { actual_spend_usd: 0.75 }, candidates: Array.from({ length: 8 }, (_, index) => ({ candidate_id: `c${index}` })) },
      { entry_type: "reviewer_action", status: "blocked", result: { verifier: { issues: [{ severity: "blocking" }, { severity: "blocking" }] } } },
      { entry_type: "crawler_fetch", status: "failed_fetch" }
    ]
  },
  {
    runId: "run_telemetry_2",
    caseId: "case_telemetry_2",
    status: "retrieving",
    ledger: [
      { entry_type: "crawler_fetch", status: "blocked" },
      { entry_type: "reviewer_action", status: "blocked", validation_issues: [{ severity: "blocking" }] }
    ]
  }
], {
  providerSpendUsd: 0.5,
  verifierFailures: 2,
  queueBacklog: 5,
  crawlerFailures: 1,
  createdAt: "2026-05-16T13:00:00.000Z"
});

const issues = validateTelemetrySnapshot(snapshot);
if (issues.length) throw new Error(`Telemetry snapshot failed validation:\n${issues.join("\n")}`);
for (const alertType of ["provider_spend_exceeded", "verifier_failures_exceeded", "queue_backlog_exceeded", "crawler_failures_exceeded"]) {
  if (!snapshot.alerts.some((alert) => alert.alert_type === alertType && alert.status === "triggered")) {
    throw new Error(`expected alert did not trigger: ${alertType}`);
  }
}
if (snapshot.metrics.run_states.ready !== 1 || snapshot.metrics.run_states.retrieving !== 1) throw new Error("run state metrics incorrect");
if (snapshot.metrics.provider_spend_usd !== 0.75) throw new Error("provider spend metric incorrect");
if (snapshot.metrics.verifier_failures !== 3) throw new Error("verifier failure metric incorrect");
if (snapshot.metrics.queue_backlog !== 8) throw new Error("queue backlog metric incorrect");
if (snapshot.metrics.crawler_failures !== 2) throw new Error("crawler failure metric incorrect");

console.log("Telemetry alert verification passed.");
