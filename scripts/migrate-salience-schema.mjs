import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasDatabase, query } from "../lib/database.js";

if (!hasDatabase()) {
  console.log("DATABASE_URL is not configured; skipped salience schema migration.");
  process.exit(0);
}

// The salience layer references runs/cases/evidence_records/citations, so apply the
// product schema first to guarantee a clean migration from an empty database.
const files = [
  join(process.cwd(), "docs", "aculeus-product-schema.sql"),
  join(process.cwd(), "docs", "aculeus-salience-layer-schema.sql")
];

let applied = 0;
for (const path of files) {
  const sql = readFileSync(path, "utf8");
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await query(statement);
    applied += 1;
  }
}

console.log(`Applied ${applied} schema statements (product + salience layer).`);
