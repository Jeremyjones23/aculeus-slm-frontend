export function buildBrowserCaptureFallback(input = {}) {
  const url = String(input.url || "").trim();
  const sourceId = safeId(input.source_id || input.sourceId || input.candidate_id || "source");
  const reason = String(input.reason || input.error || "fetch_blocked_or_dynamic_page").slice(0, 600);
  return {
    fallback_id: `browser_capture_${sourceId}_${Date.now()}`,
    mode: "browserbase_or_manual_public_capture",
    source_id: sourceId,
    candidate_id: input.candidate_id || input.source_id || null,
    url,
    title: input.title || "Browser capture required",
    status: "needs_browser",
    reason,
    provider: "Browserbase/custom crawler fallback",
    labels: ["needs_browser", "locator_only", "receipt_required", "candidate_only"],
    browserbase_ready: Boolean(process.env.BROWSERBASE_API_KEY || process.env.BROWSERBASE_PROJECT_ID),
    automation_plan: [
      "Open the public URL in a fresh browser context.",
      "Capture the final URL, response screenshot, page title, and visible excerpt.",
      "Store the receipt hash before reviewer source promotion.",
      "Keep the item as locator-only if the page requires login, private data, or non-public access."
    ],
    evidence_id: null,
    evidence_promotion_allowed: false,
    finding_promotion_allowed: false,
    public_safe: true
  };
}

export function browserFallbackLedgerEntry(input = {}) {
  const fallback = buildBrowserCaptureFallback(input);
  return {
    ledger_entry_id: `browser_fallback_${Date.now()}`,
    entry_type: "browser_capture_fallback",
    run_id: input.run_id || input.runId || null,
    case_id: input.case_id || input.caseId || null,
    status: "needs_browser",
    labels: fallback.labels,
    candidate_id: fallback.candidate_id,
    fallback,
    public_safe: true
  };
}

function safeId(value) {
  return String(value || "source").replace(/[^a-zA-Z0-9_.:-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "source";
}
