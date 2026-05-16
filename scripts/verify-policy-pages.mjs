import { readFileSync } from "node:fs";
import { join } from "node:path";

const files = {
  terms: readFile("app", "terms", "page.jsx"),
  privacy: readFile("app", "privacy", "page.jsx"),
  acceptableUse: readFile("app", "acceptable-use", "page.jsx"),
  security: readFile("app", "security", "page.jsx"),
  disclaimer: readFile("app", "disclaimer", "page.jsx"),
  nav: readFile("components", "aculeus-workspace-sections.jsx"),
  css: readFile("app", "globals.css")
};

const required = {
  terms: [
    "Known paid customer pilot",
    "public-records investigation",
    "Candidate leads are not proof",
    "Accounts are invite-only and role-bound",
    "Human review is part of the product contract"
  ],
  privacy: [
    "Privacy and data handling",
    "uploaded sources",
    "public-record receipts",
    "Production traces do not update models directly",
    "Retention is controlled by dry-run before deletion"
  ],
  acceptableUse: [
    "Acceptable use",
    "Do not overstate what the evidence supports",
    "Do not use Aculeus to harass or dox",
    "Respect access boundaries",
    "Exports must preserve limitations"
  ],
  security: [
    "Security and incident response",
    "Incident packet export is the first response artifact",
    "Retention dry-run identifies deletion candidates",
    "Identity failures are production blockers",
    "Rollback is tied to a verified smoke path"
  ],
  disclaimer: [
    'href="/terms"',
    'href="/privacy"',
    'href="/acceptable-use"',
    'href="/security"'
  ],
  nav: [
    'href="/terms"',
    'href="/privacy"'
  ],
  css: [
    ".policy-shell",
    ".policy-grid",
    ".policy-link-row",
    "@media (max-width: 980px)"
  ]
};

const failures = [];
for (const [name, phrases] of Object.entries(required)) {
  for (const phrase of phrases) {
    if (!files[name].includes(phrase)) failures.push(`${name} missing phrase: ${phrase}`);
  }
}
for (const [name, text] of Object.entries(files)) {
  if (/\bTODO\b|\bTBD\b/.test(text)) failures.push(`${name} contains TODO/TBD placeholder`);
}

if (failures.length) {
  console.error(`Policy page verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Policy page verification passed.");

function readFile(...parts) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}
