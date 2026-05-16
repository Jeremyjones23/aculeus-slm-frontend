import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const boardPath = join(process.cwd(), "data", "source-fed-case-board.json");
let boardCache = null;

export function loadSourceFedBoard() {
  return getBoardSnapshot().board;
}

export function getSeedCase(caseId) {
  const { board, cases, caseById } = getBoardSnapshot();
  return caseById.get(caseId)
    || caseById.get(board.defaultCaseId)
    || cases[0]
    || null;
}

export function listRecentCaseSeeds() {
  const { cases } = getBoardSnapshot();
  return cases.map((item) => ({
    caseId: item.caseId,
    displayId: item.displayId,
    title: cleanTitle(item.title),
    jurisdiction: item.jurisdiction || "Public records",
    status: item.reviewStatus || "review",
    score: item.caseScore || null,
    sourceCount: Array.isArray(item.sources) ? item.sources.length : 0,
    missingCount: Array.isArray(item.nextRecords) ? item.nextRecords.length : 0
  }));
}

export function buildAnswerBriefFromCase(casePacket) {
  const claims = Array.isArray(casePacket?.claims) ? casePacket.claims : [];
  const sources = Array.isArray(casePacket?.sources) ? casePacket.sources : [];
  const nextRecords = Array.isArray(casePacket?.nextRecords) ? casePacket.nextRecords : [];
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const strongestClaims = claims
    .filter((claim) => Array.isArray(claim.sourceIds) && claim.sourceIds.length > 0)
    .slice(0, 4);

  const citations = [];
  const citationIdsByClaim = new Map();
  strongestClaims.forEach((claim, claimIndex) => {
    const claimCitationIds = [];
    claim.sourceIds.slice(0, 2).forEach((sourceId, sourceIndex) => {
      const source = sourceById.get(sourceId);
      const citation = {
        citationId: `cite_${claimIndex + 1}_${sourceIndex + 1}`,
        claimTitle: claim.title || `Finding ${claimIndex + 1}`,
        sourceId,
        title: source?.title || sourceId,
        publisher: source?.publisher || "Source",
        url: source?.url || null,
        artifactPath: source?.artifactPath || null,
        location: source?.pageNumber ? `Page ${source.pageNumber}` : "Exact source location stored in case packet",
        excerpt: source?.quotedExcerpt || source?.excerpt || claim.body || "",
        supportLevel: source?.supportLevel || claim.state || "supported",
        limitation: source?.limitation || "Supports the cited point only."
      };
      citations.push(citation);
      claimCitationIds.push(citation.citationId);
    });
    citationIdsByClaim.set(claim, claimCitationIds);
  });

  return {
    caseId: casePacket?.caseId || "case",
    title: cleanTitle(casePacket?.title || "Untitled case"),
    eyebrow: "Aculeus answer brief",
    bottomLine: casePacket?.dossier?.shortFinding || casePacket?.summary || "Aculeus opened the source trail and found the review path.",
    whyItMatters: casePacket?.dossier?.deck || "This shows where the operator should focus next before making stronger claims.",
    support: strongestClaims.map((claim, index) => ({
      id: `support_${index + 1}`,
      title: sentenceCase(claim.title || `Finding ${index + 1}`),
      body: claim.body,
      confidence: claim.confidence ?? null,
      citationIds: citationIdsByClaim.get(claim) || []
    })),
    missing: nextRecords.slice(0, 4).map((record, index) => ({
      id: record.recordId || `missing_${index + 1}`,
      priority: record.priority || "needed",
      holder: record.holder || "Record custodian",
      request: record.request || "Request the missing record.",
      reason: record.reason || "Needed before stronger conclusions."
    })),
    nextMove: nextRecords[0]?.request || "Ask Aculeus to tighten the finding or draft the next source request.",
    suggestedNextMoves: [
      "Tighten this to the strongest source-backed claim.",
      "Show the exact citations behind the bottom line.",
      "What record would change the answer?",
      "Draft the next request for the missing source."
    ],
    citations
  };
}

export function buildRunCheckpoints() {
  return [
    { state: "planning", label: "Planning", detail: "Aculeus turns the question into controlled retrieval tasks." },
    { state: "retrieving", label: "Retrieving", detail: "Official APIs and providers create candidate leads." },
    { state: "verifying", label: "Verifying", detail: "Candidate rows are checked before reviewer promotion." },
    { state: "ready", label: "Ready", detail: "The case board shows ledger, candidates, gaps, and next moves." },
    { state: "insufficient", label: "Insufficient", detail: "More records are needed before stronger findings." }
  ];
}

function getBoardSnapshot() {
  const mtimeMs = statSync(boardPath).mtimeMs;
  if (boardCache?.mtimeMs === mtimeMs) return boardCache;

  const board = JSON.parse(readFileSync(boardPath, "utf8"));
  const cases = Array.isArray(board.cases) ? board.cases : [];
  boardCache = {
    mtimeMs,
    board,
    cases,
    caseById: new Map(cases.map((item) => [item.caseId, item]))
  };
  return boardCache;
}

function cleanTitle(value) {
  return String(value || "")
    .replace(/\bwhere the fraud, waste, and abuse is\b/gi, "system review")
    .replace(/\bwhere the fraud is\b/gi, "program review")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceCase(value) {
  const clean = String(value || "").replace(/[_-]+/g, " ").trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}
