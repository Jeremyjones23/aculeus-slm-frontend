import { buildAnswerBriefFromCase, buildRunCheckpoints, getSeedCase } from "./aculeus-product-data.js";

export async function createAculeusRun({ lead, caseId, userId = "local-operator", caseRecord = null } = {}) {
  const casePacket = caseRecord ? {
    caseId: caseRecord.caseId || caseRecord.id || caseId,
    title: caseRecord.title || lead || "Untitled Aculeus case",
    lead: caseRecord.lead || lead || caseRecord.title,
    jurisdiction: caseRecord.jurisdiction,
    summary: caseRecord.summary || caseRecord.lead || lead,
    claims: [],
    sources: [],
    nextRecords: [{
      recordId: "missing_public_records",
      priority: "needed",
      holder: caseRecord.jurisdiction || "Record custodian",
      request: "Open official records, provider candidates, and receipt-backed source material before promoting findings.",
      reason: "Canonical case runs begin as candidate-only until evidence receipts and verifier gates pass."
    }]
  } : getSeedCase(caseId);
  const brief = buildAnswerBriefFromCase(casePacket);
  const now = new Date().toISOString();

  return {
    runId: `run_${Date.now()}`,
    caseId: brief.caseId,
    userId,
    status: "review",
    lead: lead || casePacket?.lead || brief.title,
    checkpoints: buildRunCheckpoints(),
    answerBrief: brief,
    createdAt: now,
    updatedAt: now,
    adapter: {
      name: "AculeusRunAdapter",
      mode: process.env.ACULEUS_MODEL_ID ? "env_gated_model_ready" : "deterministic_source_fed",
      modelId: process.env.ACULEUS_MODEL_ID || "local-source-fed-adapter",
      rawChatExposed: false
    }
  };
}

export async function answerFollowUp({ question, activeRun } = {}) {
  const brief = activeRun?.answerBrief || buildAnswerBriefFromCase(getSeedCase(activeRun?.caseId));
  const q = String(question || "").toLowerCase();
  const sourceFocused = q.includes("source") || q.includes("cite") || q.includes("citation") || q.includes("proof");
  const missingFocused = q.includes("missing") || q.includes("next") || q.includes("request");

  if (sourceFocused) {
    return {
      supportLevel: "supported",
      answer: "The strongest points are tied to the citation list below. Open each citation to inspect the exact public URL or private artifact location Aculeus used.",
      citationIds: brief.citations.slice(0, 4).map((citation) => citation.citationId),
      missingRecords: brief.missing,
      safeNextMove: "Open the top citation, verify the excerpt, then ask Aculeus to tighten the finding around that source."
    };
  }

  if (missingFocused) {
    return {
      supportLevel: "needs_more_records",
      answer: "The case gets stronger when the missing records are opened. The next best move is to request the highest-priority custodian record and rerun the brief when it lands.",
      citationIds: [],
      missingRecords: brief.missing,
      safeNextMove: brief.nextMove
    };
  }

  return {
    supportLevel: "case_bound_answer",
    answer: "Aculeus can tighten this, but the answer should stay inside the current source trail. Use one of the suggested moves or ask for a narrower claim.",
    citationIds: brief.citations.slice(0, 2).map((citation) => citation.citationId),
    missingRecords: brief.missing.slice(0, 2),
    safeNextMove: "Ask for the single strongest source-backed claim."
  };
}
