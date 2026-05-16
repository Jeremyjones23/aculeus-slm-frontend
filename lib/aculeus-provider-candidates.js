const PROVIDERS = [
  {
    provider_id: "parallel_search",
    provider: "Parallel Search",
    endpoint: "https://api.parallel.ai/v1/search",
    required_secret: "PARALLEL_API_KEY",
    request_shape: "search_queries, objective, mode, max_chars_total, advanced_settings",
    default_search_type: "advanced"
  },
  {
    provider_id: "exa_deep",
    provider: "Exa Deep Search",
    endpoint: "https://api.exa.ai/search",
    required_secret: "EXA_API_KEY",
    request_shape: "query, type, num_results, contents.highlights",
    default_search_type: "deep"
  }
];

export function planProviderCandidateTasks(spec = {}, options = {}) {
  const maxTasks = clampNumber(options.maxTasks ?? options.max_tasks ?? 6, 1, 12);
  const maxResults = clampNumber(options.maxResults ?? options.max_results ?? 5, 1, 10);
  const queryVariants = buildProviderQueries(spec).slice(0, Math.max(1, Math.ceil(maxTasks / PROVIDERS.length)));
  const providerOrder = selectProviders(options.providerOrder || options.provider_order);
  const liveRequested = Boolean(options.enableLiveProviderCalls || options.enable_live_provider_calls);
  const providerCapUsd = Number(options.providerCapUsd ?? options.provider_cap_usd ?? 0);
  const tasks = [];

  for (const query of queryVariants) {
    for (const provider of providerOrder) {
      if (tasks.length >= maxTasks) break;
      const liveAllowed = liveRequested && providerCapUsd > 0;
      tasks.push({
        task_id: `provider_${tasks.length + 1}`,
        task_type: "provider_candidate_search",
        provider_id: provider.provider_id,
        provider: provider.provider,
        endpoint: provider.endpoint,
        query,
        search_type: provider.default_search_type,
        max_results: maxResults,
        max_chars_total: clampNumber(options.maxCharsTotal ?? options.max_chars_total ?? 6000, 1000, 20000),
        requires_secret: provider.required_secret,
        status: liveRequested && providerCapUsd <= 0 ? "cost_capped" : "planned_provider_candidate_search",
        live_execution_allowed: liveAllowed,
        request_preview: buildRequestPreview(provider, query, maxResults, options),
        evidence_promotion_allowed: false,
        candidate_only_until_receipted: true,
        receipt_required: true,
        public_boundary: "search/provider locator only; fetch and citation receipt required before evidence use"
      });
    }
  }
  return tasks;
}

export function collectProviderCandidates(spec = {}, options = {}) {
  const tasks = planProviderCandidateTasks(spec, options);
  const candidateCap = clampNumber(options.candidateCap ?? options.candidate_cap ?? 8, 1, 20);
  const fixtureCandidates = buildFixtureCandidates(spec, tasks).slice(0, candidateCap);
  return {
    provider_mode: "fixture_provider_candidate_collection",
    live_provider_calls_executed: false,
    provider_calls_executed: false,
    paid_spend_incurred: false,
    actual_spend_usd: 0,
    estimated_spend_usd: 0,
    task_count: tasks.length,
    candidate_count: fixtureCandidates.length,
    tasks,
    candidates: fixtureCandidates
  };
}

export function validateProviderCandidateTasks(tasks) {
  const issues = [];
  if (!Array.isArray(tasks) || tasks.length === 0) return ["provider candidate tasks must be nonempty"];
  for (const task of tasks) {
    for (const field of ["task_id", "task_type", "provider_id", "provider", "endpoint", "query", "status"]) {
      if (!String(task?.[field] ?? "").trim()) issues.push(`${task?.task_id || "provider task"} missing ${field}`);
    }
    if (task.task_type !== "provider_candidate_search") issues.push(`${task.task_id} has wrong task_type`);
    if (!["planned_provider_candidate_search", "cost_capped"].includes(task.status)) issues.push(`${task.task_id} has invalid status`);
    if (task.evidence_promotion_allowed !== false) issues.push(`${task.task_id} must not allow evidence promotion`);
    if (task.candidate_only_until_receipted !== true) issues.push(`${task.task_id} must remain candidate-only until receipted`);
    if (task.receipt_required !== true) issues.push(`${task.task_id} must require a receipt before promotion`);
  }
  return issues;
}

export function validateProviderCandidates(candidates) {
  const issues = [];
  if (!Array.isArray(candidates) || candidates.length === 0) return ["provider candidates must be nonempty"];
  for (const candidate of candidates) {
    for (const field of ["candidate_id", "provider", "url", "title", "candidate_reason", "promotion_status"]) {
      if (!String(candidate?.[field] ?? "").trim()) issues.push(`${candidate?.candidate_id || "provider candidate"} missing ${field}`);
    }
    if (candidate.promotion_status !== "candidate_lead_not_evidence") issues.push(`${candidate.candidate_id} must be candidate-only`);
    if (candidate.evidence_id !== null) issues.push(`${candidate.candidate_id} must not carry evidence_id`);
    if (candidate.evidence_promotion_allowed !== false) issues.push(`${candidate.candidate_id} must not allow evidence promotion`);
    if (candidate.receipt_required !== true) issues.push(`${candidate.candidate_id} must require receipt`);
    if (candidate.public_safe !== true) issues.push(`${candidate.candidate_id} must be public_safe`);
  }
  return issues;
}

function buildProviderQueries(spec) {
  const raw = clean(spec.raw_query || spec.hardened_query);
  const entities = Array.isArray(spec.target_entities) ? spec.target_entities.map((entity) => entity.name).filter(Boolean) : [];
  const jurisdiction = Array.isArray(spec.jurisdictions) ? spec.jurisdictions.map((item) => item.name).filter(Boolean).join(" ") : "";
  const concern = Array.isArray(spec.concern_types) ? spec.concern_types.join(" ") : "";
  const base = [entities.slice(0, 3).join(" "), jurisdiction, raw].join(" ").replace(/\s+/g, " ").trim();
  return unique([
    `${base} official audit report contract PDF`,
    `${base} open data spending vendor grant monitoring`,
    `${base} board packet agenda minutes procurement`,
    `${base} lawsuit audit inspector general performance report`,
    `${base} ${concern} public records request missing invoices outcomes`
  ].map((query) => query.trim().slice(0, 260)).filter(Boolean));
}

function buildFixtureCandidates(spec, tasks) {
  const text = `${spec.raw_query || ""} ${spec.hardened_query || ""} ${JSON.stringify(spec.target_entities || [])}`.toLowerCase();
  const rows = [];
  if (/los angeles|lahsa|homeless/.test(text)) {
    rows.push(
      row("Los Angeles City Controller homelessness audits and reports", "https://controller.lacity.gov/audits", "Official controller pages are high-priority locators for audit PDFs and source receipts."),
      row("LAHSA public records and commission materials", "https://www.lahsa.org/documents", "LAHSA document indexes can lead to contracts, board reports, and missing-record requests."),
      row("California State Auditor homelessness report index", "https://www.auditor.ca.gov/reports/", "State audit reports are authoritative starting points for control-gap review.")
    );
  }
  if (/school board|lausd|district|board of education/.test(text)) {
    rows.push(
      row("California Department of Education expenditure data", "https://www.cde.ca.gov/ds/fd/ec/", "Official school finance datasets can locate spending rows before district-level fetches."),
      row("LAUSD Board of Education meeting archive", "https://www.lausd.org/boe", "Board meeting pages are candidate locators for agenda items, contracts, and votes."),
      row("California local education agency audit reports", "https://www.cde.ca.gov/fg/ac/ar/", "Audit report pages can identify findings and missing attachments.")
    );
  }
  if (/san francisco|sfdph|healthright|rehabilitation|drug/.test(text)) {
    rows.push(
      row("San Francisco open data contracts and payments", "https://data.sfgov.org/", "SFGov open data is a primary locator for contract and payment records."),
      row("SFDPH behavioral health services documents", "https://www.sf.gov/departments/department-public-health", "Department pages can locate program-monitoring and provider documents."),
      row("HealthRIGHT 360 public filings and program pages", "https://www.healthright360.org/", "Provider pages are candidate-only context until official records or fetched receipts support claims.")
    );
  }
  if (/chirla|becerra|bacerra|immigrant|nonprofit/.test(text)) {
    rows.push(
      row("IRS tax exempt organization search bulk data", "https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads", "IRS TEOS is an official nonprofit-record locator."),
      row("California Secretary of State campaign finance search", "https://cal-access.sos.ca.gov/", "CAL-ACCESS can locate official campaign finance records before any linkage claim."),
      row("California social services immigration funding pages", "https://www.cdss.ca.gov/inforesources/immigration", "CDSS pages are candidate locators for public grant award records.")
    );
  }
  if (!rows.length) {
    rows.push(
      row("Data.gov public catalog search", "https://catalog.data.gov/dataset", "Federal catalog metadata can locate official public datasets."),
      row("USAspending award search", "https://www.usaspending.gov/search", "Federal award search can locate grants and recipient records.")
    );
  }
  return rows.map((candidate, index) => {
    const task = tasks[index % Math.max(1, tasks.length)] || {};
    return {
      candidate_id: `provider_candidate_${index + 1}`,
      provider: task.provider || "fixture provider",
      provider_id: task.provider_id || "fixture",
      source_family: "provider_search_candidate",
      query: task.query || spec.raw_query || "",
      url: candidate.url,
      title: candidate.title,
      snippet: candidate.snippet,
      candidate_reason: `${candidate.snippet} This is a locator only until fetched, hashed, quoted, and verified.`,
      retrieval_score: null,
      promotion_status: "candidate_lead_not_evidence",
      evidence_id: null,
      evidence_promotion_allowed: false,
      receipt_required: true,
      public_safe: true
    };
  });
}

function buildRequestPreview(provider, query, maxResults, options) {
  if (provider.provider_id === "parallel_search") {
    return {
      method: "POST",
      endpoint: provider.endpoint,
      headers: { "x-api-key": "<redacted>", "content-type": "application/json" },
      body: {
        search_queries: [parallelSearchQuery(query)],
        objective: "Find public-record candidate sources about the named government, nonprofit, vendor, program, audit, contract, spending, or oversight question. Return locators only.",
        mode: options.parallelMode || options.parallel_mode || "advanced",
        max_chars_total: clampNumber(options.maxCharsTotal ?? options.max_chars_total ?? 6000, 1000, 20000)
      }
    };
  }
  return {
    method: "POST",
    endpoint: provider.endpoint,
    headers: { "x-api-key": "<redacted>", "content-type": "application/json" },
    body: {
      query,
      type: options.exaType || options.exa_type || "deep",
      num_results: maxResults,
      contents: { highlights: true }
    }
  };
}

function selectProviders(input) {
  const requested = Array.isArray(input) ? input : [];
  if (!requested.length) return PROVIDERS;
  const ids = new Set(requested.map((item) => clean(item).toLowerCase()));
  const selected = PROVIDERS.filter((provider) => ids.has(provider.provider_id) || ids.has(provider.provider.toLowerCase()));
  return selected.length ? selected : PROVIDERS;
}

function row(title, url, snippet) {
  return { title, url, snippet };
}

function clean(value) {
  return String(value ?? "").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(number, max));
}

function parallelSearchQuery(value) {
  const cleaned = clean(value)
    .replace(/\bofficial\b/gi, "")
    .replace(/\bpublic records?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 10).join(" ");
  return (words || "audit records").slice(0, 190);
}
