import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { answerCaseQuestion, extractGatewayToken, investigateCase } from "../lib/aculeus-case-qa.js";
import { createInvestigationRun, getInvestigationRun } from "../lib/aculeus-investigation-runner.js";
import { createFileRunStore } from "../lib/aculeus-run-store.js";
import { createFileReceiptStore } from "../lib/aculeus-receipt-store.js";
import { fetchPublicReceipt } from "../lib/aculeus-receipt-fetcher.js";
import { verifyReceiptCitation } from "../lib/aculeus-citation-verifier.js";
import { reviewCandidatePromotion, reviewCandidateRejection } from "../lib/aculeus-reviewer-actions.js";

const root = process.cwd();
const port = Number(process.env.PORT || 4280);
const investigationRunStore = createFileRunStore(process.env.ACULEUS_RUN_STORE_DIR || join(root, ".local", "investigation-runs"));
const receiptStore = createFileReceiptStore(process.env.ACULEUS_RECEIPT_STORE_DIR || join(root, ".local", "receipts"));

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function handleApi(request, response, pathname) {
  if (pathname === "/api/demo-case" && request.method === "GET") {
    const library = JSON.parse(readFileSync(join(root, "data", "demo-case.json"), "utf8"));
    const caseId = new URL(request.url || "/api/demo-case", "http://localhost").searchParams.get("caseId") || library.defaultCaseId;
    const demoCase = library.cases.find((casePacket) => casePacket.caseId === caseId)
      || library.cases.find((casePacket) => casePacket.caseId === library.defaultCaseId)
      || library.cases[0];
    sendJson(response, {
      ok: true,
      mode: "local-demo",
      defaultCaseId: library.defaultCaseId,
      cases: library.cases.map(({ caseId: id, displayId, title, headline, caseType, caseScope }) => ({
        caseId: id,
        displayId,
        title,
        headline,
        caseType,
        caseScope
      })),
      case: demoCase
    });
    return true;
  }

  if (pathname === "/api/source-fed-case-board" && request.method === "GET") {
    const library = JSON.parse(readFileSync(join(root, "data", "source-fed-case-board.json"), "utf8"));
    sendJson(response, {
      ok: true,
      mode: "source_fed_case_board",
      ...library
    });
    return true;
  }

  if (pathname === "/api/investigation-runs" && request.method === "POST") {
    const payload = await readRequestBody(request);
    const library = JSON.parse(readFileSync(join(root, "data", "source-fed-case-board.json"), "utf8"));
    sendJson(response, createInvestigationRun(payload, library, { store: investigationRunStore }), 202);
    return true;
  }

  if (pathname.startsWith("/api/investigation-runs/") && request.method === "GET") {
    const library = JSON.parse(readFileSync(join(root, "data", "source-fed-case-board.json"), "utf8"));
    const runId = pathname.split("/").filter(Boolean).pop();
    const result = getInvestigationRun(runId, library, { store: investigationRunStore });
    sendJson(response, result, result.ok ? 200 : 404);
    return true;
  }

  if (pathname === "/api/receipt-fetch" && request.method === "POST") {
    const payload = await readRequestBody(request);
    const candidate = payload.candidate || {
      candidate_id: payload.candidate_id || payload.source_id,
      url: payload.url,
      title: payload.title,
      source_family: payload.source_family,
      promotion_status: "candidate_lead_not_evidence",
      evidence_id: null
    };
    const receipt = await fetchPublicReceipt({
      sourceId: candidate.candidate_id || candidate.source_id,
      url: candidate.url || payload.url,
      max_bytes: payload.max_bytes
    }, { store: receiptStore, maxBytes: payload.max_bytes });
    const stored = receiptStore.getReceipt(receipt.receipt_id);
    const verifier = verifyReceiptCitation({
      candidate,
      receipt: stored,
      receiptText: stored?.raw_text,
      quote: payload.quote || payload.quoted_text,
      claim: payload.claim,
      adjudicative_source: payload.adjudicative_source === true
    });
    sendJson(response, {
      ok: true,
      mode: "receipt_fetch_and_citation_verify",
      receipt,
      verifier
    });
    return true;
  }

  if (pathname === "/api/reviewer-actions" && request.method === "POST") {
    const payload = await readRequestBody(request);
    const action = String(payload.action || "promote_candidate_source");
    if (action === "reject_candidate_source") {
      sendJson(response, reviewCandidateRejection(payload));
      return true;
    }
    const receipt = payload.receipt || receiptStore.getReceipt(payload.receipt_id);
    if (!receipt) {
      sendJson(response, {
        ok: true,
        action: "promote_candidate_source",
        status: "blocked",
        reason: "receipt_not_found",
        finding_promotion_allowed: false,
        high_risk_finding_blocked: true,
        evidence_record: null,
        verifier: {
          ok: false,
          issues: [{
            severity: "blocking",
            issue_type: "receipt_not_found",
            message: "Receipt must exist before reviewer promotion.",
            suggested_action: "Fetch and store the public receipt first.",
            status: "open"
          }]
        },
        public_safe: true
      });
      return true;
    }
    sendJson(response, reviewCandidatePromotion({
      ...payload,
      receipt,
      receiptText: receipt.raw_text
    }));
    return true;
  }

  if (pathname === "/api/investigate" && request.method === "POST") {
    const payload = await readRequestBody(request);
    const library = JSON.parse(readFileSync(join(root, "data", "demo-case.json"), "utf8"));
    const caseId = payload.caseId || library.defaultCaseId;
    const demoCase = library.cases.find((casePacket) => casePacket.caseId === caseId)
      || library.cases.find((casePacket) => casePacket.caseId === library.defaultCaseId)
      || library.cases[0];
    const investigatedCase = await investigateCase({
      baseCase: demoCase,
      lead: payload.lead,
      gatewayAuthToken: extractGatewayToken(request)
    });
    sendJson(response, {
      ok: true,
      mode: investigatedCase.responseMode,
      modelReady: investigatedCase.model.mode === "live_model_configured" || investigatedCase.model.mode === "live_model",
      case: investigatedCase
    });
    return true;
  }

  if (pathname === "/api/case-question" && request.method === "POST") {
    const payload = await readRequestBody(request);
    const library = JSON.parse(readFileSync(join(root, "data", "demo-case.json"), "utf8"));
    const demoCase = library.cases.find((casePacket) => casePacket.caseId === library.defaultCaseId) || library.cases[0];
    const casePacket = payload.case && typeof payload.case === "object" ? payload.case : demoCase;
    const result = await answerCaseQuestion({
      question: payload.question,
      casePacket,
      gatewayAuthToken: extractGatewayToken(request)
    });
    sendJson(response, result, result.ok ? 200 : 400);
    return true;
  }

  if (pathname === "/api/signup" && request.method === "POST") {
    const payload = await readRequestBody(request);
    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim();
    const organization = String(payload.organization || "").trim();
    const useCase = String(payload.useCase || "").trim();
    if (!name || !email || !organization || !useCase || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendJson(response, {
        ok: false,
        mode: "validation_error",
        message: "Name, work email, organization, and first lead are required."
      }, 400);
      return true;
    }
    sendJson(response, {
      ok: true,
      mode: "local-demo",
      requestId: `aculeus-access-${Date.now()}`,
      account: {
        name,
        email,
        organization,
        useCase
      },
      message: "Access request received."
    });
    return true;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(response, { error: "Not found" }, 404);
    return true;
  }

  return false;
}

function resolveSafe(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const requested = pathname === "/" ? "/index.html" : pathname;
  let filePath = normalize(join(root, requested));
  let resolved = resolve(filePath);
  if (resolved.startsWith(resolve(root)) && existsSync(resolved) && statSync(resolved).isDirectory()) {
    filePath = join(resolved, "index.html");
    resolved = resolve(filePath);
  }
  if (resolved.startsWith(resolve(root)) && !existsSync(resolved) && !extname(resolved)) {
    filePath = `${resolved}.html`;
    resolved = resolve(filePath);
  }
  if (!resolved.startsWith(resolve(root))) return null;
  return resolved;
}

createServer((request, response) => {
  const parsedUrl = new URL(request.url || "/", "http://localhost");
  handleApi(request, response, parsedUrl.pathname).then((handled) => {
    if (handled) return;

    const filePath = resolveSafe(request.url || "/");
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mime[extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store"
  });
  createReadStream(filePath).pipe(response);
  }).catch((error) => {
    sendJson(response, { error: error.message }, 500);
  });
}).listen(port, () => {
  console.log(`Aculeus SLM frontend running at http://localhost:${port}`);
});
