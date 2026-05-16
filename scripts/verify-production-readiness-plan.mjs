import { readFileSync } from "node:fs";
import { join } from "node:path";

const path = join(process.cwd(), "docs", "production-readiness.md");
const text = readFileSync(path, "utf8");

const requiredPhrases = [
  "Status: not external-invite ready",
  "Internal rehearsal ready",
  "Controlled pilot ready",
  "Production invite ready",
  "North-Star Invariants",
  "Candidate snippets, provider results, Qdrant matches, official API rows, and crawler finds are leads until receipt-backed reviewer promotion.",
  "Blocking External Invites",
  "Real Clerk session verification is wired app-side",
  "real Clerk pilot accounts and deployed JWT/custom-claim E2E are still pending.",
  "Vercel still reports `Clerk DNS Configuration` as a failed platform check.",
  "Vercel GitHub integration is not attached",
  "Production-Readiness Task List",
  "Identity And Access",
  "Platform And Deployment",
  "Data And Persistence",
  "Retrieval And Evidence",
  "Reviewer Workflow",
  "Training And Model Path",
  "Spend And Provider Operations",
  "UI And Product Surface",
  "Observability And Incident Response",
  "Legal And External Posture",
  "Invite-Ready Gate",
  "Real Clerk role-token E2E passes for admin, operator, reviewer, viewer, and pending users.",
  "Vercel Production has zero failed checks.",
  "Noise-Pruning Decisions",
  "Legacy static demo lane"
];

const missing = requiredPhrases.filter((phrase) => !text.includes(phrase));
if (missing.length) {
  console.error(`Production readiness plan is missing required coverage:\n${missing.join("\n")}`);
  process.exit(1);
}

const forbiddenPhrases = [
  "production ready",
  "external-invite ready. Internal operator rehearsal is acceptable"
];

if (text.includes("Status: production ready")) {
  console.error("Production readiness plan must not claim production readiness while blockers remain.");
  process.exit(1);
}

for (const phrase of forbiddenPhrases) {
  if (phrase === "production ready") continue;
  if (!text.includes(phrase)) {
    console.error(`Expected explicit readiness boundary phrase missing: ${phrase}`);
    process.exit(1);
  }
}

console.log("Production readiness plan verification passed.");
