(function () {
  const demoLibrary = window.ACULEUS_DEMO_LIBRARY || {
    defaultCaseId: window.ACULEUS_DEMO_CASE?.caseId || "",
    cases: window.ACULEUS_DEMO_CASE ? [window.ACULEUS_DEMO_CASE] : []
  };
  const demoCases = Array.isArray(demoLibrary.cases) ? demoLibrary.cases : [];
  const demoCase = window.ACULEUS_DEMO_CASE || demoCases[0];
  const hasHttp = window.location.protocol === "http:" || window.location.protocol === "https:";

  async function requestJson(path, options) {
    if (!hasHttp) return null;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4200);
    try {
      const response = await fetch(path, {
        headers: { "content-type": "application/json" },
        ...options,
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Aculeus adapter request failed: ${response.status}`);
      return response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function localCase(caseId) {
    return demoCases.find((casePacket) => casePacket.caseId === caseId)
      || demoCases.find((casePacket) => casePacket.caseId === demoLibrary.defaultCaseId)
      || demoCase
      || null;
  }

  async function getDemoCase(caseId = "") {
    const local = localCase(caseId);
    if (local) return clone(local);
    const suffix = caseId ? `?caseId=${encodeURIComponent(caseId)}` : "";
    const response = await requestJson(`/api/demo-case${suffix}`);
    return response?.case || null;
  }

  async function investigate(lead, caseId = "") {
    const baseCase = localCase(caseId) || demoCase;
    const fallback = clone(baseCase);
    fallback.submittedLead = lead;
    fallback.runId = `demo-run-${Date.now()}`;
    fallback.responseMode = "demo_fallback";

    try {
      const response = await requestJson("/api/investigate", {
        method: "POST",
        body: JSON.stringify({ lead, caseId: caseId || baseCase?.caseId })
      });
      return response?.case || fallback;
    } catch {
      return fallback;
    }
  }

  async function askCaseQuestion({ question, casePacket }) {
    const fallback = buildFallbackAnswer(question, casePacket || demoCase);

    try {
      const response = await requestJson("/api/case-question", {
        method: "POST",
        body: JSON.stringify({ question, case: casePacket || demoCase })
      });
      return response?.answer ? { ...response.answer, mode: response.mode } : fallback;
    } catch {
      return fallback;
    }
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

  function buildFallbackAnswer(question, casePacket) {
    const record = casePacket || demoCase || {};
    const firstSource = record.sources?.[0];
    const nextRecord = record.nextRecords?.[0];
    const asksMissing = /missing|next|need|record|request|action|move/i.test(question || "");
    const asksProof = /source|support|evidence|inspect|trail|prove|proof/i.test(question || "");
    const asksClaim = /claim|claims|hold|holds|supported|limit|falsify|falsifies/i.test(question || "");
    const asksLayer = /layer|layers|money|actor|actors|network|pipeline|intermediary|first|audit/i.test(question || "");
    const asksDossier = /dossier|finding|findings|entity|provider|receipt|gap|audit|notice|signal/i.test(question || "");
    const asksUnsupported = /fraud|illegal|intent|guilty|crime|criminal/i.test(question || "");
    const dossier = record.dossier || {};
    const findingSources = (dossier.findings || [])
      .flatMap((finding) => finding.sourceIds || [])
      .filter(Boolean);

    if (asksUnsupported) {
      return {
        answer: brandAnswer(`The record stops there. ${record.legalBoundary || "The signal is real. The missing record decides the next move."}`),
        supportLevel: "unsupported",
        sourceRefs: record.sources?.map((source) => source.sourceId).filter(Boolean).slice(0, 3) || [],
        missingRecords: record.nextRecords?.map((item) => item.request).filter(Boolean) || [],
        safeNextMove: nextRecord?.request || "Get the missing record before moving."
      };
    }

    if (asksLayer && dossier.layers?.length) {
      const layers = dossier.layers
        .slice(0, 4)
        .map((layer) => `${layer.title} ${layer.body}`)
        .join(" ");
      return {
        answer: brandAnswer(`${dossier.shortFinding || dossier.summary || record.summary} Layers opened: ${layers}`),
        supportLevel: "supported",
        sourceRefs: dossier.layers.flatMap((layer) => layer.sourceIds || []).filter(Boolean).slice(0, 5),
        missingRecords: dossier.nextMoves || record.nextRecords?.map((item) => item.request).filter(Boolean) || [],
        safeNextMove: dossier.nextMoves?.[0] || nextRecord?.request || "Open the strongest layer and request missing records."
      };
    }

    if (asksClaim && dossier.claimLedger?.length) {
      const claims = dossier.claimLedger
        .slice(0, 3)
        .map((claim) => `${claim.claim} Support: ${claim.support}. Limit: ${claim.limitation}. Next record: ${claim.nextRecord}.`)
        .join(" ");
      return {
        answer: brandAnswer(claims),
        supportLevel: "supported",
        sourceRefs: dossier.claimLedger.flatMap((claim) => claim.sourceIds || []).filter(Boolean).slice(0, 5),
        missingRecords: dossier.claimLedger.map((claim) => claim.nextRecord).filter(Boolean).slice(0, 5),
        safeNextMove: dossier.claimLedger[0]?.nextRecord || nextRecord?.request || "Open the claim ledger and request the decisive record."
      };
    }

    if (asksDossier && dossier.findings?.length) {
      const strongest = dossier.findings
        .slice(0, 3)
        .map((finding) => `${finding.entity}: ${finding.whatRecordSays}`)
        .join(" ");
      return {
        answer: brandAnswer(`${dossier.shortFinding || dossier.summary || record.summary} Strongest findings: ${strongest}`),
        supportLevel: "supported",
        sourceRefs: findingSources.length ? findingSources.slice(0, 4) : record.sources?.map((source) => source.sourceId).filter(Boolean).slice(0, 3) || [],
        missingRecords: dossier.nextMoves || record.nextRecords?.map((item) => item.request).filter(Boolean) || [],
        safeNextMove: dossier.nextMoves?.[0] || nextRecord?.request || "Open the source trail and request missing records."
      };
    }

    if (asksMissing) {
      return {
        answer: nextRecord
        ? brandAnswer(nextRecord.reason || nextRecord.request)
          : "The next record is not listed in this packet.",
        supportLevel: "supported",
        sourceRefs: record.sources?.map((source) => source.sourceId).filter(Boolean).slice(0, 3) || [],
        missingRecords: record.nextRecords?.map((item) => item.request).filter(Boolean) || [],
        safeNextMove: nextRecord?.request || "Open the source trail first."
      };
    }

    return {
      answer: asksProof && firstSource
        ? brandAnswer(`Start with ${firstSource.title}. ${firstSource.limitation}`)
        : brandAnswer(record.summary || "The source trail is ready."),
      supportLevel: firstSource ? "partially_supported" : "unsupported",
      sourceRefs: record.sources?.map((source) => source.sourceId).filter(Boolean).slice(0, 3) || [],
      missingRecords: record.nextRecords?.map((item) => item.request).filter(Boolean) || [],
      safeNextMove: nextRecord?.request || "Stay inside the source trail."
    };
  }

  async function createAccount(payload) {
    const fallback = {
      ok: false,
      mode: "demo",
      message: "Request did not send from this demo."
    };

    try {
      return await requestJson("/api/signup", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch {
      return fallback;
    }
  }

  window.AculeusModelAdapter = {
    getDemoCase,
    investigate,
    askCaseQuestion,
    createAccount,
    contract: {
      demoCase: "GET /api/demo-case",
      investigate: "POST /api/investigate",
      caseQuestion: "POST /api/case-question",
      signup: "POST /api/signup",
      futureModelInput: {
        lead: "string",
        question: "string",
        casePacket: "object",
        sources: "array",
        operatorMode: "demo | internal | production"
      }
    }
  };
})();
