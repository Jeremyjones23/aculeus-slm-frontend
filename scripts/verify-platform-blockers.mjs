import { readFileSync } from "node:fs";
import { join } from "node:path";

const text = readFileSync(join(process.cwd(), "docs", "platform-blockers.md"), "utf8");
const required = [
  "Vercel Clerk DNS Configuration",
  "Clerk DNS Configuration",
  "sso:/domains",
  "Vercel GitHub Integration Not Attached",
  "Failed to connect Jeremyjones23/aculeus-slm-frontend to project",
  "Real Clerk Role-Token E2E",
  "This blocker should not be waived",
  "Screenshot-Capable Hosted Browser Capture",
  "Browserbase Fetch",
  "candidate-only",
  "Waiver Standard",
  "Latest verified source SHA:",
  "Latest inspected deployment:"
];
const missing = required.filter((phrase) => !text.includes(phrase));
if (missing.length) {
  console.error(`Platform blocker ledger missing required phrases:\n${missing.join("\n")}`);
  process.exit(1);
}
if (!/Latest verified source SHA: `[\da-f]{40}`/i.test(text)) {
  console.error("Platform blocker ledger must include a full 40-character source SHA.");
  process.exit(1);
}
if (!/Latest inspected deployment: `dpl_[A-Za-z0-9]+`/.test(text)) {
  console.error("Platform blocker ledger must include a Vercel deployment id.");
  process.exit(1);
}
if (text.includes("Status: resolved")) {
  console.error("Platform blocker ledger must not mark unresolved platform blockers as resolved.");
  process.exit(1);
}
console.log("Platform blocker ledger verification passed.");
