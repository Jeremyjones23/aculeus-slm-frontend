import {
  browserCaptureLedgerEntry,
  capturePublicPageWithBrowserbase,
  createBrowserbaseSession
} from "../lib/aculeus-browserbase-capture.js";

const calls = [];
const fakeSession = {
  id: "bb_session_verify",
  status: "RUNNING",
  connectUrl: "wss://connect.browserbase.example/session",
  signingKey: "must_not_leak"
};

const session = await createBrowserbaseSession({
  apiKey: "bb_test_secret",
  projectId: "project_verify",
  userMetadata: { system: "aculeus" },
  fetchFn: async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(fakeSession), { status: 201, headers: { "content-type": "application/json" } });
  }
});
if (session.id !== fakeSession.id) throw new Error("Browserbase session helper did not parse session");
if (!calls[0]?.init?.headers?.["x-bb-api-key"]) throw new Error("Browserbase session helper did not send API key header");

const capture = await capturePublicPageWithBrowserbase({
  run_id: "run_browserbase_verify",
  case_id: "case_browserbase_verify",
  candidate_id: "candidate_browserbase_verify",
  source_id: "source_browserbase_verify",
  url: "https://example.com/public-record",
  title: "Browserbase public record"
}, {
  apiKey: "bb_test_secret",
  projectId: "project_verify",
  fetchFn: async () => new Response(JSON.stringify(fakeSession), { status: 201, headers: { "content-type": "application/json" } }),
  connectOverCdp: async (connectUrl) => {
    if (connectUrl !== fakeSession.connectUrl) throw new Error("connectOverCDP did not receive Browserbase connectUrl");
    return fakeBrowser();
  }
});

const failures = [];
if (capture.status !== "captured") failures.push("capture did not return captured status");
if (capture.browserbase_session_id !== fakeSession.id) failures.push("capture missing session id");
if (!capture.excerpt_sha256 || !capture.screenshot_sha256 || !capture.receipt_hash) failures.push("capture missing receipt hashes");
if (capture.evidence_promotion_allowed !== false || capture.finding_promotion_allowed !== false || capture.evidence_id !== null) failures.push("capture escaped candidate-only gate");
if (JSON.stringify(capture).match(/bb_test_secret|connectUrl|signingKey|seleniumRemoteUrl|raw_text/i)) failures.push("capture leaked blocked raw or secret fields");

const ledgerEntry = browserCaptureLedgerEntry(capture, { run_id: "run_browserbase_verify", case_id: "case_browserbase_verify", candidate_id: "candidate_browserbase_verify" });
if (ledgerEntry.entry_type !== "browser_capture") failures.push("browser capture ledger entry type mismatch");
if (!ledgerEntry.labels.includes("browserbase") || !ledgerEntry.labels.includes("candidate_only")) failures.push("browser capture ledger labels missing");
if (ledgerEntry.evidence_promotion_allowed !== false || ledgerEntry.finding_promotion_allowed !== false) failures.push("browser capture ledger escaped promotion gates");

const missingKey = await capturePublicPageWithBrowserbase({ url: "https://example.com", candidate_id: "missing_key" }, { apiKey: "" });
if (missingKey.status !== "needs_browser" || missingKey.evidence_promotion_allowed !== false) failures.push("missing Browserbase key fallback invalid");

if (failures.length) {
  console.error(`Browserbase capture verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("Browserbase capture verification passed.");

function fakeBrowser() {
  const page = {
    async goto() {},
    async waitForLoadState() {},
    url: () => "https://example.com/public-record",
    title: async () => "Captured public record",
    locator: () => ({
      innerText: async () => "Visible public records text that should be hashed and excerpted for reviewer receipt capture."
    }),
    screenshot: async () => Buffer.from("fake_png_bytes")
  };
  const context = {
    pages: () => [page],
    newPage: async () => page
  };
  return {
    contexts: () => [context],
    close: async () => {}
  };
}
