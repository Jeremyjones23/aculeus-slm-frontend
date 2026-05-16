const DEFAULT_BOUNDARY = "Review lead only. The source trail supports public-record follow-up, not a final legal conclusion.";

export function caseBoardReportToDemoLibrary(caseBoardReport, options = {}) {
  const boards = Array.isArray(caseBoardReport?.case_boards) ? caseBoardReport.case_boards : [];
  const cases = boards.map((board, index) => caseBoardToDemoCase(board, {
    index,
    generatedAt: caseBoardReport?.generated_at || "",
    sourceRunId: caseBoardReport?.artifact || "aculeus_case_board_from_web_harness"
  }));
  return {
    defaultCaseId: options.defaultCaseId || cases[0]?.caseId || "",
    generatedAt: caseBoardReport?.generated_at || "",
    sourceArtifact: caseBoardReport?.artifact || "",
    runStatus: runStatusFromAdvancementPacket(options.advancementPacket),
    trainingStatus: trainingStatusFromPackets(options.modelAdvancementPacket, options.splitReadinessPacket),
    mode: "source_fed_case_board",
    cases
  };
}

function runStatusFromAdvancementPacket(packet) {
  if (!packet || typeof packet !== "object") {
    return {
      status: "not_attached",
      paidTrainingDecision: "not_attached",
      nextSpendDecision: "not_attached",
      nextWorkOrder: "",
      accessGapRows: 0,
      accessCaptureGate: "NOT_ATTACHED",
      gapClosureStatus: "NOT_ATTACHED"
    };
  }
  const access = objectValue(packet.access_gap_feedback);
  const paid = objectValue(packet.paid_training);
  const gap = objectValue(packet.gap_closure);
  const nextWorkOrder = arrayValue(packet.next_work_order).map(stringValue).filter(Boolean);
  return {
    status: stringValue(packet.status),
    paidTrainingDecision: stringValue(paid.decision),
    nextSpendDecision: stringValue(packet.next_spend_decision),
    nextWorkOrder: nextWorkOrder[0] || "",
    accessGapRows: Number(access.row_count || 0),
    accessCaptureGate: stringValue(access.capture_gate || "NOT_ATTACHED"),
    gapClosureStatus: stringValue(gap.status || "NOT_ATTACHED")
  };
}

function trainingStatusFromPackets(modelPacket, splitPacket) {
  const modelGate = objectValue(modelPacket?.model_gate);
  const product = objectValue(modelPacket?.product_advancement);
  const split = objectValue(splitPacket?.split_decision);
  const candidate = objectValue(splitPacket?.candidate_summary);
  return {
    modelDecision: stringValue(modelPacket?.decision || "not_attached"),
    primarySignal: stringValue(modelGate.primary_signal || ""),
    canonicalizedGateGreen: Boolean(modelGate.canonicalized_gate_green),
    rawGateGreen: Boolean(modelGate.raw_gate_green),
    paymentExtractionGateGreen: Boolean(modelGate.payment_extraction_gate_green),
    hostedTrainingAllowed: Boolean(modelGate.hosted_training_allowed),
    paidReadinessStatus: stringValue(modelGate.paid_readiness_status || "not_attached"),
    hostedTrainingDecision: stringValue(modelGate.hosted_training_decision || "not_attached"),
    localTrainingDecision: stringValue(modelGate.local_training_decision || "not_attached"),
    localAdapterTransportDecision: stringValue(modelGate.local_adapter_transport_decision || "not_attached"),
    preferenceSignalCount: Number(modelGate.preference_signal_count || 0),
    mvpUse: stringValue(product.mvp_role || ""),
    splitDecision: stringValue(splitPacket?.decision || "not_attached"),
    trainSplitAllowed: Boolean(split.train_split_allowed),
    reviewedCandidateRows: Number(candidate.reviewed_passed_rows || 0),
    candidatePublisherCount: Number(candidate.publisher_count || 0),
    blockers: arrayValue(splitPacket?.blockers).map(stringValue).filter(Boolean)
  };
}

export function caseBoardToDemoCase(board, context = {}) {
  const header = objectValue(board?.case_header);
  const sourceLedger = arrayValue(board?.source_ledger);
  const findings = arrayValue(board?.findings_table);
  const rejectedOrWeak = objectValue(board?.rejected_or_weak_claims);
  const missingRecords = arrayValue(board?.missing_records).map(stringValue).filter(Boolean);
  const caseId = stringValue(header.case_id || `source_fed_case_${context.index || 0}`);
  const title = titleFromTopic(header.topic || caseId);
  const sources = sourceLedger.map(sourceFromLedgerRow);
  const sourceIds = new Set(sources.map((source) => source.sourceId));
  const dossierFindings = findings.map((finding, index) => findingFromCard(finding, sourceIds, index));
  const nextRecords = nextRecordsFromBoard(board);

  return {
    caseId: `source_${caseId}`,
    displayId: `AC-${String((context.index || 0) + 1).padStart(3, "0")}`,
    caseType: "source_fed_public_records",
    caseScope: stringValue(header.hardened_focus || header.topic),
    title,
    headline: "A source-fed case board is ready for review.",
    lead: stringValue(header.topic),
    summary: stringValue(header.assessment || "Aculeus converted a web-search harness run into a cited case board."),
    jurisdiction: jurisdictionFromTopic(header.topic || ""),
    reviewStatus: stringValue(header.status || "REVIEW_REQUIRED").toLowerCase(),
    publicLabel: "source_fed_case_board",
    legalBoundary: stringValue(header.legal_boundary || header.public_boundary || DEFAULT_BOUNDARY),
    caseScore: scoreFromStatus(header.status),
    model: {
      name: "Aculeus SLM",
      version: "source-fed-adapter-0.1",
      mode: "source_fed_case_board",
      endpoint: "/api/investigate"
    },
    commandCenter: {
      break: stringValue(header.assessment || "The record trail supports review leads and missing records."),
      proof: dossierFindings.slice(0, 3).map((finding) => finding.whatRecordSays),
      missing: uniqueStrings(nextRecords.map((record) => record.request)).join(" | ") || "No missing records were listed by the case-board packet.",
      move: nextRecords[0]?.request || "Review the evidence rail and decide the next public-record request."
    },
    entities: entitiesFromFindings(findings),
    sourceFamilies: sourceFamiliesFromSources(sources),
    dossier: {
      title,
      deck: stringValue(header.assessment || "The source trail is organized into review leads, evidence, and missing records."),
      posture: stringValue(header.status || "review_required"),
      centralQuestion: stringValue(header.topic),
      shortFinding: shortFindingFromCards(dossierFindings, header),
      summary: stringValue(header.assessment || "Aculeus generated a case board from public-source retrieval."),
      stats: [
        { label: "Verified leads", value: String(dossierFindings.length), detail: "Finding cards that passed the citation verifier or remain visible as blocked leads." },
        { label: "Evidence rows", value: String(sources.length), detail: "Source-ledger records carried into the front end." },
        { label: "Missing records", value: String(nextRecords.length), detail: "Records needed before stronger conclusions." }
      ],
      layers: layersFromBoard(board, sources),
      findings: dossierFindings,
      claimLedger: claimLedgerFromBoard(board, findings),
      sourceMatrix: sourceMatrixFromBoard(board),
      followUpQuestions: [
        "Which finding has the strongest official-source support?",
        "What record would change this case the most?",
        "Which weak or rejected claim should stay out of the public narrative?",
        "Which source should be opened next?"
      ],
      nextMoves: nextRecords.map((record) => record.request)
    },
    claims: findings.map((finding) => ({
      title: stringValue(finding.type || "review lead"),
      body: stringValue(finding.claim),
      state: stringValue(finding.status),
      sourceIds: arrayValue(finding.evidence_ids).map(stringValue).filter((sourceId) => sourceIds.has(sourceId)).slice(0, 4),
      confidence: numberOrNull(finding.confidence)
    })),
    sources,
    lanes: lanesFromBoard(board),
    anomalyMath: [],
    nextRecords,
    actions: {
      directMove: nextRecords[0]?.request || "Open the strongest official source and request the decisive missing record.",
      requestLanguage: nextRecords[0]?.request || "Please provide the complete public contract file, invoices, monitoring records, and related board approvals for this case.",
      ifRefused: "Ask for the statutory exemption, record index, and segregable public portions.",
      coalitionPath: "Share only citation-verified review leads and missing-record requests."
    },
    sourceBoard: {
      generatedAt: context.generatedAt || "",
      sourceRunId: context.sourceRunId || "",
      originalCaseId: caseId
    }
  };
}

function sourceFromLedgerRow(row) {
  const labels = arrayValue(row?.labels).map(stringValue).filter(Boolean);
  const official = labels.includes("official");
  const targetedExtract = objectValue(row?.targeted_extract);
  return {
    sourceId: stringValue(row?.evidence_id),
    title: stringValue(row?.title || row?.url || row?.evidence_id),
    type: official ? "official_public_record" : "secondary_or_locator",
    publisher: stringValue(row?.source_authority || row?.search_provider),
    role: labels.join(", "),
    confidence: labels.includes("usable_as_evidence") ? "usable_as_evidence" : "locator_only",
    visibility: "source_fed_case_board",
    url: stringValue(row?.url),
    hash: stringValue(row?.text_sha256),
    excerpt: stringValue(row?.excerpt_preview),
    quotedExcerpt: stringValue(row?.excerpt_preview),
    limitation: labels.includes("usable_as_evidence")
      ? "Supports only the cited claim and does not prove the whole case by itself."
      : "Locator or blocked record; it needs fetch, browser capture, or public-record follow-up.",
    supportLevel: labels.includes("usable_as_evidence") ? "supported" : "partially_supported",
    retrievalMethod: stringValue(row?.search_provider || row?.excerpt_source || "source-ledger import"),
    pageNumber: targetedExtract.page_number ?? null,
    matchedTerms: arrayValue(targetedExtract.matched_terms).map(stringValue).filter(Boolean).slice(0, 6),
    amountCandidates: arrayValue(targetedExtract.amount_candidates).map(stringValue).filter(Boolean).slice(0, 6)
  };
}

function findingFromCard(finding, sourceIds, index) {
  const ids = arrayValue(finding?.evidence_ids).map(stringValue).filter((sourceId) => sourceIds.has(sourceId)).slice(0, 6);
  return {
    findingId: stringValue(finding?.finding_id || `finding-${index + 1}`),
    entity: arrayValue(finding?.entities).map(stringValue).filter(Boolean).join(", ") || stringValue(finding?.type || "Public record"),
    signal: stringValue(finding?.severity || finding?.type || "review lead"),
    whatRecordSays: stringValue(finding?.claim),
    whyItMatters: `Confidence ${stringValue(finding?.confidence)}; citation verifier status ${stringValue(finding?.status)}.`,
    whatItDoesNotProve: "It does not prove fraud, intent, guilt, or liability unless an official adjudicative record says so.",
    nextRecord: stringValue(finding?.next_action || "Request the missing record named by the case board."),
    sourceFamily: stringValue(finding?.type || "public_record_review"),
    sourceIds: ids
  };
}

function nextRecordsFromBoard(board) {
  const missing = arrayValue(board?.missing_records).map(stringValue).filter(Boolean);
  if (missing.length) {
    return missing.slice(0, 8).map((item, index) => ({
      priority: index === 0 ? "high" : "medium",
      recordId: `missing_${index + 1}`,
      holder: "public agency or record custodian",
      request: item,
      reason: "Needed before upgrading a review lead into a stronger finding."
    }));
  }
  const seen = new Set();
  return arrayValue(board?.findings_table).slice(0, 5).map((finding, index) => ({
    priority: index === 0 ? "high" : "medium",
    recordId: `next_${index + 1}`,
    holder: "public agency or record custodian",
    request: requestFromNextAction(finding?.next_action),
    reason: "Named by the citation-verified finding card as the next action."
  })).filter((record) => {
    if (seen.has(record.request)) return false;
    seen.add(record.request);
    return true;
  });
}

function requestFromNextAction(value) {
  const action = stringValue(value);
  if (!action) return "Request complete source file and supporting records.";
  if (/^web_\d+$/i.test(action)) {
    return `Open source ${action} and request the complete underlying record packet, attachments, and payment/support files.`;
  }
  return action;
}

function layersFromBoard(board, sources) {
  const header = objectValue(board?.case_header);
  return [
    {
      label: "Scope",
      title: "Question entered",
      body: stringValue(header.topic),
      sourceIds: sources.slice(0, 3).map((source) => source.sourceId)
    },
    {
      label: "Evidence",
      title: "Source ledger opened",
      body: `${sources.length} source-ledger records are visible for review.`,
      sourceIds: sources.slice(0, 6).map((source) => source.sourceId)
    },
    {
      label: "Verifier",
      title: "Claims stay citation-bound",
      body: stringValue(objectValue(board?.audit_trail).citation_verifier_status || header.status),
      sourceIds: sources.slice(0, 3).map((source) => source.sourceId)
    }
  ];
}

function claimLedgerFromBoard(board, findings) {
  const rejected = arrayValue(objectValue(board?.rejected_or_weak_claims).rejected_claims).map(stringValue).filter(Boolean);
  const weak = arrayValue(objectValue(board?.rejected_or_weak_claims).weak_signals).map(stringValue).filter(Boolean);
  const blocked = arrayValue(objectValue(board?.rejected_or_weak_claims).blocked_findings);
  const fromFindings = findings.slice(0, 6).map((finding) => ({
    claim: stringValue(finding.claim),
    support: stringValue(finding.status),
    limitation: "Support is limited to cited evidence IDs.",
    nextRecord: stringValue(finding.next_action),
    sourceIds: arrayValue(finding.evidence_ids).map(stringValue).slice(0, 6)
  }));
  return [
    ...fromFindings,
    ...blocked.slice(0, 6).map((finding) => ({
      claim: stringValue(finding?.claim),
      support: "blocked_by_citation_verifier",
      limitation: arrayValue(finding?.verifier_issues).map(stringValue).filter(Boolean).join(", ") || "Citation verifier blocked this claim.",
      nextRecord: stringValue(finding?.next_action || "Fetch stronger primary support or keep blocked."),
      sourceIds: arrayValue(finding?.evidence_ids).map(stringValue).slice(0, 6)
    })),
    ...rejected.slice(0, 3).map((claim) => ({ claim, support: "rejected_or_not_supported", limitation: "Do not publish as a finding.", nextRecord: "Find primary support or keep rejected.", sourceIds: [] })),
    ...weak.slice(0, 3).map((claim) => ({ claim, support: "weak_signal", limitation: "Needs stronger evidence.", nextRecord: "Run second retrieval or request the missing record.", sourceIds: [] }))
  ];
}

function sourceMatrixFromBoard(board) {
  const rows = arrayValue(board?.source_ledger);
  let usable = 0;
  let official = 0;
  let locators = 0;
  rows.forEach((row) => {
    const labels = new Set(arrayValue(row?.labels));
    if (labels.has("usable_as_evidence")) usable += 1;
    if (labels.has("official")) official += 1;
    if (labels.has("locator_only")) locators += 1;
  });
  return [
    { family: "Official records", status: String(official), proves: "Authority and source trail", missing: "Underlying attachments where not fetched" },
    { family: "Usable evidence", status: String(usable), proves: "Claim support candidates", missing: "Human review before publication" },
    { family: "Locators", status: String(locators), proves: "Where to fetch next", missing: "Direct capture or records request" }
  ];
}

function lanesFromBoard(board) {
  const header = objectValue(board?.case_header);
  return [
    ["lead", "Question received", "A public-record question enters.", stringValue(header.topic), []],
    ["sources", "Sources opened", "The ledger is visible.", `${arrayValue(board?.source_ledger).length} evidence rows are available.`, []],
    ["findings", "Findings checked", "The verifier gates claims.", `${arrayValue(board?.findings_table).length} finding cards were produced.`, []],
    ["gaps", "Gaps named", "Missing records stay visible.", `${arrayValue(board?.missing_records).length} missing records are listed.`, []]
  ].map(([laneId, label, headline, body, sourceIds]) => ({ laneId, label, headline, body, sourceIds }));
}

function entitiesFromFindings(findings) {
  const types = new Set(arrayValue(findings).map((finding) => stringValue(finding?.type)).filter(Boolean));
  return [...types].slice(0, 8).map((name) => ({ name, role: "finding type", confidence: 75 }));
}

function sourceFamiliesFromSources(sources) {
  return [...new Set(sources.map((source) => source.type).filter(Boolean))].slice(0, 10);
}

function uniqueStrings(values) {
  return [...new Set(values.map(stringValue).filter(Boolean))];
}

function shortFindingFromCards(findings, header) {
  if (findings.length) return findings.slice(0, 3).map((finding) => finding.whatRecordSays).join(" ");
  return stringValue(header.assessment || "The case board produced no findings; inspect missing records and source ledger.");
}

function titleFromTopic(topic) {
  const value = stringValue(topic).replace(/\.$/, "");
  return value ? value[0].toUpperCase() + value.slice(1) : "Aculeus source-fed case board";
}

function jurisdictionFromTopic(topic) {
  const lower = stringValue(topic).toLowerCase();
  if (lower.includes("san francisco")) return "San Francisco, CA";
  if (lower.includes("los angeles") || lower.includes("la ")) return "Los Angeles, CA";
  if (lower.includes("california") || lower.includes("ca ")) return "California";
  return "United States";
}

function scoreFromStatus(status) {
  return stringValue(status) === "PASS" ? 88 : 64;
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function stringValue(value) {
  return String(value ?? "").trim();
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
