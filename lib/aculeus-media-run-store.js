// N1 — Media-run persistence (local file mode).
//
// Self-contained local store so the media-run route works in dev/CI without a database.
// Durable Neon persistence (writing read_snapshots + media_runs to satisfy the schema
// FKs) is wired when DATABASE_URL is provisioned — deliberately NOT imported here so this
// module stays testable without @neondatabase/serverless. Secrets are stripped on write.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function storeDir() {
  return process.env.ACULEUS_MEDIA_STORE_DIR || join(process.cwd(), ".local", "media-runs");
}
function storeFile() {
  return join(storeDir(), "media-runs.json");
}
function readStore() {
  mkdirSync(storeDir(), { recursive: true });
  try {
    const parsed = JSON.parse(readFileSync(storeFile(), "utf8"));
    return { mediaRuns: Array.isArray(parsed.mediaRuns) ? parsed.mediaRuns : [] };
  } catch {
    return { mediaRuns: [] };
  }
}
function writeStore(store) {
  mkdirSync(storeDir(), { recursive: true });
  writeFileSync(storeFile(), `${JSON.stringify(store, null, 2)}\n`, "utf8");
  return store;
}

export function saveMediaRun(mediaRun) {
  const store = readStore();
  const item = sanitizePublic(mediaRun);
  store.mediaRuns = [item, ...store.mediaRuns.filter((m) => m.media_run_id !== item.media_run_id)];
  writeStore(store);
  return item;
}

export function getMediaRun(mediaRunId) {
  return readStore().mediaRuns.find((m) => m.media_run_id === mediaRunId) || null;
}

export function listMediaRuns() {
  return readStore().mediaRuns;
}

// Durable Neon persistence. The DB client is lazily imported so this module stays
// importable (and locally testable) without @neondatabase/serverless. The read_snapshot
// is written first to satisfy the media_runs FK, then the media_run with its full payload.
// Deploy-verified-only: runs where DATABASE_URL + the schema exist.
export async function saveMediaRunAuto(mediaRun, snapshot) {
  const { hasDatabase, query } = await import("./database.js");
  if (!hasDatabase()) return saveMediaRun(mediaRun);
  // read_snapshots.source_run_id and media_runs.source_run_id are NOT NULL and reference
  // runs(id); without a real source run there is nothing valid to point the FK at, so keep
  // the run in the local store rather than throwing after a successful pipeline run.
  if (!snapshot?.source_run_id) return saveMediaRun(mediaRun);
  const item = sanitizePublic(mediaRun);
  if (snapshot && snapshot.content_hash) {
    await query(
      `insert into read_snapshots (id, source_run_id, case_id, snapshot_version, bottom_line, counter_case, thin_evidence, eligible, content_hash, payload, created_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb, now())
       on conflict (id) do nothing`,
      [
        snapshot.content_hash, snapshot.source_run_id || null, snapshot.case_id || null, snapshot.snapshot_version || 1,
        snapshot.bottom_line || "", JSON.stringify(snapshot.counter_case || []), JSON.stringify(snapshot.thin_evidence || []),
        snapshot.eligible === true, snapshot.content_hash, JSON.stringify(snapshot)
      ]
    );
  }
  await query(
    `insert into media_runs (id, source_run_id, read_snapshot_id, case_id, status, profile_set, format_set, cost_summary, payload, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, now(), now())
     on conflict (id) do update set status = excluded.status, payload = excluded.payload, updated_at = now()`,
    [
      item.media_run_id, item.source_run_id || null, item.read_snapshot_id || null, item.case_id || null, item.status || "review",
      JSON.stringify(item.profile_set || []), JSON.stringify(item.format_set || []), JSON.stringify({}), JSON.stringify(item)
    ]
  );
  return item;
}

export async function getMediaRunAuto(mediaRunId) {
  const { hasDatabase, query } = await import("./database.js");
  if (!hasDatabase()) return getMediaRun(mediaRunId);
  const rows = await query("select payload from media_runs where id = $1 limit 1", [mediaRunId]);
  return rows[0]?.payload || null;
}

function sanitizePublic(value) {
  return JSON.parse(JSON.stringify(value, (key, child) => {
    if (/api[_-]?key|authorization|secret|token/i.test(key)) return undefined;
    return child;
  }));
}
