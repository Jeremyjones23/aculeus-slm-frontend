import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = (process.argv[2] || process.env.ACULEUS_DEPLOY_URL || "https://aculeus-slm-frontend.vercel.app").replace(/\/+$/, "");
const outDir = process.env.ACULEUS_SMOKE_ARTIFACT_DIR || join(process.cwd(), "qa-artifacts");
mkdirSync(outDir, { recursive: true });

const checks = [
  runCheck("postdeploy_auth_provider_dry_source_ledger", ["scripts/postdeploy-smoke.mjs", base], {
    ACULEUS_LIVE_PROVIDER_SMOKE: "false"
  }),
  runCheck("postdeploy_receipt_gate", ["scripts/postdeploy-receipt-smoke.mjs", base], {}),
  runCheck("postdeploy_training_export_download", ["scripts/postdeploy-training-export-smoke.mjs", base], {})
];

const failed = checks.filter((check) => check.status !== "pass");
const packet = {
  ok: failed.length === 0,
  base,
  generated_at: new Date().toISOString(),
  checks,
  gates: {
    production_auth_boundary: checks[0]?.status === "pass",
    provider_dry_run: checks[0]?.status === "pass",
    source_ledger_candidate_only: checks[0]?.status === "pass",
    receipt_fetch_and_verifier: checks[1]?.status === "pass",
    training_export_download: checks[2]?.status === "pass",
    evidence_auto_promotion_allowed: false
  }
};

const outPath = join(outDir, `nightly-production-smoke-${Date.now()}.json`);
writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...packet, artifactPath: outPath }, null, 2));
if (!packet.ok) process.exit(1);

function runCheck(name, args, env) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 180000
  });
  let parsed = null;
  const stdout = String(result.stdout || "").trim();
  try {
    parsed = JSON.parse(stdout.slice(stdout.indexOf("{")));
  } catch {
    parsed = null;
  }
  return {
    name,
    status: result.status === 0 ? "pass" : "fail",
    exit_code: result.status,
    run_id: parsed?.runId || null,
    estimated_provider_spend_usd: parsed?.estimatedProviderSpendUsd || 0,
    promoted_evidence_count: findPromotedEvidenceCount(parsed),
    artifact_path: parsed?.artifactPath || null,
    stderr: String(result.stderr || "").slice(0, 1200)
  };
}

function findPromotedEvidenceCount(parsed) {
  const board = (parsed?.results || []).find((item) => item.check === "case_board");
  return board?.promotedEvidenceCount || parsed?.checks?.promotedEvidenceCount || 0;
}
