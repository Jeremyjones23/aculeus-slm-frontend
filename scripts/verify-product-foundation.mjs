import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "app/layout.jsx",
  "app/page.jsx",
  "app/globals.css",
  "app/api/access-requests/route.js",
  "app/api/cases/route.js",
  "app/api/follow-up/route.js",
  "app/api/runs/start/route.js",
  "app/api/session/route.js",
  "app/api/sources/upload/route.js",
  "components/aculeus-workspace.jsx",
  "components/aculeus-workspace-sections.jsx",
  "components/aculeus-workspace-state.js",
  "lib/aculeus-product-data.js",
  "lib/aculeus-run-adapter.js",
  "lib/aculeus-product-store.js",
  "lib/access-control.js",
  "workflows/aculeus-case-run.js",
  "docs/aculeus-proper-contract.md",
  "docs/aculeus-product-schema.sql",
  "docs/backend-env.md",
  "next.config.mjs",
  "jsconfig.json"
];

const missingFiles = requiredFiles.filter((file) => !existsSync(join(root, file)));
if (missingFiles.length) {
  fail(`Missing Aculeus Proper foundation files:\n${missingFiles.join("\n")}`);
}

const combined = requiredFiles
  .filter((file) => existsSync(join(root, file)))
  .map((file) => readFileSync(join(root, file), "utf8"))
  .join("\n");

const requiredPhrases = [
  "Ask Aculeus. Watch the record open.",
  "Answer Brief",
  "SuggestedNextMoves",
  "MissingRecords",
  "RunCheckpoints",
  "FollowUpAnswer",
  "invite-only",
  "Source Ingestion",
  "Vercel Workflow",
  "Clerk",
  "Neon Postgres",
  "Vercel Blob",
  "Open actual source location",
  "Open private artifact anchor",
  "Research Refinement Loop",
  "AculeusRunAdapter"
];

const missingPhrases = requiredPhrases.filter((phrase) => !combined.includes(phrase));
if (missingPhrases.length) {
  fail(`Missing product contract phrases:\n${missingPhrases.join("\n")}`);
}

const banned = [
  "Lorem ipsum",
  "ChatGPT wrapper",
  "Run demo case",
  "Invoice #7784",
  "Redspire",
  "TODO"
];

const bannedHits = banned.filter((term) => combined.includes(term));
if (bannedHits.length) {
  fail(`Banned placeholder/demo terms found: ${bannedHits.join(", ")}`);
}

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
for (const dependency of ["next", "react", "react-dom", "@clerk/nextjs", "@neondatabase/serverless", "@vercel/blob", "workflow"]) {
  if (!packageJson.dependencies?.[dependency]) {
    fail(`Missing dependency: ${dependency}`);
  }
}

console.log("Aculeus Proper product foundation verification passed.");

function fail(message) {
  console.error(message);
  process.exit(1);
}
