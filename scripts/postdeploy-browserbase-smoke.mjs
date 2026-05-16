import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createSmokeAuthHeaders } from "./smoke-auth-headers.mjs";

const base = (process.argv[2] || process.env.ACULEUS_DEPLOY_URL || "https://aculeus-slm-frontend.vercel.app").replace(/\/+$/, "");
const captureUrl = process.env.ACULEUS_BROWSERBASE_SMOKE_URL || "https://example.com";
const headers = createSmokeAuthHeaders({
  userId: process.env.ACULEUS_SMOKE_USER_ID || "postdeploy_browserbase_admin",
  email: process.env.ACULEUS_SMOKE_EMAIL || "browserbase-admin@aculeus.local",
  role: process.env.ACULEUS_SMOKE_ROLE || "admin"
});
const results = [];

const denied = await fetch(`${base}/api/browser-capture`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ url: captureUrl, candidate_id: "browserbase_denied_candidate" })
});
const deniedJson = await readJson(denied);
record("browser_capture_without_auth", { status: denied.status, error: deniedJson?.error });
assert(denied.status === 403, "browser capture did not deny unauthenticated production request");

const runStart = await fetch(`${base}/api/runs/start`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    lead: "Browserbase smoke: public dynamic receipt capture",
    caseId: `browserbase_smoke_${Date.now()}`
  })
});
const runJson = await readJson(runStart);
const runId = runJson?.run?.runId;
record("run_start", { status: runStart.status, ok: runJson?.ok, runId });
assert(runStart.status === 200 && runJson?.ok && runId, "browserbase smoke run start failed");

const captureResponse = await fetch(`${base}/api/browser-capture`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    runId,
    candidate: {
      candidate_id: "browserbase_smoke_candidate",
      source_id: "browserbase_smoke_source",
      url: captureUrl,
      title: "Browserbase smoke public page",
      evidence_id: null,
      evidence_promotion_allowed: false,
      receipt_required: true
    }
  })
});
const captureJson = await readJson(captureResponse);
const capture = captureJson?.capture || {};
record("browser_capture_with_auth", {
  status: captureResponse.status,
  ok: captureJson?.ok,
  provider: capture.provider,
  captureStatus: capture.status,
  hasReceiptHash: Boolean(capture.receipt_hash),
  hasScreenshotHash: Boolean(capture.screenshot_sha256),
  evidencePromotionAllowed: captureJson?.ledger_entry?.evidence_promotion_allowed,
  secretLeak: hasSecretLeak(captureJson)
});
assert(captureResponse.status === 200 && captureJson?.ok, `browser capture failed: ${JSON.stringify(captureJson).slice(0, 500)}`);
assert(capture.status === "captured", "browser capture did not return captured status");
assert(Boolean(capture.receipt_hash), "browser capture missing receipt hash");
assert(captureJson?.ledger_entry?.evidence_promotion_allowed === false, "browser capture escaped evidence gate");
assert(!hasSecretLeak(captureJson), "browser capture leaked secret-bearing fields");

const ledger = await fetch(`${base}/api/runs/${encodeURIComponent(runId)}/ledger`, { headers });
const ledgerJson = await readJson(ledger);
const browserRows = (ledgerJson?.ledger || []).filter((entry) => entry.entry_type === "browser_capture");
record("ledger_persistence", {
  status: ledger.status,
  ok: ledgerJson?.ok,
  browserCaptureRows: browserRows.length,
  candidateOnlyRows: browserRows.filter((entry) => entry.evidence_promotion_allowed === false).length
});
assert(ledger.status === 200 && ledgerJson?.ok, "browser capture ledger fetch failed");
assert(browserRows.length >= 1, "browser capture ledger row was not persisted");
assert(browserRows.every((entry) => entry.evidence_promotion_allowed === false), "browser capture ledger row escaped evidence gate");

const packet = {
  ok: true,
  base,
  runId,
  captureUrl,
  provider: capture.provider,
  captureStatus: capture.status,
  hasReceiptHash: Boolean(capture.receipt_hash),
  hasScreenshotHash: Boolean(capture.screenshot_sha256),
  results
};
const outDir = process.env.ACULEUS_SMOKE_ARTIFACT_DIR || join(process.cwd(), "qa-artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `postdeploy-browserbase-smoke-${Date.now()}.json`);
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

function hasSecretLeak(value) {
  return /api[_-]?key|authorization|secret|token|connectUrl|signingKey|seleniumRemoteUrl|request_headers|raw_text/i.test(JSON.stringify(value || {}));
}
