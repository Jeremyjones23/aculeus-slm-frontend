const OFFICIAL_SOURCES = [
  {
    source_id: "usaspending_award_search",
    title: "USAspending Award Search",
    endpoint: "https://api.usaspending.gov/api/v2/search/spending_by_award/",
    method: "POST",
    jurisdiction: "United States federal",
    source_family: "federal_awards",
    reliability_tier: "official_public_record",
    requires_secret: null,
    concern_match: ["grant_awards", "public_contracts", "vendor_spend_review", "fraud_allegation_boundary", "waste_or_control_gap_review", "program_outcome_and_monitoring_review"]
  },
  {
    source_id: "sam_entity_management",
    title: "SAM.gov Entity Management API",
    endpoint: "https://api.sam.gov/entity-information/v4/entities",
    method: "GET",
    jurisdiction: "United States federal",
    source_family: "entity_registration",
    reliability_tier: "official_public_record",
    requires_secret: "SAM_API_KEY",
    concern_match: ["vendor_spend_review", "public_contracts"]
  },
  {
    source_id: "sam_exclusions",
    title: "SAM.gov Exclusions API",
    endpoint: "https://api.sam.gov/entity-information/v4/exclusions",
    method: "GET",
    jurisdiction: "United States federal",
    source_family: "exclusions_debarment",
    reliability_tier: "official_public_record",
    requires_secret: "SAM_API_KEY",
    concern_match: ["vendor_spend_review", "public_contracts", "fraud_allegation_boundary"]
  },
  {
    source_id: "datagov_catalog_search",
    title: "Data.gov Catalog Search API",
    endpoint: "https://catalog.data.gov/search",
    method: "GET",
    jurisdiction: "United States federal",
    source_family: "open_data_catalog",
    reliability_tier: "official_catalog_metadata",
    requires_secret: null,
    concern_match: ["public_record_gap_review", "program_outcome_and_monitoring_review", "public_contracts"]
  },
  {
    source_id: "california_ckan_package_search",
    title: "California Open Data CKAN Package Search",
    endpoint: "https://data.ca.gov/api/3/action/package_search",
    method: "GET",
    jurisdiction: "California statewide",
    source_family: "state_open_data_catalog",
    reliability_tier: "official_catalog_metadata",
    requires_secret: null,
    concern_match: ["public_record_gap_review", "program_outcome_and_monitoring_review", "public_contracts", "board_actions"]
  },
  {
    source_id: "socrata_lacity_catalog",
    title: "Los Angeles Open Data Socrata Catalog",
    endpoint: "https://api.us.socrata.com/api/catalog/v1",
    method: "GET",
    jurisdiction: "Los Angeles, CA",
    source_family: "local_open_data_catalog",
    reliability_tier: "official_catalog_metadata",
    requires_secret: null,
    concern_match: ["public_contracts", "vendor_spend_review", "program_outcome_and_monitoring_review"]
  },
  {
    source_id: "socrata_sfgov_catalog",
    title: "San Francisco Open Data Socrata Catalog",
    endpoint: "https://api.us.socrata.com/api/catalog/v1",
    method: "GET",
    jurisdiction: "San Francisco, CA",
    source_family: "local_open_data_catalog",
    reliability_tier: "official_catalog_metadata",
    requires_secret: null,
    concern_match: ["program_outcome_and_monitoring_review", "public_contracts", "vendor_spend_review"]
  },
  {
    source_id: "arcgis_item_search",
    title: "ArcGIS REST Item Search",
    endpoint: "https://www.arcgis.com/sharing/rest/search",
    method: "GET",
    jurisdiction: "multi-jurisdiction",
    source_family: "geospatial_open_data_catalog",
    reliability_tier: "official_catalog_metadata",
    requires_secret: null,
    concern_match: ["program_outcome_and_monitoring_review", "public_record_gap_review"]
  },
  {
    source_id: "irs_teos_bulk_download_links",
    title: "IRS Tax Exempt Organization Search Bulk Data",
    endpoint: "https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads",
    method: "GET",
    jurisdiction: "United States federal",
    source_family: "nonprofit_tax_exempt_records",
    reliability_tier: "official_public_record_locator",
    requires_secret: null,
    concern_match: ["nonprofit_filing_reconciliation", "grant_awards"]
  },
  {
    source_id: "legistar_events",
    title: "Legistar Public Events API",
    endpoint: "https://webapi.legistar.com/v1/{client}/Events",
    method: "GET",
    jurisdiction: "multi-jurisdiction",
    source_family: "public_meetings_agendas",
    reliability_tier: "official_public_record",
    requires_secret: null,
    concern_match: ["board_actions", "public_contracts"]
  }
];

export function planOfficialApiTasks(spec = {}, options = {}) {
  const cap = Math.max(1, Math.min(Number(options.maxTasks || 8), 12));
  const concernTypes = new Set(Array.isArray(spec.concern_types) ? spec.concern_types : []);
  const jurisdictionText = JSON.stringify(spec.jurisdictions || []).toLowerCase();
  const query = buildOfficialApiQuery(spec);
  const ranked = OFFICIAL_SOURCES.map((source) => ({
    source,
    score: sourceScore(source, concernTypes, jurisdictionText)
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.source.source_id.localeCompare(b.source.source_id))
    .slice(0, cap);

  return ranked.map(({ source }, index) => ({
    task_id: `official_${index + 1}`,
    task_type: "official_api_candidate_probe",
    source_id: source.source_id,
    title: source.title,
    endpoint: source.endpoint,
    method: source.method,
    source_family: source.source_family,
    reliability_tier: source.reliability_tier,
    jurisdiction: source.jurisdiction,
    query,
    requires_secret: source.requires_secret,
    status: source.requires_secret ? "needs_secret" : "planned_public_api_candidate_probe",
    max_results: Number(options.maxResults || 5),
    evidence_promotion_allowed: false,
    candidate_only_until_receipted: true,
    public_boundary: "public records and public metadata only"
  }));
}

export function validateOfficialApiTasks(tasks) {
  const issues = [];
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return ["official_api_tasks must be nonempty"];
  }
  for (const task of tasks) {
    for (const field of ["task_id", "task_type", "source_id", "endpoint", "method", "query", "status"]) {
      if (!String(task?.[field] ?? "").trim()) issues.push(`${task?.task_id || "official task"} missing ${field}`);
    }
    if (task.task_type !== "official_api_candidate_probe") issues.push(`${task.task_id} has wrong task_type`);
    if (task.evidence_promotion_allowed !== false) issues.push(`${task.task_id} must not allow evidence promotion`);
    if (task.candidate_only_until_receipted !== true) issues.push(`${task.task_id} must remain candidate-only until receipted`);
    if (!["planned_public_api_candidate_probe", "needs_secret"].includes(task.status)) issues.push(`${task.task_id} has invalid status`);
  }
  return issues;
}

function sourceScore(source, concernTypes, jurisdictionText) {
  let score = 0;
  for (const concern of source.concern_match) {
    if (concernTypes.has(concern)) score += 3;
  }
  if (source.jurisdiction === "multi-jurisdiction") score += 1;
  if (source.jurisdiction === "United States federal") score += 1;
  if (/california|los angeles|san francisco/.test(jurisdictionText) && /California/.test(source.jurisdiction)) score += 4;
  if (/los angeles|lahsa|lausd/.test(jurisdictionText) && /Los Angeles/.test(source.jurisdiction)) score += 5;
  if (/san francisco|sfdph/.test(jurisdictionText) && /San Francisco/.test(source.jurisdiction)) score += 5;
  return score;
}

function buildOfficialApiQuery(spec) {
  const entities = Array.isArray(spec.target_entities) ? spec.target_entities.map((entity) => entity.name).filter(Boolean) : [];
  const jurisdiction = Array.isArray(spec.jurisdictions) ? spec.jurisdictions.map((item) => item.name).filter(Boolean).join(" ") : "";
  return [entities.slice(0, 3).join(" "), jurisdiction, spec.raw_query || spec.hardened_query || ""]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}
