import { callProvider, providerConfigured } from "./aculeus-providers.js";

const DEFAULT_MODEL_ID = "deepseek/deepseek-chat";
const SUPPORT_LEVELS = new Set(["supported", "partially_supported", "unsupported"]);

export function readJsonRequest(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
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

export function buildInvestigatedCase(baseCase, lead = "", gatewayAuthToken = "") {
  const submittedLead = String(lead || baseCase.lead || "").slice(0, 640);
  return {
    ...structuredClone(baseCase),
    submittedLead,
    runId: `demo-run-${Date.now()}`,
    responseMode: "demo_fallback",
    model: {
      ...baseCase.model,
      version: configuredModelId(),
      mode: modelConfigured(gatewayAuthToken) ? "live_model_configured" : "demo_fallback",
      endpoint: "/api/investigate"
    }
  };
}

export function extractGatewayToken(request) {
  return request?.headers?.["x-vercel-oidc-token"]
    || request?.headers?.["X-Vercel-Oidc-Token"]
    || request?.headers?.["x-vercel-ai-gateway-token"]
    || "";
}

export async function investigateCase({ baseCase, lead, gatewayAuthToken = "" }) {
  const investigatedCase = buildInvestigatedCase(baseCase, lead, gatewayAuthToken);
  if (!modelConfigured(gatewayAuthToken)) return investigatedCase;

  try {
    const modelReview = await generateInvestigationReview(investigatedCase, gatewayAuthToken);
    return {
      ...investigatedCase,
      responseMode: "live_model",
      modelReview,
      model: {
        ...investigatedCase.model,
        mode: "live_model",
        endpoint: "/api/investigate"
      }
    };
  } catch {
    return {
      ...investigatedCase,
      responseMode: "guardrail_fallback",
      model: {
        ...investigatedCase.model,
        mode: "guardrail_fallback"
      }
    };
  }
}

export async function answerCaseQuestion({ question, casePacket, gatewayAuthToken = "" }) {
  const safeQuestion = String(question || "").trim().slice(0, 500);
  const safeCase = normalizeCasePacket(casePacket);

  if (!safeQuestion) {
    return {
      ok: false,
      mode: "validation_error",
      answer: fallbackAnswer("What is supported by this case?", safeCase)
    };
  }

  if (!modelConfigured(gatewayAuthToken)) {
    return {
      ok: true,
      mode: "demo_fallback",
      modelId: configuredModelId(),
      answer: fallbackAnswer(safeQuestion, safeCase)
    };
  }

  try {
    const answer = await generateModelAnswer(safeQuestion, safeCase, gatewayAuthToken);
    return {
      ok: true,
      mode: "live_model",
      modelId: configuredModelId(),
      answer
    };
  } catch {
    return {
      ok: true,
      mode: "guardrail_fallback",
      modelId: configuredModelId(),
      answer: fallbackAnswer(safeQuestion, safeCase)
    };
  }
}

// Direct providers authenticate from their own env keys; the per-request OIDC token
// that used to credential the gateway is no longer a model credential, so it is ignored.
function modelConfigured() {
  return providerConfigured(configuredModelId());
}

function configuredModelId() {
  return safeString(process.env.ACULEUS_MODEL_ID || DEFAULT_MODEL_ID).replace(/^["']|["']$/g, "") || DEFAULT_MODEL_ID;
}

function normalizeCasePacket(casePacket) {
  const sourceCase = casePacket && typeof casePacket === "object" ? casePacket : {};
  return {
    caseId: safeString(sourceCase.caseId || "sf_homelessness_system"),
    displayId: safeString(sourceCase.displayId || "SF-001"),
    title: safeString(sourceCase.title || ""),
    caseType: safeString(sourceCase.caseType || ""),
    caseScope: safeString(sourceCase.caseScope || ""),
    headline: safeString(sourceCase.headline || "A public-record case is open."),
    lead: safeString(sourceCase.submittedLead || sourceCase.lead || ""),
    summary: safeString(sourceCase.summary || ""),
    legalBoundary: safeString(sourceCase.legalBoundary || "The record supports a lead. Missing records decide the next move."),
    commandCenter: sourceCase.commandCenter && typeof sourceCase.commandCenter === "object" ? sourceCase.commandCenter : {},
    sourceFamilies: Array.isArray(sourceCase.sourceFamilies) ? sourceCase.sourceFamilies.map(safeString).slice(0, 16) : [],
    dossier: sourceCase.dossier && typeof sourceCase.dossier === "object" ? compactDossier(sourceCase.dossier) : null,
    claims: Array.isArray(sourceCase.claims) ? sourceCase.claims.map(compactClaim).slice(0, 12) : [],
    sources: Array.isArray(sourceCase.sources) ? sourceCase.sources.map(compactSource).slice(0, 16) : [],
    lanes: Array.isArray(sourceCase.lanes) ? sourceCase.lanes.map(compactLane).slice(0, 10) : [],
    anomalyMath: Array.isArray(sourceCase.anomalyMath) ? sourceCase.anomalyMath.map(compactAnomaly).slice(0, 8) : [],
    nextRecords: Array.isArray(sourceCase.nextRecords) ? sourceCase.nextRecords.map(compactNextRecord).slice(0, 8) : [],
    actions: sourceCase.actions && typeof sourceCase.actions === "object" ? {
      directMove: safeString(sourceCase.actions.directMove),
      requestLanguage: safeString(sourceCase.actions.requestLanguage),
      ifRefused: safeString(sourceCase.actions.ifRefused),
      coalitionPath: safeString(sourceCase.actions.coalitionPath)
    } : {}
  };
}

function compactDossier(dossier) {
  return {
    title: safeString(dossier.title),
    deck: safeString(dossier.deck),
    summary: safeString(dossier.summary),
    posture: safeString(dossier.posture),
    centralQuestion: safeString(dossier.centralQuestion),
    shortFinding: safeString(dossier.shortFinding),
    stats: Array.isArray(dossier.stats) ? dossier.stats.map((stat) => ({
      label: safeString(stat.label),
      value: safeString(stat.value),
      detail: safeString(stat.detail)
    })).slice(0, 8) : [],
    layers: Array.isArray(dossier.layers) ? dossier.layers.map((layer) => ({
      label: safeString(layer.label),
      title: safeString(layer.title),
      body: safeString(layer.body),
      sourceIds: Array.isArray(layer.sourceIds) ? layer.sourceIds.map(safeString).slice(0, 6) : []
    })).slice(0, 8) : [],
    findings: Array.isArray(dossier.findings) ? dossier.findings.map((finding) => ({
      findingId: safeString(finding.findingId),
      entity: safeString(finding.entity),
      signal: safeString(finding.signal),
      whatRecordSays: safeString(finding.whatRecordSays),
      whyItMatters: safeString(finding.whyItMatters),
      whatItDoesNotProve: safeString(finding.whatItDoesNotProve),
      nextRecord: safeString(finding.nextRecord),
      sourceFamily: safeString(finding.sourceFamily),
      sourceIds: Array.isArray(finding.sourceIds) ? finding.sourceIds.map(safeString).slice(0, 4) : []
    })).slice(0, 8) : [],
    claimLedger: Array.isArray(dossier.claimLedger) ? dossier.claimLedger.map((claim) => ({
      claim: safeString(claim.claim),
      support: safeString(claim.support),
      limitation: safeString(claim.limitation),
      nextRecord: safeString(claim.nextRecord),
      sourceIds: Array.isArray(claim.sourceIds) ? claim.sourceIds.map(safeString).slice(0, 6) : []
    })).slice(0, 8) : [],
    sourceMatrix: Array.isArray(dossier.sourceMatrix) ? dossier.sourceMatrix.map((row) => ({
      family: safeString(row.family),
      status: safeString(row.status),
      proves: safeString(row.proves),
      missing: safeString(row.missing)
    })).slice(0, 10) : [],
    followUpQuestions: Array.isArray(dossier.followUpQuestions) ? dossier.followUpQuestions.map(safeString).slice(0, 8) : [],
    nextMoves: Array.isArray(dossier.nextMoves) ? dossier.nextMoves.map(safeString).slice(0, 8) : []
  };
}

function compactClaim(claim) {
  return {
    title: safeString(claim.title),
    body: safeString(claim.body),
    state: safeString(claim.state),
    sourceIds: Array.isArray(claim.sourceIds) ? claim.sourceIds.map(safeString).slice(0, 4) : [],
    confidence: Number.isFinite(Number(claim.confidence)) ? Number(claim.confidence) : null
  };
}

function compactSource(source) {
  return {
    sourceId: safeString(source.sourceId),
    title: safeString(source.title),
    type: safeString(source.type),
    publisher: safeString(source.publisher),
    role: safeString(source.role),
    confidence: safeString(source.confidence),
    excerpt: safeString(source.excerpt),
    limitation: safeString(source.limitation)
  };
}

function compactAnomaly(anomaly) {
  return {
    label: safeString(anomaly.label),
    metric: safeString(anomaly.metric),
    observed: anomaly.observed,
    baseline: anomaly.baseline,
    calculation: safeString(anomaly.calculation),
    limitation: safeString(anomaly.limitation)
  };
}

function compactNextRecord(record) {
  return {
    priority: safeString(record.priority),
    recordId: safeString(record.recordId),
    holder: safeString(record.holder),
    request: safeString(record.request),
    reason: safeString(record.reason)
  };
}

function compactLane(lane) {
  return {
    laneId: safeString(lane.laneId),
    label: safeString(lane.label),
    headline: safeString(lane.headline),
    body: safeString(lane.body),
    sourceIds: Array.isArray(lane.sourceIds) ? lane.sourceIds.map(safeString).slice(0, 6) : []
  };
}

function safeString(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 1400);
}

function fallbackAnswer(question, casePacket) {
  const lower = question.toLowerCase();
  const sourceRefs = casePacket.sources.map((source) => source.sourceId || source.title).filter(Boolean).slice(0, 3);
  const missingRecords = casePacket.nextRecords.map((record) => record.request || record.recordId).filter(Boolean);
  const firstSource = casePacket.sources[0];
  const firstClaim = casePacket.claims[0];
  const nextRecord = casePacket.nextRecords[0];
  const dossier = casePacket.dossier;
  const dossierSourceRefs = dossier?.findings
    ?.flatMap((finding) => finding.sourceIds || [])
    .filter(Boolean)
    .slice(0, 5) || [];

  if (/\b(layer|layers|money|actor|actors|network|pipeline|intermediary|first|audit)\b/.test(lower) && dossier?.layers?.length) {
    const layers = dossier.layers
      .slice(0, 4)
      .map((layer) => `${layer.title} ${layer.body}`)
      .join(" ");
    return normalizeAnswer({
      answer: `${dossier.shortFinding || dossier.summary || casePacket.summary} Layers opened: ${layers}`,
      supportLevel: "supported",
      sourceRefs: dossier.layers.flatMap((layer) => layer.sourceIds || []).filter(Boolean).slice(0, 5),
      missingRecords: dossier.nextMoves?.length ? dossier.nextMoves : missingRecords,
      safeNextMove: dossier.nextMoves?.[0] || nextRecord?.request || "Open the strongest layer and request missing records."
    }, casePacket);
  }

  if (/\b(claim|claims|hold|holds|supported|limit|falsify|falsifies)\b/.test(lower) && dossier?.claimLedger?.length) {
    const claims = dossier.claimLedger
      .slice(0, 3)
      .map((claim) => `${claim.claim} Support: ${claim.support}. Limit: ${claim.limitation}. Next record: ${claim.nextRecord}.`)
      .join(" ");
    return normalizeAnswer({
      answer: claims,
      supportLevel: "supported",
      sourceRefs: dossier.claimLedger.flatMap((claim) => claim.sourceIds || []).filter(Boolean).slice(0, 5),
      missingRecords: dossier.claimLedger.map((claim) => claim.nextRecord).filter(Boolean).slice(0, 5),
      safeNextMove: dossier.claimLedger[0]?.nextRecord || nextRecord?.request || "Open the claim ledger and request the decisive record."
    }, casePacket);
  }

  if (/\b(fraud|illegal|intent|guilty|crime|criminal)\b/.test(lower)) {
    return normalizeAnswer({
      answer: `The record stops there. ${casePacket.legalBoundary}`,
      supportLevel: "unsupported",
      sourceRefs,
      missingRecords,
        safeNextMove: nextRecord?.request || casePacket.actions?.directMove || "Get the missing records before moving."
    }, casePacket);
  }

  if (/\b(missing|need|next|record|request|stronger)\b/.test(lower)) {
    return normalizeAnswer({
      answer: nextRecord
        ? `${nextRecord.request} ${nextRecord.reason || ""}`.trim()
        : "No missing record is listed. Demand source confirmation before moving.",
      supportLevel: "supported",
      sourceRefs,
      missingRecords,
      safeNextMove: nextRecord?.request || "Demand source confirmation before moving."
    }, casePacket);
  }

  if (/\b(dossier|finding|findings|entity|provider|receipt|gap|audit|notice|signal)\b/.test(lower) && dossier?.findings?.length) {
    const strongest = dossier.findings
      .slice(0, 3)
      .map((finding) => `${finding.entity}: ${finding.whatRecordSays}`)
      .join(" ");
    return normalizeAnswer({
      answer: `${dossier.shortFinding || dossier.summary || casePacket.summary} Strongest findings: ${strongest}`,
      supportLevel: "supported",
      sourceRefs: dossierSourceRefs.length ? dossierSourceRefs : sourceRefs,
      missingRecords: dossier.nextMoves?.length ? dossier.nextMoves : missingRecords,
      safeNextMove: dossier.nextMoves?.[0] || nextRecord?.request || "Open the source trail and request missing records."
    }, casePacket);
  }

  if (/\b(source|support|supports|evidence|inspect|trail|where)\b/.test(lower)) {
    return normalizeAnswer({
      answer: firstSource
        ? `Start with ${firstSource.title}. It carries the lead. Its limit is: ${firstSource.limitation}`
        : "No source trail item answers that question.",
      supportLevel: firstSource ? "supported" : "unsupported",
      sourceRefs,
      missingRecords,
      safeNextMove: nextRecord?.request || "Open the source trail before moving."
    }, casePacket);
  }

  if (/\b(why|suspicious|pattern|anomaly|flag)\b/.test(lower)) {
    const anomaly = casePacket.anomalyMath[0];
    return normalizeAnswer({
      answer: anomaly
        ? `The signal is hot because ${anomaly.calculation}. The proof line still matters: ${anomaly.limitation}`
        : firstClaim?.body || "The signal is real. The missing record decides the next move.",
      supportLevel: "partially_supported",
      sourceRefs,
      missingRecords,
      safeNextMove: nextRecord?.request || "Inspect the source trail and request missing records."
    }, casePacket);
  }

  return normalizeAnswer({
    answer: firstClaim
      ? `${firstClaim.body} ${casePacket.legalBoundary}`
      : `The signal is real. ${casePacket.legalBoundary}`,
    supportLevel: "partially_supported",
    sourceRefs,
    missingRecords,
    safeNextMove: nextRecord?.request || "Stay inside the source trail and request missing records."
  }, casePacket);
}

async function generateModelAnswer(question, casePacket) {
  const text = await callProvider({
    model: configuredModelId(),
    messages: [
        {
          role: "system",
          content: [
            "You are the Aculeus source-locked Q&A engine.",
            "Answer only from the provided case_packet.",
            "Do not use model memory, outside facts, vector similarity, or speculation as evidence.",
            "If the case packet does not support an answer, say so.",
            "Never claim fraud, intent, guilt, illegality, or final findings unless the case_packet explicitly says so.",
            "Do not expose internal identifiers such as findingId, sourceId, caseId, JSON key names, or adapter metadata in the answer text.",
            "Return only JSON with keys: answer, supportLevel, sourceRefs, missingRecords, safeNextMove.",
            "supportLevel must be one of supported, partially_supported, unsupported.",
            "Do not include markdown, reasoning text, provider metadata, or raw source bodies."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({ question, case_packet: casePacket })
        }
    ]
  });
  return normalizeAnswer(parseJsonObject(text), casePacket);
}

async function generateInvestigationReview(casePacket) {
  const text = await callProvider({
    model: configuredModelId(),
    messages: [
        {
          role: "system",
          content: [
            "You are the Aculeus demo investigation adapter.",
            "Review only the provided case packet and submitted lead.",
            "Return only JSON with keys: summary, supportLevel, safeNextMove.",
            "Do not make final findings, fraud claims, or intent claims.",
            "Do not include markdown, reasoning text, provider metadata, or raw source bodies."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({ case_packet: normalizeCasePacket(casePacket) })
        }
    ]
  });
  const parsed = parseJsonObject(text);
  const supportLevel = SUPPORT_LEVELS.has(parsed.supportLevel) ? parsed.supportLevel : "partially_supported";
  return {
    summary: safeString(parsed.summary) || "The model reviewed the record and kept the proof line tight.",
    supportLevel,
    safeNextMove: safeString(parsed.safeNextMove) || casePacket.nextRecords?.[0]?.request || "Stay inside the source trail."
  };
}

function parseJsonObject(text) {
  const raw = String(text || "").trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model response");
  return JSON.parse(raw.slice(start, end + 1));
}

function brandAnswer(value) {
  return String(value || "")
    .replace(/\bThe dossier\b/g, "Aculeus")
    .replace(/\bthe dossier\b/g, "the source trail")
    .replace(/\bDossier\b/g, "Source trail")
    .replace(/\bdossier\b/g, "source trail")
    .replace(/\battached record\b/g, "source trail")
    .replace(/\battached sources\b/g, "retrieved source trails");
}

function normalizeAnswer(answer, casePacket) {
  const defaultSourceRefs = casePacket.sources
    .map((source) => source.sourceId || source.title)
    .filter(Boolean)
    .slice(0, 3);
  const sourceIds = new Set(casePacket.sources.map((source) => source.sourceId).filter(Boolean));
  const sourceRefs = Array.isArray(answer.sourceRefs)
    ? answer.sourceRefs.map(safeString).filter(Boolean).slice(0, 5)
    : [];
  const validSourceRefs = sourceRefs.filter((ref) => sourceIds.has(ref) || casePacket.sources.some((source) => source.title === ref));
  const missingRecords = Array.isArray(answer.missingRecords)
    ? answer.missingRecords.map(safeString).filter(Boolean).slice(0, 5)
    : casePacket.nextRecords.map((record) => record.request).filter(Boolean).slice(0, 3);

  return {
    answer: safeString(brandAnswer(answer.answer)) || "The record stops there for that question.",
    supportLevel: SUPPORT_LEVELS.has(answer.supportLevel) ? answer.supportLevel : "partially_supported",
    sourceRefs: validSourceRefs.length ? validSourceRefs : defaultSourceRefs,
    missingRecords: missingRecords.map(brandAnswer),
    safeNextMove: safeString(brandAnswer(answer.safeNextMove)) || casePacket.nextRecords[0]?.request || "Stay inside the source trail and request missing records."
  };
}
