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

function sanitizePublic(value) {
  return JSON.parse(JSON.stringify(value, (key, child) => {
    if (/api[_-]?key|authorization|secret|token/i.test(key)) return undefined;
    return child;
  }));
}
