import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { createLocalProductRepository } from "../lib/aculeus-product-store.js";

const port = Number(process.env.ACULEUS_ADMIN_E2E_PORT || 4531);
const storeDir = mkdtempSync(join(tmpdir(), "aculeus-admin-e2e-store-"));
const repo = createLocalProductRepository({ storeDir });
repo.saveRun({
  runId: "run_admin_e2e",
  caseId: "case_admin_e2e",
  workspace_id: "workspace_admin_e2e",
  status: "ready",
  ledger: [{
    ledger_entry_id: "ledger_provider_admin_e2e",
    entry_type: "provider_search",
    status: "candidate_results_ready",
    labels: ["provider", "candidate_only"],
    created_at: "2026-05-16T14:00:00.000Z",
    result_summary: {
      provider: "exa",
      provider_calls_executed: true,
      paid_spend_incurred: true,
      estimated_spend_usd: 0.08,
      provider_cap_usd: 0.1
    }
  }],
  trainingTraces: [{
    trace_id: "trace_admin_e2e_pending",
    run_id: "run_admin_e2e",
    case_id: "case_admin_e2e",
    action: "provider_search",
    review_status: "needs_human_review_before_training",
    reviewed: false,
    training_conversion_allowed: false,
    direct_model_answer_used: false,
    candidate_snippets_treated_as_evidence: false,
    source_ledger: [{ entry_type: "provider_search", source_family: "provider_candidate" }],
    retrieval_actions: [{ task_type: "provider_search" }],
    verifier_results: { issues: [] },
    public_safe: true,
    final_outcome: "candidate_results_ready"
  }]
});

const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const command = existsSync(join(process.cwd(), ".next", "BUILD_ID")) ? "start" : "dev";
const child = spawn(process.execPath, [nextBin, command, "-p", String(port), "-H", "127.0.0.1"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ACULEUS_AUTH_MODE: "production",
    ACULEUS_TRUST_SMOKE_HEADERS: "1",
    ACULEUS_PRODUCT_STORE_DIR: storeDir
  },
  stdio: "ignore",
  windowsHide: true
});

let browser = null;
try {
  await retry(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/admin`);
    if (response.status !== 403 && !response.ok) throw new Error(`admin route not ready: ${response.status}`);
  }, 120, 300);

  browser = await chromium.launch({ headless: true });
  const deniedPage = await browser.newPage();
  await deniedPage.goto(`http://127.0.0.1:${port}/admin`);
  if (!((await deniedPage.textContent("body")) || "").includes("Access denied")) throw new Error("admin page did not deny unauthenticated browser");
  await deniedPage.close();

  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-clerk-user-id": "admin_e2e",
      "x-aculeus-email": "admin-e2e@aculeus.local",
      "x-aculeus-role": "admin",
      "x-aculeus-approval-status": "approved"
    }
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/admin`, { waitUntil: "networkidle" });
  await expectText(page, "Run audit visibility");
  await expectText(page, "Trace review and training export");
  if (await page.locator(".admin-budget-totals").count() !== 1) throw new Error("admin budget totals panel did not render");
  await page.getByRole("button", { name: "Pending", exact: true }).click();
  const approve = page.getByRole("button", { name: "Approve for export" });
  if (!(await approve.isDisabled())) throw new Error("approve button should require reviewer notes");
  await page.locator('textarea[placeholder*="Record the source"]').fill("Admin E2E approved after checking source ledger, verifier gates, and candidate-only boundaries.");
  if (await approve.isDisabled()) throw new Error("approve button stayed disabled after reviewer note");
  await approve.click();
  await expectText(page, "approved_for_sft_preference_pool");

  const exportResponse = await context.request.get(`http://127.0.0.1:${port}/api/admin/training-export?format=sft`);
  if (exportResponse.status() !== 200) throw new Error(`SFT export returned ${exportResponse.status()}`);
  const exportBody = await exportResponse.text();
  if (!exportBody.includes("trace_admin_e2e_pending")) throw new Error("SFT export did not include approved trace");
  if (exportResponse.headers()["x-aculeus-production-update-allowed"] !== "false") throw new Error("SFT export allowed production update");
  console.log("Admin portal browser E2E verification passed.");
} finally {
  await browser?.close?.().catch(() => null);
  child.kill();
  await sleep(300);
  rmSync(storeDir, { recursive: true, force: true });
}

async function expectText(page, text) {
  await page.waitForFunction((needle) => document.body.innerText.includes(needle), text, { timeout: 15000 });
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
