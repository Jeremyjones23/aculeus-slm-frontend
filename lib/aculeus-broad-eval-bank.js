const TOPICS = [
  "homelessness services",
  "school board spending",
  "behavioral health programs",
  "public health vendors",
  "housing authority vouchers",
  "transit capital projects",
  "water district construction",
  "parks capital grants",
  "police technology procurement",
  "fire recovery contracts",
  "workforce training grants",
  "child welfare providers",
  "air quality equipment grants",
  "jail medical services",
  "city IT modernization",
  "emergency shelter hotels",
  "nonprofit pass-through grants",
  "overtime payroll spending",
  "bond-funded infrastructure",
  "blocked PDF budget appendices"
];

const JURISDICTIONS = [
  "Los Angeles, California",
  "San Francisco, California",
  "California county government",
  "California school district",
  "California special district",
  "California city government",
  "United States federal grants",
  "local housing authority",
  "regional transit agency",
  "public health department"
];

const SOURCE_FAMILIES = [
  ["USAspending", "SAM.gov", "audits", "grant records", "public records request"],
  ["Socrata", "ArcGIS", "board agendas", "contracts", "payment datasets"],
  ["IRS nonprofit records", "state grants portal", "monitoring reports", "audits", "public filings"],
  ["procurement portal", "minutes", "budget records", "change orders", "invoices"],
  ["CKAN", "open data catalog", "agency reports", "FOIA/CPRA targets", "archives"]
];

const EDGE_CASES = [
  "unavailable record",
  "blocked PDF",
  "duplicate source",
  "secondary-source-only lead",
  "stale receipt",
  "ambiguous entity name",
  "missing payment backup",
  "missing monitoring report",
  "conflicting record",
  "requires public-record request"
];

export function generateBroadEvalBank(count = 100) {
  const cases = [];
  for (let index = 0; index < count; index += 1) {
    const topic = TOPICS[index % TOPICS.length];
    const jurisdiction = JURISDICTIONS[index % JURISDICTIONS.length];
    const edge = EDGE_CASES[index % EDGE_CASES.length];
    const families = SOURCE_FAMILIES[index % SOURCE_FAMILIES.length];
    cases.push({
      case_id: `broad_${String(index + 1).padStart(3, "0")}_${slug(topic)}_${slug(edge)}`,
      query: `${jurisdiction} ${topic}: locate contracts, payments, audits, official records, and ${edge} handling without writing unsupported findings`,
      jurisdiction,
      expected_source_families: families,
      expected_verifier_gates: [
        "zero_uncited_critical_claims",
        index % 2 === 0 ? "candidate_only_until_receipted" : "receipt_required_for_evidence",
        index % 3 === 0 ? "missing_records_named" : "official_source_priority",
        index % 5 === 0 ? "overclaim_guardrails" : "rejected_claims_separated"
      ],
      edge_case: edge
    });
  }
  return {
    schema_version: "aculeus_eval_bank.v1",
    name: `Aculeus ${count}-case broad eval bank`,
    description: "Generated broad eval manifest for scale/self-serve readiness. Cases are retrieval/evidence-gate checks, not findings.",
    split: "broad_scale_pre_self_serve",
    cases
  };
}

export function summarizeBroadEvalReport(report = {}) {
  const cases = Array.isArray(report.cases) ? report.cases : [];
  const failed = cases.filter((item) => item.status !== "pass");
  const gateCounts = new Map();
  for (const item of cases) {
    for (const gate of item.gate_results || []) {
      const key = `${gate.gate}:${gate.pass ? "pass" : "fail"}`;
      gateCounts.set(key, (gateCounts.get(key) || 0) + 1);
    }
  }
  return {
    schema_version: "aculeus_eval_dashboard.v1",
    case_count: cases.length,
    passed: cases.length - failed.length,
    failed: failed.length,
    pass_rate: cases.length ? Number(((cases.length - failed.length) / cases.length).toFixed(3)) : 0,
    gate_counts: Object.fromEntries([...gateCounts.entries()].sort()),
    failed_case_ids: failed.map((item) => item.case_id),
    promotion_ready: failed.length === 0 && cases.length >= 100
  };
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 42);
}
