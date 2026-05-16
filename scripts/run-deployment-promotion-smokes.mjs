import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getRequestUser, canAccessWorkspace, canCreateCase, ROLES } from "../lib/access-control.js";
import {
  buildDeploymentPromotionPacket,
  REQUIRED_PRODUCTION_ENV,
  REQUIRED_PROVIDER_ENV,
  summarizeEnvironment,
  validateDeploymentPromotionPacket
} from "../lib/aculeus-deployment-promotion.js";
import { storeArtifact, validateArtifactRef } from "../lib/aculeus-blob-artifacts.js";
import { buildInvestigationSpec } from "../lib/aculeus-operator-spec.js";
import { planOfficialApiTasks } from "../lib/aculeus-official-source-router.js";
import { executeOfficialApiTasks, validateOfficialApiExecution } from "../lib/aculeus-official-api-executor.js";
import { hardenInvestigationQuery } from "../lib/aculeus-source-fed-contracts.js";
import { planProviderCandidateTasks } from "../lib/aculeus-provider-candidates.js";
import { executeProviderCandidateTasks, validateProviderExecution } from "../lib/aculeus-provider-executor.js";
import { query } from "../lib/database.js";

const loadedLocalEnv = loadDotEnvLocal();
for (const [key, value] of Object.entries(loadedLocalEnv.values)) {
  if (!process.env[key]) process.env[key] = value;
}

const project = readVercelProject();
const validation = {
  build: existsSync(join(process.cwd(), ".next", "BUILD_ID"))
    ? { status: process.env.ACULEUS_PROMOTION_BUILD_STATUS || "pass", command: "npm run build", artifact: ".next/BUILD_ID" }
    : { status: "not_run", command: "npm run build", artifact: null },
  verify: { status: process.env.ACULEUS_PROMOTION_VERIFY_STATUS || "not_run", command: "npm run verify" },
  vercel_build: existsSync(join(process.cwd(), ".vercel", "output", "config.json"))
    ? { status: process.env.ACULEUS_PROMOTION_VERCEL_BUILD_STATUS || "pass", command: "npx vercel build --yes", artifact: ".vercel/output" }
    : { status: "not_run", command: "npx vercel build --yes", artifact: null }
};

const smokes = {
  auth_smoke: runAuthSmoke(),
  neon_smoke: await runNeonSmoke(),
  blob_smoke: await runBlobSmoke(),
  provider_smoke: await runProviderSmoke(),
  official_api_25: await runOfficialApi25Smoke()
};

const envSummary = summarizeEnvironment(process.env, {
  localEnvKeys: loadedLocalEnv.keys,
  userEnvKeys: String(process.env.ACULEUS_USER_ENV_KEYS || "").split(",").filter(Boolean)
});

const packet = buildDeploymentPromotionPacket({
  env_summary: envSummary,
  project,
  validation,
  smokes
});

const secretValues = Object.keys(process.env)
  .filter((key) => /KEY|TOKEN|SECRET|DATABASE_URL/i.test(key))
  .map((key) => process.env[key])
  .filter(Boolean);
const issues = validateDeploymentPromotionPacket(packet, secretValues);
if (issues.length) {
  throw new Error(`Deployment promotion packet failed validation:\n${issues.join("\n")}`);
}

const outputDir = join(process.cwd(), "qa-artifacts");
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, "aculeus-deployment-promotion-packet.json");
writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

console.log(`Deployment promotion smokes complete. Packet: ${outputPath}`);
console.log(JSON.stringify({
  target: packet.target,
  preview_ready: packet.pass_fail_gates.preview_ready,
  production_env_ready: packet.pass_fail_gates.production_env_ready,
  provider_env_ready: packet.pass_fail_gates.provider_env_ready,
  official_api_25_status: packet.smokes.official_api_25.status,
  provider_smoke_status: packet.smokes.provider_smoke.status,
  blocked_tasks: packet.tasks.filter((task) => task.status === "blocked").map((task) => task.id)
}, null, 2));

function runAuthSmoke() {
  const productionEnvMissing = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"].filter((key) => !process.env[key]);
  const productionEnv = {
    ACULEUS_AUTH_MODE: "production",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_boundary_fixture",
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || "sk_boundary_fixture"
  };
  const anonymous = getRequestUser(new Request("http://aculeus.local/api/session"), productionEnv);
  const approved = getRequestUser(new Request("http://aculeus.local/api/session", {
    headers: {
      "x-clerk-user-id": "user_smoke_operator",
      "x-aculeus-email": "operator@aculeus.local",
      "x-aculeus-role": ROLES.operator,
      "x-aculeus-approval-status": "approved"
    }
  }), productionEnv);
  const pass = !canAccessWorkspace(anonymous) && canAccessWorkspace(approved) && canCreateCase(approved);
  if (!pass) return { status: "fail", summary: "Auth boundary did not block anonymous and admit approved operator." };
  if (productionEnvMissing.length) {
    return {
      status: "blocked",
      summary: `Auth boundary logic passed with fixtures, but live Clerk env is missing: ${productionEnvMissing.join(", ")}.`,
      missing: productionEnvMissing
    };
  }
  return { status: "pass", summary: "Production auth boundary smoke passed with configured Clerk env." };
}

async function runNeonSmoke() {
  if (!process.env.DATABASE_URL) {
    return { status: "blocked", summary: "DATABASE_URL is missing; Neon repository smoke was not run.", missing: ["DATABASE_URL"] };
  }
  try {
    const rows = await query("select 1 as ok");
    if (Number(rows?.[0]?.ok) !== 1) return { status: "fail", summary: "Neon select smoke returned unexpected result." };
    return { status: "pass", summary: "Neon connection smoke passed with select 1." };
  } catch (error) {
    return { status: "fail", summary: `Neon smoke failed: ${error.message}` };
  }
}

async function runBlobSmoke() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { status: "blocked", summary: "BLOB_READ_WRITE_TOKEN is missing; live Blob upload was not run.", missing: ["BLOB_READ_WRITE_TOKEN"] };
  }
  try {
    const { put } = await import("@vercel/blob");
    const bytes = new TextEncoder().encode(`Aculeus deployment smoke ${new Date().toISOString()}`);
    const artifact = await storeArtifact({
      bytes,
      fileName: "deployment-smoke.txt",
      contentType: "text/plain",
      visibility: "private"
    }, { blobClient: { put } });
    const issues = validateArtifactRef(artifact);
    if (issues.length) return { status: "fail", summary: `Blob artifact ref failed validation: ${issues.join("; ")}` };
    return {
      status: "pass",
      summary: "Blob upload smoke passed.",
      storage_mode: artifact.storage_mode,
      artifact_id: artifact.artifact_id,
      size: artifact.size
    };
  } catch (error) {
    return { status: "fail", summary: `Blob smoke failed: ${error.message}` };
  }
}

async function runProviderSmoke() {
  const missing = ["EXA_API_KEY", "PARALLEL_API_KEY"].filter((key) => !process.env[key]);
  if (missing.length) return { status: "blocked", summary: `Provider keys missing: ${missing.join(", ")}.`, missing };
  const cap = Number(process.env.ACULEUS_PROVIDER_SMOKE_CAP_USD || 0.25);
  try {
    const spec = hardenInvestigationQuery({
      rawQuery: "LAHSA audited financial statements homelessness contracts public records"
    });
    const tasks = planProviderCandidateTasks(spec, { maxTasks: 2, maxResults: 2, providerCapUsd: cap });
    const result = await executeProviderCandidateTasks(tasks, {
      enableNetwork: true,
      providerCapUsd: cap,
      maxTasks: 2,
      maxResults: 2,
      providerApiKeys: {
        EXA_API_KEY: process.env.EXA_API_KEY,
        PARALLEL_API_KEY: process.env.PARALLEL_API_KEY
      }
    });
    const issues = validateProviderExecution(result);
    if (issues.length) return { status: "fail", summary: `Provider smoke failed validation: ${issues.join("; ")}` };
    return {
      status: result.status === "PASS" ? "pass" : "partial",
      summary: `Provider smoke completed with ${result.candidate_count} candidate leads under cap.`,
      candidate_count: result.candidate_count,
      estimated_spend_usd: result.estimated_spend_usd,
      provider_cap_usd: result.provider_cap_usd,
      provider_calls_executed: result.provider_calls_executed,
      result_set_count: result.result_set_count
    };
  } catch (error) {
    return { status: "fail", summary: `Provider smoke failed: ${error.message}`, provider_cap_usd: cap };
  }
}

async function runOfficialApi25Smoke() {
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "data", "eval-bank", "aculeus-eval-bank-25.json"), "utf8"));
  const caseResults = [];
  let totalRecords = 0;
  let totalResultSets = 0;
  const failures = [];
  for (const item of manifest.cases) {
    const spec = buildInvestigationSpec({
      rawQuery: item.query,
      casePacket: {
        caseId: item.case_id,
        title: item.query,
        jurisdiction: item.jurisdiction
      }
    });
    const tasks = planOfficialApiTasks(spec, { maxTasks: 4, maxResults: 1 })
      .filter((task) => !task.requires_secret && task.source_id !== "legistar_events")
      .slice(0, 2);
    if (!tasks.length) {
      failures.push(`${item.case_id}: no executable public official API tasks`);
      continue;
    }
    const result = await executeOfficialApiTasks(tasks, {
      enableNetwork: true,
      maxTasks: tasks.length,
      maxResults: 1,
      timeoutMs: 10000,
      maxBytes: 300000
    });
    const issues = validateOfficialApiExecution(result);
    if (issues.length) failures.push(`${item.case_id}: ${issues.join("; ")}`);
    if (result.result_sets.some((set) => set.status === "ERROR")) failures.push(`${item.case_id}: one or more public official API calls failed`);
    totalRecords += result.record_count || 0;
    totalResultSets += result.result_set_count || 0;
    caseResults.push({
      case_id: item.case_id,
      status: result.status,
      result_set_count: result.result_set_count,
      record_count: result.record_count
    });
  }
  return {
    status: failures.length ? "fail" : "pass",
    summary: failures.length
      ? `Official API 25-case live regression had ${failures.length} failures.`
      : `Official API 25-case live regression passed with ${totalResultSets} result sets.`,
    case_count: manifest.cases.length,
    total_result_sets: totalResultSets,
    total_records: totalRecords,
    failures: failures.slice(0, 10),
    cases: caseResults
  };
}

function readVercelProject() {
  const projectPath = join(process.cwd(), ".vercel", "project.json");
  if (!existsSync(projectPath)) return { linked: false, project_id: null, org_id: null };
  try {
    const project = JSON.parse(readFileSync(projectPath, "utf8"));
    return {
      linked: Boolean(project.projectId && project.orgId),
      project_id: project.projectId || null,
      org_id: project.orgId || null
    };
  } catch {
    return { linked: false, project_id: null, org_id: null };
  }
}

function loadDotEnvLocal() {
  const allowedNames = new Set([
    ...REQUIRED_PRODUCTION_ENV,
    ...REQUIRED_PROVIDER_ENV,
    "DATA_GOV_API_KEY"
  ]);
  const values = {};
  const files = [
    join(process.cwd(), ".env.local"),
    join(process.cwd(), ".vercel", ".env.production.local"),
    join(process.cwd(), ".vercel", ".env.preview.local")
  ];
  for (const envPath of files) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      const name = key.trim();
      if (!allowedNames.has(name)) continue;
      values[name] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return { values, keys: Object.keys(values) };
}
