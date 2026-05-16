export function planSourceRefreshJobs({ run, receipts = [], now = new Date().toISOString() } = {}) {
  const ledger = Array.isArray(run?.ledger) ? run.ledger : [];
  const urls = new Map();
  for (const receipt of receipts) {
    if (receipt.url || receipt.final_url) urls.set(receipt.receipt_id, receipt);
  }
  for (const entry of ledger) {
    const receipt = entry.receipt;
    if (receipt?.receipt_id && (receipt.url || receipt.final_url)) urls.set(receipt.receipt_id, receipt);
  }
  return [...urls.values()].map((receipt) => ({
    job_id: `refresh_${receipt.receipt_id}`,
    receipt_id: receipt.receipt_id,
    url: receipt.final_url || receipt.url,
    previous_content_sha256: receipt.content_sha256,
    status: "scheduled",
    scheduled_at: now,
    public_safe: true
  }));
}

export function evaluateRefreshResult(job, refreshed = {}) {
  const changed = refreshed.content_sha256 && job.previous_content_sha256 && refreshed.content_sha256 !== job.previous_content_sha256;
  const broken = refreshed.ok === false || refreshed.status_code >= 400;
  return {
    ledger_entry_id: `refresh_${job.receipt_id}_${Date.now()}`,
    entry_type: "source_refresh",
    receipt_id: job.receipt_id,
    url: job.url,
    status: broken ? "broken" : changed ? "changed" : "unchanged",
    labels: ["refresh", broken ? "failed_fetch" : changed ? "source_changed" : "source_unchanged"],
    previous_content_sha256: job.previous_content_sha256,
    refreshed_content_sha256: refreshed.content_sha256 || null,
    old_receipt_preserved: true,
    evidence_promotion_allowed: false,
    public_safe: true,
    created_at: new Date().toISOString()
  };
}

export function validateRefreshLedgerEvent(event) {
  const issues = [];
  if (!event || typeof event !== "object") return ["refresh event must be an object"];
  if (!["broken", "changed", "unchanged"].includes(event.status)) issues.push("refresh event status invalid");
  if (!event.previous_content_sha256) issues.push("refresh event must preserve previous hash");
  if (event.old_receipt_preserved !== true) issues.push("refresh event must preserve old receipt");
  if (event.evidence_promotion_allowed !== false) issues.push("refresh event must not promote evidence");
  return issues;
}
