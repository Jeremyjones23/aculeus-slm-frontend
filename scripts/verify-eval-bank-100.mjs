import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateBroadEvalBank, summarizeBroadEvalReport } from "../lib/aculeus-broad-eval-bank.js";
import { buildInvestigationSpec } from "../lib/aculeus-operator-spec.js";
import { runEvalBank, validateEvalBankManifest } from "../lib/aculeus-eval-bank.js";
import { planOfficialApiTasks } from "../lib/aculeus-official-source-router.js";
import { planProviderCandidateTasks } from "../lib/aculeus-provider-candidates.js";

const manifest = generateBroadEvalBank(100);
const manifestIssues = validateEvalBankManifest(manifest);
if (manifestIssues.length) throw new Error(`Broad eval manifest failed validation:\n${manifestIssues.join("\n")}`);
if (manifest.cases.length < 100) throw new Error("broad eval manifest must include at least 100 cases");

const report = runEvalBank(manifest, (item) => {
  const spec = buildInvestigationSpec({
    rawQuery: item.query,
    casePacket: {
      caseId: item.case_id,
      title: item.query,
      jurisdiction: item.jurisdiction,
      nextRecords: item.expected_source_families.map((family) => ({ request: `Locate source family: ${family}` }))
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

const dashboard = summarizeBroadEvalReport(report);
if (!report.ok) throw new Error(`Broad eval report failed:\n${JSON.stringify({ dashboard, failures: report.cases.filter((item) => item.status !== "pass").slice(0, 10) }, null, 2)}`);
if (dashboard.case_count < 100 || dashboard.pass_rate !== 1 || dashboard.promotion_ready !== true) {
  throw new Error(`Broad eval dashboard not promotion-ready:\n${JSON.stringify(dashboard, null, 2)}`);
}
if (report.zero_uncited_critical_claim_gate !== true) throw new Error("broad eval zero-uncited-critical-claim gate failed");

const outputDir = mkdtempSync(join(tmpdir(), "aculeus-eval-bank-100-"));
writeFileSync(join(outputDir, "broad-eval-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(join(outputDir, "broad-eval-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(join(outputDir, "broad-eval-dashboard.json"), `${JSON.stringify(dashboard, null, 2)}\n`, "utf8");

console.log(`100-case broad eval bank verification passed. Dashboard: ${join(outputDir, "broad-eval-dashboard.json")}`);
