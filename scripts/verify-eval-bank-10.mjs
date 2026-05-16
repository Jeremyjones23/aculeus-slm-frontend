import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildInvestigationSpec } from "../lib/aculeus-operator-spec.js";
import { runEvalBank, validateEvalBankManifest } from "../lib/aculeus-eval-bank.js";
import { planOfficialApiTasks } from "../lib/aculeus-official-source-router.js";
import { planProviderCandidateTasks } from "../lib/aculeus-provider-candidates.js";

const manifest = JSON.parse(readFileSync(join(process.cwd(), "data", "eval-bank", "aculeus-eval-bank-10.json"), "utf8"));
const manifestIssues = validateEvalBankManifest(manifest);
if (manifestIssues.length) throw new Error(`Eval manifest failed validation:\n${manifestIssues.join("\n")}`);

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
  const officialApiTasks = planOfficialApiTasks(spec, { maxTasks: 5 });
  const providerTasks = planProviderCandidateTasks(spec, { maxTasks: 4, maxResults: 2 });
  return {
    spec,
    official_api_tasks: officialApiTasks,
    provider_tasks: providerTasks,
    missing_record_hypotheses: spec.missing_record_hypotheses,
    overclaim_guardrails: Array.isArray(spec.overclaim_guardrails) && spec.overclaim_guardrails.length > 0,
    findings_written: false
  };
});

if (!report.ok) {
  throw new Error(`Eval bank report failed:\n${JSON.stringify(report, null, 2)}`);
}
if (report.case_count !== 10) throw new Error(`expected 10 eval cases, got ${report.case_count}`);
if (report.zero_uncited_critical_claim_gate !== true) throw new Error("zero-uncited-critical-claim gate did not pass");
if (report.cases.some((item) => item.planned_source_count < 2)) throw new Error("eval case produced too few retrieval tasks");

const outputDir = mkdtempSync(join(tmpdir(), "aculeus-eval-bank-10-"));
const outputPath = join(outputDir, "eval-report.json");
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`10-case eval bank verification passed. Report: ${outputPath}`);
