import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "../lib/database.js";
import { buildPilotShadowEvalReport } from "../lib/aculeus-pilot-shadow-eval.js";

loadEnvFiles();

const limit = Number(process.env.ACULEUS_SHADOW_TRACE_LIMIT || 60);
const outputDir = join(process.cwd(), "qa-artifacts");
mkdirSync(outputDir, { recursive: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run pilot-trace shadow evaluation.");
}

const rows = await query(
  `select id, run_id, case_id, trace_type, payload, public_safe, created_at
   from training_traces
   where public_safe = true
   order by created_at desc
   limit $1`,
  [limit]
);

const enrichedReport = buildPilotShadowEvalReport(rows, {
  candidateModelId: process.env.ACULEUS_MODEL_ID || "candidate_aculeus_shadow_from_pilot_traces",
  traceLimit: limit,
  store: "neon_training_traces"
});

if (enrichedReport.metrics.no_regression !== true) throw new Error("Pilot trace shadow eval regressed against baseline.");

const outputPath = join(outputDir, "aculeus-pilot-shadow-eval-report.json");
writeFileSync(outputPath, `${JSON.stringify(enrichedReport, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  outputPath,
  traceCount: enrichedReport.input_trace_count,
  runCount: enrichedReport.input_run_count,
  caseCount: enrichedReport.metrics.case_count,
  status: enrichedReport.status,
  userVisiblePromotionAllowed: enrichedReport.user_visible_promotion_allowed
}, null, 2));

function loadEnvFiles() {
  const files = [
    join(process.cwd(), ".env.local"),
    join(process.cwd(), ".vercel", ".env.production.local"),
    join(process.cwd(), ".vercel", ".env.preview.local")
  ];
  const allowed = new Set(["DATABASE_URL", "ACULEUS_MODEL_ID"]);
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      const name = key.trim();
      if (!allowed.has(name) || process.env[name]) continue;
      process.env[name] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  }
}
