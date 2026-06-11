// Guarded build-time schema migration.
//
// Runs automatically in postbuild. In the Vercel build (where DATABASE_URL is present) it
// applies the product + salience schema; everywhere else it is a safe no-op. It NEVER fails
// the build: the migration is idempotent (create table if not exists), and a transient error
// is logged as a warning rather than blocking a deploy. The DB client is imported lazily so
// this script loads even where @neondatabase/serverless is not installed.

let db;
try {
  db = await import("../lib/database.js");
} catch {
  console.log("[migrate-on-build] DB client unavailable; skipping schema migration.");
  process.exit(0);
}

if (!db.hasDatabase()) {
  console.log("[migrate-on-build] DATABASE_URL not set; skipping schema migration.");
  process.exit(0);
}

try {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const files = [
    join(process.cwd(), "docs", "aculeus-product-schema.sql"),
    join(process.cwd(), "docs", "aculeus-salience-layer-schema.sql")
  ];
  let applied = 0;
  for (const path of files) {
    const sql = readFileSync(path, "utf8");
    const statements = sql.split(/;\s*(?:\r?\n|$)/).map((s) => s.trim()).filter(Boolean);
    for (const statement of statements) {
      await db.query(statement);
      applied += 1;
    }
  }
  console.log(`[migrate-on-build] Applied ${applied} schema statements (product + salience layer).`);
} catch (error) {
  console.warn(`[migrate-on-build] WARNING: schema migration failed (build continues): ${error.message}`);
  process.exit(0);
}
