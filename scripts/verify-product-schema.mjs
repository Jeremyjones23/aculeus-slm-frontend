import { readFileSync } from "node:fs";
import { join } from "node:path";

const schema = readFileSync(join(process.cwd(), "docs", "aculeus-product-schema.sql"), "utf8");

const requiredTables = [
  "workspaces",
  "workspace_memberships",
  "access_requests",
  "cases",
  "runs",
  "run_ledger_entries",
  "candidate_sources",
  "receipts",
  "evidence_records",
  "verifier_issues",
  "reviewer_actions",
  "export_packets",
  "training_traces"
];

const requiredColumns = [
  "run_payload jsonb",
  "case_spec jsonb",
  "quality_score",
  "evidence_promotion_allowed boolean",
  "content_hash text",
  "score_payload jsonb",
  "public_safe boolean"
];

const missingTables = requiredTables.filter((table) => !schema.includes(`create table if not exists ${table}`));
const missingColumns = requiredColumns.filter((column) => !schema.includes(column));

if (missingTables.length || missingColumns.length) {
  console.error("Product schema verification failed.");
  if (missingTables.length) console.error(`Missing tables: ${missingTables.join(", ")}`);
  if (missingColumns.length) console.error(`Missing columns: ${missingColumns.join(", ")}`);
  process.exit(1);
}

console.log("Aculeus product schema verification passed.");
