import { createHash } from "node:crypto";

const BROWSERBASE_SESSIONS_URL = "https://api.browserbase.com/v1/sessions";
const BROWSERBASE_FETCH_URL = "https://api.browserbase.com/v1/fetch";

export async function capturePublicPageWithBrowserbase(input = {}, options = {}) {
  const url = validatePublicUrl(input.url);
  const apiKey = options.apiKey ?? process.env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    return buildUnavailableCapture(input, "browserbase_api_key_missing");
  }

  const fetchFn = options.fetchFn || fetch;
  const connectOverCdp = options.connectOverCdp || defaultConnectOverCdp;
  let browser = null;
  try {
    const session = await createBrowserbaseSession({
      fetchFn,
      apiKey,
      projectId: options.projectId ?? process.env.BROWSERBASE_PROJECT_ID,
      userMetadata: {
        system: "aculeus",
        run_id: input.run_id || input.runId || null,
        candidate_id: input.candidate_id || input.source_id || input.sourceId || null
      }
    });
    if (!session.connectUrl) {
      throw new Error("Browserbase session did not return connectUrl.");
    }
    browser = await connectOverCdp(session.connectUrl);
    const context = browser.contexts?.()[0] || await browser.newContext?.();
    const page = context.pages?.()[0] || await context.newPage?.();
    if (!page) throw new Error("Browserbase session did not expose a Playwright page.");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: options.timeoutMs || 45000 });
    if (typeof page.waitForLoadState === "function") {
      await page.waitForLoadState("networkidle", { timeout: options.networkIdleTimeoutMs || 8000 }).catch(() => null);
    }
    const finalUrl = typeof page.url === "function" ? page.url() : url;
    const title = typeof page.title === "function" ? await page.title().catch(() => "") : "";
    const visibleText = typeof page.locator === "function"
      ? await page.locator("body").innerText({ timeout: 5000 }).catch(() => "")
      : "";
    const screenshot = typeof page.screenshot === "function"
      ? await page.screenshot({ fullPage: false, type: "png", timeout: 10000 }).catch(() => null)
      : null;
    return publicBrowserCapture({
      input,
      session,
      url,
      finalUrl,
      title,
      visibleText,
      screenshot
    });
  } catch (error) {
    if (options.allowFetchFallback === false) throw error;
    return capturePublicPageWithBrowserbaseFetch(input, {
      fetchFn,
      apiKey,
      projectId: options.projectId ?? process.env.BROWSERBASE_PROJECT_ID,
      fallbackReason: error.message
    });
  } finally {
    await browser?.close?.().catch(() => null);
  }
}

export async function createBrowserbaseSession({ fetchFn = fetch, apiKey, projectId, userMetadata } = {}) {
  if (!apiKey) throw new Error("BROWSERBASE_API_KEY is required.");
  const body = {
    browserSettings: {
      viewport: { width: 1365, height: 900 }
    },
    userMetadata: stringMetadata(userMetadata)
  };
  if (projectId) body.projectId = projectId;
  const response = await fetchFn(BROWSERBASE_SESSIONS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-bb-api-key": apiKey
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  if (!response.ok) {
    throw new Error(`Browserbase session create failed with ${response.status}: ${json?.error || json?.message || "unknown_error"}`);
  }
  return json;
}

export async function capturePublicPageWithBrowserbaseFetch(input = {}, options = {}) {
  const url = validatePublicUrl(input.url);
  const apiKey = options.apiKey ?? process.env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    return buildUnavailableCapture(input, "browserbase_api_key_missing");
  }
  const response = await createBrowserbaseFetch({
    fetchFn: options.fetchFn || fetch,
    apiKey,
    projectId: options.projectId ?? process.env.BROWSERBASE_PROJECT_ID,
    url
  });
  const visibleText = compactExcerpt(response.content || response.text || response.body || "");
  return sanitizeCapture({
    ...publicBrowserCapture({
      input,
      session: {
        id: response.id || null,
        status: "FETCHED"
      },
      url,
      finalUrl: response.final_url || response.url || url,
      title: input.title || "Browserbase fetch capture",
      visibleText,
      screenshot: null
    }),
    provider: "Browserbase Fetch",
    browserbase_fetch_id: response.id || null,
    browserbase_fetch_status_code: response.statusCode || response.status_code || null,
    browserbase_fetch_content_type: response.contentType || response.content_type || null,
    fallback_reason: options.fallbackReason || null
  });
}

export async function createBrowserbaseFetch({ fetchFn = fetch, apiKey, projectId, url } = {}) {
  if (!apiKey) throw new Error("BROWSERBASE_API_KEY is required.");
  const body = { url };
  if (projectId) body.projectId = projectId;
  const response = await fetchFn(BROWSERBASE_FETCH_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-bb-api-key": apiKey
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { content: text };
  }
  if (!response.ok) {
    throw new Error(`Browserbase fetch failed with ${response.status}: ${json?.error || json?.message || "unknown_error"}`);
  }
  return json;
}

export function browserCaptureLedgerEntry(capture = {}, input = {}) {
  const status = capture.status === "captured" ? "browser_receipt_captured" : "needs_browser";
  return {
    ledger_entry_id: `browser_capture_${Date.now()}`,
    entry_type: "browser_capture",
    run_id: input.run_id || input.runId || capture.run_id || null,
    case_id: input.case_id || input.caseId || capture.case_id || null,
    status,
    labels: [
      status === "browser_receipt_captured" ? "fetched" : "blocked",
      "browserbase",
      "receipt",
      "candidate_only",
      "locator_only"
    ],
    candidate_id: input.candidate_id || input.source_id || capture.candidate_id || null,
    capture,
    evidence_promotion_allowed: false,
    finding_promotion_allowed: false,
    public_safe: true
  };
}

function publicBrowserCapture({ input, session, url, finalUrl, title, visibleText, screenshot }) {
  const excerpt = compactExcerpt(visibleText);
  const screenshotBuffer = Buffer.isBuffer(screenshot) ? screenshot : screenshot ? Buffer.from(screenshot) : null;
  return sanitizeCapture({
    capture_id: `bb_capture_${safeId(input.candidate_id || input.source_id || input.sourceId || "source")}_${Date.now()}`,
    provider: "Browserbase",
    status: "captured",
    source_id: input.source_id || input.sourceId || null,
    candidate_id: input.candidate_id || input.source_id || input.sourceId || null,
    url,
    final_url: finalUrl || url,
    title: title || input.title || "Browser capture",
    excerpt,
    excerpt_sha256: excerpt ? sha256(excerpt) : null,
    screenshot_sha256: screenshotBuffer ? sha256(screenshotBuffer) : null,
    browserbase_session_id: session.id || null,
    browserbase_status: session.status || null,
    receipt_hash: sha256([finalUrl || url, title || "", excerpt || "", screenshotBuffer ? sha256(screenshotBuffer) : ""].join("\n")),
    evidence_id: null,
    evidence_promotion_allowed: false,
    finding_promotion_allowed: false,
    public_safe: true,
    captured_at: new Date().toISOString()
  });
}

function buildUnavailableCapture(input, reason) {
  return sanitizeCapture({
    capture_id: `bb_capture_${safeId(input.candidate_id || input.source_id || input.sourceId || "source")}_${Date.now()}`,
    provider: "Browserbase",
    status: "needs_browser",
    source_id: input.source_id || input.sourceId || null,
    candidate_id: input.candidate_id || input.source_id || input.sourceId || null,
    url: input.url || "",
    title: input.title || "Browser capture required",
    reason,
    evidence_id: null,
    evidence_promotion_allowed: false,
    finding_promotion_allowed: false,
    public_safe: true
  });
}

async function defaultConnectOverCdp(connectUrl) {
  const { chromium } = await import("playwright-core");
  return chromium.connectOverCDP(connectUrl);
}

function validatePublicUrl(value) {
  const url = new URL(String(value || ""));
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Browser capture URL must use http or https.");
  return url.toString();
}

function compactExcerpt(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 1200);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeId(value) {
  return String(value || "source").replace(/[^a-zA-Z0-9_.:-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "source";
}

function sanitizeCapture(value) {
  return JSON.parse(JSON.stringify(value, (key, child) => {
    if (/api[_-]?key|authorization|secret|token|raw_text|rawText|request_headers|connectUrl|signingKey|seleniumRemoteUrl/i.test(key)) return undefined;
    if (typeof child === "string" && child.length > 1600) return `${child.slice(0, 1600)}...`;
    return child;
  }));
}

function stringMetadata(value = {}) {
  return Object.fromEntries(
    Object.entries(value || {})
      .filter(([, child]) => child !== null && child !== undefined && child !== "")
      .map(([key, child]) => [key, String(child)])
  );
}
