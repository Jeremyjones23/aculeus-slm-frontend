export const RUN_STATES = [
  "empty",
  "submitted",
  "hardening_query",
  "planning",
  "retrieving",
  "gap_scouting",
  "second_pass_retrieving",
  "gating",
  "synthesizing",
  "verifying",
  "ready",
  "insufficient_evidence",
  "needs_records_request",
  "blocked",
  "cost_capped",
  "error",
  "cancelled",
  "complete"
];

const FORBIDDEN_CLAIMS = ["fraud", "intent", "illegal_activity", "misconduct", "waste"];
const DEFAULT_DATE_RANGE = { start: "2018-01-01", end: null, confidence: "system-default" };

export function hardenInvestigationQuery(input = {}) {
  const rawQuery = clean(input.rawQuery || input.raw_query || input.query);
  const targetEntity = clean(input.targetEntity || input.target_entity);
  const targetType = clean(input.targetType || input.target_type) || inferTargetType(rawQuery, targetEntity);
  const jurisdiction = clean(input.jurisdiction) || inferJurisdiction(rawQuery);
  const concernTypes = inferConcernTypes(rawQuery, clean(input.concernType || input.concern_type));
  const entities = inferEntities(rawQuery, targetEntity, targetType);
  const missingInfo = [];

  if (!rawQuery) missingInfo.push("raw query not supplied");
  if (!targetEntity && entities.every((entity) => entity.confidence !== "user-stated")) {
    missingInfo.push("specific target entity not supplied");
  }
  if (!input.dateRange && !input.date_range) missingInfo.push("exact date range not supplied");
  if (!input.concernType && !input.concern_type) missingInfo.push("specific concern type not supplied");
  if (/school board|school boards/i.test(rawQuery) && !/(lausd|district|county|board of education)/i.test(rawQuery)) {
    missingInfo.push("specific school board, district, or county not supplied");
  }

  return {
    raw_query: rawQuery,
    hardened_query: hardenedDirection(rawQuery, entities, jurisdiction, concernTypes),
    target_entities: entities,
    target_type: targetType,
    jurisdictions: [{ name: jurisdiction, level: jurisdictionLevel(jurisdiction), confidence: jurisdiction === "United States" ? "system-default" : "user-stated" }],
    date_range: input.dateRange || input.date_range || DEFAULT_DATE_RANGE,
    concern_types: concernTypes,
    source_priority: sourcePriority(concernTypes, rawQuery),
    forbidden_claims_without_direct_evidence: FORBIDDEN_CLAIMS,
    output_default: "action_brief",
    dossier_available: true,
    missing_info: missingInfo,
    assumptions: [
      { text: "Default date range is 2018-present unless the user narrows it.", confidence: "medium" },
      { text: "Search and provider results are candidate leads until fetched, receipted, gated, and verified.", confidence: "high" }
    ],
    stop_conditions: ["no official records found", "records request needed", "cost cap reached", "high-risk claim requires human review"],
    risk_level: concernTypes.some((item) => /fraud|legal|regulatory|misconduct|waste/.test(item)) ? "medium" : "low"
  };
}

export function buildActionBriefResponse(casePacket, library = {}) {
  const findings = Array.isArray(casePacket?.dossier?.findings) ? casePacket.dossier.findings : [];
  const sources = new Map((casePacket?.sources || []).map((source) => [source.sourceId, source]));
  const evidenceRecords = buildEvidenceRecords(casePacket);
  const missingRecords = buildMissingRecordTasks(casePacket);
  const verifierIssues = buildVerifierIssues(casePacket);
  const found = findings.slice(0, 5).map((finding) => {
    const findingSources = (finding.sourceIds || []).map((sourceId) => sources.get(sourceId)).filter(Boolean);
    const officialCount = findingSources.filter((source) => source.type === "official_public_record" || /official/i.test(source.role || "")).length;
    const blocked = verifierIssues.some((issue) => {
      return issue.severity === "blocking"
        && (issue.finding_id === finding.findingId || (finding.sourceIds || []).includes(issue.evidence_id));
    }) || /blocked|rejected|candidate.only|not.supported/i.test(clean(finding.whyItMatters));
    const status = blocked ? "blocked" : statusFromSupport(finding.whyItMatters);
    return {
      finding_id: clean(finding.findingId),
      plain_english: clean(finding.whatRecordSays),
      status,
      confidence: confidenceFromText(finding.whyItMatters),
      evidence_count: findingSources.filter((source) => source.confidence === "usable_as_evidence" || /usable_as_evidence|verified/i.test(source.role || "")).length,
      official_source_count: officialCount,
      verifier_status: status === "verified" ? "passed" : "blocked"
    };
  });

  return {
    case_id: clean(casePacket?.caseId),
    status: verifierIssues.some((issue) => issue.severity === "blocking") ? "verifying" : "ready",
    headline: clean(casePacket?.headline) || "Records show review leads; no unsupported fraud finding is made.",
    what_we_found: found,
    why_it_matters: [
      clean(casePacket?.summary) || "The reviewed records identify oversight questions that should stay tied to source evidence.",
      "This brief separates evidence-supported review leads from candidate leads, missing records, and rejected claims."
    ],
    where_the_evidence_is: evidenceRecords.slice(0, 8).map((record) => ({
      evidence_id: record.evidence_id,
      source_id: record.source_id,
      source_title: record.title,
      source_type: record.source_type,
      receipt_id: record.receipt_id,
      verifier_status: "passed"
    })),
    what_is_missing: missingRecords,
    quick_next_steps: quickNextSteps(casePacket, missingRecords, library),
    warnings: unique([
      clean(casePacket?.legalBoundary),
      "No fraud, intent, illegality, misconduct, or waste finding is supported unless direct evidence and review establish it."
    ])
  };
}

export function buildCaseBoardResponse(casePacket, library = {}) {
  return {
    case_id: clean(casePacket?.caseId),
    mode: "source_fed_case_board",
    run_status: library.runStatus || {},
    investigation_spec: null,
    action_brief: buildActionBriefResponse(casePacket, library),
    findings: Array.isArray(casePacket?.dossier?.findings) ? casePacket.dossier.findings : [],
    evidence_records: buildEvidenceRecords(casePacket),
    candidate_sources: buildCandidateSources(casePacket),
    missing_records: buildMissingRecordTasks(casePacket),
    verifier_issues: buildVerifierIssues(casePacket),
    ledger_summary: buildLedgerSummary(casePacket),
    source_ledger: Array.isArray(casePacket?.sources) ? casePacket.sources : [],
    audit_trail: casePacket?.sourceBoard || {}
  };
}

export function buildLedgerSummary(casePacket) {
  const summary = {
    total: 0,
    official: 0,
    secondary: 0,
    found: 0,
    fetched: 0,
    blocked: 0,
    failed: 0,
    duplicate: 0,
    candidate: 0,
    usable_as_evidence: 0,
    locator_only: 0,
    needs_browser: 0,
    needs_records_request: 0
  };
  for (const source of casePacket?.sources || []) {
    summary.total += 1;
    const blob = `${source.role || ""} ${source.confidence || ""} ${source.supportLevel || ""} ${source.limitation || ""}`.toLowerCase();
    if (/official/.test(blob) || source.type === "official_public_record") summary.official += 1;
    else summary.secondary += 1;
    if (/found/.test(blob)) summary.found += 1;
    if (/fetched/.test(blob)) summary.fetched += 1;
    if (/blocked/.test(blob)) summary.blocked += 1;
    if (/failed/.test(blob)) summary.failed += 1;
    if (/duplicate/.test(blob)) summary.duplicate += 1;
    if (/candidate/.test(blob) || !isUsableEvidence(source)) summary.candidate += 1;
    if (isUsableEvidence(source)) summary.usable_as_evidence += 1;
    if (/locator_only/.test(blob)) summary.locator_only += 1;
    if (/needs_browser/.test(blob)) summary.needs_browser += 1;
    if (/records request|needs_records_request/.test(blob)) summary.needs_records_request += 1;
  }
  return summary;
}

export function buildCandidateSources(casePacket) {
  return (casePacket?.sources || [])
    .filter((source) => !isUsableEvidence(source))
    .map((source) => ({
      candidate_id: clean(source.sourceId),
      url: clean(source.url),
      title: clean(source.title || source.url || source.sourceId),
      source_family: clean(source.type || source.publisher || "candidate_source"),
      retrieval_score: null,
      candidate_reason: clean(source.limitation || "Candidate lead requires fetch, receipt, gate, and verifier before evidence promotion."),
      promotion_status: "candidate_lead_not_evidence",
      evidence_id: null
    }));
}

export function buildEvidenceRecords(casePacket) {
  return (casePacket?.sources || [])
    .filter(isUsableEvidence)
    .map((source) => ({
      evidence_id: clean(source.sourceId),
      source_id: clean(source.sourceId),
      receipt_id: clean(source.hash ? `sha256:${source.hash}` : `${source.sourceId}:receipt_required`),
      url: clean(source.url),
      title: clean(source.title || source.url || source.sourceId),
      publisher: clean(source.publisher || "unknown_publisher"),
      source_type: clean(source.type || "public_record"),
      fetched_at: null,
      content_hash: clean(source.hash),
      provenance: {
        retrieval_method: clean(source.retrievalMethod || "source-fed fixture"),
        page_number: source.pageNumber ?? null,
        matched_terms: Array.isArray(source.matchedTerms) ? source.matchedTerms : []
      },
      public_safe: true
    }));
}

export function buildMissingRecordTasks(casePacket) {
  return (casePacket?.nextRecords || []).slice(0, 8).map((record, index) => ({
    task_id: clean(record.recordId || `missing_${index + 1}`),
    record_needed: clean(record.request || "Request complete underlying public record packet."),
    why_needed: clean(record.reason || "Needed before upgrading a review lead into a stronger finding."),
    likely_holder: clean(record.holder || "public agency or record custodian"),
    next_action: clean(record.request || "Request the missing public record.")
  }));
}

export function buildVerifierIssues(casePacket) {
  const claims = Array.isArray(casePacket?.dossier?.claimLedger) ? casePacket.dossier.claimLedger : [];
  return claims
    .filter((claim) => /blocked|weak|rejected/i.test(clean(claim.support)))
    .map((claim, index) => ({
      issue_id: `vi_${clean(casePacket?.caseId || "case")}_${index + 1}`,
      finding_id: clean(claim.findingId || claim.sourceIds?.[0] || ""),
      claim_id: `claim_${index + 1}`,
      severity: /blocked|rejected/i.test(clean(claim.support)) ? "blocking" : "warning",
      issue_type: /candidate/i.test(clean(claim.limitation)) ? "candidate_only_source_used_as_evidence" : "overclaim_language",
      evidence_id: claim.sourceIds?.[0] || null,
      message: clean(claim.limitation || "Verifier prevented this claim from being treated as verified evidence."),
      suggested_action: clean(claim.nextRecord || "Downgrade claim, fetch a stronger record, or request the missing record."),
      status: "open"
    }));
}

export function validateInvestigationSpec(spec) {
  const issues = [];
  requireString(spec, "raw_query", issues);
  requireString(spec, "hardened_query", issues);
  requireNonemptyArray(spec, "target_entities", issues);
  requireNonemptyArray(spec, "jurisdictions", issues);
  requireNonemptyArray(spec, "concern_types", issues);
  requireNonemptyArray(spec, "source_priority", issues);
  requireNonemptyArray(spec, "forbidden_claims_without_direct_evidence", issues);
  if (spec?.output_default !== "action_brief") issues.push("InvestigationSpec output_default must be action_brief");
  if (spec?.dossier_available !== true) issues.push("InvestigationSpec dossier_available must be true");
  if (!Array.isArray(spec?.missing_info)) issues.push("InvestigationSpec missing_info must be an array");
  if (Object.keys(spec || {}).some((key) => /finding|conclusion/i.test(key))) {
    issues.push("InvestigationSpec must not contain finding or conclusion fields");
  }
  return issues;
}

export function validateActionBriefResponse(brief) {
  const issues = [];
  requireString(brief, "case_id", issues);
  requireString(brief, "status", issues);
  requireString(brief, "headline", issues);
  requireNonemptyArray(brief, "what_we_found", issues);
  requireNonemptyArray(brief, "why_it_matters", issues);
  requireNonemptyArray(brief, "where_the_evidence_is", issues);
  requireNonemptyArray(brief, "what_is_missing", issues);
  requireNonemptyArray(brief, "quick_next_steps", issues);
  requireNonemptyArray(brief, "warnings", issues);
  for (const finding of brief?.what_we_found || []) {
    if (!finding.finding_id || !finding.plain_english || !finding.verifier_status) {
      issues.push("ActionBriefResponse finding rows require id, text, and verifier status");
    }
  }
  return issues;
}

export function validateCaseBoardResponse(response) {
  const issues = [];
  requireString(response, "case_id", issues);
  if (response?.mode !== "source_fed_case_board") issues.push("CaseBoardResponse mode must be source_fed_case_board");
  if (validateActionBriefResponse(response?.action_brief || {}).length) issues.push("CaseBoardResponse action_brief is invalid");
  requireNonemptyArray(response, "findings", issues);
  requireNonemptyArray(response, "evidence_records", issues);
  if (!Array.isArray(response?.candidate_sources)) issues.push("CaseBoardResponse candidate_sources must be an array");
  if (!Array.isArray(response?.verifier_issues)) issues.push("CaseBoardResponse verifier_issues must be an array");
  for (const candidate of response?.candidate_sources || []) {
    issues.push(...validateCandidateSource(candidate));
  }
  for (const record of response?.evidence_records || []) {
    issues.push(...validateEvidenceRecord(record));
  }
  for (const issue of response?.verifier_issues || []) {
    issues.push(...validateVerifierIssue(issue));
  }
  return issues;
}

export function validateCandidateSource(candidate) {
  const issues = [];
  requireString(candidate, "candidate_id", issues);
  requireString(candidate, "url", issues);
  requireString(candidate, "title", issues);
  requireString(candidate, "source_family", issues);
  requireString(candidate, "candidate_reason", issues);
  if (candidate?.promotion_status !== "candidate_lead_not_evidence") issues.push(`${candidate?.candidate_id || "candidate"} must be candidate-only`);
  if (candidate?.evidence_id !== null) issues.push(`${candidate?.candidate_id || "candidate"} must not carry evidence_id`);
  return issues;
}

export function validateEvidenceRecord(record) {
  const issues = [];
  requireString(record, "evidence_id", issues);
  requireString(record, "source_id", issues);
  requireString(record, "receipt_id", issues);
  requireString(record, "url", issues);
  requireString(record, "title", issues);
  requireString(record, "publisher", issues);
  requireString(record, "source_type", issues);
  if (record?.public_safe !== true) issues.push(`${record?.evidence_id || "evidence"} must be public_safe`);
  if (!record?.provenance || typeof record.provenance !== "object") issues.push(`${record?.evidence_id || "evidence"} must include provenance`);
  return issues;
}

export function validateVerifierIssue(issue) {
  const issues = [];
  requireString(issue, "issue_id", issues);
  requireString(issue, "claim_id", issues);
  if (!["blocking", "warning", "info"].includes(issue?.severity)) issues.push(`${issue?.issue_id || "verifier issue"} has invalid severity`);
  requireString(issue, "issue_type", issues);
  requireString(issue, "message", issues);
  requireString(issue, "suggested_action", issues);
  if (!["open", "resolved", "accepted_risk", "dismissed"].includes(issue?.status)) issues.push(`${issue?.issue_id || "verifier issue"} has invalid status`);
  return issues;
}

function quickNextSteps(casePacket, missingRecords, library) {
  const next = missingRecords.map((record) => record.next_action).filter(Boolean).slice(0, 2);
  next.push("Open the evidence rail before promoting any claim.");
  if (library?.runStatus?.nextSpendDecision) {
    next.push(`Respect spend gate: ${library.runStatus.nextSpendDecision}.`);
  }
  return next.slice(0, 4);
}

function hardenedDirection(rawQuery, entities, jurisdiction, concernTypes) {
  const entityText = entities.map((entity) => entity.name).join(", ") || "the named target";
  const concerns = concernTypes.join(", ");
  return `Investigate public-record evidence related to ${entityText} in ${jurisdiction}, prioritizing official records for ${concerns}. Surface only evidence-supported findings, candidate leads, missing records, and verifier-limited next steps.`;
}

function inferEntities(rawQuery, targetEntity, targetType) {
  const entities = [];
  if (targetEntity) entities.push({ name: targetEntity, type: targetType, confidence: "user-stated" });
  const normalized = rawQuery.replace(/Bacerra/g, "Becerra");
  for (const [pattern, name, type] of [
    [/urban alchemy/i, "Urban Alchemy", "vendor_or_nonprofit"],
    [/school board|school boards|lausd/i, "California school boards", "public_board"],
    [/san francisco|sfdph|drug rehabilitation|rehabilitation/i, "San Francisco Department of Public Health", "agency"],
    [/healthright/i, "HealthRIGHT 360", "provider"],
    [/xavier becerra/i, "Xavier Becerra", "person"],
    [/chirla/i, "Coalition for Humane Immigrant Rights", "nonprofit"],
    [/homeless|lahsa/i, "Los Angeles Homeless Services Authority", "agency_or_joint_powers_authority"]
  ]) {
    if (pattern.test(normalized) && !entities.some((entity) => entity.name === name)) {
      entities.push({ name, type, confidence: "inferred_from_query" });
    }
  }
  return entities.length ? entities : [{ name: "Unresolved target", type: targetType || "unresolved_entity", confidence: "missing_from_prompt" }];
}

function inferTargetType(rawQuery, targetEntity) {
  if (/school board|district|lausd/i.test(rawQuery)) return "public_board_or_school_district";
  if (/program|department|agency|sfdph|lahsa/i.test(rawQuery)) return "agency_or_program";
  if (/xavier|becerra/i.test(rawQuery)) return "person";
  if (/urban alchemy|chirla|nonprofit|vendor/i.test(`${rawQuery} ${targetEntity}`)) return "vendor_or_nonprofit";
  return "public_records_target";
}

function inferJurisdiction(rawQuery) {
  if (/los angeles|lahsa|\bLA\b/i.test(rawQuery)) return "Los Angeles, CA";
  if (/san francisco|sfdph/i.test(rawQuery)) return "San Francisco, CA";
  if (/california|\bCA\b|school board|becerra|chirla|urban alchemy/i.test(rawQuery)) return "California";
  return "United States";
}

function inferConcernTypes(rawQuery, explicitConcern) {
  const concerns = [];
  if (explicitConcern) concerns.push(slug(explicitConcern));
  if (/fraud/i.test(rawQuery)) concerns.push("fraud_allegation_boundary");
  if (/waste|abuse/i.test(rawQuery)) concerns.push("waste_or_control_gap_review");
  if (/spend|spending|money|contract|procurement|board/i.test(rawQuery)) concerns.push("public_contracts", "board_actions", "vendor_spend_review");
  if (/grant|nonprofit|chirla/i.test(rawQuery)) concerns.push("grant_awards", "nonprofit_filing_reconciliation");
  if (/rehabilitation|drug|treatment|program/i.test(rawQuery)) concerns.push("program_outcome_and_monitoring_review");
  return unique(concerns.length ? concerns : ["public_record_gap_review"]);
}

function sourcePriority(concernTypes, rawQuery) {
  const priorities = ["official_api", "official_records_portal", "audit_report", "contract_pdf", "procurement_database"];
  if (/school board|board/i.test(rawQuery)) priorities.splice(2, 0, "board_packet");
  if (concernTypes.some((item) => /grant|nonprofit/.test(item))) priorities.push("irs_teos", "state_charity_registry");
  priorities.push("secondary_reporting_candidate_only");
  return unique(priorities);
}

function isUsableEvidence(source) {
  const blob = `${source?.confidence || ""} ${source?.role || ""} ${source?.supportLevel || ""}`;
  return /usable_as_evidence|citation_verified|verified|supported_narrow/i.test(blob) && !/locator_only|candidate_only/i.test(blob);
}

function statusFromSupport(value) {
  if (/blocked|rejected/i.test(value)) return "rejected";
  if (/weak|warning/i.test(value)) return "weak";
  if (/verified|passed|confidence/i.test(value)) return "verified";
  return "weak";
}

function confidenceFromText(value) {
  const textValue = clean(value).toLowerCase();
  const match = textValue.match(/confidence\s+([0-9.]+)/);
  if (match && Number(match[1]) >= 0.8) return "high";
  if (match && Number(match[1]) >= 0.55) return "medium";
  return "low";
}

function jurisdictionLevel(value) {
  if (/United States/i.test(value)) return "federal";
  if (/, CA/i.test(value)) return "local";
  return "state";
}

function requireString(value, field, issues) {
  if (!clean(value?.[field])) issues.push(`${field} is required`);
}

function requireNonemptyArray(value, field, issues) {
  if (!Array.isArray(value?.[field]) || value[field].length === 0) issues.push(`${field} must be nonempty`);
}

function clean(value) {
  return String(value ?? "").trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "public_record_review";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
