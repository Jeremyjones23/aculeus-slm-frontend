import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const ui = [
  "components/aculeus-workspace.jsx",
  "components/aculeus-workspace-sections.jsx",
  "components/aculeus-workspace-state.js"
].map((file) => readFileSync(join(root, file), "utf8")).join("\n");
const css = readFileSync(join(root, "app", "globals.css"), "utf8");

for (const phrase of [
  "Ask Aculeus. Watch the record open.",
  "The record opens after you ask.",
  "Run Aculeus",
  "Ask or tighten",
  "Open actual source location",
  "Open private artifact anchor",
  "Request Aculeus access"
]) {
  if (!ui.includes(phrase)) {
    fail(`Missing UI phrase: ${phrase}`);
  }
}

for (const phrase of [
  "/api/runs/${runId}/case-board",
  "persisted ledger rows",
  "Missing records",
  "Rejected or weak claims",
  "Verifier failures",
  "Audit trail",
  "Reject",
  "Defer",
  "Annotate",
  "Request record",
  "Selected quote",
  "quoteByCandidate[candidate.candidate_id] || receipt.receipt.excerpt",
  "Official API drilldown",
  "Request preview",
  "Response hash",
  "No secret headers are shown",
  "Provider cap",
  "Live provider mode",
  "Hard stop:",
  "providerLiveMode && Number(state.providerCapUsd) > 0",
  "candidateQueue: action.caseBoard?.candidateQueue || state.candidateQueue"
]) {
  if (!ui.includes(phrase)) {
    fail(`Missing persisted case-board UI contract: ${phrase}`);
  }
}

for (const phrase of [".command-surface", ".answer-brief", ".refine-panel", ".citation-overlay", ".case-board-sections", ".quote-picker", ".official-drilldown", ".provider-budget-control", ".provider-live-toggle", "@media (max-width: 980px)"]) {
  if (!css.includes(phrase)) {
    fail(`Missing UI CSS contract: ${phrase}`);
  }
}

if (ui.includes("brief || initialBrief")) {
  fail("Answer Brief must not be preloaded before the run.");
}

console.log("Next operator UI verification passed.");

function fail(message) {
  console.error(message);
  process.exit(1);
}
