import { neon } from "@neondatabase/serverless";

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function query(sqlText, params = []) {
  if (!hasDatabase()) {
    throw new Error("DATABASE_URL is not configured. Local file store is active.");
  }
  const sql = neon(process.env.DATABASE_URL);
  return sql.query(sqlText, params);
}
