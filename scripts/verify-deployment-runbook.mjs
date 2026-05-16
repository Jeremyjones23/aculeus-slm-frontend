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
  "remote Qdrant mutation"
]) {
  if (!runbook.includes(phrase)) throw new Error(`deployment runbook missing phrase: ${phrase}`);
}
if (!runbook.includes("No output may include raw receipt text")) throw new Error("deployment runbook missing leakage boundary");
if (!runbook.includes("Production deployment")) throw new Error("deployment runbook missing production approval boundary");

console.log("Deployment runbook verification passed.");
