// Browser QA for the media review surface. Boots the Next app, starts a media run
// through /api/media-runs with a fixture Read (deterministic mode — no gateway needed),
// loads /media-review?id=..., and asserts the panel renders the cross-demographic diff
// and per-variant cards. Requires node_modules + a Playwright browser; ready for CI.

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const port = 4533;
const storeDir = mkdtempSync(join(tmpdir(), "aculeus-media-qa-store-"));
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const hasBuild = existsSync(join(process.cwd(), ".next", "BUILD_ID"));
const base = `http://127.0.0.1:${port}`;

const fixtureRead = {
  source_run_id: "qa_run", case_id: "qa_case",
  bottom_line: "$48M flowed; the auditor cleared it.",
  evidence_records: [
    { evidence_record_id: "ev1", claim: "$48M flowed to three vendors.", support_level: "supported", receipt: { publisher: "USAspending.gov", date: "2026-01-10" }, locator: { captured_at: "2026-01-10" } },
    { evidence_record_id: "ev2", claim: "They share an address with two officers.", support_level: "supported", receipt: { publisher: "IRS Form 990", date: "2026-02-01" }, locator: { captured_at: "2026-02-01" } },
    { evidence_record_id: "ev3", claim: "The auditor found no violation.", support_level: "partially_supported", role: "counter_case", receipt: { publisher: "Independent audit", date: "2026-03-01" }, locator: { captured_at: "2026-03-01" } }
  ]
};
const body = {
  read: fixtureRead,
  profiles: [
    { profile_key: "far_left", frame: "power & exploitation", messenger: "the organizer" },
    { profile_key: "right_of_center", frame: "stewardship & trust", messenger: "the local operator" }
  ],
  formats: ["op_ed", "social"]
};

const { chromium } = await import("playwright");
const child = spawn(process.execPath, [nextBin, hasBuild ? "start" : "dev", "-p", String(port), "-H", "127.0.0.1"], {
  cwd: process.cwd(),
  env: { ...process.env, ACULEUS_MEDIA_STORE_DIR: storeDir, ACULEUS_PRODUCT_STORE_DIR: storeDir, ACULEUS_PRODUCT_STORE_MODE: "local" },
  stdio: "ignore"
});

let browser;
try {
  await retry(async () => { if (!(await fetch(`${base}/`)).ok) throw new Error("not ready"); }, 100, 250);

  const started = await postJson("/api/media-runs", body);
  if (!started.ok || !started.media_run?.media_run_id) throw new Error("media run did not start");
  const id = started.media_run.media_run_id;

  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${base}/media-review?id=${id}`, { waitUntil: "networkidle" });
  const text = await page.innerText("body");
  if (!/Media review/i.test(text)) throw new Error("panel did not render");
  if (!/Same receipts, different doors/i.test(text)) throw new Error("cross-demographic diff did not render");
  if (!/needs_human/i.test(text)) throw new Error("variant status did not render");
  await page.screenshot({ path: join(storeDir, "media-review.png"), fullPage: true });

  console.log(`Media review browser QA passed (media run ${id}, 4 variants rendered).`);
} finally {
  if (browser) await browser.close();
  child.kill();
  await sleep(300);
  rmSync(storeDir, { recursive: true, force: true });
}

async function postJson(path, payload) {
  const r = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}
function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }
async function retry(fn, attempts, delay) {
  let last;
  for (let i = 0; i < attempts; i += 1) { try { return await fn(); } catch (e) { last = e; await sleep(delay); } }
  throw last;
}
