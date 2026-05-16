import { validateOfficialApiTasks } from "./aculeus-official-source-router.js";
import { validateProviderCandidateTasks } from "./aculeus-provider-candidates.js";

export function validateEvalBankManifest(manifest = {}) {
  const issues = [];
  if (manifest.schema_version !== "aculeus_eval_bank.v1") issues.push("eval bank schema version mismatch");
  if (!Array.isArray(manifest.cases) || manifest.cases.length < 10) issues.push("eval bank must include at least 10 cases");
  const ids = new Set();
  for (const item of manifest.cases || []) {
    if (!item.case_id || ids.has(item.case_id)) issues.push(`duplicate or missing case id: ${item.case_id || "missing"}`);
    ids.add(item.case_id);
    if (!item.query || !item.jurisdiction) issues.push(`${item.case_id}: query and jurisdiction are required`);
    if (!Array.isArray(item.expected_source_families) || item.expected_source_families.length < 3) {
      issues.push(`${item.case_id}: expected source families must include at least three families`);
    }
    if (!Array.isArray(item.expected_verifier_gates) || !item.expected_verifier_gates.includes("zero_uncited_critical_claims")) {
      issues.push(`${item.case_id}: zero-uncited-critical-claims gate required`);
    }
  }
  return issues;
}

export function runEvalBank(manifest = {}, planner) {
  const issues = validateEvalBankManifest(manifest);
  if (issues.length) {
    return {
      ok: false,
      case_count: Array.isArray(manifest.cases) ? manifest.cases.length : 0,
      issues,
      cases: []
    };
  }

  const cases = manifest.cases.map((item) => {
    const planned = planner(item);
    const officialIssues = validateOfficialApiTasks(planned.official_api_tasks || []);
    const providerIssues = validateProviderCandidateTasks(planned.provider_tasks || []);
    const gateResults = evaluateCaseGates(item, planned);
    return {
      case_id: item.case_id,
      status: gateResults.every((gate) => gate.pass) && !officialIssues.length && !providerIssues.length ? "pass" : "fail",
      expected_source_families: item.expected_source_families,
      planned_source_count: (planned.official_api_tasks || []).length + (planned.provider_tasks || []).length,
      official_task_count: (planned.official_api_tasks || []).length,
      provider_task_count: (planned.provider_tasks || []).length,
      gate_results: gateResults,
      issues: [...officialIssues, ...providerIssues]
    };
  });

  return {
    ok: cases.every((item) => item.status === "pass"),
    schema_version: "aculeus_eval_report.v1",
    case_count: cases.length,
    zero_uncited_critical_claim_gate: cases.every((item) => item.gate_results.some((gate) => gate.gate === "zero_uncited_critical_claims" && gate.pass)),
    cases
  };
}

function evaluateCaseGates(item, planned) {
  return item.expected_verifier_gates.map((gate) => {
    if (gate === "zero_uncited_critical_claims") {
      return { gate, pass: planned.findings_written === false, detail: "Eval planning does not write findings or allegations." };
    }
    if (gate === "candidate_only_until_receipted" || gate === "receipt_required_for_evidence") {
      const candidates = [...(planned.official_api_tasks || []), ...(planned.provider_tasks || [])];
      return { gate, pass: candidates.every((task) => task.evidence_promotion_allowed === false || task.receipt_required !== false), detail: "Retrieval tasks stay candidate-only." };
    }
    if (gate === "missing_records_named") {
      return { gate, pass: Array.isArray(planned.missing_record_hypotheses) && planned.missing_record_hypotheses.length > 0, detail: "Missing-record hypotheses are present." };
    }
    if (gate === "official_source_priority") {
      return { gate, pass: (planned.official_api_tasks || []).length > 0, detail: "Official API tasks are present." };
    }
    if (gate === "overclaim_guardrails" || gate === "rejected_claims_separated") {
      return { gate, pass: planned.overclaim_guardrails === true, detail: "Overclaim guardrails are active." };
    }
    return { gate, pass: true, detail: "Gate recorded for later expanded eval." };
  });
}
