import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { createSmokeAuthHeaders } from "./smoke-auth-headers.mjs";

const port = 4532;
const storeDir = mkdtempSync(join(tmpdir(), "aculeus-prod-auth-store-"));
const receiptDir = mkdtempSync(join(tmpdir(), "aculeus-prod-auth-receipts-"));
const tracePath = join(mkdtempSync(join(tmpdir(), "aculeus-prod-auth-traces-")), "traces.jsonl");
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const command = "start";
const base = `http://127.0.0.1:${port}`;
const smokeSecret = "local_route_auth_secret_fixture";
process.env.ACULEUS_SMOKE_SECRET = smokeSecret;

const child = spawn(process.execPath, [nextBin, command, "-p", String(port), "-H", "127.0.0.1"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ACULEUS_AUTH_MODE: "production",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
    CLERK_SECRET_KEY: "sk_test_fixture",
    ACULEUS_SMOKE_SECRET: smokeSecret,
    ACULEUS_PRODUCT_STORE_DIR: storeDir,
    ACULEUS_RECEIPT_STORE_DIR: receiptDir,
    ACULEUS_TRAINING_TRACE_PATH: tracePath,
    BROWSERBASE_API_KEY: ""
  },
  stdio: "ignore"
});

const operatorHeaders = createSmokeAuthHeaders({
  userId: "operator_route_auth",
  email: "operator@aculeus.local",
  role: "operator"
});

const reviewerHeaders = createSmokeAuthHeaders({
  userId: "reviewer_route_auth",
  email: "reviewer@aculeus.local",
  role: "reviewer"
});

const viewerHeaders = createSmokeAuthHeaders({
  userId: "viewer_route_auth",
  email: "viewer@aculeus.local",
  role: "viewer"
});

try {
  await retry(async () => {
    const response = await fetch(`${base}/`);
    if (!response.ok) throw new Error(`Next ${command} server not ready: ${response.status}`);
  }, 100, 300);

  await expectStatus("POST /api/runs/start without auth", "/api/runs/start", { lead: "auth gate" }, {}, 403);
  await expectStatus("POST /api/runs/start viewer denied", "/api/runs/start", { lead: "auth gate" }, viewerHeaders, 403);
  const runPayload = await postJson("/api/runs/start", { lead: "LA homelessness public spending controls", caseId: "source_la_homelessness_fwa" }, operatorHeaders);
  const runId = runPayload.run?.runId;
  if (!runPayload.ok || !runId) throw new Error("operator could not create a run in production auth mode");

  await expectStatus("GET /api/runs/:runId without auth", `/api/runs/${runId}`, null, {}, 403, "GET");
  await expectStatus("GET /api/runs/:runId viewer allowed", `/api/runs/${runId}`, null, viewerHeaders, 200, "GET");
  await expectStatus("GET /api/runs/:runId/case-board without auth", `/api/runs/${runId}/case-board`, null, {}, 403, "GET");
  await expectStatus("POST /api/provider-search without auth", "/api/provider-search", { runId, rawQuery: "LA homelessness" }, {}, 403);
  await expectStatus("POST /api/provider-search viewer denied", "/api/provider-search", { runId, rawQuery: "LA homelessness" }, viewerHeaders, 403);
  const provider = await postJson("/api/provider-search", {
    runId,
    rawQuery: "LA homelessness public spending controls",
    caseId: "source_la_homelessness_fwa",
    enableNetwork: false,
    providerCapUsd: 0,
    maxTasks: 2,
    maxResults: 1
  }, operatorHeaders);
  if (!provider.ok || provider.mode !== "provider_search_operator") throw new Error("operator provider search did not pass production auth gate");

  await expectStatus("POST /api/official-api-search reviewer denied", "/api/official-api-search", { runId, rawQuery: "LA homelessness" }, reviewerHeaders, 403);
  await expectStatus("POST /api/receipt-fetch without auth", "/api/receipt-fetch", { runId }, {}, 403);
  await expectStatus("POST /api/browser-capture without auth", "/api/browser-capture", { runId, url: "https://example.com" }, {}, 403);
  const browserCapture = await postJson("/api/browser-capture", { runId, url: "https://example.com", candidate_id: "auth_browser_candidate" }, reviewerHeaders);
  if (!browserCapture.ok || browserCapture.ledger_entry?.evidence_promotion_allowed !== false) throw new Error("reviewer browser capture did not pass auth gate while preserving promotion boundary");
  await expectStatus("POST /api/reviewer-actions without auth", "/api/reviewer-actions", { runId, action: "reject_candidate_source" }, {}, 403);
  const review = await postJson("/api/reviewer-actions", {
    runId,
    caseId: "source_la_homelessness_fwa",
    action: "reject_candidate_source",
    candidate: provider.dedupe.candidates[0],
    reason: "Auth route verifier rejection.",
    reviewer: "reviewer_route_auth"
  }, reviewerHeaders);
  if (!review.ok || review.status !== "candidate_rejected_or_deferred") throw new Error("reviewer action did not pass production auth gate");

  await expectStatus("GET /api/runs/:runId/export viewer denied", `/api/runs/${runId}/export`, null, viewerHeaders, 403, "GET");
  await expectStatus("GET /api/runs/:runId/export reviewer allowed", `/api/runs/${runId}/export`, null, reviewerHeaders, 200, "GET");

  console.log("Production route auth verification passed.");
} finally {
  child.kill();
  await sleep(300);
  rmSync(storeDir, { recursive: true, force: true });
  rmSync(receiptDir, { recursive: true, force: true });
  rmSync(dirname(tracePath), { recursive: true, force: true });
}

async function expectStatus(label, path, body, headers, expected, method = "POST") {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: method === "GET" ? undefined : JSON.stringify(body || {})
  });
  if (response.status !== expected) {
    const text = await response.text().catch(() => "");
    throw new Error(`${label}: expected ${expected}, got ${response.status}. ${text.slice(0, 400)}`);
  }
  return response;
}

async function postJson(path, body, headers) {
  const response = await expectStatus(path, path, body, headers, 200);
  return response.json();
}

async function retry(fn, attempts, delay) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await sleep(delay);
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
