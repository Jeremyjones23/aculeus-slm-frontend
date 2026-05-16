import { createBackupPacket, planRetentionDryRun, restoreBackupPacket, validateBackupPacket } from "../lib/aculeus-backup-restore.js";

const packet = createBackupPacket({
  cases: [{ caseId: "case_backup_1", title: "Backup case" }],
  runs: [
    { runId: "run_backup_old", caseId: "case_backup_1", updatedAt: "2026-04-01T00:00:00.000Z", raw_text: "must be removed" },
    { runId: "run_backup_recent", caseId: "case_backup_1", updatedAt: "2026-05-15T00:00:00.000Z" }
  ],
  sources: [{ sourceId: "source_backup_1" }]
}, {
  backupId: "backup_verify",
  createdAt: "2026-05-16T14:00:00.000Z",
  retentionDays: 30
});

const issues = validateBackupPacket(packet);
if (issues.length) throw new Error(`Backup packet failed validation:\n${issues.join("\n")}`);
if (JSON.stringify(packet).includes("must be removed")) throw new Error("backup sanitizer leaked raw text");
const restore = restoreBackupPacket(packet);
if (!restore.ok || restore.restored_store.runs.length !== 2) throw new Error("backup restore failed");
const retention = planRetentionDryRun(packet, "2026-05-16T14:00:00.000Z");
if (retention.destructive_action_planned !== false) throw new Error("retention dry-run planned destructive action");
if (!retention.purge_candidates.some((item) => item.run_id === "run_backup_old")) throw new Error("retention dry-run missed old run");
if (retention.purge_candidates.some((item) => item.run_id === "run_backup_recent")) throw new Error("retention dry-run marked recent run");

console.log("Backup/restore verification passed.");
