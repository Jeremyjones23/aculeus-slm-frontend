const app = document.querySelector("[data-app]");
const leadForm = document.querySelector("[data-lead-form]");
const leadInput = document.querySelector("#lead-input");
const commandForm = document.querySelector("[data-command-form]");
const commandInput = document.querySelector("[data-command-input]");
const counter = document.querySelector("[data-counter]");
const runFeed = document.querySelector("[data-run-feed]");
const railSteps = document.querySelector("[data-rail-steps]");
const trailList = document.querySelector("[data-trail-list]");
const caseList = document.querySelector("[data-demo-case-list]");
const signupForm = document.querySelector("[data-signup-form]");
const cursorLaser = document.querySelector("[data-cursor-laser]");
const runButtonLabel = document.querySelector("[data-run-button-label]");
const commandAnswer = document.querySelector("[data-command-answer]");
const commandAnswerText = document.querySelector("[data-command-answer-text]");
const commandAnswerLabel = document.querySelector("[data-command-answer-label]");
const commandAnswerJump = document.querySelector("[data-command-answer-jump]");
const completionSpine = document.querySelector("[data-completion-spine]");
const sourceOpenLink = document.querySelector("[data-source-open]");
const sourceProvenance = document.querySelector("[data-source-provenance]");
const sourceStory = document.querySelector("[data-source-story]");
const sourceCiteButton = document.querySelector("[data-source-cite]");
const sourceAskButton = document.querySelector("[data-source-ask]");

const sheets = {
  source: document.querySelector("[data-source-sheet]"),
  trail: document.querySelector("[data-trail-sheet]"),
  draft: document.querySelector("[data-draft-sheet]"),
  account: document.querySelector("[data-account-sheet]")
};

let demoLibrary = window.ACULEUS_DEMO_LIBRARY || { cases: [] };
const hiddenDemoCaseIds = new Set([
  "sf_homelessness_system",
  "ca_homelessness_top15",
  "provider_deep_dive"
]);
let demoCases = Array.isArray(demoLibrary.cases)
  ? demoLibrary.cases.filter((casePacket) => !hiddenDemoCaseIds.has(casePacket.caseId))
  : [];
let currentCase = demoCases.find((item) => item.caseId === demoLibrary.defaultCaseId) || demoCases[0] || null;
const sourceIndexCache = new WeakMap();
let activeSourceId = firstSource(currentCase)?.sourceId || "";
let activeSourceContext = null;
let sourceContextCounter = 0;
const sourceContextRegistry = new Map();
let runTimers = [];
let latestAnswerItem = null;

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[character]));
}

function brandPlain(value) {
  return String(value ?? "")
    .replace(/\bThe dossier\b/g, "Aculeus")
    .replace(/\bthe dossier\b/g, "the source trail")
    .replace(/\bDossier\b/g, "Source trail")
    .replace(/\bdossier\b/g, "source trail")
    .replace(/\battached record\b/g, "source trail")
    .replace(/\battached sources\b/g, "retrieved source trails")
    .replace(/\battached\b/g, "linked");
}

function safeCopy(value) {
  return safe(brandPlain(value));
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value ?? "";
}

function setRunState(state, label) {
  app?.setAttribute("data-run-state", state);
  setText("[data-run-status]", label);
}

function resetSourceContexts() {
  activeSourceContext = null;
  sourceContextCounter = 0;
  sourceContextRegistry.clear();
}

function selectedCase() {
  return currentCase || demoCases[0] || null;
}

function setLeadFromCase(casePacket, focus = false) {
  if (!leadInput || !casePacket) return;
  leadInput.value = casePacket.lead || "";
  updateCounter();
  if (focus) leadInput.focus();
}

function caseScopeLabel(casePacket) {
  const key = String(casePacket?.caseScope || casePacket?.caseType || "").toLowerCase();
  const labels = {
    city_system: "City system",
    statewide_system: "Statewide system",
    program_review: "Program review",
    organization_network: "Organization network",
    statewide_review: "Statewide review",
    entity_review: "Provider review",
    system_review: "System review",
    target_ranking: "Target ranking",
    provider_deep_dive: "Provider review"
  };
  return labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Source run";
}

function demoButtonLabel(casePacket) {
  const id = String(casePacket?.displayId || "").toUpperCase();
  if (id.startsWith("NS")) return "Run network demo";
  if (id.startsWith("EY")) return "Run funding demo";
  if (id.startsWith("GR")) return "Run infrastructure demo";
  if (id.startsWith("SF")) return "Run SF demo";
  if (id.startsWith("CA")) return "Run CA demo";
  if (id.startsWith("PD")) return "Run provider demo";
  return "Run proof demo";
}

function sampleLeadLabel(casePacket) {
  const id = String(casePacket?.displayId || "").toUpperCase();
  if (id.startsWith("NS")) return "Use network lead";
  if (id.startsWith("EY")) return "Use funding lead";
  if (id.startsWith("GR")) return "Use infrastructure lead";
  if (id.startsWith("SF")) return "Use SF lead";
  return "Use lead";
}

function sourceTypeLabel(source) {
  const labels = {
    investigation_profile: "case map",
    payment_ledger: "payment records",
    approval_record: "board files",
    contract_monitoring: "contract and monitoring files",
    audit_report: "controller reports",
    outcome_record: "outcome records",
    workflow_profile: "source map",
    attached_dossier: "source packet",
    funding_table: "funding table",
    intermediary_profile: "intermediary profile",
    program_profile: "program profile",
    government_report: "government report",
    press_release: "press release",
    meeting_minutes: "meeting minutes",
    rfa: "request for application",
    recipient_map: "recipient map",
    federal_award: "federal award",
    financial_filings: "financial filings",
    partner_map: "partner map",
    field_operations: "field operations"
  };
  return labels[source?.type] || String(source?.type || "source").replace(/_/g, " ");
}

function sourceLabel(source) {
  const labels = {
    sf_hsh_profile: "Case map",
    sf_payments: "Payment records",
    sf_board_files: "Board files",
    sf_hsh_contracts: "Monitoring files",
    sf_controller_reports: "Controller reports",
    sf_hsh_data_hub: "Outcome records",
    ca_profile: "Ranking profile",
    provider_workflow: "Provider source map",
    newsom_dossier: "Network run",
    aggregate_program_table: "Funding table",
    sierra_center_profile: "Sierra profile",
    phi_profile: "PHI profile",
    cerf_profile: "CERF profile",
    volunteers_profile: "Volunteer lane",
    eyc_dossier: "EYC run",
    eyc_legislative_report: "DHCS report",
    governor_press_release: "Governor release",
    prop64_minutes: "Prop 64 minutes",
    grants_portal_rfa: "Grant RFA",
    eyc_partner_map: "Recipient map",
    grid_dossier: "GRID run",
    grid_federal_awards: "Federal awards",
    grid_financials: "Financials",
    grid_partnerships: "Partner map",
    grid_field_operations: "Field records"
  };
  if (labels[source?.sourceId]) return labels[source.sourceId];
  const role = source?.role || source?.title || "Source";
  return role.replace(/\s+source\s+family$/i, "").replace(/\s+trail$/i, " records");
}

function sourceWeight(source) {
  if (!source) return 9;
  if (String(source.sourceId || "").includes("payments")) return 0;
  if (String(source.type || "").includes("payment")) return 0;
  if (String(source.sourceId || "").includes("board")) return 1;
  if (String(source.type || "").includes("approval")) return 1;
  if (String(source.type || "").includes("contract")) return 2;
  if (String(source.type || "").includes("audit")) return 3;
  if (String(source.type || "").includes("outcome")) return 4;
  if (String(source.visibility || "").includes("internal")) return 8;
  if (String(source.type || "").includes("profile")) return 8;
  return 5;
}

function sourceIndex(casePacket) {
  if (!casePacket || typeof casePacket !== "object") {
    return { sources: [], byId: new Map(), ordered: [] };
  }
  const sources = Array.isArray(casePacket.sources) ? casePacket.sources : [];
  const cached = sourceIndexCache.get(casePacket);
  if (cached?.sources === sources) return cached;
  const byId = new Map();
  sources.forEach((source) => {
    const sourceId = source?.sourceId;
    if (sourceId && !byId.has(sourceId)) byId.set(sourceId, source);
  });
  const ordered = [...sources].sort((left, right) => sourceWeight(left) - sourceWeight(right));
  const indexed = { sources, byId, ordered };
  sourceIndexCache.set(casePacket, indexed);
  return indexed;
}

function orderedSources(casePacket) {
  return [...sourceIndex(casePacket).ordered];
}

function firstSource(casePacket) {
  return sourceIndex(casePacket).ordered[0] || casePacket?.sources?.[0] || null;
}

function primarySources(casePacket, limit = 3) {
  return sourceIndex(casePacket).ordered.slice(0, limit);
}

function sourceById(casePacket, sourceId) {
  return sourceIndex(casePacket).byId.get(sourceId) || null;
}

function sourcesByIds(casePacket, sourceIds = []) {
  const byId = sourceIndex(casePacket).byId;
  return sourceIds.map((sourceId) => byId.get(sourceId)).filter(Boolean);
}

function registerSourceContext(source, context = {}) {
  if (!source?.sourceId) return "";
  sourceContextCounter += 1;
  const contextId = `${source.sourceId}-${sourceContextCounter}`;
  sourceContextRegistry.set(contextId, {
    sourceId: source.sourceId,
    usedHere: context.usedHere || "",
    supports: context.supports || "",
    cannotProve: context.cannotProve || "",
    missingRecord: context.missingRecord || "",
    storyBeat: context.storyBeat || "",
    supportType: context.supportType || "",
    claimId: context.claimId || ""
  });
  return contextId;
}

function sourceButtonAttributes(source, context = {}) {
  const contextId = registerSourceContext(source, context);
  return `data-source-ref="${safe(source?.sourceId || "")}" data-source-context="${safe(contextId)}"`;
}

function publicSourceUrl(source) {
  const url = source?.canonicalUrl || source?.sourceUrl || source?.url || "";
  return /^https?:\/\//i.test(url) ? url : "";
}

function openableSourceUrl(source) {
  const publicUrl = publicSourceUrl(source);
  if (publicUrl) return publicUrl;
  const localPath = source?.localArtifactPath || source?.url || "";
  if (/^data\//i.test(localPath)) return localPath;
  return "";
}

function sourceVerificationLabel(source) {
  const labels = {
    publicly_verifiable: "Publicly verifiable",
    local_profile: "Local profile",
    local_source_packet: "Local source packet",
    internal_workflow: "Internal workflow",
    request_required: "Records request required"
  };
  return labels[source?.verificationStatus] || (publicSourceUrl(source) ? "Publicly verifiable" : "Verification pending");
}

function sourceLocator(source) {
  return source?.pageOrRowLocator || source?.excerptLocator || source?.documentId || source?.hash || source?.sourceId || "Locator pending";
}

function sourceProvenanceRows(source) {
  const rows = [
    ["Status", sourceVerificationLabel(source)],
    ["Publisher", source?.publisher || "Aculeus source workspace"],
    ["Type", source?.publisherType || sourceTypeLabel(source)],
    ["Record date", source?.recordDate || "Date held in source packet"],
    ["Retrieved", source?.retrievedAt || "Retrieval date pending"],
    ["Locator", sourceLocator(source)],
    ["Document id", source?.documentId || source?.hash || source?.sourceId],
    ["Method", source?.retrievalMethod || "Loaded by the source run"]
  ];
  return rows
    .filter(([, value]) => value)
    .map(([label, value]) => `<div><dt>${safe(label)}</dt><dd>${safeCopy(value)}</dd></div>`)
    .join("");
}

function runSteps(casePacket) {
  const lanes = casePacket?.lanes || [];
  if (lanes.length) {
    return lanes.map((lane) => ({
      title: lane.label,
      detail: lane.headline || lane.body,
      sourceIds: lane.sourceIds || []
    }));
  }

  return [
    { title: "Lead received", detail: "The public question entered the system." },
    { title: "Sources opened", detail: "Aculeus retrieved the permitted record families." },
    { title: "Uncertainty flagged", detail: "The answer stays inside the source trail." },
    { title: "Next move drafted", detail: "The human approves the escalation." }
  ];
}

function renderCaseSwitcher() {
  if (!caseList) return;
  caseList.innerHTML = demoCases.map((casePacket) => `
    <button class="demo-case-button ${casePacket.caseId === currentCase?.caseId ? "is-selected" : ""}" type="button" data-demo-case-id="${safe(casePacket.caseId)}">
      <span>${safe(casePacket.displayId || "CASE")}</span>
      <div>
        <strong>${safe(casePacket.title || "Aculeus case")}</strong>
        <em>${safe(caseScopeLabel(casePacket))}</em>
      </div>
    </button>
  `).join("");
  setText("[data-case-display-id]", currentCase?.displayId || "Trial");
  if (runButtonLabel) runButtonLabel.textContent = demoButtonLabel(currentCase);
  setText("[data-sample-lead]", sampleLeadLabel(currentCase));
}

function renderTrail(casePacket, activeIndex = -1) {
  const items = runSteps(casePacket);
  const markup = items.map((item, index) => `
    <li class="${index <= activeIndex ? "is-active" : ""}">
      <span>${safe(item.title)}</span>
      <small>${safeCopy(item.detail || "")}</small>
    </li>
  `).join("");
  if (railSteps) railSteps.innerHTML = markup;
  if (trailList) trailList.innerHTML = markup;
}

function renderSourceSheet(source, context = activeSourceContext) {
  const chosen = source || sourceById(currentCase, activeSourceId) || firstSource(currentCase);
  if (!chosen) return;
  activeSourceId = chosen.sourceId;
  activeSourceContext = context || null;
  const nextRecord = currentCase?.nextRecords?.[0]?.request || currentCase?.actions?.requestLanguage || "Request the missing record before escalation.";
  const usedHere = context?.usedHere || `Aculeus uses this source as ${chosen.role || "record support"} in the current investigation thread.`;
  const supports = context?.supports || chosen.excerpt || "This source provides one receipt in the record trail.";
  const cannotProve = context?.cannotProve || chosen.limitation || "This source does not prove the whole case by itself.";
  const missingRecord = context?.missingRecord || nextRecord;
  const publicUrl = publicSourceUrl(chosen);
  const openableUrl = openableSourceUrl(chosen);
  const storyBeat = context?.storyBeat || chosen.role || "record support";
  const sourceRole = `This receipt is used in ${storyBeat}. It belongs to ${currentCase?.title || "the current case"} and keeps the claim tied to a retrievable source, not a loose summary.`;
  setText("[data-source-title]", chosen.title);
  setText("[data-source-status]", `${sourceVerificationLabel(chosen)} | Source type: ${sourceTypeLabel(chosen)} | Story role: ${storyBeat}`);
  setText("[data-source-story]", brandPlain(sourceRole));
  setText("[data-source-used]", brandPlain(usedHere));
  setText("[data-source-supports]", brandPlain(supports));
  setText("[data-source-limitation]", brandPlain(cannotProve));
  setText("[data-source-missing]", brandPlain(missingRecord));
  setText("[data-source-trace]", chosen.hash || chosen.documentId || chosen.url || chosen.sourceId);
  if (sourceProvenance) sourceProvenance.innerHTML = sourceProvenanceRows(chosen);
  if (sourceOpenLink) {
    sourceOpenLink.textContent = publicUrl ? "Open public source" : openableUrl ? "Open source packet" : sourceVerificationLabel(chosen);
    sourceOpenLink.classList.toggle("is-disabled", !openableUrl);
    sourceOpenLink.setAttribute("aria-disabled", openableUrl ? "false" : "true");
    if (openableUrl) sourceOpenLink.setAttribute("href", openableUrl);
    else sourceOpenLink.removeAttribute("href");
  }
  if (sourceAskButton) {
    sourceAskButton.textContent = `Ask about ${sourceLabel(chosen)}`;
  }
}

function renderDraft(casePacket) {
  const request = casePacket?.actions?.requestLanguage
    || casePacket?.nextRecords?.[0]?.request
    || "Run Aculeus to draft request language.";
  setText("[data-draft-request]", brandPlain(request));
  const receiptLine = primarySources(casePacket, 3).map(sourceLabel).join(" + ") || "Receipts appear after the source run.";
  const missing = casePacket?.commandCenter?.missing || casePacket?.nextRecords?.[0]?.reason || "The request is tied to the missing proof record.";
  setText("[data-draft-provenance]", `Built from ${receiptLine}. Requests focus on: ${missing}`);
}

function sourceChips(sources, context = {}) {
  if (!sources?.length) return "";
  return `
    <div class="source-row">
      ${sources.map((source) => {
        const sourceContext = typeof context === "function" ? context(source) : context;
        return `
        <button class="source-chip" type="button" ${sourceButtonAttributes(source, sourceContext)}>
          ${safe(sourceLabel(source))}
        </button>
      `;
      }).join("")}
    </div>
  `;
}

function sourceRefsForFinding(finding, casePacket) {
  const ids = Array.isArray(finding?.sourceIds) ? finding.sourceIds : [];
  const sources = sourcesByIds(casePacket, ids);
  return sources.length ? sources.slice(0, 2) : primarySources(casePacket, 1);
}

function dossierStats(stats = []) {
  if (!stats.length) return "";
  return `
    <div class="dossier-stats">
      ${stats.map((stat) => `
        <div>
          <strong>${safe(stat.value)}</strong>
          <b>${safeCopy(stat.label)}</b>
          <small>${safeCopy(stat.detail || "")}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function storyStats(casePacket) {
  const stats = casePacket?.dossier?.stats || [];
  if (!stats.length) return "";
  return `
    <div class="story-stats">
      ${stats.slice(0, 4).map((stat) => `
        <div>
          <strong>${safe(stat.value)}</strong>
          <span>${safeCopy(stat.label)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function firstClaimBySupport(claims, pattern) {
  return claims.find((claim) => pattern.test(`${claim.support || ""} ${claim.claim || ""}`)) || claims[0] || null;
}

function storyQuestion(casePacket) {
  const dossier = casePacket?.dossier || {};
  return `
    <section class="story-beat story-question">
      <span>Question under review</span>
      <h4>${safeCopy(dossier.centralQuestion || casePacket?.lead || "What does the record actually support?")}</h4>
      <p>${safeCopy(casePacket?.summary || "Aculeus turns the lead into a bounded source run.")}</p>
    </section>
  `;
}

function storyHypothesis(casePacket) {
  const dossier = casePacket?.dossier || {};
  const hypothesis = casePacket?.commandCenter?.break || dossier.shortFinding || dossier.summary || "The record suggests a pattern worth testing.";
  return `
    <section class="story-beat story-hypothesis">
      <span>Working hypothesis</span>
      <h4>The record supports a review lead. It does not support a final verdict yet.</h4>
      <p>${safeCopy(hypothesis)}</p>
    </section>
  `;
}

function primaryEvidence(casePacket) {
  const findings = casePacket?.dossier?.findings || [];
  return findings.slice(0, 3).map((finding, index) => {
    const source = sourceRefsForFinding(finding, casePacket)[0] || firstSource(casePacket);
    return { finding, source, index };
  }).filter((item) => item.source);
}

function evidenceSpine(casePacket) {
  const evidence = primaryEvidence(casePacket);
  if (!evidence.length) return "";
  return `
    <section class="story-beat evidence-spine">
      <div class="dossier-section-head">
        <b>What the record shows</b>
        <small>Click a receipt to see its role in the story.</small>
      </div>
      <div class="evidence-card-list">
        ${evidence.map(({ finding, source, index }) => `
          <button class="evidence-card" type="button" ${sourceButtonAttributes(source, {
            storyBeat: `Receipt ${String(index + 1).padStart(2, "0")}`,
            usedHere: `This receipt anchors the ${finding.signal || "finding"} step in the investigation story.`,
            supports: finding.whatRecordSays,
            cannotProve: finding.whatItDoesNotProve,
            missingRecord: finding.nextRecord,
            supportType: finding.signal
          })}>
            <div class="receipt-top">
              <span>Receipt ${String(index + 1).padStart(2, "0")}</span>
              <b>${safe(sourceVerificationLabel(source))}</b>
            </div>
            <h4>${safeCopy(finding.signal || finding.entity)}</h4>
            <p>${safeCopy(finding.whatRecordSays)}</p>
            <dl class="receipt-meta">
              <div><dt>Source</dt><dd>${safeCopy(source.title || sourceLabel(source))}</dd></div>
              <div><dt>Why it matters</dt><dd>${safeCopy(finding.whyItMatters || "This moves the claim from hunch to review lead.")}</dd></div>
              <div><dt>Still needed</dt><dd>${safeCopy(finding.nextRecord || "The next record decides the stronger claim.")}</dd></div>
            </dl>
            <em>Open receipt</em>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function claimLadder(casePacket) {
  const claims = casePacket?.dossier?.claimLedger || [];
  if (!claims.length) return "";
  const supported = firstClaimBySupport(claims, /supported/i);
  const partial = claims.find((claim) => /partial/i.test(claim.support || "")) || claims[1] || supported;
  const notReady = claims.find((claim) => /need|requires|missing/i.test(`${claim.limitation || ""} ${claim.nextRecord || ""}`)) || claims[2] || partial;
  const rows = [
    { label: "Supported", claim: supported },
    { label: "Partly supported", claim: partial },
    { label: "Not ready", claim: notReady }
  ].filter((row, index, arr) => row.claim && arr.findIndex((item) => item.claim === row.claim && item.label === row.label) === index);
  return `
    <section class="story-beat claim-ladder">
      <div class="dossier-section-head">
        <b>Claim ladder</b>
        <small>Aculeus separates the useful from the unsafe.</small>
      </div>
      <div class="claim-ladder-list">
        ${rows.map((row) => {
          const source = sourcesByIds(casePacket, row.claim.sourceIds || [])[0] || firstSource(casePacket);
          return `
            <article>
              <span>${safe(row.label)}</span>
              <h4>${safeCopy(row.claim.claim)}</h4>
              <p>${safeCopy(row.claim.support)}</p>
              ${source ? sourceChips([source], {
                storyBeat: row.label,
                usedHere: `This source is tied to the ${row.label.toLowerCase()} rung of the claim ladder.`,
                supports: row.claim.support,
                cannotProve: row.claim.limitation,
                missingRecord: row.claim.nextRecord
              }) : ""}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function missingRecordBlock(casePacket) {
  const nextRecord = casePacket?.nextRecords?.[0];
  const claim = casePacket?.dossier?.claimLedger?.[0];
  const missing = nextRecord?.request || casePacket?.commandCenter?.missing || claim?.nextRecord || "Request the decisive record before escalation.";
  const falsify = claim?.limitation || casePacket?.legalBoundary || "If the missing records do not support the pattern, the claim stops there.";
  return `
    <section class="story-beat missing-record">
      <span>Missing record that decides the case</span>
      <h4>${safeCopy(nextRecord?.holder || "The record holder has the next proof.")}</h4>
      <p>${safeCopy(missing)}</p>
      <small>If the missing record contradicts the pattern, Aculeus holds the claim back: ${safeCopy(falsify)}</small>
    </section>
  `;
}

function actionRoute(casePacket) {
  const action = casePacket?.actions || {};
  return `
    <section class="story-beat action-route">
      <div>
        <span>Action route</span>
        <h4>${safeCopy(action.directMove || "Request the next record.")}</h4>
        <p>${safeCopy(action.coalitionPath || casePacket?.commandCenter?.move || "Route the reviewed packet to a human before anything moves.")}</p>
      </div>
      <button type="button" data-open-draft>Open drafted request</button>
    </section>
  `;
}

function renderCompletionSpine(casePacket, visible = true) {
  if (!completionSpine) return;
  completionSpine.hidden = !visible;
  if (!visible || !casePacket) {
    completionSpine.innerHTML = "";
    return;
  }
  const finding = casePacket?.dossier?.findings?.[0];
  const claim = casePacket?.dossier?.claimLedger?.[0];
  const missing = casePacket?.nextRecords?.[0]?.request || casePacket?.commandCenter?.missing || claim?.nextRecord || "Request the decisive record.";
  completionSpine.innerHTML = `
    <button type="button" data-open-sources>
      <span>Receipts opened</span>
      <strong>${safe(String(primarySources(casePacket, 4).length))}</strong>
      <em>${safeCopy(finding?.signal || "Record trail ready")}</em>
    </button>
    <button type="button" data-open-trail>
      <span>Claim status</span>
      <strong>${safeCopy(claim?.support || "Review lead")}</strong>
      <em>${safeCopy(claim?.claim || casePacket?.dossier?.posture || "Not a final verdict")}</em>
    </button>
    <button type="button" data-open-draft>
      <span>Next move</span>
      <strong>Draft ready</strong>
      <em>${safeCopy(missing)}</em>
    </button>
  `;
}

function resultBrief(casePacket) {
  const dossier = casePacket?.dossier || {};
  return `
    <section class="story-spine">
      ${storyQuestion(casePacket)}
      ${storyHypothesis(casePacket)}
      ${storyStats(casePacket)}
      ${evidenceSpine(casePacket)}
      ${claimLadder(casePacket)}
      ${missingRecordBlock(casePacket)}
      ${actionRoute(casePacket)}
    </section>
  `;
}

function dossierExecutive(dossier, casePacket) {
  const question = dossier?.centralQuestion || casePacket?.lead || "What should the record answer?";
  const finding = dossier?.shortFinding || dossier?.summary || casePacket?.summary || "The record is open.";
  return `
    <section class="dossier-section dossier-executive">
      <div class="dossier-section-head">
        <b>Answer from the run</b>
        <small>What Aculeus can say now.</small>
      </div>
      <div class="executive-answer">
        <p class="executive-question">${safeCopy(question)}</p>
        <p>${safeCopy(finding)}</p>
      </div>
    </section>
  `;
}

function dossierLayers(casePacket) {
  const layers = casePacket?.dossier?.layers || [];
  if (!layers.length) return "";
  return `
    <section class="dossier-section investigation-layers">
      <div class="dossier-section-head">
        <b>How the case opens</b>
        <small>Each layer has a source trail and a limit.</small>
      </div>
      <div class="layer-stack">
        ${layers.map((layer, index) => `
          <article>
            <span>${String(index + 1).padStart(2, "0")} / ${safe(layer.label)}</span>
            <h4>${safeCopy(layer.title)}</h4>
            <p>${safeCopy(layer.body)}</p>
            ${sourceChips(sourcesByIds(casePacket, layer.sourceIds || []), {
                storyBeat: layer.label,
                usedHere: `This source moves the ${layer.label || "reasoning"} layer forward.`,
                supports: layer.body,
                cannotProve: "This layer does not prove final liability without the missing records.",
                missingRecord: casePacket?.nextRecords?.[0]?.request || casePacket?.commandCenter?.missing || "Request the decisive record."
              })}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function dossierClaimLedger(casePacket) {
  const claims = casePacket?.dossier?.claimLedger || [];
  if (!claims.length) return "";
  return `
    <section class="dossier-section claim-ledger">
      <div class="dossier-section-head">
        <b>Claim ledger</b>
        <small>Proof, limit, next record.</small>
      </div>
      <div class="claim-ledger-list">
        ${claims.map((claim) => `
          <article>
            <h4>${safeCopy(claim.claim)}</h4>
            <dl>
              <div><dt>Support</dt><dd>${safeCopy(claim.support)}</dd></div>
              <div><dt>Limit</dt><dd>${safeCopy(claim.limitation)}</dd></div>
              <div><dt>Next record</dt><dd>${safeCopy(claim.nextRecord)}</dd></div>
            </dl>
            ${sourceChips(sourcesByIds(casePacket, claim.sourceIds || []), {
                storyBeat: "Claim ladder",
                usedHere: "This source is tied to a claim Aculeus is testing.",
                supports: claim.support,
                cannotProve: claim.limitation,
                missingRecord: claim.nextRecord
              })}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function dossierSourceMatrix(dossier) {
  const rows = dossier?.sourceMatrix || [];
  if (!rows.length) return "";
  return `
    <section class="dossier-section source-matrix">
      <div class="dossier-section-head">
        <b>Source matrix</b>
        <small>Opened, needed, decisive.</small>
      </div>
      <div class="source-matrix-list">
        ${rows.map((row) => `
          <article>
            <div>
              <span>${safe(row.status)}</span>
              <h4>${safeCopy(row.family)}</h4>
            </div>
            <dl>
              <div><dt>Shows</dt><dd>${safeCopy(row.proves)}</dd></div>
              <div><dt>Still needed</dt><dd>${safeCopy(row.missing)}</dd></div>
            </dl>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function dossierFollowups(dossier) {
  const questions = dossier?.followUpQuestions || [];
  if (!questions.length) return "";
  return `
    <section class="dossier-section followup-questions">
      <div class="dossier-section-head">
        <b>Interrogate the packet</b>
        <small>Answers stay inside the source trail.</small>
      </div>
      <div class="followup-list">
        ${questions.map((question) => `<button type="button" data-followup-question="${safe(question)}">${safeCopy(question)}</button>`).join("")}
      </div>
    </section>
  `;
}

function dossierFindings(casePacket) {
  const findings = casePacket?.dossier?.findings || [];
  if (!findings.length) return "";
  return `
    <section class="dossier-section dossier-findings">
      <div class="dossier-section-head">
        <b>Findings that can move</b>
        <small>Every line stays tied to a receipt.</small>
      </div>
      <ol>
        ${findings.map((finding, index) => `
          <li>
            <div class="finding-index">${String(index + 1).padStart(2, "0")}</div>
            <div class="finding-copy">
              <em>${safeCopy(finding.signal)}</em>
              <strong>${safeCopy(finding.entity)}</strong>
              <p>${safeCopy(finding.whatRecordSays)}</p>
              <details>
                <summary>Why it matters</summary>
                <div>
                  <p>${safeCopy(finding.whyItMatters)}</p>
                  <p><b>Does not prove:</b> ${safeCopy(finding.whatItDoesNotProve)}</p>
                  <p><b>Next record:</b> ${safeCopy(finding.nextRecord)}</p>
                </div>
              </details>
              <div class="dossier-links">
                ${sourceRefsForFinding(finding, casePacket).map((source) => `
                  <button type="button" ${sourceButtonAttributes(source, {
                    storyBeat: finding.signal,
                    usedHere: `This receipt supports the finding about ${finding.entity}.`,
                    supports: finding.whatRecordSays,
                    cannotProve: finding.whatItDoesNotProve,
                    missingRecord: finding.nextRecord,
                    supportType: finding.signal
                  })}>${safe(sourceLabel(source))}</button>
                `).join("")}
                ${finding.sourceUrl ? `<a href="${safe(finding.sourceUrl)}" target="_blank" rel="noreferrer">Open public source</a>` : ""}
              </div>
            </div>
          </li>
        `).join("")}
      </ol>
    </section>
  `;
}

function dossierEntityFolders(dossier) {
  const folders = dossier?.entityFolders || [];
  if (!folders.length) return "";
  return `
    <section class="dossier-section dossier-entities">
      <div class="dossier-section-head">
        <b>Entity folders</b>
        <small>Open the file before forming the claim.</small>
      </div>
      <div class="entity-folder-list">
        ${folders.map((folder) => `
          <details>
            <summary>
              <strong>${safeCopy(folder.entity)}</strong>
              <em>${safe(folder.receipts)} receipts</em>
            </summary>
            <p>${safeCopy(folder.signal)}</p>
            <p><b>Gap:</b> ${safeCopy(folder.gap)}</p>
            <p><b>Move:</b> ${safeCopy(folder.nextMove)}</p>
          </details>
        `).join("")}
      </div>
    </section>
  `;
}

function dossierSourceGroups(dossier) {
  const groups = dossier?.sourceGroups || [];
  if (!groups.length) return "";
  return `
    <section class="dossier-section dossier-source-groups">
      <div class="dossier-section-head">
        <b>Source map</b>
        <small>Opened, partial, missing.</small>
      </div>
      <div class="source-group-list">
        ${groups.map((group) => `
          <div>
            <strong>${safeCopy(group.label)}</strong>
            <em>${safeCopy(group.status)}</em>
            <p>${safeCopy(group.detail)}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function dossierNextMoves(dossier) {
  const moves = dossier?.nextMoves || [];
  if (!moves.length) return "";
  return `
    <section class="dossier-section dossier-next">
      <div class="dossier-section-head">
        <b>What happens next</b>
        <small>The work becomes action.</small>
      </div>
      <ol>
        ${moves.map((move) => `<li>${safeCopy(move)}</li>`).join("")}
      </ol>
    </section>
  `;
}

function dossierItem(casePacket) {
  const dossier = casePacket?.dossier;
  if (!dossier || !runFeed) return null;
  const item = document.createElement("li");
  item.className = "feed-item is-dossier";
  item.innerHTML = `
    <article class="dossier-room">
      <span>Review lead opened</span>
      <div class="case-thread-title">${safeCopy(dossier.title || casePacket.title || "Aculeus source run")}</div>
      <h3>The record supports a review lead. Not a final verdict.</h3>
      <p>${safeCopy(dossier.deck || dossier.summary || casePacket.summary || "The source trail is live and queryable.")}</p>
      <div class="dossier-posture">${safeCopy(dossier.posture || "Review lead")}</div>
      ${resultBrief(casePacket)}
      <details class="proof-drawer">
        <summary>Open the full proof artifact</summary>
        ${dossierExecutive(dossier, casePacket)}
        ${dossierLayers(casePacket)}
        ${dossierFindings(casePacket)}
        ${dossierClaimLedger(casePacket)}
        <div class="dossier-lower-grid">
          ${dossierEntityFolders(dossier)}
          ${dossierSourceMatrix(dossier) || dossierSourceGroups(dossier)}
        </div>
        ${dossierNextMoves(dossier)}
      </details>
      ${dossierFollowups(dossier)}
    </article>
  `;
  runFeed.appendChild(item);
  requestAnimationFrame(() => {
    item.classList.add("is-complete");
    if (window.gsap) {
      window.gsap.fromTo(item, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" });
    }
  });
  return item;
}

function archiveRunPrelude() {
  runFeed?.querySelectorAll(".feed-item:not(.is-dossier):not(.is-result):not(.is-answer)").forEach((item) => {
    item.classList.add("is-archived");
  });
}

function inlineActions() {
  return `
    <div class="inline-actions">
      <button type="button" data-open-sources>Inspect source</button>
      <button type="button" data-open-trail>Show trail</button>
      <button type="button" data-open-draft>Draft next move</button>
    </div>
  `;
}

function feedItem({ type = "agent", kicker, title, body, sources = [], uncertainty = [], actions = false }) {
  const item = document.createElement("li");
  item.className = `feed-item is-${type}`;
  item.innerHTML = `
    <article>
      <span>${safeCopy(kicker)}</span>
      ${title ? `<h3>${safeCopy(title)}</h3>` : ""}
      <p>${safeCopy(body)}</p>
      ${uncertainty.length ? `<div class="uncertainty-row">${uncertainty.map((line) => `<span>${safeCopy(line)}</span>`).join("")}</div>` : ""}
      ${sourceChips(sources, (source) => ({
        storyBeat: title || kicker,
        usedHere: `Aculeus cited ${sourceLabel(source)} for this step in the run.`,
        supports: body,
        cannotProve: source.limitation || "This source does not prove the whole case by itself.",
        missingRecord: currentCase?.nextRecords?.[0]?.request || currentCase?.commandCenter?.missing || "Request the decisive record."
      }))}
      ${actions ? inlineActions() : ""}
    </article>
  `;
  runFeed?.appendChild(item);
  requestAnimationFrame(() => {
    item.classList.add("is-complete");
    if (window.gsap) {
      window.gsap.fromTo(item, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "power3.out" });
    }
  });
  return item;
}

function answerSignal(answer) {
  const text = brandPlain(answer?.answer || "");
  const signalMatch = text.match(/Strongest (?:record trail signals|source trail signals|findings):\s*(.+)$/i);
  if (signalMatch) return signalMatch[1].split(". ").slice(0, 1).join(". ").trim();
  const evidenceMatch = text.match(/The strongest evidence is\s+(.+?)(?:\.\s+The next move|\.$)/i);
  if (evidenceMatch) return evidenceMatch[1].trim();
  return text.split(/(?<=\.)\s+/).slice(0, 2).join(" ").trim() || "The record trail does not support a stronger answer yet.";
}

function answerFeedItem(question, answer, sources = []) {
  const item = document.createElement("li");
  item.className = "feed-item is-answer";
  const missing = answer.missingRecords?.[0] || answer.safeNextMove || "No stronger move until the next record is opened.";
  const signal = answerSignal(answer);
  item.innerHTML = `
    <article class="answer-card">
      <span>Source-locked answer</span>
      <h3>${answer.supportLevel === "unsupported" ? "The record stops there." : "Answer from the record."}</h3>
      <div class="answer-grid">
        <section>
          <b>Question</b>
          <p>${safeCopy(question)}</p>
        </section>
        <section>
          <b>Strongest signal</b>
          <p>${safeCopy(signal)}</p>
        </section>
        <section>
          <b>Receipts</b>
          ${sourceChips(sources, (source) => ({
            storyBeat: "Q&A support",
            usedHere: `Aculeus cited ${sourceLabel(source)} to answer the user's question.`,
            supports: answer.answer,
            cannotProve: source.limitation || "This source does not prove a final verdict.",
            missingRecord: missing
          })) || "<p>No source supports a stronger answer yet.</p>"}
        </section>
        <section>
          <b>Still missing</b>
          <p>${safeCopy(missing)}</p>
        </section>
        <section>
          <b>Next request</b>
          <p>${safeCopy(answer.safeNextMove || missing)}</p>
        </section>
      </div>
      <details class="answer-full">
        <summary>Read full answer</summary>
        <p>${safeCopy(answer.answer || "The record trail does not support a stronger answer yet.")}</p>
      </details>
      ${inlineActions()}
    </article>
  `;
  runFeed?.appendChild(item);
  requestAnimationFrame(() => {
    item.classList.add("is-complete");
    if (window.gsap) {
      window.gsap.fromTo(item, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "power3.out" });
    }
  });
  return item;
}

function clearRunTimers() {
  runTimers.forEach((timer) => clearTimeout(timer));
  runTimers = [];
}

function schedule(delay, task) {
  const timer = setTimeout(task, delay);
  runTimers.push(timer);
}

function resetRun() {
  clearRunTimers();
  if (runFeed) runFeed.innerHTML = "";
  resetSourceContexts();
  latestAnswerItem = null;
  if (commandAnswer) commandAnswer.hidden = true;
  renderCompletionSpine(null, false);
  setText("[data-answer-kicker]", "Waiting for lead");
  setText("[data-answer-headline]", "Ask the record. Watch the run.");
  setText("[data-answer-body]", "Aculeus dispatches a controlled investigation, opens permitted sources, separates proof from suspicion, and names the next record.");
  setRunState("idle", "Ready");
  renderTrail(currentCase, -1);
  closeSheets();
}

async function startRun() {
  const baseCase = selectedCase();
  if (!baseCase) return;
  clearRunTimers();
  if (runFeed) runFeed.innerHTML = "";
  resetSourceContexts();
  latestAnswerItem = null;
  if (commandAnswer) commandAnswer.hidden = true;
  renderCompletionSpine(null, false);

  const lead = (leadInput?.value || baseCase.lead || "").trim();
  setRunState("running", "Running");
  setText("[data-run-title]", baseCase.title || "Aculeus source run");
  setText("[data-case-display-id]", baseCase.displayId || "Run");
  setText("[data-answer-kicker]", "Run started");
  setText("[data-answer-headline]", "Dispatching the agent.");
  setText("[data-answer-body]", "Aculeus is scoping the lead, opening source families, mapping actors and money, and holding unsupported claims back.");
  renderTrail(baseCase, 0);

  feedItem({
    type: "user",
    kicker: "Lead",
    title: "Dispatch this question.",
    body: lead || baseCase.lead || "Open the public-record trail."
  });

  let investigated = baseCase;
  try {
    investigated = await window.AculeusModelAdapter.investigate(lead || baseCase.lead, baseCase.caseId);
  } catch {
    investigated = baseCase;
  }

  currentCase = investigated;
  activeSourceId = firstSource(currentCase)?.sourceId || activeSourceId;
  renderDraft(currentCase);
  renderSourceSheet(firstSource(currentCase));

  const steps = runSteps(currentCase);
  const sources = primarySources(currentCase, 3);
  const missing = currentCase.commandCenter?.missing || currentCase.nextRecords?.[0]?.request || "The missing record decides the next move.";
  const proofBody = Array.isArray(currentCase.commandCenter?.proof)
    ? currentCase.commandCenter.proof.join(" ")
    : currentCase.commandCenter?.proof || currentCase.summary;

  schedule(1250, () => {
    renderTrail(currentCase, 1);
    setText("[data-answer-kicker]", "Plan created");
    setText("[data-answer-headline]", "The scope is live.");
    setText("[data-answer-body]", brandPlain(currentCase.dossier?.centralQuestion || "The agent retrieves records first, then answers only from the source trail."));
    feedItem({
      kicker: "Scope",
      title: "Turn the question into a run.",
      body: currentCase.dossier?.centralQuestion || "Aculeus converts the lead into source families, actors, claims, gaps, and actions.",
      uncertainty: ["No guessing", "Source first", "Human approval required"]
    });
  });

  schedule(3800, () => {
    renderTrail(currentCase, 2);
    setText("[data-answer-kicker]", "Sources opened");
    setText("[data-answer-headline]", "The source trail is open.");
    setText("[data-answer-body]", brandPlain(proofBody || "The source trail is open."));
    feedItem({
      type: "source",
      kicker: "Sources",
      title: "The run opens the record.",
      body: proofBody || "Aculeus opened the source family and linked the record references.",
      sources,
      actions: true
    });
  });

  schedule(7100, () => {
    renderTrail(currentCase, 4);
    setText("[data-answer-kicker]", "Uncertainty flagged");
    setText("[data-answer-headline]", "The gap is the work.");
    setText("[data-answer-body]", brandPlain(missing));
    feedItem({
      kicker: "Uncertainty",
      title: "Do not outrun the record.",
      body: missing,
      uncertainty: ["Partial record", "Proof required", "Escalate missing files"],
      sources: primarySources(currentCase, 2)
    });
  });

  schedule(10100, () => {
    renderTrail(currentCase, Math.min(5, steps.length - 1));
    archiveRunPrelude();
    setText("[data-answer-kicker]", "Investigation opened");
    setText("[data-answer-headline]", brandPlain(currentCase.dossier?.deck || "The case is alive now."));
    setText("[data-answer-body]", brandPlain(currentCase.dossier?.summary || currentCase.summary || "The deeper findings are source-linked and queryable."));
    dossierItem(currentCase);
  });

  schedule(13200, () => {
    renderTrail(currentCase, steps.length - 1);
    setText("[data-answer-kicker]", "Next move ready");
    setText("[data-answer-headline]", "The next record is clear.");
    setText("[data-answer-body]", "Aculeus opened the record trail, separated supported claims from unsupported claims, named the missing records, and drafted the next request for human review.");
    renderCompletionSpine(currentCase, true);
    setRunState("complete", "Next move ready");
  });
}

function setCommandBusy(isBusy) {
  if (commandInput) commandInput.disabled = isBusy;
  const sendButton = commandForm?.querySelector(".send-command");
  if (sendButton) sendButton.disabled = isBusy;
}

function renderCommandAnswer(answer, sources) {
  if (!commandAnswer || !commandAnswerText) return;
  commandAnswer.hidden = false;
  if (commandAnswerLabel) {
    commandAnswerLabel.textContent = answer.supportLevel === "unsupported" ? "The record stops there" : "Source-locked answer";
  }
  const missing = answer.missingRecords?.[0] || answer.safeNextMove || "No stronger move until the next record is opened.";
  const support = sources.length
    ? sources.map(sourceLabel).slice(0, 3).join(" + ")
    : "No cited record supports a stronger answer yet.";
  const signal = answerSignal(answer);
  commandAnswerText.innerHTML = `
    <div class="command-answer-core">
      <section>
        <b>Strongest signal</b>
        <p>${safeCopy(signal)}</p>
      </section>
      <section>
        <b>Receipts</b>
        <p>${safeCopy(support)}</p>
      </section>
      <section>
        <b>Still missing</b>
        <p>${safeCopy(missing)}</p>
      </section>
      <section>
        <b>Next request</b>
        <p>${safeCopy(answer.safeNextMove || missing)}</p>
      </section>
    </div>
    <details class="command-answer-full">
      <summary>Read full reasoning</summary>
      <p>${safeCopy(answer.answer || "The record trail does not support a stronger answer yet.")}</p>
    </details>
  `;
}

async function askCommand(event) {
  event.preventDefault();
  const question = commandInput?.value.trim();
  if (!question || !currentCase) return;
  commandInput.value = "";
  setCommandBusy(true);

  feedItem({
    type: "user",
    kicker: "Question",
    body: question
  });

  setText("[data-run-status]", "Answering");
  setText("[data-command-status]", "Aculeus is checking the source trail.");
  try {
    const answer = await window.AculeusModelAdapter.askCaseQuestion({
      question,
      casePacket: currentCase
    });
    const sourceRefs = answer.sourceRefs || [];
    const sources = [...sourcesByIds(currentCase, sourceRefs)].sort((left, right) => sourceWeight(left) - sourceWeight(right));

    renderCommandAnswer(answer, sources);
    const answerItem = answerFeedItem(question, answer, sources);
    latestAnswerItem = answerItem;
    answerItem?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (answer.safeNextMove) {
      setText("[data-draft-request]", brandPlain(answer.safeNextMove));
    }
    setRunState("complete", "Answer ready");
    setText("[data-command-status]", "Answer added below. Ask another question.");
  } catch {
    setText("[data-command-status]", "Answer failed. Try again.");
  } finally {
    setCommandBusy(false);
    commandInput?.focus();
  }
}

function openSheet(name) {
  Object.entries(sheets).forEach(([key, sheet]) => {
    if (!sheet) return;
    sheet.hidden = key !== name;
  });
  if (name === "source") renderSourceSheet(undefined, activeSourceContext);
  if (name === "draft") renderDraft(currentCase);
  document.body.classList.add("has-open-sheet");
}

function closeSheets() {
  Object.values(sheets).forEach((sheet) => {
    if (sheet) sheet.hidden = true;
  });
  document.body.classList.remove("has-open-sheet");
}

function copyRequest() {
  const request = currentCase?.actions?.requestLanguage || document.querySelector("[data-draft-request]")?.textContent || "";
  if (request) navigator.clipboard?.writeText(request).catch(() => {});
  setText("[data-action-status]", "Request copied. Human approval still required.");
}

function approveAction() {
  setText("[data-action-status]", "Next move approved inside the demo. Nothing was sent.");
}

function showActiveSourceCitation() {
  if (!activeSourceId) return;
  const sourceButton = runFeed?.querySelector(`[data-source-ref="${CSS.escape(activeSourceId)}"]`);
  closeSheets();
  sourceButton?.scrollIntoView({ behavior: "smooth", block: "center" });
  sourceButton?.classList.add("is-source-flash");
  window.setTimeout(() => sourceButton?.classList.remove("is-source-flash"), 1300);
}

function askAboutActiveSource() {
  const source = sourceById(currentCase, activeSourceId);
  if (!source || !commandInput) return;
  closeSheets();
  commandInput.value = `What exactly does ${sourceLabel(source)} prove, and what record is still missing?`;
  commandInput.focus();
}

function updateCounter() {
  if (!counter || !leadInput) return;
  counter.textContent = `${leadInput.value.length} / ${leadInput.maxLength || 320}`;
}

function loadSampleLead() {
  const demo = selectedCase();
  if (!leadInput || !demo) return;
  leadInput.value = demo.lead || "";
  updateCounter();
  leadInput.focus();
}

async function submitSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  setText("[data-account-status]", "Sending request.");
  const response = await window.AculeusModelAdapter.createAccount(payload);
  setText("[data-account-status]", response?.ok ? "Request received." : response?.message || "Request saved locally for demo.");
  if (response?.ok) form.reset();
}

function initCursor() {
  if (!cursorLaser || window.matchMedia("(max-width: 800px)").matches) return;
  document.body.classList.add("has-custom-cursor");
  window.addEventListener("pointermove", (event) => {
    document.body.classList.add("is-cursor-active");
    cursorLaser.style.transform = `translate3d(${event.clientX - 6.5}px, ${event.clientY - 6.5}px, 0px)`;
  }, { passive: true });
  window.addEventListener("pointerleave", () => {
    document.body.classList.remove("is-cursor-active");
  });
}

function bindEvents() {
  leadInput?.addEventListener("input", updateCounter);
  leadForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    startRun();
  });
  commandForm?.addEventListener("submit", askCommand);
  commandInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    commandForm?.requestSubmit();
  });
  commandAnswerJump?.addEventListener("click", () => {
    latestAnswerItem?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.querySelectorAll("[data-start-investigation]").forEach((button) => button.addEventListener("click", startRun));
  document.querySelectorAll("[data-sample-lead]").forEach((button) => button.addEventListener("click", loadSampleLead));
  document.querySelectorAll("[data-reset-run]").forEach((button) => button.addEventListener("click", resetRun));
  document.querySelectorAll("[data-open-sources]").forEach((button) => button.addEventListener("click", () => openSheet("source")));
  document.querySelectorAll("[data-open-trail]").forEach((button) => button.addEventListener("click", () => openSheet("trail")));
  document.querySelectorAll("[data-open-draft]").forEach((button) => button.addEventListener("click", () => openSheet("draft")));
  document.querySelectorAll("[data-open-account]").forEach((button) => button.addEventListener("click", () => openSheet("account")));
  document.querySelectorAll("[data-close-sheet]").forEach((button) => button.addEventListener("click", closeSheets));
  document.querySelectorAll("[data-copy-request]").forEach((button) => button.addEventListener("click", copyRequest));
  document.querySelectorAll("[data-approve-action]").forEach((button) => button.addEventListener("click", approveAction));
  sourceCiteButton?.addEventListener("click", showActiveSourceCitation);
  sourceAskButton?.addEventListener("click", askAboutActiveSource);
  completionSpine?.addEventListener("click", (event) => {
    if (event.target.closest("[data-open-sources]")) openSheet("source");
    if (event.target.closest("[data-open-trail]")) openSheet("trail");
    if (event.target.closest("[data-open-draft]")) openSheet("draft");
  });
  signupForm?.addEventListener("submit", submitSignup);

  caseList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-demo-case-id]");
    if (!button) return;
    currentCase = demoCases.find((casePacket) => casePacket.caseId === button.dataset.demoCaseId) || currentCase;
    activeSourceId = firstSource(currentCase)?.sourceId || "";
    setLeadFromCase(currentCase, true);
    renderCaseSwitcher();
    renderTrail(currentCase, -1);
    renderDraft(currentCase);
    renderSourceSheet(firstSource(currentCase));
  });

  runFeed?.addEventListener("click", (event) => {
    const followupButton = event.target.closest("[data-followup-question]");
    if (followupButton) {
      if (commandInput) commandInput.value = followupButton.dataset.followupQuestion || "";
      commandForm?.requestSubmit();
      return;
    }
    const sourceButton = event.target.closest("[data-source-ref]");
    if (sourceButton) {
      const source = sourceById(currentCase, sourceButton.dataset.sourceRef);
      const context = sourceContextRegistry.get(sourceButton.dataset.sourceContext || "") || null;
      renderSourceSheet(source, context);
      openSheet("source");
      return;
    }
    if (event.target.closest("[data-open-sources]")) openSheet("source");
    if (event.target.closest("[data-open-trail]")) openSheet("trail");
    if (event.target.closest("[data-open-draft]")) openSheet("draft");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSheets();
  });
}

function initMotion() {
  if (!window.gsap) return;
  window.gsap.fromTo(".lead-panel", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" });
}

function init() {
  renderCaseSwitcher();
  setLeadFromCase(currentCase);
  renderTrail(currentCase, -1);
  renderDraft(currentCase);
  renderSourceSheet(firstSource(currentCase));
  updateCounter();
  bindEvents();
  initCursor();
  window.addEventListener("load", () => {
    window.lucide?.createIcons();
    initMotion();
  });
}

init();
