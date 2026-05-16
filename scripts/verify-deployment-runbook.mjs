import { readFileSync } from "node:fs";
import { join } from "node:path";

const runbook = readFileSync(join(process.cwd(), "docs", "deployment-runbook.md"), "utf8");
for (const phrase of [
  "npm run verify",
  "npm run build",
  "npm run test:next-operator",
  "ACULEUS_AUTH_MODE=production",
  "BLOB_READ_WRITE_TOKEN",
  "Rollback",
  "Incident Steps",
  "Approval Boundaries",
  "remote Qdrant mutation",
  "Controlled Pilot Checklist",
  "Provider cap gate",
  "Four-dossier regression gate",
  "Training trace gate",
  "Production Promotion Gate",
  "npm run smoke:postdeploy:receipt -- <preview-url>"
]) {
  if (!runbook.includes(phrase)) throw new Error(`deployment runbook missing phrase: ${phrase}`);
}
if (!runbook.includes("No output may include raw receipt text")) throw new Error("deployment runbook missing leakage boundary");
if (!runbook.includes("Production deployment")) throw new Error("deployment runbook missing production approval boundary");
if (!runbook.includes("zero auto-promoted findings")) throw new Error("deployment runbook missing candidate-only pilot invariant");
if (!runbook.includes("provider_spend_near_cap") || !runbook.includes("provider_spend_over_cap")) {
  throw new Error("deployment runbook missing provider spend alert handling");
}

console.log("Deployment runbook verification passed.");
