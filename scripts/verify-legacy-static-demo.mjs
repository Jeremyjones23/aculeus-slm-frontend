import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const required = [
  "index.html",
  "styles.css",
  "script.js",
  "favicon.svg",
  "favicon.ico",
  "vercel.json",
  "package.json",
  "scripts/serve.mjs",
  "scripts/sync-demo-case-js.mjs",
  "scripts/verify-legacy-static-demo.mjs",
  "scripts/build.mjs",
  "scripts/qa-browser.mjs",
  "assets/aculeus-logomark.svg",
  "assets/aculeus-wordmark.svg",
  "assets/aculeus-lockup.svg",
  "assets/aculeus-meta-image.png",
  "assets/favicon-32.png",
  "assets/apple-touch-icon.png",
  "data/demo-case.json",
  "data/demo-case.js",
  "model-adapter.js",
  "api/demo-case.js",
  "api/investigate.js",
  "api/case-question.js",
  "api/signup.js",
  "lib/aculeus-case-qa.js",
  "docs/demo-readiness-audit.md"
];

const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  console.error(`Missing required files:\n${missing.join("\n")}`);
  process.exit(1);
}

const textFiles = [
  "index.html",
  "styles.css",
  "script.js",
  "model-adapter.js",
  "data/demo-case.json",
  "data/demo-case.js",
  "scripts/serve.mjs",
  "vercel.json",
  "package.json"
];

const combined = textFiles.map((file) => readFileSync(join(root, file), "utf8")).join("\n");

const requiredPhrases = [
  "Agentic investigation for public records",
  "Bring a lead. Build the case.",
  "Aculeus dispatches a controlled investigation",
  "opens permitted sources",
  "maps money and actors",
  "separates proof from suspicion",
  "human-approved action",
  "Run Aculeus",
  "Source-locked. Permission-aware. Action-ready.",
  "California intermediary governance network",
  "Elevate Youth California funding pipeline",
  "GRID Alternatives political infrastructure audit",
  "data-run-state=\"idle\"",
  "data-run-feed",
  "data-command-form",
  "data-open-sources",
  "data-open-trail",
  "data-open-draft",
  "data-source-sheet",
  "data-trail-sheet",
  "data-draft-sheet",
  "data-account-sheet",
  "What Aculeus checked.",
  "The next move is drafted, not sent.",
  "Nothing leaves the system without human approval.",
  "let currentCase",
  "AculeusModelAdapter",
  "askCaseQuestion",
  "createAccount",
  "gsap.min.js",
  "cursor-laser",
  "The next record is clear.",
  "Question under review",
  "Working hypothesis",
  "What the record shows",
  "Claim ladder",
  "Missing record that decides the case",
  "Action route",
  "Open the full proof artifact",
  "Interrogate the packet",
  "The intermediary machine",
  "$6.2B+",
  "evidence-spine",
  "Source type:",
  "Used here because",
  "What it supports"
];

const missingPhrases = requiredPhrases.filter((phrase) => !combined.includes(phrase));
if (missingPhrases.length) {
  console.error(`Missing required agentic product phrases:\n${missingPhrases.join("\n")}`);
  process.exit(1);
}

const banned = [
  "Lorem ipsum",
  "TODO",
  "rest of code",
  "add more as needed",
  "Demo case loaded",
  "Load Aculeus demo case",
  "Invoice reference paid twice",
  "Turn a lead into",
  "a case you can prove.",
  "Find the proof. Cut the noise. Keep the trail.",
  "Load trial lead",
  "Run the trial case.",
  "Run demo case",
  "Run the demo case.",
  "Use demo lead",
  "Review the case. Follow the proof.",
  "Demo federal duplicate-payment review",
  "Same invoice appears twice",
  "Private review packet",
  "Not an accusation",
  "not enough to accuse",
  "Not enough to accuse",
  "legal boundary",
  "Workspace ready",
  "Demo workspace created",
  "block weak claims",
  "blocks weak claims",
  "kills weak leaps",
  "Weak leaps killed",
  "Weak leap blocked",
  "Case-bound Q&A",
  "Guarded demo answer",
  "visual review",
  "review limits",
  "live review",
  "Safe to share",
  "Next record list",
  "Run trace",
  "Next best actions",
  "control gap",
  "media company",
  "Post-it",
  "post-it",
  "sticker board",
  "paper trail. Build",
  "SECTION 01",
  "QUESTION 05",
  "ChatGPT wrapper",
  "chat bubble",
  "military",
  "crosshair",
  "sci-fi",
  "neon dashboard",
  "case-universe",
  "evidence-lanes",
  "action-board",
  "command-panels",
  "Redspire",
  "duplicate-payment",
  "Invoice #7784",
  "Open invoice package request",
  "Demand the invoice package"
];

const bannedHits = banned.filter((term) => combined.includes(term));
if (bannedHits.length) {
  console.error(`Banned weak, noisy, or off-brand terms found: ${bannedHits.join(", ")}`);
  process.exit(1);
}

if (!combined.includes(".command-bar") || !combined.includes(".sheet-panel") || !combined.includes(".bottom-dock")) {
  console.error("Expected mobile-first command bar, bottom sheets, and hidden dock fallback.");
  process.exit(1);
}

if (!combined.includes(".command-actions") || !combined.includes("@media (min-width: 860px)")) {
  console.error("Expected mobile command actions and desktop expansion breakpoint.");
  process.exit(1);
}

if (!combined.includes("data-source-ref") || !combined.includes("sourceRefs") || !combined.includes("supportLevel")) {
  console.error("Expected source references and support-level handling in the agent run.");
  process.exit(1);
}

const imageTags = [...readFileSync(join(root, "index.html"), "utf8").matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
const badImageTags = imageTags.filter((tag) => !tag.includes('decoding="async"'));
if (badImageTags.length) {
  console.error("Every image must use async decoding.");
  process.exit(1);
}

console.log("Aculeus SLM agentic frontend verification passed.");
