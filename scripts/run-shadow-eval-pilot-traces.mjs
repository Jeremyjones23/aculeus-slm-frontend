import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "../lib/database.js";
import { runShadowModelEvaluation, validateShadowEvalReport } from "../lib/aculeus-shadow-model.js";

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

const traces = rows
  .map((row) => ({
    id: row.id,
    run_id: row.run_id,
    case_id: row.case_id || row.payload?.case_id,
    trace_type: row.trace_type || row.payload?.action,
    payload: row.payload || {},
    created_at: row.created_at
  }))
  .filter((row) => row.case_id && row.run_id);

if (!traces.length) {
  throw new Error("No public-safe pilot traces were available for shadow evaluation.");
}

const cases = buildCasesFromTraces(traces);
const report = runShadowModelEvaluation({
  cases,
  baseline: { model_id: "production_aculeus_trace_workflow", adjustment: 0 },
  candidate: { model_id: process.env.ACULEUS_MODEL_ID || "candidate_aculeus_shadow_from_pilot_traces", adjustment: 0 }
});

const enrichedReport = {
  ...report,
  input_trace_count: traces.length,
  input_run_count: new Set(traces.map((trace) => trace.run_id)).size,
  source: {
    store: "neon_training_traces",
    trace_limit: limit,
    public_safe_only: true
  },
  cases: report.cases.map((row) => ({
    ...row,
    trace_count: cases.find((item) => item.case_id === row.case_id)?.trace_count || 0,
    run_count: cases.find((item) => item.case_id === row.case_id)?.run_count || 0
  }))
};

const issues = validateShadowEvalReport(enrichedReport);
if (issues.length) {
  throw new Error(`Pilot trace shadow eval failed validation:\n${issues.join("\n")}`);
}
if (enrichedReport.user_visible_promotion_allowed !== false) throw new Error("Shadow eval attempted user-visible promotion.");
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

function buildCasesFromTraces(items) {
  const byCase = new Map();
  for (const trace of items) {
    const payload = trace.payload || {};
    const current = byCase.get(trace.case_id) || {
      case_id: trace.case_id,
      expected_source_families: new Set(),
      trace_count: 0,
      run_ids: new Set()
    };
    current.trace_count += 1;
    current.run_ids.add(trace.run_id);
    for (const family of sourceFamiliesForTrace(payload)) current.expected_source_families.add(family);
    byCase.set(trace.case_id, current);
  }
  return [...byCase.values()].map((item) => ({
    case_id: item.case_id,
    expected_source_families: [...item.expected_source_families].sort(),
    trace_count: item.trace_count,
    run_count: item.run_ids.size
  }));
}

function sourceFamiliesForTrace(payload) {
  const families = new Set();
  for (const entry of payload.source_ledger || []) {
    if (entry.entry_type) families.add(entry.entry_type);
    for (const label of entry.labels || []) {
      if (/official|provider|receipt|reviewer|feedback/i.test(label)) families.add(String(label));
    }
  }
  for (const action of payload.retrieval_actions || []) {
    if (action.provider) families.add(action.provider);
    if (action.source_id) families.add(action.source_id);
    if (action.task_type) families.add(action.task_type);
  }
  if (!families.size && payload.action) families.add(payload.action);
  return families.size ? families : new Set(["pilot_trace"]);
}

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
