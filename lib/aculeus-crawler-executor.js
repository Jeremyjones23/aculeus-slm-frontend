import { createHash } from "node:crypto";
import { buildBrowserCaptureFallback } from "./aculeus-browser-capture-fallback.js";

const DEFAULT_USER_AGENT = "AculeusCrawler/0.1 public-record-candidate-review";

export function planCrawlerTasks(spec = {}, options = {}) {
  const query = String(spec.raw_query || spec.rawQuery || spec.case_scope || "").trim();
  const jurisdiction = String(spec.jurisdiction || "").toLowerCase();
  const targets = [
    {
      source_id: "irs_teos_bulk_page",
      title: "IRS TEOS bulk data download page",
      url: "https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads",
      source_family: "official_host_page"
    },
    jurisdiction.includes("san francisco") || query.toLowerCase().includes("san francisco") ? {
      source_id: "sf_open_data_home",
      title: "San Francisco open data portal",
      url: "https://data.sfgov.org/",
      source_family: "official_host_page"
    } : null,
    jurisdiction.includes("los angeles") || query.toLowerCase().includes("la ") || query.toLowerCase().includes("los angeles") ? {
      source_id: "la_open_data_home",
      title: "Los Angeles open data portal",
      url: "https://data.lacity.org/",
      source_family: "official_host_page"
    } : null,
    query.toLowerCase().includes("california") || query.toLowerCase().includes(" ca ") ? {
      source_id: "ca_open_data_home",
      title: "California open data portal",
      url: "https://data.ca.gov/",
      source_family: "official_host_page"
    } : null
  ].filter(Boolean);

  return targets.slice(0, options.maxTasks || 4).map((target, index) => ({
    task_id: `crawler_${target.source_id}_${index + 1}`,
    crawler_type: "custom_official_host",
    query,
    receipt_required: true,
    evidence_promotion_allowed: false,
    public_safe: true,
    ...target
  }));
}

export async function executeCrawlerTasks(tasks = [], options = {}) {
  const enableNetwork = Boolean(options.enableNetwork || options.enable_network);
  const fetchFn = options.fetchFn || fetch;
  const maxTasks = Math.max(1, Math.min(Number(options.maxTasks || options.max_tasks || tasks.length || 1), 8));
  const selected = tasks.slice(0, maxTasks);
  const resultSets = [];
  for (const task of selected) {
    resultSets.push(await executeCrawlerTask(task, { ...options, enableNetwork, fetchFn }));
  }
  return {
    status: resultSets.some((set) => set.status === "ERROR") ? "PARTIAL" : "PASS",
    mode: enableNetwork ? "custom_crawler_public_execution" : "custom_crawler_dry_run",
    paid_spend_incurred: false,
    remote_mutation: false,
    result_set_count: resultSets.length,
    candidate_count: resultSets.reduce((sum, set) => sum + (set.candidates?.length || 0), 0),
    result_sets: resultSets
  };
}

export async function executeCrawlerTask(task = {}, options = {}) {
  if (!options.enableNetwork) {
    return {
      source_id: task.source_id,
      task_id: task.task_id,
      status: "DRY_RUN",
      robots: { status: "not_checked", allowed: null },
      candidates: [candidateFromTask(task, {
        snippet: "Crawler dry run. Fetch the public page and store a receipt before evidence use.",
        content_hash: null,
        fetched_at: null,
        needs_browser: false
      })],
      evidence_promotion_allowed: false,
      public_safe: true
    };
  }

  const robots = await checkRobots(task.url, options.fetchFn);
  if (robots.allowed === false) {
    return {
      source_id: task.source_id,
      task_id: task.task_id,
      status: "BLOCKED_BY_ROBOTS",
      robots,
      candidates: [candidateFromTask(task, {
        snippet: "Robots metadata blocked this crawler path. Use browser/manual public-record review instead.",
        content_hash: null,
        fetched_at: new Date().toISOString(),
        needs_browser: true,
        error: "blocked_by_robots"
      })],
      evidence_promotion_allowed: false,
      public_safe: true
    };
  }

  try {
    const response = await options.fetchFn(task.url, {
      headers: { "user-agent": DEFAULT_USER_AGENT, accept: "text/html,text/plain,*/*;q=0.5" },
      redirect: "follow",
      signal: AbortSignal.timeout(Math.max(1000, Math.min(Number(options.timeoutMs || 12000), 30000)))
    });
    const text = await boundedText(response, Math.max(10000, Math.min(Number(options.maxBytes || 220000), 750000)));
    const contentHash = sha256(text);
    return {
      source_id: task.source_id,
      task_id: task.task_id,
      status: response.ok ? "PASS" : "ERROR",
      http_status: response.status,
      robots,
      content_hash: contentHash,
      candidates: [candidateFromTask(task, {
        snippet: compact(text).slice(0, 1200) || `${task.title} fetched with empty body.`,
        content_hash: contentHash,
        fetched_at: new Date().toISOString(),
        needs_browser: false
      })],
      evidence_promotion_allowed: false,
      public_safe: true
    };
  } catch (error) {
    return {
      source_id: task.source_id,
      task_id: task.task_id,
      status: "ERROR",
      robots,
      error: error.message,
      candidates: [candidateFromTask(task, {
        snippet: `Crawler failed to fetch this public page: ${error.message}`,
        content_hash: null,
        fetched_at: new Date().toISOString(),
        needs_browser: true,
        error: error.message
      })],
      evidence_promotion_allowed: false,
      public_safe: true
    };
  }
}

export function validateCrawlerExecution(result) {
  const issues = [];
  if (!result || typeof result !== "object") return ["crawler result must be an object"];
  if (result.paid_spend_incurred !== false) issues.push("crawler must not incur spend");
  if (result.remote_mutation !== false) issues.push("crawler must not mutate remote systems");
  for (const set of result.result_sets || []) {
    if (!set.robots) issues.push(`${set.source_id || "crawler"} missing robots metadata`);
    if (set.evidence_promotion_allowed !== false) issues.push(`${set.source_id || "crawler"} must not promote evidence`);
    for (const candidate of set.candidates || []) {
      if (candidate.evidence_promotion_allowed !== false || candidate.evidence_id !== null) issues.push(`${candidate.candidate_id} escaped candidate gate`);
      if (candidate.receipt_required !== true) issues.push(`${candidate.candidate_id} must require receipt`);
      if (candidate.labels?.includes("needs_browser") && !candidate.browser_capture_fallback) issues.push(`${candidate.candidate_id} missing browser fallback plan`);
    }
  }
  return issues;
}

async function checkRobots(url, fetchFn) {
  const parsed = new URL(url);
  const robotsUrl = `${parsed.origin}/robots.txt`;
  try {
    const response = await fetchFn(robotsUrl, {
      headers: { "user-agent": DEFAULT_USER_AGENT, accept: "text/plain,*/*;q=0.5" },
      signal: AbortSignal.timeout(5000)
    });
    const text = await response.text();
    const disallowedAll = /user-agent:\s*\*[\s\S]*?disallow:\s*\/(?:\s|$)/i.test(text);
    return {
      status: response.ok ? "checked" : "unavailable",
      robots_url: robotsUrl,
      allowed: response.ok ? !disallowedAll : true,
      fetched_at: new Date().toISOString()
    };
  } catch (error) {
    return { status: "unavailable", robots_url: robotsUrl, allowed: true, error: error.message };
  }
}

function candidateFromTask(task, meta) {
  const fallback = meta.needs_browser ? buildBrowserCaptureFallback({
    source_id: task.source_id,
    candidate_id: `${task.task_id}_candidate`,
    url: task.url,
    title: task.title,
    reason: meta.error || "custom_crawler_needs_browser"
  }) : null;
  return {
    candidate_id: `${task.task_id}_candidate`,
    provider: "Custom crawler",
    provider_id: task.source_id,
    source_family: task.source_family || "official_host_page",
    url: task.url,
    title: task.title,
    snippet: meta.snippet,
    content_hash: meta.content_hash,
    fetched_at: meta.fetched_at,
    labels: meta.needs_browser ? ["needs_browser", "candidate_only"] : ["fetched", "candidate_only"],
    browser_capture_fallback: fallback,
    evidence_id: null,
    evidence_promotion_allowed: false,
    candidate_only_until_receipted: true,
    receipt_required: true,
    public_safe: true
  };
}

async function boundedText(response, maxBytes) {
  const text = await response.text();
  return text.length > maxBytes ? text.slice(0, maxBytes) : text;
}

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}
