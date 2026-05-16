import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SAFE_RUN_ID = /^[a-zA-Z0-9_-]+$/;

export function createFileRunStore(rootDir) {
  const dir = resolve(rootDir || join(process.cwd(), "data", "investigation-runs"));
  mkdirSync(dir, { recursive: true });

  return {
    dir,
    getRun(runId) {
      const filePath = runPath(dir, runId);
      if (!existsSync(filePath)) return null;
      const value = JSON.parse(readFileSync(filePath, "utf8"));
      return value && typeof value === "object" ? value : null;
    },
    saveRun(run) {
      const clean = sanitizeRun(run);
      writeFileSync(runPath(dir, clean.run_id), `${JSON.stringify(clean, null, 2)}\n`, "utf8");
      return clean;
    }
  };
}

export function createMemoryRunStore(initialRuns = []) {
  const runs = new Map(initialRuns.map((run) => [run.run_id, sanitizeRun(run)]));
  return {
    dir: "memory",
    getRun(runId) {
      return runs.get(String(runId || "")) || null;
    },
    saveRun(run) {
      const clean = sanitizeRun(run);
      runs.set(clean.run_id, clean);
      return clean;
    }
  };
}

function runPath(dir, runId) {
  const cleanId = String(runId || "");
  if (!SAFE_RUN_ID.test(cleanId)) throw new Error("Invalid run id");
  return join(dir, `${cleanId}.json`);
}

function sanitizeRun(run) {
  if (!run || typeof run !== "object") throw new Error("Run must be an object");
  if (!SAFE_RUN_ID.test(String(run.run_id || ""))) throw new Error("Run requires safe run_id");
  return JSON.parse(JSON.stringify(run));
}
