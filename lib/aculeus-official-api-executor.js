import { createHash } from "node:crypto";

const USER_AGENT = "AculeusOfficialApiExecutor/0.1 public-record-research";

export async function executeOfficialApiTasks(tasks = [], options = {}) {
  const maxTasks = clampNumber(options.maxTasks ?? options.max_tasks ?? (tasks.length || 1), 1, 12);
  const enableNetwork = Boolean(options.enableNetwork ?? options.enable_network ?? false);
  const fetchFn = options.fetchFn || fetch;
  const now = options.now || new Date().toISOString();
  const selected = tasks.slice(0, maxTasks);
  const concurrency = clampNumber(options.concurrency ?? options.maxConcurrency ?? options.max_concurrency ?? 3, 1, 6);
  const resultSets = await mapLimit(selected, concurrency, (task) => (
    executeOfficialApiTask(task, { ...options, enableNetwork, fetchFn, now })
  ));

  return {
    status: resultSets.some((item) => item.status === "ERROR") ? "PARTIAL" : "PASS",
    mode: enableNetwork ? "official_api_public_execution" : "official_api_dry_run",
    official_api_calls_executed: enableNetwork,
    paid_spend_incurred: false,
    actual_spend_usd: 0,
    result_set_count: resultSets.length,
    record_count: resultSets.reduce((sum, item) => sum + (item.records?.length || 0), 0),
    result_sets: resultSets
  };
}

export async function executeOfficialApiTask(task = {}, options = {}) {
  if (task.requires_secret) {
    return emptyResult(task, "NEEDS_SECRET", {
      required_secret: task.requires_secret,
      message: `${task.source_id || task.task_id} requires ${task.requires_secret}; no secret value is stored.`
    });
  }

  const request = buildOfficialApiRequest(task);
  if (!request.ok) {
    return emptyResult(task, request.status || "SKIPPED", { message: request.message || "Unsupported official API task." });
  }

  if (!options.enableNetwork) {
    return {
      ...emptyResult(task, "DRY_RUN", { message: "Network execution disabled; request preview only." }),
      request_preview: publicRequestPreview(request)
    };
  }

  const requestFingerprint = fingerprint({
    method: request.method,
    url: request.url,
    body: request.body || null
  });
  try {
    const response = await options.fetchFn(request.url, {
      method: request.method,
      headers: {
        "accept": "application/json,text/html;q=0.8,*/*;q=0.6",
        "content-type": "application/json",
        "user-agent": USER_AGENT
      },
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(clampNumber(options.timeoutMs ?? options.timeout_ms ?? 12000, 1000, 30000))
    });
    const text = await boundedText(response, clampNumber(options.maxBytes ?? options.max_bytes ?? 750000, 10000, 2000000));
    const bodyHash = sha256(text);
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    const records = parseOfficialApiRecords(task, parsed, {
      retrieved_at: options.now,
      request_fingerprint: requestFingerprint,
      content_hash: bodyHash,
      limit: clampNumber(task.max_results ?? options.maxResults ?? options.max_results ?? 5, 1, 10)
    });
    return {
      source_id: clean(task.source_id),
      task_id: clean(task.task_id),
      status: response.ok ? "PASS" : "ERROR",
      http_status: response.status,
      result_count: records.length,
      records,
      request_fingerprint: requestFingerprint,
      response_content_sha256: bodyHash,
      evidence_promotion_allowed: false,
      candidate_only_until_receipted: true,
      public_safe: true
    };
  } catch (error) {
    return emptyResult(task, "ERROR", {
      message: error.message,
      request_fingerprint: requestFingerprint
    });
  }
}

export function buildOfficialApiRequest(task = {}) {
  const sourceId = clean(task.source_id);
  const query = clean(task.query || "");
  const maxResults = clampNumber(task.max_results ?? 5, 1, 10);
  if (sourceId === "usaspending_award_search") {
    return {
      ok: true,
      method: "POST",
      url: task.endpoint || "https://api.usaspending.gov/api/v2/search/spending_by_award/",
      body: {
        filters: {
          keywords: [query],
          award_type_codes: ["02", "03", "04", "05"],
          time_period: [{ start_date: "2020-10-01", end_date: "2026-05-16" }]
        },
        fields: ["Award ID", "Recipient Name", "Award Amount", "Awarding Agency", "Start Date", "End Date"],
        page: 1,
        limit: maxResults,
        sort: "Award Amount",
        order: "desc",
        subawards: false
      }
    };
  }
  if (sourceId === "datagov_catalog_search") {
    return ckanGet(task.endpoint || "https://catalog.data.gov/search", { q: query, per_page: maxResults });
  }
  if (sourceId === "california_ckan_package_search") {
    return ckanGet(task.endpoint || "https://data.ca.gov/api/3/action/package_search", { q: query, rows: maxResults });
  }
  if (sourceId === "socrata_lacity_catalog") {
    return ckanGet(task.endpoint || "https://api.us.socrata.com/api/catalog/v1", {
      domains: "data.lacity.org",
      search_context: "data.lacity.org",
      q: query,
      limit: maxResults
    });
  }
  if (sourceId === "socrata_sfgov_catalog") {
    return ckanGet(task.endpoint || "https://api.us.socrata.com/api/catalog/v1", {
      domains: "data.sfgov.org",
      search_context: "data.sfgov.org",
      q: query,
      limit: maxResults
    });
  }
  if (sourceId === "arcgis_item_search") {
    return ckanGet(task.endpoint || "https://www.arcgis.com/sharing/rest/search", {
      f: "json",
      q: query,
      num: maxResults
    });
  }
  if (sourceId === "irs_teos_bulk_download_links") {
    return {
      ok: true,
      method: "GET",
      url: task.endpoint || "https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads"
    };
  }
  if (sourceId === "legistar_events") {
    return { ok: false, status: "NEEDS_CLIENT", message: "Legistar execution requires a concrete client slug before request." };
  }
  return { ok: false, status: "SKIPPED", message: `Unsupported official API source: ${sourceId || "missing"}` };
}

export function validateOfficialApiExecution(result) {
  const issues = [];
  if (!result || typeof result !== "object") return ["official API execution result must be an object"];
  if (!["PASS", "PARTIAL"].includes(result.status)) issues.push("official API execution status must be PASS or PARTIAL");
  if (result.paid_spend_incurred !== false || result.actual_spend_usd !== 0) issues.push("official API execution must not incur spend");
  if (!Array.isArray(result.result_sets)) issues.push("official API execution must include result_sets");
  for (const set of result.result_sets || []) {
    if (set.evidence_promotion_allowed !== false) issues.push(`${set.source_id || "result set"} must not allow evidence promotion`);
    if (set.candidate_only_until_receipted !== true) issues.push(`${set.source_id || "result set"} must remain candidate-only`);
    for (const record of set.records || []) {
      if (record.evidence_id !== null) issues.push(`${record.record_id || "record"} must not carry evidence_id`);
      if (record.evidence_promotion_allowed !== false) issues.push(`${record.record_id || "record"} must not allow evidence promotion`);
      if (record.receipt_required !== true) issues.push(`${record.record_id || "record"} must require receipt`);
      if (record.public_safe !== true) issues.push(`${record.record_id || "record"} must be public_safe`);
    }
  }
  return issues;
}

function parseOfficialApiRecords(task, body, meta) {
  const sourceId = clean(task.source_id);
  if (sourceId === "usaspending_award_search") return parseUsaspending(task, body, meta);
  if (sourceId === "datagov_catalog_search" || sourceId === "california_ckan_package_search") return parseCkan(task, body, meta);
  if (sourceId === "socrata_lacity_catalog" || sourceId === "socrata_sfgov_catalog") return parseSocrata(task, body, meta);
  if (sourceId === "arcgis_item_search") return parseArcgis(task, body, meta);
  if (sourceId === "irs_teos_bulk_download_links") {
    return [record(task, 1, "IRS TEOS bulk data download page", task.endpoint, "Official IRS locator page for nonprofit bulk data downloads.", {}, meta)];
  }
  return [];
}

function parseUsaspending(task, body, meta) {
  return asArray(body?.results).slice(0, meta.limit).map((item, index) => {
    const awardId = item.generated_internal_id || item["Award ID"] || item.award_id || "";
    const recipient = item["Recipient Name"] || item.recipient_name || "recipient";
    const amount = item["Award Amount"] || item.award_amount || "";
    const agency = item["Awarding Agency"] || item.awarding_agency || "";
    return record(
      task,
      index + 1,
      `USAspending award - ${recipient}`,
      awardId ? `https://www.usaspending.gov/award/${encodeURIComponent(String(awardId))}` : "https://www.usaspending.gov/search",
      `USAspending award metadata: recipient=${recipient}; amount=${amount}; awarding_agency=${agency}.`,
      { award_id: awardId, recipient_name: recipient, award_amount: amount, awarding_agency: agency },
      meta
    );
  });
}

function parseCkan(task, body, meta) {
  if (clean(task.source_id) === "datagov_catalog_search" && Array.isArray(body?.results)) {
    return parseDataGovCatalog(task, body, meta);
  }
  const result = body?.result && typeof body.result === "object" ? body.result : {};
  return asArray(result.results).slice(0, meta.limit).map((item, index) => {
    const resource = asArray(item.resources)[0] || {};
    const org = typeof item.organization === "object" ? item.organization?.title : item.organization;
    const url = resource.url || item.url || datasetUrl(task.endpoint, item.name || item.id);
    return record(
      task,
      index + 1,
      item.title || item.name || "CKAN dataset",
      url,
      `CKAN catalog metadata: title=${item.title || item.name}; organization=${org || ""}; notes=${clean(item.notes).slice(0, 300)}.`,
      { package_id: item.id, name: item.name, organization: org, resource_id: resource.id },
      meta
    );
  });
}

function parseDataGovCatalog(task, body, meta) {
  return asArray(body?.results).slice(0, meta.limit).map((item, index) => {
    const url = item.landingPage || item.accessURL || item.identifier || (item.slug ? `https://catalog.data.gov/dataset/${item.slug}` : "https://catalog.data.gov/search");
    const keywords = asArray(item.keyword).slice(0, 6).join(", ");
    return record(
      task,
      index + 1,
      item.title || item.slug || "Data.gov catalog dataset",
      url,
      `Data.gov catalog metadata: title=${item.title || ""}; publisher=${item.publisher || ""}; accessLevel=${item.accessLevel || ""}; keywords=${keywords}; description=${clean(item.description).slice(0, 300)}.`,
      { identifier: item.identifier, slug: item.slug, publisher: item.publisher },
      meta
    );
  });
}

function parseSocrata(task, body, meta) {
  return asArray(body?.results).slice(0, meta.limit).map((item, index) => {
    const resource = item.resource || {};
    const metadata = item.metadata || {};
    const domain = task.source_id === "socrata_lacity_catalog" ? "data.lacity.org" : "data.sfgov.org";
    const id = resource.id || resource.identifier || "";
    return record(
      task,
      index + 1,
      resource.name || "Socrata dataset",
      item.permalink || (id ? `https://${domain}/d/${id}` : `https://${domain}`),
      `Socrata catalog metadata: name=${resource.name || ""}; domain=${domain}; updatedAt=${resource.updatedAt || ""}; description=${clean(metadata.description).slice(0, 300)}.`,
      { domain, resource_id: id },
      meta
    );
  });
}

function parseArcgis(task, body, meta) {
  return asArray(body?.results).slice(0, meta.limit).map((item, index) => {
    const url = item.url || (item.id ? `https://www.arcgis.com/home/item.html?id=${encodeURIComponent(String(item.id))}` : "https://www.arcgis.com/");
    return record(
      task,
      index + 1,
      item.title || "ArcGIS item",
      url,
      `ArcGIS item metadata: title=${item.title || ""}; owner=${item.owner || ""}; type=${item.type || ""}; snippet=${clean(item.snippet).slice(0, 300)}.`,
      { item_id: item.id, owner: item.owner, type: item.type },
      meta
    );
  });
}

function record(task, index, title, url, snippet, canonicalIds, meta) {
  return {
    record_id: `${clean(task.source_id || "official_api")}_record_${index}`,
    source_id: clean(task.source_id),
    task_id: clean(task.task_id),
    title: clean(title),
    url: clean(url || task.endpoint),
    snippet: clean(snippet).slice(0, 1400),
    source_family: clean(task.source_family || "official_api_record"),
    reliability_tier: clean(task.reliability_tier || "official_public_record"),
    canonical_ids: canonicalIds || {},
    retrieved_at: meta.retrieved_at,
    request_fingerprint: meta.request_fingerprint,
    response_content_sha256: meta.content_hash,
    evidence_id: null,
    evidence_promotion_allowed: false,
    candidate_only_until_receipted: true,
    receipt_required: true,
    public_safe: true
  };
}

function emptyResult(task, status, extras = {}) {
  return {
    source_id: clean(task.source_id),
    task_id: clean(task.task_id),
    status,
    http_status: null,
    result_count: 0,
    records: [],
    evidence_promotion_allowed: false,
    candidate_only_until_receipted: true,
    public_safe: true,
    ...extras
  };
}

function ckanGet(endpoint, params) {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return { ok: true, method: "GET", url: url.toString() };
}

function publicRequestPreview(request) {
  return {
    method: request.method,
    url: request.url,
    body: request.body || null,
    headers: { "user-agent": USER_AGENT, "accept": "application/json,text/html;q=0.8,*/*;q=0.6" }
  };
}

async function boundedText(response, maxBytes) {
  const text = await response.text();
  return text.length > maxBytes ? text.slice(0, maxBytes) : text;
}

function datasetUrl(endpoint, id) {
  if (!id) return endpoint;
  const base = String(endpoint || "").split("/api/", 1)[0];
  return `${base}/dataset/${encodeURIComponent(String(id))}`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function fingerprint(value) {
  return sha256(JSON.stringify(value));
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(number, max));
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
