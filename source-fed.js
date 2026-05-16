import {
  RUN_STATES,
  buildActionBriefResponse,
  buildCandidateSources,
  buildCaseBoardResponse,
  hardenInvestigationQuery
} from "./lib/aculeus-source-fed-contracts.js";

const library = window.ACULEUS_SOURCE_FED_CASE_BOARD || { cases: [] };
const caseList = document.querySelector("[data-case-list]");
const caseCount = document.querySelector("[data-case-count]");
const board = document.querySelector("[data-case-board]");
let liveRun = { caseId: "", runId: "", status: "empty", spec: null, error: "", transport: "local" };
let liveTimer = null;

function text(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return text(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function sourceById(casePacket) {
  return new Map((casePacket.sources || []).map((source) => [source.sourceId, source]));
}

function renderCases() {
  const cases = library.cases || [];
  caseCount.textContent = `${cases.length} imported`;
  caseList.innerHTML = cases.map((casePacket, index) => `
    <button type="button" class="case-tab" data-case-id="${escapeHtml(casePacket.caseId)}" aria-pressed="${index === 0 ? "true" : "false"}">
      <span>${escapeHtml(casePacket.displayId)}</span>
      <b>${escapeHtml(casePacket.title)}</b>
      <em>${escapeHtml(casePacket.reviewStatus)}</em>
    </button>
  `).join("");
  caseList.querySelectorAll("[data-case-id]").forEach((button) => {
    button.addEventListener("click", () => selectCase(button.dataset.caseId));
  });
  selectCase(library.defaultCaseId || cases[0]?.caseId);
}

function selectCase(caseId) {
  const casePacket = (library.cases || []).find((item) => item.caseId === caseId) || library.cases?.[0];
  if (!casePacket) return;
  caseList.querySelectorAll("[data-case-id]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.caseId === casePacket.caseId));
  });
  renderBoard(casePacket);
}

function renderBoard(casePacket) {
  const caseBoardResponse = buildCaseBoardResponse(casePacket, library);
  const actionBrief = caseBoardResponse.action_brief || buildActionBriefResponse(casePacket, library);
  const candidateSources = caseBoardResponse.candidate_sources || buildCandidateSources(casePacket);
  const ledgerSummary = caseBoardResponse.ledger_summary || {};
  const sources = sourceById(casePacket);
  const findings = casePacket.dossier?.findings || [];
  const officialAwardFacts = casePacket.officialAwardFacts || [];
  const officialOcrVendorFacts = casePacket.officialOcrVendorFacts || [];
  const officialLacityControllerRowFacts = casePacket.officialLacityControllerRowFacts || [];
  const officialLacityLahsaContractPdfFacts = casePacket.officialLacityLahsaContractPdfFacts || [];
  const officialSfgovHealthrightFinancialRowFacts = casePacket.officialSfgovHealthrightFinancialRowFacts || [];
  const browserCaptureTasks = casePacket.browserCaptureTasks || [];
  const publicRecordsRequestPacket = casePacket.publicRecordsRequestPacket || null;
  const sfdphScopeParity = casePacket.sfdphScopeParity || null;
  const chirlaOfficialRecordScope = casePacket.chirlaOfficialRecordScope || null;
  const calaccessEntityLookup = casePacket.calaccessEntityLookup || null;
  const officialStateLocalRowFacts = library.officialStateLocalRowFacts || [];
  const nextRecords = casePacket.nextRecords || [];
  const runStatus = library.runStatus || {};
  const trainingStatus = library.trainingStatus || {};
  const fourPromptReadiness = library.fourPromptReadiness || null;
  const missingRecordWorkOrders = library.missingRecordWorkOrders || null;
  const rejectedClaims = (casePacket.dossier?.claimLedger || []).filter((claim) => {
    const support = text(claim.support).toLowerCase();
    return support.includes("blocked") || support.includes("weak") || support.includes("rejected");
  });
  board.innerHTML = `
    <header class="case-header">
      <div>
        <span>${escapeHtml(casePacket.displayId)} · ${escapeHtml(casePacket.jurisdiction)}</span>
        <h2>${escapeHtml(casePacket.title)}</h2>
        <p>${escapeHtml(casePacket.summary)}</p>
      </div>
      <dl>
        <div><dt>Status</dt><dd>${escapeHtml(casePacket.reviewStatus)}</dd></div>
        <div><dt>Evidence</dt><dd>${escapeHtml(String(casePacket.sources?.length || 0))}</dd></div>
        <div><dt>Findings</dt><dd>${escapeHtml(String(findings.length))}</dd></div>
      </dl>
    </header>
    <section class="panel action-brief" data-action-brief>
      <div class="section-head">
        <b>Action Brief</b>
        <small>${escapeHtml(actionBrief.status)}</small>
      </div>
      <div class="brief-grid">
        <article>
          <span>What we found</span>
          <h3>${escapeHtml(actionBrief.headline)}</h3>
          ${(actionBrief.what_we_found || []).slice(0, 4).map((item) => `
            <p><b>${escapeHtml(item.status)}</b> ${escapeHtml(item.plain_english)} <em>${escapeHtml(item.verifier_status)}</em></p>
          `).join("")}
        </article>
        <article>
          <span>Why it matters</span>
          ${(actionBrief.why_it_matters || []).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </article>
        <article>
          <span>Where the evidence is</span>
          ${(actionBrief.where_the_evidence_is || []).slice(0, 5).map((item) => `
            <p><b>${escapeHtml(item.evidence_id)}</b> ${escapeHtml(item.source_title)}</p>
          `).join("")}
        </article>
        <article>
          <span>What is still missing</span>
          ${(actionBrief.what_is_missing || []).slice(0, 4).map((item) => `
            <p><b>${escapeHtml(item.task_id)}</b> ${escapeHtml(item.record_needed)}</p>
          `).join("")}
        </article>
        <article>
          <span>Quick next steps</span>
          ${(actionBrief.quick_next_steps || []).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </article>
        <article>
          <span>Warnings / open risks</span>
          ${(actionBrief.warnings || []).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </article>
      </div>
    </section>
    <section class="panel live-investigation" data-live-investigation>
      <div class="section-head">
        <b>Live Investigation Scaffold</b>
        <small>${escapeHtml(liveRun.caseId === casePacket.caseId ? liveRun.status : "empty")}</small>
      </div>
      <form class="live-form" data-live-investigation-form>
        <label>
          <span>Raw query</span>
          <textarea name="rawQuery" rows="3">${escapeHtml(casePacket.title)}</textarea>
        </label>
        <div class="live-fields">
          <label><span>Jurisdiction</span><input name="jurisdiction" value="${escapeHtml(casePacket.jurisdiction || "")}"></label>
          <label><span>Target type</span><input name="targetType" value="${escapeHtml(casePacket.caseType || "public_records_target")}"></label>
          <button type="submit">Harden and simulate run</button>
        </div>
      </form>
      ${renderLiveRun(casePacket)}
    </section>
    ${candidateSources.length ? `
      <section class="panel candidate-leads" data-candidate-leads>
        <div class="section-head">
          <b>Candidate Leads</b>
          <small>${escapeHtml(String(candidateSources.length))} not evidence</small>
        </div>
        <div class="findings-table compact">
          ${candidateSources.slice(0, 8).map((candidate) => `
            <article>
              <div>
                <span>Candidate lead — not evidence</span>
                <h3>${escapeHtml(candidate.title)}</h3>
                <p>${escapeHtml(candidate.candidate_reason)}</p>
              </div>
              <div class="source-chips">
                ${candidate.url ? `<a href="${escapeHtml(candidate.url)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.candidate_id)}</a>` : `<span>${escapeHtml(candidate.candidate_id)}</span>`}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    <section class="panel source-ledger-summary" data-source-ledger-summary>
      <div class="section-head">
        <b>Source Ledger</b>
        <small>${escapeHtml(String(ledgerSummary.total || 0))} total records</small>
      </div>
      <div class="ledger-status-grid">
        ${[
          ["official", "Official", ledgerSummary.official],
          ["usable_as_evidence", "Usable Evidence", ledgerSummary.usable_as_evidence],
          ["candidate", "Candidate / Locator", ledgerSummary.candidate],
          ["fetched", "Fetched", ledgerSummary.fetched],
          ["found", "Found", ledgerSummary.found],
          ["blocked", "Blocked", ledgerSummary.blocked],
          ["failed", "Failed Fetch", ledgerSummary.failed],
          ["duplicate", "Duplicate", ledgerSummary.duplicate],
          ["needs_browser", "Needs Browser", ledgerSummary.needs_browser],
          ["needs_records_request", "Needs Records Request", ledgerSummary.needs_records_request]
        ].map(([key, label, value]) => `
          <div data-ledger-status="${escapeHtml(key)}">
            <span>${escapeHtml(label)}</span>
            <b>${escapeHtml(String(value || 0))}</b>
          </div>
        `).join("")}
      </div>
    </section>
    ${fourPromptReadiness ? `
      <section class="panel retrieval-gate">
        <div class="section-head">
          <b>Four Prompt Readiness</b>
          <small>${escapeHtml(fourPromptReadiness.status)}</small>
        </div>
        <div class="gate-grid">
          <div>
            <span>Decision</span>
            <b>${escapeHtml(fourPromptReadiness.decision)}</b>
          </div>
          <div>
            <span>Cases</span>
            <b>${escapeHtml(String(fourPromptReadiness.caseCount))}</b>
          </div>
          <div>
            <span>Truth artifacts</span>
            <b>${escapeHtml(String(fourPromptReadiness.truthIndexArtifactCount ?? "not attached"))}</b>
          </div>
        </div>
        <div class="findings-table compact">
          ${(fourPromptReadiness.rows || []).map((row) => `
            <article>
              <div>
                <span>${escapeHtml(row.status)} · ${escapeHtml(row.topic)}</span>
                <h3>${escapeHtml(row.caseId)}</h3>
                <p>${escapeHtml(String(row.findingCount))} findings · ${escapeHtml(String(row.sourceCount))} sources · training conversion ${escapeHtml(String(row.trainingConversionAllowed))}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    ${missingRecordWorkOrders ? `
      <section class="panel retrieval-gate">
        <div class="section-head">
          <b>Missing Record Work Orders</b>
          <small>${escapeHtml(missingRecordWorkOrders.status)}</small>
        </div>
        <div class="gate-grid">
          <div>
            <span>Decision</span>
            <b>${escapeHtml(missingRecordWorkOrders.decision)}</b>
          </div>
          <div>
            <span>Tasks</span>
            <b>${escapeHtml(String(missingRecordWorkOrders.taskCount))}</b>
          </div>
          <div>
            <span>Current case</span>
            <b>${escapeHtml(String((missingRecordWorkOrders.tasks || []).filter((task) => task.caseId === casePacket.caseId).length))}</b>
          </div>
        </div>
        <div class="findings-table compact">
          ${(missingRecordWorkOrders.tasks || []).filter((task) => task.caseId === casePacket.caseId).map((task) => `
            <article>
              <div>
                <span>${escapeHtml(task.retrievalStatus)} · ${escapeHtml(task.recordFamily)}</span>
                <h3>${escapeHtml(task.targetRecord)}</h3>
                <p>${escapeHtml(task.providerHint)} · ${escapeHtml(task.evidencePosture)}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    <section class="panel retrieval-gate">
      <div class="section-head">
        <b>Retrieval Gate</b>
        <small>${escapeHtml(runStatus.status || "not attached")}</small>
      </div>
      <div class="gate-grid">
        <div>
          <span>Next spend</span>
          <b>${escapeHtml(runStatus.nextSpendDecision || "not attached")}</b>
        </div>
        <div>
          <span>Access gap</span>
          <b>${escapeHtml(runStatus.accessCaptureGate || "not attached")}</b>
        </div>
        <div>
          <span>Training</span>
          <b>${escapeHtml(runStatus.paidTrainingDecision || "not attached")}</b>
        </div>
      </div>
      ${runStatus.nextWorkOrder ? `<p>${escapeHtml(runStatus.nextWorkOrder)}</p>` : ""}
    </section>
    <section class="panel retrieval-gate">
      <div class="section-head">
        <b>Model Gate</b>
        <small>${escapeHtml(trainingStatus.modelDecision || "not attached")}</small>
      </div>
      <div class="gate-grid">
        <div>
          <span>Wrapper</span>
          <b>${escapeHtml(String(trainingStatus.canonicalizedGateGreen ?? "not attached"))}</b>
        </div>
        <div>
          <span>Raw model</span>
          <b>${escapeHtml(String(trainingStatus.rawGateGreen ?? "not attached"))}</b>
        </div>
        <div>
          <span>Train split</span>
          <b>${escapeHtml(String(trainingStatus.trainSplitAllowed ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>Reviewed rows</span>
          <b>${escapeHtml(String(trainingStatus.reviewedCandidateRows || 0))}</b>
        </div>
        <div>
          <span>Publishers</span>
          <b>${escapeHtml(String(trainingStatus.candidatePublisherCount || 0))}</b>
        </div>
        <div>
          <span>Prime</span>
          <b>${escapeHtml(trainingStatus.paidReadinessStatus || "not attached")}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>Hosted</span>
          <b>${escapeHtml(trainingStatus.hostedTrainingDecision || "not attached")}</b>
        </div>
        <div>
          <span>Local</span>
          <b>${escapeHtml(trainingStatus.localTrainingDecision || "not attached")}</b>
        </div>
        <div>
          <span>Hosted allowed</span>
          <b>${escapeHtml(String(trainingStatus.hostedTrainingAllowed ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>Adapter</span>
          <b>${escapeHtml(trainingStatus.localAdapterTransportDecision || "not attached")}</b>
        </div>
        <div>
          <span>Pref signals</span>
          <b>${escapeHtml(String(trainingStatus.preferenceSignalCount || 0))}</b>
        </div>
        <div>
          <span>Payment model</span>
          <b>${escapeHtml(String(trainingStatus.paymentExtractionGateGreen ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>Cross-publisher row scope</span>
          <b>${escapeHtml(runStatus.crossPublisherRowScopeDecision || "not attached")}</b>
        </div>
        <div>
          <span>Official row facts</span>
          <b>${escapeHtml(String(runStatus.crossPublisherRowScopeVerifiedRows || 0))}</b>
        </div>
        <div>
          <span>READY checkpoints</span>
          <b>${escapeHtml(String(runStatus.primeLiveCheckpointReadyTotal ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>Official API v2</span>
          <b>${escapeHtml(runStatus.officialApiRowExpansionV2Decision || "not attached")}</b>
        </div>
        <div>
          <span>API row samples</span>
          <b>${escapeHtml(String(runStatus.officialApiRowExpansionV2RowSamples ?? "not attached"))}</b>
        </div>
        <div>
          <span>API surfaces</span>
          <b>${escapeHtml(String(runStatus.officialApiRowExpansionV2Surfaces ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>API row feedback</span>
          <b>${escapeHtml(runStatus.officialApiRowScopeFeedbackV2Decision || "not attached")}</b>
        </div>
        <div>
          <span>Feedback rows</span>
          <b>${escapeHtml(String(runStatus.officialApiRowScopeFeedbackV2Rows ?? "not attached"))}</b>
        </div>
        <div>
          <span>Feedback eval blocked</span>
          <b>${escapeHtml(String(runStatus.officialApiRowScopeFeedbackV2EvalBlocked ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>LAHSA fetch gate</span>
          <b>${escapeHtml(runStatus.lacityLahsaContractFetchQualityDecision || "not attached")}</b>
        </div>
        <div>
          <span>LAHSA contract PDFs</span>
          <b>${escapeHtml(String(runStatus.lacityLahsaContractFetchFetched ?? "not attached"))}</b>
        </div>
        <div>
          <span>LAHSA usable text</span>
          <b>${escapeHtml(String(runStatus.lacityLahsaContractFetchUsableExcerpts ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>LAHSA OCR needed</span>
          <b>${escapeHtml(String(runStatus.lacityLahsaContractFetchNeedsOcr ?? "not attached"))}</b>
        </div>
        <div>
          <span>LAHSA promotion</span>
          <b>${escapeHtml(String(runStatus.lacityLahsaContractFetchFindingPromotionAllowed ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>LAHSA PDF text</span>
          <b>${escapeHtml(String(runStatus.lacityLahsaContractPdfTextExtracted ?? "not attached"))}</b>
        </div>
        <div>
          <span>LAHSA atom gate</span>
          <b>${escapeHtml(runStatus.lacityLahsaContractPdfFieldAtomDecision || "not attached")}</b>
        </div>
        <div>
          <span>Verified atoms</span>
          <b>${escapeHtml(String(runStatus.lacityLahsaContractPdfFieldAtomsVerified ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>LAHSA atom feedback</span>
          <b>${escapeHtml(runStatus.lacityLahsaContractPdfAtomFeedbackDecision || "not attached")}</b>
        </div>
        <div>
          <span>Feedback rejected</span>
          <b>${escapeHtml(String(runStatus.lacityLahsaContractPdfAtomFeedbackRejectedClaims ?? "not attached"))}</b>
        </div>
        <div>
          <span>Feedback eval blocked</span>
          <b>${escapeHtml(String(runStatus.lacityLahsaContractPdfAtomFeedbackEvalBlocked ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>Row scope eval</span>
          <b>${escapeHtml(runStatus.crossPublisherRowScopeEvalDecision || "not attached")}</b>
        </div>
        <div>
          <span>Eval blocked</span>
          <b>${escapeHtml(String(runStatus.crossPublisherRowScopeEvalBlocked ?? "not attached"))}</b>
        </div>
        <div>
          <span>Prime runs checked</span>
          <b>${escapeHtml(String(runStatus.primeLiveCheckpointRunsChecked || 0))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>HealthRIGHT crawler</span>
          <b>${escapeHtml(runStatus.sfgovHealthrightCrawlerQualityDecision || "not attached")}</b>
        </div>
        <div>
          <span>Official PDFs fetched</span>
          <b>${escapeHtml(String(runStatus.sfgovHealthrightCrawlerFetched || 0))}</b>
        </div>
        <div>
          <span>Crawler promotion</span>
          <b>${escapeHtml(String(runStatus.sfgovHealthrightCrawlerFindingPromotionAllowed ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>Direct entity excerpts</span>
          <b>${escapeHtml(String(runStatus.sfgovHealthrightCrawlerDirectEntityExcerpts ?? "not attached"))}</b>
        </div>
        <div>
          <span>Context-only PDFs</span>
          <b>${escapeHtml(String(runStatus.sfgovHealthrightCrawlerTopicContextOnly ?? "not attached"))}</b>
        </div>
        <div>
          <span>Term triage</span>
          <b>${escapeHtml(runStatus.sfgovHealthrightCrawlerExcerptTermsDecision || "not attached")}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>Funding excerpt facts</span>
          <b>${escapeHtml(String(runStatus.sfgovHealthrightCrawlerFundingExcerptVerifiedFacts ?? "not attached"))}</b>
        </div>
        <div>
          <span>Narrow funding promotion</span>
          <b>${escapeHtml(String(runStatus.sfgovHealthrightCrawlerFundingExcerptNarrowPromotionAllowed ?? "not attached"))}</b>
        </div>
        <div>
          <span>Broader funding claims</span>
          <b>${escapeHtml(String(runStatus.sfgovHealthrightCrawlerFundingExcerptBroaderClaimsAllowed ?? "not attached"))}</b>
        </div>
      </div>
      <div class="gate-grid secondary">
        <div>
          <span>Funding feedback rows</span>
          <b>${escapeHtml(String(runStatus.sfgovHealthrightCrawlerFundingFeedbackRows ?? "not attached"))}</b>
        </div>
        <div>
          <span>Rejected overclaims</span>
          <b>${escapeHtml(String(runStatus.sfgovHealthrightCrawlerFundingFeedbackRejectedClaims ?? "not attached"))}</b>
        </div>
        <div>
          <span>Funding feedback eval</span>
          <b>${escapeHtml(String(runStatus.sfgovHealthrightCrawlerFundingFeedbackEvalBlocked ?? "not attached"))} blocked</b>
        </div>
      </div>
      ${trainingStatus.primarySignal ? `<p>${escapeHtml(trainingStatus.primarySignal)}</p>` : ""}
      ${trainingStatus.blockers?.length ? `<p>Blocked by: ${escapeHtml(trainingStatus.blockers.join(", "))}</p>` : ""}
    </section>
    <section class="panel">
      <div class="section-head">
        <b>Findings Table</b>
        <small>Citation-bound review leads</small>
      </div>
      <div class="findings-table">
        ${findings.map((finding) => `
          <article>
            <div>
              <span>${escapeHtml(finding.signal)}</span>
              <h3>${escapeHtml(finding.whatRecordSays)}</h3>
              <p>${escapeHtml(finding.whatItDoesNotProve)}</p>
            </div>
            <div class="source-chips">
              ${(finding.sourceIds || []).map((sourceId) => {
                const source = sources.get(sourceId);
                return source ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(sourceId)}</a>` : `<span>${escapeHtml(sourceId)}</span>`;
              }).join("")}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
    ${officialAwardFacts.length ? `
      <section class="panel">
        <div class="section-head">
          <b>Official Award Facts</b>
          <small>Narrow citation-verified field atoms</small>
        </div>
        <div class="findings-table">
          ${officialAwardFacts.map((fact) => `
            <article>
              <div>
                <span>${escapeHtml(fact.status)}</span>
                <h3>${escapeHtml(fact.recipientName)} · ${escapeHtml(fact.awardAmount)}</h3>
                <p>${escapeHtml(fact.awardingAgency)}${fact.startDate || fact.endDate ? ` · ${escapeHtml([fact.startDate, fact.endDate].filter(Boolean).join(" to "))}` : ""}</p>
                <p>${escapeHtml(fact.allowedClaimScope)}</p>
              </div>
              <div class="source-chips">
                <a href="${escapeHtml(fact.url)}" target="_blank" rel="noreferrer">${escapeHtml(fact.evidenceId)}</a>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    ${officialOcrVendorFacts.length ? `
      <section class="panel">
        <div class="section-head">
          <b>Official OCR Vendor Facts</b>
          <small>Narrow board-report field atoms</small>
        </div>
        <div class="findings-table">
          ${officialOcrVendorFacts.map((fact) => `
            <article>
              <div>
                <span>${escapeHtml(fact.status)} · page ${escapeHtml(fact.pageNumber)}</span>
                <h3>${escapeHtml(fact.contractorName)} · ${escapeHtml(fact.amount)}</h3>
                <p>${escapeHtml([fact.boardReport, fact.identificationNumber, fact.rfpNumber, fact.fundSource, fact.term].filter(Boolean).join(" · "))}</p>
                <p>${escapeHtml(fact.allowedClaimScope)}</p>
              </div>
              <div class="source-chips">
                <a href="${escapeHtml(fact.url)}" target="_blank" rel="noreferrer">${escapeHtml(fact.evidenceId)}</a>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    ${officialLacityControllerRowFacts.length ? `
      <section class="panel">
        <div class="section-head">
          <b>Official LA Controller Row Facts</b>
          <small>Narrow citation-verified payment rows</small>
        </div>
        <div class="findings-table">
          ${officialLacityControllerRowFacts.map((fact) => `
            <article>
              <div>
                <span>${escapeHtml(fact.status)} · row ${escapeHtml(String(fact.sourceRowNumber))}</span>
                <h3>${escapeHtml(fact.vendor)} · ${escapeHtml(String(fact.amount))}</h3>
                <p>${escapeHtml([fact.publisher, fact.targetId, fact.recordType].filter(Boolean).join(" · "))}</p>
                <p>${escapeHtml(fact.allowedClaimScope)}</p>
              </div>
              <div class="source-chips">
                <a href="${escapeHtml(fact.url)}" target="_blank" rel="noreferrer">${escapeHtml(fact.evidenceId)}</a>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    ${officialLacityLahsaContractPdfFacts.length ? `
      <section class="panel">
        <div class="section-head">
          <b>Official LAHSA Contract PDF Facts</b>
          <small>Narrow City Clerk contract-summary atoms</small>
        </div>
        <div class="findings-table">
          ${officialLacityLahsaContractPdfFacts.map((fact) => `
            <article>
              <div>
                <span>${escapeHtml(fact.status)} · pages ${escapeHtml(String(fact.pageCount))}</span>
                <h3>${escapeHtml(fact.contractId)} · ${escapeHtml((fact.verifiedAmountCandidates || []).join(", "))}</h3>
                <p>${escapeHtml([fact.entity, fact.amendmentCandidates?.length ? `amendment ${fact.amendmentCandidates.join(", ")}` : ""].filter(Boolean).join(" · "))}</p>
                <p>${escapeHtml(fact.allowedClaimScope)}</p>
              </div>
              <div class="source-chips">
                <a href="${escapeHtml(fact.url)}" target="_blank" rel="noreferrer">${escapeHtml(fact.evidenceId)}</a>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    ${officialSfgovHealthrightFinancialRowFacts.length ? `
      <section class="panel">
        <div class="section-head">
          <b>Official SF Data HealthRIGHT Row Facts</b>
          <small>Narrow citation-verified contract and voucher rows</small>
        </div>
        <div class="findings-table">
          ${officialSfgovHealthrightFinancialRowFacts.map((fact) => `
            <article>
              <div>
                <span>${escapeHtml(fact.status)} · ${escapeHtml(fact.recordType)} row ${escapeHtml(String(fact.rowIndex))}</span>
                <h3>${escapeHtml(fact.vendorOrContractor)} · ${escapeHtml(fact.primaryAmountLabel)} ${escapeHtml(String(fact.primaryAmount))}</h3>
                <p>${escapeHtml([fact.department, fact.contractNumber, fact.contractTitle].filter(Boolean).join(" · "))}</p>
                <p>${escapeHtml(fact.allowedClaimScope)}</p>
              </div>
              <div class="source-chips">
                <a href="${escapeHtml(fact.url)}" target="_blank" rel="noreferrer">${escapeHtml(fact.evidenceId)}</a>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    ${officialStateLocalRowFacts.length ? `
      <section class="panel">
        <div class="section-head">
          <b>Official State/Local Row Facts</b>
          <small>Narrow citation-verified row atoms</small>
        </div>
        <div class="findings-table">
          ${officialStateLocalRowFacts.map((fact) => {
            const sampleFields = Object.entries(fact.sampleFields || {}).slice(0, 3).map(([key, value]) => `${key}: ${value}`).join(" · ");
            return `
              <article>
                <div>
                  <span>${escapeHtml(fact.surface)} · row ${escapeHtml(fact.rowIndex)}</span>
                  <h3>${escapeHtml(fact.datasetOrResourceId)}</h3>
                  <p>${escapeHtml(sampleFields || fact.status)}</p>
                  <p>${escapeHtml(fact.allowedClaimScope)}</p>
                </div>
                <div class="source-chips">
                  <a href="${escapeHtml(fact.url)}" target="_blank" rel="noreferrer">${escapeHtml(fact.evidenceId)}</a>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    ` : ""}
    ${browserCaptureTasks.length ? `
      <section class="panel">
        <div class="section-head">
          <b>Browser Capture Queue</b>
          <small>Public receipts still required</small>
        </div>
        <div class="findings-table">
          ${browserCaptureTasks.map((task) => `
            <article>
              <div>
                <span>${escapeHtml(task.status)} · ${escapeHtml(task.recordFamily)}</span>
                <h3>${escapeHtml(task.targetRecord)}</h3>
                <p>${escapeHtml(task.captureReason)}</p>
                <p>${escapeHtml(task.evidencePosture)}</p>
              </div>
              <div class="source-chips">
                <a href="${escapeHtml(task.url)}" target="_blank" rel="noreferrer">${escapeHtml(task.taskId)}</a>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    ${publicRecordsRequestPacket ? `
      <section class="panel">
        <div class="section-head">
          <b>Public Records Requests</b>
          <small>${escapeHtml(publicRecordsRequestPacket.status)}</small>
        </div>
        <div class="findings-table">
          <article>
            <div>
              <span>${escapeHtml(publicRecordsRequestPacket.evidencePosture)}</span>
              <h3>${escapeHtml(publicRecordsRequestPacket.templateCount)} request lanes · ${escapeHtml(publicRecordsRequestPacket.officialPraEmail)}</h3>
              <p>${escapeHtml((publicRecordsRequestPacket.templateTopics || []).join(" · "))}</p>
              <p>${escapeHtml(publicRecordsRequestPacket.nextAction)}</p>
            </div>
            <div class="source-chips">
              <a href="${escapeHtml(publicRecordsRequestPacket.officialPraPageUrl)}" target="_blank" rel="noreferrer">LAUSD PRA</a>
            </div>
          </article>
        </div>
      </section>
    ` : ""}
    ${sfdphScopeParity ? `
      <section class="panel">
        <div class="section-head">
          <b>SFDPH Scope Parity</b>
          <small>${escapeHtml(sfdphScopeParity.status)}</small>
        </div>
        <div class="findings-table">
          <article>
            <div>
              <span>${escapeHtml(sfdphScopeParity.evidencePosture)}</span>
              <h3>${escapeHtml(sfdphScopeParity.decision)} · ${escapeHtml(sfdphScopeParity.laneCount)} lanes</h3>
              <p>Blocked citations hidden from findings: ${escapeHtml(String(sfdphScopeParity.blockedCitationsHiddenFromFindings))} · training conversion: ${escapeHtml(String(sfdphScopeParity.trainingConversionAllowed))}</p>
              <p>${escapeHtml(sfdphScopeParity.nextAction)}</p>
            </div>
          </article>
          ${(sfdphScopeParity.lanes || []).map((lane) => `
            <article>
              <div>
                <span>${escapeHtml(lane.status)} · ${escapeHtml(lane.laneId)}</span>
                <h3>${escapeHtml(String(lane.visibleFindingCount))} visible findings · ${escapeHtml(String(lane.targetedExtractCount))} extracts</h3>
                <p>Citation pass ${escapeHtml(String(lane.citationPassCount))}; blocked in audit trail ${escapeHtml(String(lane.citationBlockedCount))}; direct promotion ${escapeHtml(String(lane.findingPromotionAllowed))}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    ${chirlaOfficialRecordScope ? `
      <section class="panel">
        <div class="section-head">
          <b>CHIRLA Official Record Scope</b>
          <small>${escapeHtml(chirlaOfficialRecordScope.status)}</small>
        </div>
        <div class="findings-table">
          <article>
            <div>
              <span>${escapeHtml(chirlaOfficialRecordScope.evidencePosture)}</span>
              <h3>${escapeHtml(chirlaOfficialRecordScope.decision)} · ${escapeHtml(chirlaOfficialRecordScope.laneCount)} lanes</h3>
              <p>Unsupported linkage rejected: ${escapeHtml(String(chirlaOfficialRecordScope.unsupportedLinkageRejected))} · intent/linkage claim allowed: ${escapeHtml(String(chirlaOfficialRecordScope.quidProQuoOrIntentClaimAllowed))}</p>
              <p>${escapeHtml(chirlaOfficialRecordScope.nextAction)}</p>
            </div>
          </article>
          ${(chirlaOfficialRecordScope.lanes || []).map((lane) => `
            <article>
              <div>
                <span>${escapeHtml(lane.status)} · ${escapeHtml(lane.laneId)}</span>
                <h3>${escapeHtml(String(lane.officialRecordCount))} official records · ${escapeHtml(String(lane.visibleFindingCount))} visible findings</h3>
                <p>Citation pass ${escapeHtml(String(lane.citationPassCount))}; weak/rejected ${escapeHtml(String(lane.weakOrRejectedClaimCount))}; source bodies persisted ${escapeHtml(String(lane.sourceBodiesPersisted))}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    ${calaccessEntityLookup ? `
      <section class="panel">
        <div class="section-head">
          <b>CAL-ACCESS Entity Lookup</b>
          <small>${escapeHtml(calaccessEntityLookup.status)}</small>
        </div>
        <div class="findings-table">
          <article>
            <div>
              <span>hash-only locator signal</span>
              <h3>${escapeHtml(calaccessEntityLookup.decision)} · ${escapeHtml(String(calaccessEntityLookup.totalMatches))} matches</h3>
              <p>Raw rows persisted: ${escapeHtml(String(calaccessEntityLookup.rawRowsPersisted))} · linkage/influence claim allowed: ${escapeHtml(String(calaccessEntityLookup.linkageOrInfluenceClaimAllowed))}</p>
              <p>${escapeHtml(calaccessEntityLookup.nextAction)}</p>
            </div>
          </article>
          ${(calaccessEntityLookup.lookups || []).map((lookup) => `
            <article>
              <div>
                <span>${escapeHtml(lookup.status)} · ${escapeHtml(lookup.table)}</span>
                <h3>${escapeHtml(String(lookup.matchCount))} matches · ${escapeHtml(String(lookup.rowCountScanned))} rows scanned</h3>
                <p>Header columns ${escapeHtml(String(lookup.headerColumnCount))}; training conversion ${escapeHtml(String(calaccessEntityLookup.trainingConversionAllowed))}; finding promotion ${escapeHtml(String(calaccessEntityLookup.findingPromotionAllowed))}</p>
              </div>
            </article>
          `).join("")}
          ${(calaccessEntityLookup.followupTasks || []).slice(0, 8).map((task) => `
            <article>
              <div>
                <span>${escapeHtml(task.retrievalStatus)} · ${escapeHtml(task.sourceTable)} row ${escapeHtml(String(task.rowNumber))}</span>
                <h3>${escapeHtml(task.targetRecord)}</h3>
                <p>${escapeHtml(task.evidencePosture)} · linkage claim ${escapeHtml(String(task.linkageOrInfluenceClaimAllowed))} · training ${escapeHtml(String(task.trainingConversionAllowed))}</p>
              </div>
            </article>
          `).join("")}
          ${(calaccessEntityLookup.filingAtoms || []).map((atom) => `
            <article>
              <div>
                <span>${escapeHtml(atom.entityMatchScope)} · ${escapeHtml(atom.formType)} · filing ${escapeHtml(String(atom.filingId))}</span>
                <h3>${escapeHtml(atom.candidateName)}</h3>
                <p>${escapeHtml(atom.allowedClaimScope)} · exact target ${escapeHtml(String(atom.exactTargetEntityMatch))} · linkage claim ${escapeHtml(String(atom.linkageOrInfluenceClaimAllowed))}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    <section class="board-grid">
      <div class="panel">
        <div class="section-head">
          <b>Evidence Rail</b>
          <small>${escapeHtml(String(casePacket.sources?.length || 0))} records</small>
        </div>
        <ol class="source-list">
          ${(casePacket.sources || []).slice(0, 14).map((source) => `
            <li>
              <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title || source.sourceId)}</a>
              <span>${escapeHtml(source.role)}</span>
              ${source.pageNumber || source.matchedTerms?.length || source.amountCandidates?.length ? `
                <p class="source-meta">
                  ${source.pageNumber ? `<b>Page ${escapeHtml(source.pageNumber)}</b>` : ""}
                  ${source.matchedTerms?.length ? `<em>Terms: ${escapeHtml(source.matchedTerms.join(", "))}</em>` : ""}
                  ${source.amountCandidates?.length ? `<strong>Amounts: ${escapeHtml(source.amountCandidates.join(", "))}</strong>` : ""}
                </p>
              ` : ""}
            </li>
          `).join("")}
        </ol>
      </div>
      <div class="panel">
        <div class="section-head">
          <b>Missing Records</b>
          <small>Next public-record moves</small>
        </div>
        <ol class="missing-list">
          ${nextRecords.map((record) => `
            <li>
              <b>${escapeHtml(record.priority)}</b>
              <p>${escapeHtml(record.request)}</p>
            </li>
          `).join("")}
        </ol>
      </div>
    </section>
    <section class="panel">
      <div class="section-head">
        <b>Rejected Or Weak Claims</b>
        <small>Not promoted to findings</small>
      </div>
      <div class="claim-list">
        ${rejectedClaims.length ? rejectedClaims.slice(0, 10).map((claim) => `
          <article>
            <div>
              <span>${escapeHtml(claim.support)}</span>
              <h3>${escapeHtml(claim.claim)}</h3>
              <p>${escapeHtml(claim.limitation)}</p>
              <em>${escapeHtml(claim.nextRecord)}</em>
            </div>
            <div class="source-chips">
              ${(claim.sourceIds || []).map((sourceId) => {
                const source = sources.get(sourceId);
                return source ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(sourceId)}</a>` : `<span>${escapeHtml(sourceId)}</span>`;
              }).join("")}
            </div>
          </article>
        `).join("") : `<p class="empty-inline">No rejected or weak claims were listed for this case.</p>`}
      </div>
    </section>
  `;
  attachLiveForm(casePacket);
}

function renderLiveRun(casePacket) {
  if (liveRun.caseId !== casePacket.caseId || liveRun.status === "empty") {
    return `
      <div class="run-status">
        ${RUN_STATES.slice(1, 10).map((state) => `<span>${escapeHtml(state)}</span>`).join("")}
      </div>
      <p class="empty-inline">Local scaffold only. Submitting builds an InvestigationSpec and simulates lifecycle states without provider calls, paid spend, remote mutation, or findings synthesis.</p>
    `;
  }
  return `
    <div class="run-status active">
      ${RUN_STATES.slice(1, 11).map((state) => `<span class="${state === liveRun.status ? "is-active" : ""}">${escapeHtml(state)}</span>`).join("")}
    </div>
    <pre class="spec-preview">${escapeHtml(JSON.stringify({
      run_id: liveRun.runId,
      status: liveRun.status,
      transport: liveRun.transport,
      provider_calls_executed: liveRun.providerCallsExecuted ?? false,
      official_api_calls_executed: liveRun.officialApiCallsExecuted ?? false,
      paid_spend_incurred: liveRun.paidSpendIncurred ?? false,
      remote_mutation_executed: liveRun.remoteMutationExecuted ?? false,
      model_findings_generated: liveRun.modelFindingsGenerated ?? false,
      candidate_sources_are_evidence: liveRun.candidateSourcesAreEvidence ?? false,
      cost_ledger: liveRun.costLedger || null,
      provider_candidate_tasks: liveRun.providerCandidateTasks || [],
      provider_candidates: liveRun.providerCandidates || [],
      official_api_tasks: liveRun.officialApiTasks || [],
      retrieval_queue: liveRun.retrievalQueue || [],
      audit_trail: liveRun.auditTrail || [],
      investigation_spec: liveRun.spec
    }, null, 2))}</pre>
  `;
}

function attachLiveForm(casePacket) {
  const form = board.querySelector("[data-live-investigation-form]");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const spec = hardenInvestigationQuery({
      rawQuery: data.get("rawQuery"),
      jurisdiction: data.get("jurisdiction"),
      targetType: data.get("targetType")
    });
    startLiveRun(casePacket, spec);
  });
}

async function startLiveRun(casePacket, spec) {
  if (liveTimer) clearInterval(liveTimer);
  try {
    const response = await fetch("/api/investigation-runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rawQuery: spec.raw_query,
        caseId: casePacket.caseId,
        jurisdiction: spec.jurisdictions?.[0]?.name,
        targetType: spec.target_type
      })
    });
    if (!response.ok) throw new Error(`run create failed ${response.status}`);
    const created = await response.json();
    liveRun = normalizeRunForUi(casePacket, created, "api");
    renderBoard(casePacket);
    pollApiRun(casePacket, created.run_id);
    return;
  } catch (error) {
    runLocalSimulation(casePacket, spec, error);
  }
}

async function pollApiRun(casePacket, runId) {
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = setInterval(async () => {
    try {
      const response = await fetch(`/api/investigation-runs/${encodeURIComponent(runId)}`);
      if (!response.ok) throw new Error(`run poll failed ${response.status}`);
      const result = await response.json();
      liveRun = normalizeRunForUi(casePacket, result, "api");
      renderBoard(casePacket);
      if (["ready", "blocked", "error", "cost_capped"].includes(result.status)) {
        clearInterval(liveTimer);
        liveTimer = null;
      }
    } catch (error) {
      clearInterval(liveTimer);
      liveTimer = null;
      liveRun = { ...liveRun, status: "error", error: error.message };
      renderBoard(casePacket);
    }
  }, 750);
}

function runLocalSimulation(casePacket, spec, error) {
  const states = ["submitted", "hardening_query", "planning", "retrieving", "gating", "verifying", "ready"];
  let index = 0;
  liveRun = {
    caseId: casePacket.caseId,
    runId: `local_run_${Date.now()}`,
    status: states[index],
    transport: "local_fallback",
    spec,
    error: error?.message || "",
    providerCallsExecuted: false,
    officialApiCallsExecuted: false,
    paidSpendIncurred: false,
    remoteMutationExecuted: false,
    modelFindingsGenerated: false,
    candidateSourcesAreEvidence: false,
    costLedger: { actual_spend_usd: 0, estimated_spend_usd: 0, cost_capped: false },
    providerCandidateTasks: [],
    providerCandidates: [],
    retrievalQueue: [],
    officialApiTasks: [],
    auditTrail: []
  };
  renderBoard(casePacket);
  liveTimer = setInterval(() => {
    index += 1;
    liveRun = { ...liveRun, status: states[index] || "ready" };
    renderBoard(casePacket);
    if (index >= states.length - 1) {
      clearInterval(liveTimer);
      liveTimer = null;
    }
  }, 650);
}

function normalizeRunForUi(casePacket, run, transport) {
  return {
    caseId: casePacket.caseId,
    runId: run.run_id || `local_run_${Date.now()}`,
    status: run.status || "submitted",
    transport,
    spec: run.investigation_spec || null,
    error: run.error || "",
    providerCallsExecuted: Boolean(run.provider_calls_executed),
    officialApiCallsExecuted: Boolean(run.official_api_calls_executed),
    paidSpendIncurred: Boolean(run.paid_spend_incurred),
    remoteMutationExecuted: Boolean(run.remote_mutation_executed),
    modelFindingsGenerated: Boolean(run.model_findings_generated),
    candidateSourcesAreEvidence: Boolean(run.candidate_sources_are_evidence),
    costLedger: run.cost_ledger || null,
    providerCandidateTasks: Array.isArray(run.provider_candidate_tasks) ? run.provider_candidate_tasks : [],
    providerCandidates: Array.isArray(run.provider_candidates) ? run.provider_candidates : [],
    officialApiTasks: Array.isArray(run.official_api_tasks) ? run.official_api_tasks : [],
    retrievalQueue: Array.isArray(run.retrieval_queue) ? run.retrieval_queue : [],
    auditTrail: Array.isArray(run.audit_trail) ? run.audit_trail : []
  };
}

renderCases();
