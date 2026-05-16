import { evaluateRefreshResult, planSourceRefreshJobs, validateRefreshLedgerEvent } from "../lib/aculeus-source-refresh-scheduler.js";

const run = {
  ledger: [{
    entry_type: "receipt_fetch",
    receipt: {
      receipt_id: "rcpt_fixture",
      url: "https://example.gov/record",
      content_sha256: "oldhash"
    }
  }]
};

const jobs = planSourceRefreshJobs({ run, now: "2026-05-16T12:00:00.000Z" });
const changed = evaluateRefreshResult(jobs[0], { ok: true, status_code: 200, content_sha256: "newhash" });
const failures = validateRefreshLedgerEvent(changed);

if (jobs.length !== 1) failures.push("expected one refresh job");
if (changed.status !== "changed") failures.push("refresh event should mark changed hash");
if (changed.previous_content_sha256 !== "oldhash") failures.push("refresh event did not preserve old hash");

const broken = evaluateRefreshResult(jobs[0], { ok: false, status_code: 404, content_sha256: null });
failures.push(...validateRefreshLedgerEvent(broken));
if (broken.status !== "broken" || !broken.labels.includes("failed_fetch")) failures.push("broken refresh event missing failed_fetch label");

if (failures.length) {
  console.error(`Source refresh scheduler verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Source refresh scheduler verification passed.");
