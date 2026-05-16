import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildInvestigationSpec } from "../lib/aculeus-operator-spec.js";
import { runEvalBank, validateEvalBankManifest } from "../lib/aculeus-eval-bank.js";
import { planOfficialApiTasks } from "../lib/aculeus-official-source-router.js";
import { planProviderCandidateTasks } from "../lib/aculeus-provider-candidates.js";

const manifest = JSON.parse(readFileSync(join(process.cwd(), "data", "eval-bank", "aculeus-eval-bank-25.json"), "utf8"));
const manifestIssues = validateEvalBankManifest(manifest);
if (manifestIssues.length) throw new Error(`Held-out eval manifest failed validation:\n${manifestIssues.join("\n")}`);
if (manifest.cases.length < 25 || manifest.cases.length > 50) throw new Error(`held-out eval bank must contain 25-50 cases, got ${manifest.cases.length}`);
if (!Array.isArray(manifest.failure_taxonomy) || manifest.failure_taxonomy.length < 5) throw new Error("held-out eval bank missing failure taxonomy");
if (manifest.split !== "held_out_pre_pilot") throw new Error("held-out eval bank missing split marker");

const report = runEvalBank(manifest, (item) => {
  const spec = buildInvestigationSpec({
    rawQuery: item.query,
    casePacket: {
      caseId: item.case_id,
      title: item.query,
      jurisdiction: item.jurisdiction,
      nextRecords: item.expected_source_families.map((family) => ({
        request: `Locate source family: ${family}`
      }))
    }
  });
  return {
    spec,
    official_api_tasks: planOfficialApiTasks(spec, { maxTasks: 6 }),
    provider_tasks: planProviderCandidateTasks(spec, { maxTasks: 4, maxResults: 2 }),
    missing_record_hypotheses: spec.missing_record_hypotheses,
    overclaim_guardrails: Array.isArray(spec.overclaim_guardrails) && spec.overclaim_guardrails.length > 0,
    findings_written: false
  };
});

if (!report.ok) throw new Error(`Held-out eval bank report failed:\n${JSON.stringify(report, null, 2)}`);
if (report.case_count !== 25) throw new Error(`expected 25 eval cases, got ${report.case_count}`);
if (report.zero_uncited_critical_claim_gate !== true) throw new Error("zero-uncited-critical-claim gate failed");
if (report.cases.some((item) => item.official_task_count < 1 || item.provider_task_count < 1)) {
  throw new Error("held-out eval case missing official or provider task coverage");
}

const outputDir = mkdtempSync(join(tmpdir(), "aculeus-eval-bank-25-"));
const outputPath = join(outputDir, "held-out-eval-report.json");
writeFileSync(outputPath, `${JSON.stringify({ ...report, failure_taxonomy: manifest.failure_taxonomy }, null, 2)}\n`, "utf8");

console.log(`25-case held-out eval bank verification passed. Report: ${outputPath}`);
