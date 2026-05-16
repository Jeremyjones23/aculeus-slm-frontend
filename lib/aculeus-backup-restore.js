export function createBackupPacket(store = {}, options = {}) {
  return sanitize({
    schema_version: "aculeus_backup_packet.v1",
    backup_id: options.backupId || `backup_${Date.now()}`,
    created_at: options.createdAt || new Date().toISOString(),
    retention_days: Number(options.retentionDays || options.retention_days || 30),
    store: {
      accessRequests: store.accessRequests || [],
      cases: store.cases || [],
      runs: store.runs || [],
      sources: store.sources || []
    },
    counts: {
      cases: (store.cases || []).length,
      runs: (store.runs || []).length,
      sources: (store.sources || []).length
    },
    public_safe: true
  });
}

export function restoreBackupPacket(packet = {}) {
  const issues = validateBackupPacket(packet);
  if (issues.length) return { ok: false, issues, restored_store: null };
  return {
    ok: true,
    restored_store: {
      accessRequests: packet.store.accessRequests || [],
      cases: packet.store.cases || [],
      runs: packet.store.runs || [],
      sources: packet.store.sources || []
    },
    restored_counts: packet.counts
  };
}

export function planRetentionDryRun(packet = {}, now = new Date().toISOString()) {
  const cutoff = Date.parse(now) - Number(packet.retention_days || 30) * 24 * 60 * 60 * 1000;
  const runs = packet.store?.runs || [];
  const purge_candidates = runs
    .filter((run) => Date.parse(run.updatedAt || run.updated_at || run.createdAt || run.created_at || now) < cutoff)
    .map((run) => ({
      run_id: run.runId,
      case_id: run.caseId,
      reason: "older_than_retention_window",
      destructive_action_planned: false
    }));
  return {
    schema_version: "aculeus_retention_dry_run.v1",
    now,
    retention_days: Number(packet.retention_days || 30),
    purge_candidates,
    destructive_action_planned: false,
    public_safe: true
  };
}

export function validateBackupPacket(packet = {}) {
  const issues = [];
  if (packet.schema_version !== "aculeus_backup_packet.v1") issues.push("backup schema mismatch");
  if (!packet.backup_id || !packet.created_at) issues.push("backup missing identifiers");
  if (!packet.store || !Array.isArray(packet.store.runs)) issues.push("backup missing store runs");
  if (packet.public_safe !== true) issues.push("backup packet must be public safe");
  if (JSON.stringify(packet).match(/api[_-]?key|authorization|secret|raw_text/i)) issues.push("backup packet leaked blocked material");
  return issues;
}

function sanitize(value) {
  return JSON.parse(JSON.stringify(value, (key, child) => {
    if (/api[_-]?key|authorization|secret|token|raw_text|rawText|request_headers/i.test(key)) return undefined;
    return child;
  }));
}
