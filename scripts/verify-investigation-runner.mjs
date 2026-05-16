import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createInvestigationRun, getInvestigationRun, resetInvestigationRuns } from "../lib/aculeus-investigation-runner.js";
import { createFileRunStore } from "../lib/aculeus-run-store.js";

const library = JSON.parse(readFileSync(resolve(process.cwd(), "data", "source-fed-case-board.json"), "utf8"));
const failures = [];

resetInvestigationRuns();
const storeDir = mkdtempSync(join(tmpdir(), "aculeus-run-store-"));
const store = createFileRunStore(storeDir);
const created = createInvestigationRun({
  rawQuery: "LA homelessness and where the fraud, waste, and abuse is.",
  caseId: library.defaultCaseId,
  providerCapUsd: 0
}, library, { store });

if (!created.ok || !created.run_id || created.status !== "submitted") failures.push("run create did not return submitted run");
if (created.provider_calls_executed !== false) failures.push("fixture runner must not execute provider calls");
if (created.official_api_calls_executed !== false) failures.push("fixture runner must not execute official API calls before retrieval worker is enabled");
if (created.paid_spend_incurred !== false) failures.push("fixture runner must not incur paid spend");
if (created.remote_mutation_executed !== false) failures.push("fixture runner must not mutate remote systems");
if (created.model_findings_generated !== false) failures.push("fixture runner must not generate findings directly");
if (created.candidate_sources_are_evidence !== false) failures.push("fixture runner must preserve candidate/evidence separation");
if (!created.provider_candidate_tasks?.length) failures.push("run missing provider candidate tasks");
if (!created.provider_candidates?.length) failures.push("run missing provider candidates");
if (created.provider_candidate_tasks?.some((task) => task.evidence_promotion_allowed !== false || task.candidate_only_until_receipted !== true || task.receipt_required !== true)) {
  failures.push("provider candidate tasks must remain candidate-only until receipted");
}
if (created.provider_candidates?.some((candidate) => candidate.evidence_id !== null || candidate.evidence_promotion_allowed !== false || candidate.receipt_required !== true)) {
  failures.push("provider candidates must remain locator-only");
}
if (created.action_brief !== null || created.case_board !== null) failures.push("run must not expose final board before ready");
if (!created.investigation_spec?.forbidden_claims_without_direct_evidence?.includes("fraud")) failures.push("investigation spec missing high-risk claim guardrails");
if (!created.retrieval_queue?.length) failures.push("run missing retrieval queue");
if (!created.official_api_tasks?.length) failures.push("run missing official API tasks");
if (created.official_api_tasks?.some((task) => task.evidence_promotion_allowed !== false || task.candidate_only_until_receipted !== true)) {
  failures.push("official API tasks must remain candidate-only until receipted");
}
if (!created.audit_trail?.length) failures.push("run missing audit trail");
if (!created.cost_ledger || created.cost_ledger.actual_spend_usd !== 0) failures.push("run missing zero-spend cost ledger");
if (!existsSync(join(storeDir, `${created.run_id}.json`))) failures.push("run was not persisted to file store");

resetInvestigationRuns();
const recovered = getInvestigationRun(created.run_id, library, { store });
if (!recovered.ok || recovered.run_id !== created.run_id) failures.push("persisted run could not be recovered after memory reset");

const missing = getInvestigationRun("missing", library, { store });
if (missing.ok !== false || missing.status !== 404) failures.push("missing run should return a 404-style response");

await new Promise((resolveWait) => setTimeout(resolveWait, 4300));
const ready = getInvestigationRun(created.run_id, library, { store });
if (ready.status !== "ready") failures.push(`expected ready run, got ${ready.status}`);
if (!ready.action_brief?.what_we_found?.length) failures.push("ready run missing Action Brief");
if (!ready.case_board?.candidate_sources?.length) failures.push("ready run missing candidate sources");
if (ready.case_board?.candidate_sources?.some((candidate) => candidate.evidence_id !== null)) failures.push("candidate source promoted to evidence");
if (!ready.audit_trail?.some((event) => event.status === "ready")) failures.push("ready transition missing from audit trail");
if (!ready.audit_trail?.some((event) => event.event === "provider_candidate_router")) failures.push("provider candidate router audit event missing");
if (!ready.audit_trail?.some((event) => event.event === "official_api_router")) failures.push("official API router audit event missing");
if (!ready.retrieval_queue?.some((task) => task.status === "candidate_only_unverified" || task.status === "needs_records_request")) {
  failures.push("ready run did not preserve queue candidate/missing states");
}
if (!ready.retrieval_queue?.some((task) => task.task_type === "official_api_candidate_probe" && task.evidence_promotion_allowed === false)) {
  failures.push("ready run missing official API candidate-probe queue tasks");
}
if (!ready.retrieval_queue?.some((task) => task.task_type === "provider_candidate_search" && task.evidence_promotion_allowed === false && task.receipt_required === true)) {
  failures.push("ready run missing provider candidate-search queue tasks");
}
if (ready.provider_candidates?.some((candidate) => candidate.evidence_id !== null)) failures.push("ready provider candidate promoted to evidence");

if (failures.length) {
  console.error(`Investigation runner verification failed:\n${failures.join("\n")}`);
  rmSync(storeDir, { recursive: true, force: true });
  process.exit(1);
}

rmSync(storeDir, { recursive: true, force: true });
console.log("Investigation runner verification passed.");
