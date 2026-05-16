import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createSmokeAuthHeaders } from "./smoke-auth-headers.mjs";

const base = (process.argv[2] || process.env.ACULEUS_DEPLOY_URL || "https://aculeus-slm-frontend.vercel.app").replace(/\/+$/, "");
const headers = createSmokeAuthHeaders({
  userId: process.env.ACULEUS_SMOKE_USER_ID || "postdeploy_training_export_admin",
  email: process.env.ACULEUS_SMOKE_EMAIL || "training-export-admin@aculeus.local",
  role: process.env.ACULEUS_SMOKE_ROLE || "admin"
});
const results = [];

const runStart = await fetch(`${base}/api/runs/start`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    lead: "Training export smoke: public records trace review and offline export",
    caseId: `training_export_smoke_${Date.now()}`
  })
});
const runJson = await readJson(runStart);
const runId = runJson?.run?.runId;
record("run_start", { status: runStart.status, ok: runJson?.ok, runId });
assert(runStart.ok && runId, "training export smoke run start failed");

const provider = await fetch(`${base}/api/provider-search`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    runId,
    rawQuery: "public agency contract audit official spending source",
    enableNetwork: false,
    providerCapUsd: 0.02,
    maxTasks: 1,
    maxResults: 1
  })
});
const providerJson = await readJson(provider);
const traceId = providerJson?.training_trace?.trace_id;
record("provider_trace", { status: provider.status, ok: providerJson?.ok, traceId });
assert(provider.ok && traceId, "provider trace was not created for training export smoke");

const review = await fetch(`${base}/api/admin/training-traces/${encodeURIComponent(traceId)}/review`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    decision: "approve_for_training",
    note: "Postdeploy smoke approved this dry provider trace after checking candidate-only source and offline export gates."
  })
});
const reviewJson = await readJson(review);
record("trace_review", {
  status: review.status,
  ok: reviewJson?.ok,
  reviewStatus: reviewJson?.trace?.review_status,
  trainingAllowed: reviewJson?.training_conversion_allowed
});
assert(review.ok && reviewJson?.training_conversion_allowed === true, "trace review did not approve export");

const sftExport = await fetch(`${base}/api/admin/training-export?format=sft&limit=50`, { headers });
const sftBody = await sftExport.text();
record("sft_export", {
  status: sftExport.status,
  rowCountHeader: sftExport.headers.get("x-aculeus-row-count"),
  productionUpdateAllowed: sftExport.headers.get("x-aculeus-production-update-allowed"),
  containsTrace: sftBody.includes(traceId)
});
assert(sftExport.ok, "SFT export download failed");
assert(sftExport.headers.get("x-aculeus-production-update-allowed") === "false", "SFT export allowed production update");
assert(sftBody.includes(traceId), "SFT export did not include approved trace");

const preferenceExport = await fetch(`${base}/api/admin/training-export?format=preference&limit=50`, { headers });
const preferenceBody = await preferenceExport.text();
record("preference_export", {
  status: preferenceExport.status,
  rowCountHeader: preferenceExport.headers.get("x-aculeus-row-count"),
  containsTrace: preferenceBody.includes(traceId)
});
assert(preferenceExport.ok && preferenceBody.includes(traceId), "preference export did not include approved trace");

const packet = { ok: true, base, runId, traceId, results };
const outDir = process.env.ACULEUS_SMOKE_ARTIFACT_DIR || join(process.cwd(), "qa-artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `postdeploy-training-export-smoke-${Date.now()}.json`);
writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...packet, artifactPath: outPath }, null, 2));

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text.slice(0, 800) };
  }
}

function record(check, data) {
  results.push({ check, ...data });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
