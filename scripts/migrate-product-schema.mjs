import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasDatabase, query } from "../lib/database.js";

if (!hasDatabase()) {
  console.log("DATABASE_URL is not configured; skipped product schema migration.");
  process.exit(0);
}

const schemaPath = join(process.cwd(), "docs", "aculeus-product-schema.sql");
const schema = readFileSync(schemaPath, "utf8");
const statements = schema
  .split(/;\s*(?:\r?\n|$)/)
  .map((statement) => statement.trim())
  .filter(Boolean);

for (const statement of statements) {
  await query(statement);
}

console.log(`Applied ${statements.length} product schema statements.`);
