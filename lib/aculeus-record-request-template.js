export function buildRecordRequestTemplates(missingRecords = [], context = {}) {
  return missingRecords.map((record, index) => buildRecordRequestTemplate(record, context, index));
}

export function buildRecordRequestTemplate(record = {}, context = {}, index = 0) {
  const holder = clean(record.holder || context.defaultCustodian || "Records Custodian");
  const request = clean(record.request || "Please provide the public records described below.");
  const entities = asArray(context.entities || record.entities).map(clean).filter(Boolean);
  const dateScope = clean(record.date_scope || context.dateScope || "January 1, 2020 through present");
  return {
    template_id: `record_request_${record.id || index + 1}`,
    missing_record_id: record.id || record.recordId || `missing_${index + 1}`,
    custodian: holder,
    record_description: stripAllegations(request),
    entity_scope: entities,
    date_scope: dateScope,
    statutory_framing: clean(context.statutoryFraming || "Request made under the applicable public records law for non-exempt public records."),
    delivery_format: "Electronic copies preferred, including native spreadsheets where available.",
    next_action: `Send to ${holder} after operator review.`,
    unsupported_allegations_removed: true,
    evidence_promotion_allowed: false,
    public_safe: true
  };
}

export function validateRecordRequestTemplates(templates = []) {
  const issues = [];
  for (const template of templates) {
    if (!template.custodian || !template.record_description || !template.date_scope) issues.push(`${template.template_id} missing required fields`);
    if (/fraud|criminal|corrupt|abuse/i.test(template.record_description)) issues.push(`${template.template_id} includes unsupported allegation language`);
    if (template.evidence_promotion_allowed !== false) issues.push(`${template.template_id} must not promote evidence`);
    if (template.public_safe !== true) issues.push(`${template.template_id} must be public_safe`);
  }
  return issues;
}

function stripAllegations(value) {
  return clean(value)
    .replace(/\bfraud(?:ulent)?\b/gi, "irregularity")
    .replace(/\bcriminal\b/gi, "potentially noncompliant")
    .replace(/\bcorrupt(?:ion)?\b/gi, "governance concern")
    .replace(/\babuse\b/gi, "control concern");
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
