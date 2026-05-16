import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "qa-artifacts", "product");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

await page.goto("http://localhost:4280", { waitUntil: "networkidle" });
await page.screenshot({ path: join(outDir, "desktop-home.png"), fullPage: true });

await page.getByRole("button", { name: /run aculeus/i }).click();
await page.waitForSelector(".answer-brief", { timeout: 10000 });
await page.waitForTimeout(1700);
await page.screenshot({ path: join(outDir, "desktop-run.png"), fullPage: true });

await page.getByRole("button", { name: /show the exact citations/i }).click();
await page.waitForSelector(".follow-up-thread .aculeus", { timeout: 10000 });
await page.screenshot({ path: join(outDir, "desktop-follow-up.png"), fullPage: true });

const citationButton = page.locator(".citation-row button").first();
await citationButton.click();
await page.waitForSelector(".citation-overlay", { timeout: 10000 });
await page.screenshot({ path: join(outDir, "desktop-citation.png"), fullPage: true });

await page.keyboard.press("Escape").catch(() => {});
await browser.close();

const mobile = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
const mobilePage = await mobile.newPage({ viewport: { width: 390, height: 900 }, isMobile: true });
await mobilePage.goto("http://localhost:4280", { waitUntil: "networkidle" });
await mobilePage.screenshot({ path: join(outDir, "mobile-home.png"), fullPage: true });
await mobile.close();

console.log("Product Playwright QA passed. Screenshots written to qa-artifacts/product.");
