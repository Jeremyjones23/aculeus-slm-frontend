import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { capturePublicPageWithBrowserbase } from "../lib/aculeus-browserbase-capture.js";

const targetUrl = process.argv[2] || process.env.ACULEUS_BROWSERBASE_SMOKE_URL || "https://example.com";
const outDir = process.env.ACULEUS_SMOKE_ARTIFACT_DIR || join(process.cwd(), "qa-artifacts");

const capture = await capturePublicPageWithBrowserbase({
  url: targetUrl,
  candidate_id: "browserbase_cdp_smoke_candidate",
  source_id: "browserbase_cdp_smoke_source",
  title: "Browserbase CDP screenshot smoke"
}, {
  timeoutMs: Number(process.env.ACULEUS_BROWSERBASE_TIMEOUT_MS || 30000),
  networkIdleTimeoutMs: Number(process.env.ACULEUS_BROWSERBASE_NETWORK_IDLE_MS || 4000),
  allowFetchFallback: false
});

const packet = {
  ok: capture.status === "captured" && Boolean(capture.receipt_hash) && Boolean(capture.screenshot_sha256),
  targetUrl,
  provider: capture.provider,
  status: capture.status,
  hasReceiptHash: Boolean(capture.receipt_hash),
  hasScreenshotHash: Boolean(capture.screenshot_sha256),
  receiptHash: capture.receipt_hash || null,
  screenshotSha256: capture.screenshot_sha256 || null,
  secretLeak: hasSecretLeak(capture)
};

if (!packet.ok) {
  console.error(JSON.stringify(packet, null, 2));
  process.exit(1);
}
if (packet.secretLeak) {
  console.error(JSON.stringify(packet, null, 2));
  throw new Error("Browserbase CDP capture leaked secret-bearing fields.");
}

mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `browserbase-cdp-smoke-${Date.now()}.json`);
writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...packet, artifactPath: outPath }, null, 2));

function hasSecretLeak(value) {
  return /api[_-]?key|authorization|secret|token|connectUrl|signingKey|seleniumRemoteUrl|request_headers|raw_text/i.test(JSON.stringify(value || {}));
}
