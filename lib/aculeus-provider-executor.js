import { createHash } from "node:crypto";

const PROVIDER_ESTIMATES = {
  parallel_search: 0.08,
  exa_deep: 0.04
};

export async function executeProviderCandidateTasks(tasks = [], options = {}) {
  const maxTasks = clampNumber(options.maxTasks ?? options.max_tasks ?? (tasks.length || 1), 1, 8);
  const budgetUsd = Number(options.providerCapUsd ?? options.provider_cap_usd ?? 0);
  const enableNetwork = Boolean(options.enableNetwork ?? options.enable_network ?? false);
  const fetchFn = options.fetchFn || fetch;
  const selected = tasks.slice(0, maxTasks);
  const concurrency = clampNumber(options.concurrency ?? options.maxConcurrency ?? options.max_concurrency ?? 2, 1, 4);
  let reservedSpendUsd = 0;
  const executionPlan = selected.map((task) => {
    const estimate = estimateTaskCost(task);
    if (!enableNetwork) {
      return { task, estimate, result: dryResult(task, "DRY_RUN", estimate) };
    }
    if (reservedSpendUsd + estimate > budgetUsd) {
      return { task, estimate, result: dryResult(task, "COST_CAPPED", estimate) };
    }
    reservedSpendUsd += estimate;
    return { task, estimate, result: null };
  });
  const resultSets = await mapLimit(executionPlan, concurrency, (item) => {
    if (item.result) return item.result;
    return executeProviderCandidateTask(item.task, {
      ...options,
      fetchFn,
      estimatedCostUsd: item.estimate
    });
  });
  const estimatedSpendUsd = resultSets.reduce((sum, item) => item.status === "PASS" ? sum + Number(item.estimated_cost_usd || 0) : sum, 0);

  return {
    status: resultSets.some((item) => item.status === "ERROR") ? "PARTIAL" : "PASS",
    mode: enableNetwork ? "paid_provider_candidate_execution" : "paid_provider_dry_run",
    provider_calls_executed: enableNetwork && resultSets.some((item) => item.status === "PASS"),
    paid_spend_incurred: enableNetwork && resultSets.some((item) => item.status === "PASS"),
    estimated_spend_usd: roundMoney(estimatedSpendUsd),
    actual_spend_usd: null,
    provider_cap_usd: budgetUsd,
    result_set_count: resultSets.length,
    candidate_count: resultSets.reduce((sum, item) => sum + (item.candidates?.length || 0), 0),
    result_sets: resultSets
  };
}

export async function executeProviderCandidateTask(task = {}, options = {}) {
  const request = buildProviderRequest(task, options);
  if (!request.ok) {
    return dryResult(task, request.status || "SKIPPED", estimateTaskCost(task), request.message);
  }
  const started = new Date().toISOString();
  try {
    const response = await options.fetchFn(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(clampNumber(options.timeoutMs ?? options.timeout_ms ?? 20000, 1000, 45000))
    });
    const text = await boundedText(response, clampNumber(options.maxBytes ?? options.max_bytes ?? 750000, 10000, 2000000));
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    const candidates = parseProviderCandidates(task, parsed, {
      retrieved_at: started,
      result_sha256: sha256(text),
      limit: clampNumber(task.max_results ?? options.maxResults ?? options.max_results ?? 5, 1, 10)
    });
    return {
      task_id: clean(task.task_id),
      provider_id: clean(task.provider_id),
      provider: clean(task.provider),
      status: response.ok ? "PASS" : "ERROR",
      http_status: response.status,
      estimated_cost_usd: roundMoney(options.estimatedCostUsd ?? estimateTaskCost(task)),
      result_count: candidates.length,
      result_sha256: sha256(text),
      candidates,
      evidence_promotion_allowed: false,
      candidate_only_until_receipted: true,
      receipt_required: true,
      public_safe: true
    };
  } catch (error) {
    return dryResult(task, "ERROR", estimateTaskCost(task), error.message);
  }
}

export function buildProviderRequest(task = {}, options = {}) {
  const providerId = clean(task.provider_id);
  const key = providerKey(providerId, options);
  if (!key) {
    return {
      ok: false,
      status: "NEEDS_SECRET",
      message: `${providerId || "provider"} key is not available in process environment or provided options.`
    };
  }
  if (providerId === "parallel_search") {
    const query = parallelSearchQuery(task.query);
    return {
      ok: true,
      url: task.endpoint || "https://api.parallel.ai/v1/search",
      headers: {
        "x-api-key": key,
        "content-type": "application/json"
      },
      body: {
        search_queries: [query],
        objective: "Find public-record candidate sources about the named government, nonprofit, vendor, program, audit, contract, spending, or oversight question. Return locators and excerpts only.",
        mode: options.parallelMode || options.parallel_mode || task.search_type || "advanced",
        max_chars_total: clampNumber(task.max_chars_total ?? options.maxCharsTotal ?? options.max_chars_total ?? 6000, 1000, 20000)
      }
    };
  }
  if (providerId === "exa_deep") {
    return {
      ok: true,
      url: task.endpoint || "https://api.exa.ai/search",
      headers: {
        "x-api-key": key,
        "content-type": "application/json"
      },
      body: {
        query: clean(task.query),
        type: options.exaType || options.exa_type || task.search_type || "deep",
        num_results: clampNumber(task.max_results ?? options.maxResults ?? options.max_results ?? 5, 1, 10),
        contents: { highlights: true }
      }
    };
  }
  return { ok: false, status: "SKIPPED", message: `Unsupported provider: ${providerId}` };
}

export function validateProviderExecution(result) {
  const issues = [];
  if (!result || typeof result !== "object") return ["provider execution result must be an object"];
  if (!["PASS", "PARTIAL"].includes(result.status)) issues.push("provider execution status must be PASS or PARTIAL");
  if (Number(result.estimated_spend_usd || 0) > Number(result.provider_cap_usd || 0)) issues.push("estimated spend exceeds cap");
  if (!Array.isArray(result.result_sets)) issues.push("provider execution must include result_sets");
  for (const set of result.result_sets || []) {
    if (set.evidence_promotion_allowed !== false) issues.push(`${set.task_id || "provider result"} must not allow evidence promotion`);
    if (set.candidate_only_until_receipted !== true) issues.push(`${set.task_id || "provider result"} must remain candidate-only`);
    for (const candidate of set.candidates || []) {
      if (candidate.evidence_id !== null) issues.push(`${candidate.candidate_id || "candidate"} must not carry evidence_id`);
      if (candidate.evidence_promotion_allowed !== false) issues.push(`${candidate.candidate_id || "candidate"} must not allow evidence promotion`);
      if (candidate.receipt_required !== true) issues.push(`${candidate.candidate_id || "candidate"} must require receipt`);
      if (candidate.public_safe !== true) issues.push(`${candidate.candidate_id || "candidate"} must be public_safe`);
    }
  }
  return issues;
}

function parseProviderCandidates(task, body, meta) {
  const providerId = clean(task.provider_id);
  const rows = providerId === "parallel_search" ? asArray(body?.results) : asArray(body?.results);
  return rows.slice(0, meta.limit).map((item, index) => {
    const url = clean(item.url);
    const title = clean(item.title || item.name || url || `${task.provider} result`);
    const excerpts = asArray(item.excerpts).concat(asArray(item.highlights));
    const snippet = excerpts.map((excerpt) => typeof excerpt === "string" ? excerpt : excerpt?.text || excerpt?.highlight || "")
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 900) || clean(item.summary || item.text || "");
    return {
      candidate_id: `${providerId || "provider"}_live_candidate_${index + 1}_${sha256(`${url}:${title}`).slice(0, 10)}`,
      provider: clean(task.provider),
      provider_id: providerId,
      source_family: "provider_search_candidate",
      query: clean(task.query),
      url,
      title,
      snippet,
      candidate_reason: "Paid provider search result. Locator only until fetched, hashed, quoted, and verified.",
      retrieval_score: item.score ?? null,
      retrieved_at: meta.retrieved_at,
      result_sha256: meta.result_sha256,
      promotion_status: "candidate_lead_not_evidence",
      evidence_id: null,
      evidence_promotion_allowed: false,
      receipt_required: true,
      public_safe: true
    };
  }).filter((candidate) => candidate.url);
}

function dryResult(task, status, estimate, message = "") {
  return {
    task_id: clean(task.task_id),
    provider_id: clean(task.provider_id),
    provider: clean(task.provider),
    status,
    http_status: null,
    estimated_cost_usd: roundMoney(estimate),
    result_count: 0,
    candidates: [],
    message,
    evidence_promotion_allowed: false,
    candidate_only_until_receipted: true,
    receipt_required: true,
    public_safe: true
  };
}

function providerKey(providerId, options) {
  const keys = options.providerApiKeys || options.provider_api_keys || {};
  const allowProcessEnv = options.allowProcessEnvKeys ?? options.allow_process_env_keys ?? true;
  if (providerId === "parallel_search") return keys.parallel_search || keys.PARALLEL_API_KEY || (allowProcessEnv ? process.env.PARALLEL_API_KEY : "") || "";
  if (providerId === "exa_deep") return keys.exa_deep || keys.EXA_API_KEY || (allowProcessEnv ? process.env.EXA_API_KEY : "") || "";
  return "";
}

function estimateTaskCost(task) {
  return PROVIDER_ESTIMATES[clean(task.provider_id)] || 0.05;
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

async function boundedText(response, maxBytes) {
  const text = await response.text();
  return text.length > maxBytes ? text.slice(0, maxBytes) : text;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
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
