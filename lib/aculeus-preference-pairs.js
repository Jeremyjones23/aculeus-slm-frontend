const PAIR_SCHEMA_VERSION = "aculeus_preference_pair.v1";

export function buildPreferencePairsFromTraces(traces = [], options = {}) {
  const minScore = Number(options.minScore ?? 70);
  return traces
    .filter((trace) => Number(trace.trace_quality_score || trace.score_payload?.score || 0) >= minScore)
    .flatMap((trace) => [
      buildRetrievalPlanPair(trace),
      buildFindingCardPair(trace)
    ])
    .filter(Boolean)
    .map(sanitizePair);
}

export function validatePreferencePair(pair = {}) {
  const issues = [];
  if (pair.schema_version !== PAIR_SCHEMA_VERSION) issues.push("preference pair schema version missing");
  if (!pair.pair_id || !pair.trace_id || !pair.case_id) issues.push("preference pair missing identifiers");
  if (!pair.input || !pair.chosen || !pair.rejected) issues.push("preference pair missing input/chosen/rejected");
  if (!Array.isArray(pair.evidence_refs) || pair.evidence_refs.length === 0) issues.push("preference pair missing evidence refs");
  if (pair.training_conversion_allowed !== false) issues.push("preference pair must not allow automatic training conversion");
  if (pair.public_safe !== true) issues.push("preference pair must be public safe");
  if (scanPreferencePair(pair).length) issues.push("preference pair contains blocked sensitive material");
  return issues;
}

export function scanPreferencePair(pair = {}) {
  const text = JSON.stringify(pair);
  return [
    /api[_-]?key/i,
    /authorization/i,
    /secret/i,
    /raw[_-]?text/i,
    /request[_-]?headers/i,
    /bearer\s+[a-z0-9._-]+/i
  ].filter((pattern) => pattern.test(text)).map((pattern) => `blocked pattern ${pattern}`);
}

function buildRetrievalPlanPair(trace) {
  const evidenceRefs = extractEvidenceRefs(trace);
  if (!evidenceRefs.length) return null;
  return {
    schema_version: PAIR_SCHEMA_VERSION,
    pair_id: `pref_${trace.trace_id}_retrieval`,
    trace_id: trace.trace_id,
    case_id: trace.case_id,
    run_id: trace.run_id,
    pair_type: "retrieval_plan_quality",
    input: {
      case_spec: trace.case_spec,
      objective: "Plan source-fed retrieval tasks that prioritize official records, diverse source families, and missing-record hypotheses."
    },
    chosen: {
      retrieval_actions: trace.retrieval_actions || [],
      rationale: "Specific source-fed retrieval plan with official/API/provider/crawler lanes and candidate-only discipline."
    },
    rejected: {
      retrieval_actions: [{
        provider: "generic_web_search",
        query: "fraud waste abuse",
        limitation: "Broad query lacks jurisdiction, entities, source priority, missing-record hypotheses, and spend discipline."
      }],
      rationale: "Broad query spends retrieval budget without source targeting or evidence gates."
    },
    evidence_refs: evidenceRefs,
    score_payload: trace.score_payload || null,
    training_conversion_allowed: false,
    reviewed: false,
    public_safe: true
  };
}

function buildFindingCardPair(trace) {
  const evidenceRefs = extractEvidenceRefs(trace);
  const findings = Array.isArray(trace.findings) ? trace.findings : [];
  if (!evidenceRefs.length || !findings.length) return null;
  return {
    schema_version: PAIR_SCHEMA_VERSION,
    pair_id: `pref_${trace.trace_id}_finding`,
    trace_id: trace.trace_id,
    case_id: trace.case_id,
    run_id: trace.run_id,
    pair_type: "finding_card_grounding",
    input: {
      case_spec: trace.case_spec,
      objective: "Write compact finding cards only from eligible evidence and name missing records without overclaiming intent."
    },
    chosen: {
      findings: findings.map((finding, index) => ({
        finding_id: finding.finding_id || finding.id || `finding_${index + 1}`,
        claim: finding.claim || finding.title || finding.summary || "",
        confidence: finding.confidence || finding.status || "bounded",
        evidence_ids: finding.evidence_ids || finding.evidenceIds || [],
        next_action: finding.next_action || "Inspect evidence IDs and missing-record tasks."
      })),
      rationale: "Grounded finding cards cite evidence IDs and keep confidence bounded."
    },
    rejected: {
      findings: [{
        finding_id: "bad_overclaim_1",
        claim: "This proves fraud and intent based on a search snippet.",
        confidence: "certain",
        evidence_ids: [],
        next_action: "Publish allegation."
      }],
      rationale: "Overclaims fraud or intent, treats snippets as proof, and omits evidence IDs."
    },
    evidence_refs: evidenceRefs,
    score_payload: trace.score_payload || null,
    training_conversion_allowed: false,
    reviewed: false,
    public_safe: true
  };
}

function extractEvidenceRefs(trace) {
  const refs = [];
  for (const entry of trace.source_ledger || []) {
    if (entry.evidence_id) refs.push(entry.evidence_id);
    if (entry.receipt_id) refs.push(entry.receipt_id);
    if (entry.ledger_entry_id) refs.push(entry.ledger_entry_id);
    if (entry.result?.evidence_record?.evidence_id) refs.push(entry.result.evidence_record.evidence_id);
  }
  for (const finding of trace.findings || []) {
    for (const id of finding.evidence_ids || finding.evidenceIds || []) refs.push(id);
  }
  return [...new Set(refs.filter(Boolean).map(String))];
}

function sanitizePair(pair) {
  return JSON.parse(JSON.stringify(pair, (key, value) => {
    if (/api[_-]?key|authorization|secret|token|raw_text|rawText|request_headers|requestHeaders/i.test(key)) return undefined;
    if (typeof value === "string" && value.length > 1600) return `${value.slice(0, 1600)}...`;
    return value;
  }));
}
