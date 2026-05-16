export function createAculeusModelAdapter(options = {}) {
  const modelId = options.modelId || options.model_id || process.env.ACULEUS_MODEL_ID || "aculeus-local-guarded-planner";
  return {
    model_id: modelId,
    direct_answer_allowed: false,
    roles: {
      planner: (input) => planRetrievalTasks(input, modelId),
      gap_scout: (input) => scoutGapsAfterLedger(input, modelId),
      synthesis: (input) => synthesizeAfterVerifier(input, modelId)
    }
  };
}

export function planRetrievalTasks(input = {}, modelId = process.env.ACULEUS_MODEL_ID || "aculeus-local-guarded-planner") {
  const query = String(input.raw_query || input.rawQuery || input.lead || "").trim();
  return {
    role: "planner",
    model_id: modelId,
    direct_answer_allowed: false,
    retrieval_required_before_findings: true,
    output_type: "retrieval_plan",
    search_strategy: {
      official_api_targets: input.official_api_targets || [],
      search_queries: input.search_queries || [query].filter(Boolean),
      crawler_tasks: input.crawler_tasks || [],
      missing_record_hypotheses: input.missing_record_hypotheses || []
    },
    gates: ["retrieval_must_run", "candidate_only_until_receipted", "no_findings_from_planner"]
  };
}

export function scoutGapsAfterLedger(input = {}, modelId = process.env.ACULEUS_MODEL_ID || "aculeus-local-guarded-planner") {
  const ledger = Array.isArray(input.source_ledger) ? input.source_ledger : Array.isArray(input.ledger) ? input.ledger : [];
  if (!ledger.length) {
    return blockedRole("gap_scout", modelId, "source_ledger_required_before_gap_scout");
  }
  return {
    role: "gap_scout",
    model_id: modelId,
    direct_answer_allowed: false,
    output_type: "second_pass_retrieval_tasks",
    follow_up_tasks: [
      {
        task_type: "missing_record_followup",
        reason: "Ledger has records but remaining unsupported claims require official receipts or public-record requests.",
        evidence_promotion_allowed: false
      }
    ],
    gates: ["ledger_required", "no_findings_from_gap_scout"]
  };
}

export function synthesizeAfterVerifier(input = {}, modelId = process.env.ACULEUS_MODEL_ID || "aculeus-local-guarded-planner") {
  const verifier = input.verifier_results || input.verifier || {};
  const findings = Array.isArray(input.findings) ? input.findings : [];
  const verifierOk = verifier.ok === true || verifier.source_promotion_allowed === true || verifier.finding_promotion_allowed === true;
  const findingsHaveEvidence = findings.length === 0 || findings.every((finding) => Array.isArray(finding.evidence_ids) && finding.evidence_ids.length > 0);
  if (!verifierOk || !findingsHaveEvidence) {
    return blockedRole("synthesis", modelId, "verifier_and_evidence_ids_required_before_synthesis");
  }
  return {
    role: "synthesis",
    model_id: modelId,
    direct_answer_allowed: false,
    output_type: "finding_cards",
    finding_cards: findings.map((finding, index) => ({
      finding_id: finding.finding_id || `finding_${index + 1}`,
      claim: finding.claim || finding.title || "",
      evidence_ids: finding.evidence_ids,
      confidence: finding.confidence || "bounded",
      next_action: finding.next_action || "Review missing records before publication."
    })),
    gates: ["verifier_pass_required", "evidence_ids_required", "no_direct_answer_path"]
  };
}

export function validateModelAdapterContract(adapter = {}) {
  const issues = [];
  if (!adapter.model_id) issues.push("adapter missing model id");
  if (adapter.direct_answer_allowed !== false) issues.push("adapter must block direct answers");
  for (const role of ["planner", "gap_scout", "synthesis"]) {
    if (typeof adapter.roles?.[role] !== "function") issues.push(`adapter missing role: ${role}`);
  }
  const plan = adapter.roles?.planner?.({ raw_query: "contracts", search_queries: ["contracts"] });
  if (plan?.output_type !== "retrieval_plan" || plan?.gates?.includes("no_findings_from_planner") !== true) {
    issues.push("planner must emit retrieval plan only");
  }
  const scout = adapter.roles?.gap_scout?.({ source_ledger: [] });
  if (scout?.status !== "blocked") issues.push("gap scout must block without source ledger");
  const synth = adapter.roles?.synthesis?.({ findings: [{ claim: "unsupported" }], verifier_results: { ok: false } });
  if (synth?.status !== "blocked") issues.push("synthesis must block without verifier/evidence");
  return issues;
}

function blockedRole(role, modelId, reason) {
  return {
    role,
    model_id: modelId,
    status: "blocked",
    reason,
    direct_answer_allowed: false,
    output_type: "blocked_by_retrieval_or_verifier_gate"
  };
}
