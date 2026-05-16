import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const fixtureBody = "Official receipt API fixture. Board packet approved vendor Example Services for $42,000. No fraud finding is made here.";
const fixtureServer = createServer((request, response) => {
  response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  response.end(fixtureBody);
});
const appPort = 4399;
const runStoreDir = mkdtempSync(join(tmpdir(), "aculeus-receipt-api-run-store-"));
const receiptStoreDir = mkdtempSync(join(tmpdir(), "aculeus-receipt-api-store-"));

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(fn, attempts = 40, delay = 150) {
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

await listen(fixtureServer);
const fixtureUrl = `http://127.0.0.1:${fixtureServer.address().port}/receipt.txt`;
const app = spawn(process.execPath, ["scripts/serve.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(appPort),
    ACULEUS_ALLOW_LOCAL_RECEIPT_TESTS: "1",
    ACULEUS_RUN_STORE_DIR: runStoreDir,
    ACULEUS_RECEIPT_STORE_DIR: receiptStoreDir
  },
  stdio: "ignore"
});

try {
  await retry(async () => {
    const response = await fetch(`http://127.0.0.1:${appPort}/source-fed.html`);
    if (!response.ok) throw new Error(`app server not ready: ${response.status}`);
  });
  const response = await fetch(`http://127.0.0.1:${appPort}/api/receipt-fetch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      candidate: {
        candidate_id: "candidate_api_receipt",
        url: fixtureUrl,
        title: "Receipt API fixture",
        source_family: "official_page_or_pdf",
        promotion_status: "candidate_lead_not_evidence",
        evidence_id: null
      },
      quote: "Board packet approved vendor Example Services for $42,000.",
      claim: "Fraud occurred because vendor Example Services received $42,000."
    })
  });
  if (!response.ok) throw new Error(`receipt API returned ${response.status}`);
  const result = await response.json();
  const failures = [];
  if (!result.receipt?.receipt_id || !result.receipt?.content_sha256) failures.push("receipt API missing receipt hash/id");
  if (result.receipt?.raw_text) failures.push("receipt API leaked raw text");
  if (!result.verifier?.source_promotion_allowed) failures.push("source promotion should be allowed after receipt/quote");
  if (result.verifier?.finding_promotion_allowed) failures.push("high-risk claim should not be finding-promoted");
  if (!result.verifier?.issues?.some((issue) => issue.issue_type === "high_risk_claim_requires_adjudicative_source")) failures.push("high-risk verifier issue missing");
  if (failures.length) throw new Error(failures.join("\n"));
  console.log("Receipt API verification passed.");
} finally {
  app.kill();
  await close(fixtureServer);
  await sleep(250);
  rmSync(runStoreDir, { recursive: true, force: true });
  rmSync(receiptStoreDir, { recursive: true, force: true });
}
