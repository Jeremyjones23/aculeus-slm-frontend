import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runShadowModelEvaluation, validateShadowEvalReport } from "../lib/aculeus-shadow-model.js";

const manifest = JSON.parse(readFileSync(join(process.cwd(), "data", "eval-bank", "aculeus-eval-bank-25.json"), "utf8"));
const cases = manifest.cases.slice(0, 12);
const report = runShadowModelEvaluation({
  cases,
  baseline: { model_id: "current_aculeus_workflow", adjustment: 0 },
  candidate: { model_id: "candidate_aculeus_shadow", adjustment: 0.04 }
});

const issues = validateShadowEvalReport(report);
if (issues.length) throw new Error(`Shadow model report failed validation:\n${issues.join("\n")}`);
if (report.user_visible_promotion_allowed !== false) throw new Error("shadow path allowed user-visible promotion");
if (report.metrics.no_regression !== true) throw new Error("shadow model report regressed metrics");
if (report.metrics.candidate_source_recall < report.metrics.baseline_source_recall) throw new Error("candidate source recall regressed");
if (report.metrics.candidate_verifier_pass_rate < report.metrics.baseline_verifier_pass_rate) throw new Error("candidate verifier pass rate regressed");
if (report.metrics.candidate_correction_rate > report.metrics.baseline_correction_rate) throw new Error("candidate correction rate regressed");
if (report.metrics.candidate_cost_per_supported_finding > report.metrics.baseline_cost_per_supported_finding) throw new Error("candidate cost regressed");

const outputDir = mkdtempSync(join(tmpdir(), "aculeus-shadow-model-"));
const outputPath = join(outputDir, "shadow-eval-report.json");
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Shadow model path verification passed. Report: ${outputPath}`);
