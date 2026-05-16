import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const jsonPath = resolve(root, "data", "source-fed-case-board.json");
const jsPath = resolve(root, "data", "source-fed-case-board.js");
const apiPath = resolve(root, "api", "source-fed-case-board.js");
const pagePath = resolve(root, "source-fed.html");
const pageScriptPath = resolve(root, "source-fed.js");
const pageStylePath = resolve(root, "source-fed.css");
const runnerPath = resolve(root, "lib", "aculeus-investigation-runner.js");
const officialRouterPath = resolve(root, "lib", "aculeus-official-source-router.js");
const officialExecutorPath = resolve(root, "lib", "aculeus-official-api-executor.js");
const providerPath = resolve(root, "lib", "aculeus-provider-candidates.js");
const providerExecutorPath = resolve(root, "lib", "aculeus-provider-executor.js");
const reviewerActionsPath = resolve(root, "lib", "aculeus-reviewer-actions.js");
const storePath = resolve(root, "lib", "aculeus-run-store.js");
const runApiPath = resolve(root, "api", "investigation-runs.js");

if (!existsSync(jsonPath) || !existsSync(jsPath) || !existsSync(apiPath) || !existsSync(pagePath) || !existsSync(pageScriptPath) || !existsSync(pageStylePath) || !existsSync(runnerPath) || !existsSync(officialRouterPath) || !existsSync(officialExecutorPath) || !existsSync(providerPath) || !existsSync(providerExecutorPath) || !existsSync(reviewerActionsPath) || !existsSync(storePath) || !existsSync(runApiPath)) {
  console.error("Missing generated source-fed case-board data files.");
  process.exit(1);
}

const library = JSON.parse(readFileSync(jsonPath, "utf8"));
const jsText = readFileSync(jsPath, "utf8");
const apiText = readFileSync(apiPath, "utf8");
const pageText = `${readFileSync(pagePath, "utf8")}\n${readFileSync(pageScriptPath, "utf8")}\n${readFileSync(pageStylePath, "utf8")}`;
const runnerText = readFileSync(runnerPath, "utf8");
const officialRouterText = readFileSync(officialRouterPath, "utf8");
const officialExecutorText = readFileSync(officialExecutorPath, "utf8");
const providerText = readFileSync(providerPath, "utf8");
const providerExecutorText = readFileSync(providerExecutorPath, "utf8");
const reviewerActionsText = readFileSync(reviewerActionsPath, "utf8");
const storeText = readFileSync(storePath, "utf8");
const runApiText = readFileSync(runApiPath, "utf8");

if (library.mode !== "source_fed_case_board") {
  console.error("Expected source_fed_case_board mode.");
  process.exit(1);
}
if (!library.runStatus || !library.runStatus.nextSpendDecision || !library.runStatus.accessCaptureGate) {
  console.error("Expected imported source-fed run status.");
  process.exit(1);
}
if (!library.fourPromptReadiness || library.fourPromptReadiness.caseCount !== 4 || !Array.isArray(library.fourPromptReadiness.rows)) {
  console.error("Expected imported four-prompt readiness matrix.");
  process.exit(1);
}
if (!library.missingRecordWorkOrders || library.missingRecordWorkOrders.taskCount < 10 || !Array.isArray(library.missingRecordWorkOrders.tasks)) {
  console.error("Expected imported missing-record work orders.");
  process.exit(1);
}
if (!library.trainingStatus || !library.trainingStatus.modelDecision || !library.trainingStatus.splitDecision) {
  console.error("Expected imported source-fed training/model gate status.");
  process.exit(1);
}
if (
  library.runStatus.primeLiveCheckpointReadyTotal !== 0 ||
  library.runStatus.primeLiveCheckpointPaidTrainingAllowed !== false ||
  library.runStatus.crossPublisherRowScopeVerifiedRows < 50 ||
  library.runStatus.crossPublisherRowScopeEvalBlocked !== 0 ||
  library.runStatus.crossPublisherRowScopeTrainingConversionAllowed !== false ||
  library.runStatus.officialApiRowExpansionV2RowSamples < 50 ||
  library.runStatus.officialApiRowExpansionV2Surfaces < 3 ||
  library.runStatus.officialApiRowExpansionV2TrainingConversionAllowed !== false ||
  library.runStatus.officialApiRowScopeFeedbackV2Rows < 50 ||
  library.runStatus.officialApiRowScopeFeedbackV2Surfaces < 3 ||
  library.runStatus.officialApiRowScopeFeedbackV2RejectedClaims < 150 ||
  library.runStatus.officialApiRowScopeFeedbackV2EvalBlocked !== 0 ||
  library.runStatus.officialApiRowScopeFeedbackV2EvalTrainingConversionAllowed !== false ||
  library.runStatus.lacityLahsaContractFetchFetched < 11 ||
  library.runStatus.lacityLahsaContractFetchUsableExcerpts < 11 ||
  library.runStatus.lacityLahsaContractFetchNeedsOcr !== 0 ||
  library.runStatus.lacityLahsaContractFetchFindingPromotionAllowed !== false ||
  library.runStatus.lacityLahsaContractPdfTextExtracted < 9 ||
  library.runStatus.lacityLahsaContractPdfTextFailed !== 0 ||
  library.runStatus.lacityLahsaContractPdfTextCapped !== 0 ||
  library.runStatus.lacityLahsaContractPdfFieldAtomsVerified < 8 ||
  library.runStatus.lacityLahsaContractPdfFieldAtomsBroaderClaimsAllowed !== false ||
  library.runStatus.lacityLahsaContractPdfFieldAtomsTrainingConversionAllowed !== false ||
  library.runStatus.lacityLahsaContractPdfAtomFeedbackRows < 8 ||
  library.runStatus.lacityLahsaContractPdfAtomFeedbackRejectedClaims < 32 ||
  library.runStatus.lacityLahsaContractPdfAtomFeedbackEvalBlocked !== 0 ||
  library.runStatus.lacityLahsaContractPdfAtomFeedbackEvalTrainingConversionAllowed !== false ||
  library.runStatus.sfgovHealthrightCrawlerFetched < 20 ||
  library.runStatus.sfgovHealthrightCrawlerQualityDecision !== "CRAWLER_FETCH_BATCH_READY_FOR_LEDGER_UNVERIFIED" ||
  library.runStatus.sfgovHealthrightCrawlerFindingPromotionAllowed !== false ||
  library.runStatus.sfgovHealthrightCrawlerDirectEntityExcerpts < 1 ||
  library.runStatus.sfgovHealthrightCrawlerTopicContextOnly < 1 ||
  library.runStatus.sfgovHealthrightCrawlerExcerptTermsDecision !== "SFGOV_HEALTHRIGHT_CRAWLER_EXCERPT_TERMS_TRIAGED_NO_PROMOTION" ||
  library.runStatus.sfgovHealthrightCrawlerFundingExcerptVerifiedFacts < 5 ||
  library.runStatus.sfgovHealthrightCrawlerFundingExcerptNarrowPromotionAllowed !== true ||
  library.runStatus.sfgovHealthrightCrawlerFundingExcerptBroaderClaimsAllowed !== false ||
  library.runStatus.sfgovHealthrightCrawlerFundingFeedbackRows < 5 ||
  library.runStatus.sfgovHealthrightCrawlerFundingFeedbackRejectedClaims < 15 ||
  library.runStatus.sfgovHealthrightCrawlerFundingFeedbackEvalBlocked !== 0
) {
  console.error("Expected source-fed run status to expose checkpoint hold, row-scope eval coverage, and crawler quality gates.");
  process.exit(1);
}
if (!Array.isArray(library.cases) || library.cases.length < 4) {
  console.error("Expected at least four imported source-fed cases.");
  process.exit(1);
}
if (!jsText.includes("window.ACULEUS_SOURCE_FED_CASE_BOARD")) {
  console.error("Expected browser global for source-fed case board.");
  process.exit(1);
}
if (!apiText.includes("source_fed_case_board")) {
  console.error("Expected source-fed case-board API mode.");
  process.exit(1);
}
if (!runnerText.includes("fixture_backed_investigation_run") || !runnerText.includes("provider_calls_executed") || !runnerText.includes("retrieval_queue") || !runnerText.includes("audit_trail") || !runnerText.includes("cost_ledger") || !runApiText.includes("createInvestigationRun")) {
  console.error("Expected fixture-backed investigation run API and runner contract.");
  process.exit(1);
}
if (!runnerText.includes("official_api_tasks") || !officialRouterText.includes("planOfficialApiTasks") || !officialRouterText.includes("candidate_only_until_receipted")) {
  console.error("Expected official API router to plan candidate-only official-source tasks.");
  process.exit(1);
}
if (!officialExecutorText.includes("executeOfficialApiTasks") || !officialExecutorText.includes("receipt_required") || !officialExecutorText.includes("evidence_promotion_allowed: false")) {
  console.error("Expected official API executor to fetch public API records without promotion before receipt gate.");
  process.exit(1);
}
if (!runnerText.includes("provider_candidate_tasks") || !providerText.includes("planProviderCandidateTasks") || !providerText.includes("provider_search_candidate") || !providerText.includes("candidate_lead_not_evidence")) {
  console.error("Expected provider adapter to plan candidate-only provider search tasks.");
  process.exit(1);
}
if (!providerExecutorText.includes("executeProviderCandidateTasks") || !providerExecutorText.includes("COST_CAPPED") || !providerExecutorText.includes("receipt_required")) {
  console.error("Expected provider executor to support capped paid-provider candidate execution.");
  process.exit(1);
}
if (!reviewerActionsText.includes("reviewCandidatePromotion") || !reviewerActionsText.includes("source_promoted_to_evidence") || !reviewerActionsText.includes("verifyReceiptCitation")) {
  console.error("Expected reviewer actions to gate source promotion through receipt/citation verification.");
  process.exit(1);
}
if (!storeText.includes("createFileRunStore") || !runApiText.includes(".local/investigation-runs") || !readFileSync(resolve(root, ".gitignore"), "utf8").includes(".local/")) {
  console.error("Expected non-public local run store contract.");
  process.exit(1);
}
if (!pageText.includes("data-case-board") || !pageText.includes("Findings Table") || !pageText.includes("Evidence Rail")) {
  console.error("Expected visible source-fed case-board route.");
  process.exit(1);
}
if (!pageText.includes("Action Brief") || !pageText.includes("What we found") || !pageText.includes("Quick next steps")) {
  console.error("Expected source-fed route to render Action Brief as the first decision surface.");
  process.exit(1);
}
if (!pageText.includes("Live Investigation Scaffold") || !pageText.includes("hardenInvestigationQuery") || !pageText.includes("Harden and simulate run") || !pageText.includes("/api/investigation-runs")) {
  console.error("Expected source-fed route to render fixture-backed live investigation scaffold.");
  process.exit(1);
}
if (!pageText.includes("provider_candidate_tasks") || !pageText.includes("provider_candidates")) {
  console.error("Expected live scaffold to show provider candidate tasks and candidates.");
  process.exit(1);
}
if (!pageText.includes("Candidate lead — not evidence") || !pageText.includes("data-candidate-leads")) {
  console.error("Expected source-fed route to visibly separate candidate leads from evidence.");
  process.exit(1);
}
if (!pageText.includes("Source Ledger") || !pageText.includes("data-source-ledger-summary") || !pageText.includes("Needs Records Request")) {
  console.error("Expected source-fed route to render source-ledger status summary.");
  process.exit(1);
}
if (!pageText.includes("Official Award Facts") || !pageText.includes("officialAwardFacts")) {
  console.error("Expected source-fed route to render official award facts.");
  process.exit(1);
}
if (!pageText.includes("Official State/Local Row Facts") || !pageText.includes("officialStateLocalRowFacts")) {
  console.error("Expected source-fed route to render official state/local row facts.");
  process.exit(1);
}
if (!pageText.includes("Official LA Controller Row Facts") || !pageText.includes("officialLacityControllerRowFacts")) {
  console.error("Expected source-fed route to render official LA Controller row facts.");
  process.exit(1);
}
if (!pageText.includes("Official LAHSA Contract PDF Facts") || !pageText.includes("officialLacityLahsaContractPdfFacts")) {
  console.error("Expected source-fed route to render official LAHSA contract PDF facts.");
  process.exit(1);
}
if (!pageText.includes("Official SF Data HealthRIGHT Row Facts") || !pageText.includes("officialSfgovHealthrightFinancialRowFacts")) {
  console.error("Expected source-fed route to render official SF Data HealthRIGHT row facts.");
  process.exit(1);
}
if (!pageText.includes("Official OCR Vendor Facts") || !pageText.includes("officialOcrVendorFacts")) {
  console.error("Expected source-fed route to render official OCR vendor facts.");
  process.exit(1);
}
if (!pageText.includes("Browser Capture Queue") || !pageText.includes("browserCaptureTasks")) {
  console.error("Expected source-fed route to render browser capture tasks.");
  process.exit(1);
}
if (!pageText.includes("Public Records Requests") || !pageText.includes("publicRecordsRequestPacket")) {
  console.error("Expected source-fed route to render public-records request packet.");
  process.exit(1);
}
if (!pageText.includes("SFDPH Scope Parity") || !pageText.includes("sfdphScopeParity")) {
  console.error("Expected source-fed route to render SFDPH scope parity.");
  process.exit(1);
}
if (!pageText.includes("CHIRLA Official Record Scope") || !pageText.includes("chirlaOfficialRecordScope")) {
  console.error("Expected source-fed route to render CHIRLA official-record scope.");
  process.exit(1);
}
if (!pageText.includes("CAL-ACCESS Entity Lookup") || !pageText.includes("calaccessEntityLookup")) {
  console.error("Expected source-fed route to render CAL-ACCESS entity lookup.");
  process.exit(1);
}
if (!pageText.includes("Four Prompt Readiness") || !pageText.includes("fourPromptReadiness")) {
  console.error("Expected source-fed route to render four-prompt readiness.");
  process.exit(1);
}
if (!pageText.includes("Missing Record Work Orders") || !pageText.includes("missingRecordWorkOrders")) {
  console.error("Expected source-fed route to render missing-record work orders.");
  process.exit(1);
}
if (library.fourPromptReadiness.rows.some((row) => row.status !== "PASS" || row.trainingConversionAllowed !== false || row.findingCount < 1 || row.sourceCount < 1)) {
  console.error("Four-prompt readiness matrix has an unsafe or incomplete row.");
  process.exit(1);
}
if (library.missingRecordWorkOrders.tasks.some((task) => !task.taskId || !task.caseId || task.findingPromotionAllowed !== false || task.trainingConversionAllowed !== false)) {
  console.error("Missing-record work orders have unsafe or incomplete tasks.");
  process.exit(1);
}
if (!pageText.includes("Retrieval Gate") || !pageText.includes("accessCaptureGate") || !pageText.includes("nextSpendDecision")) {
  console.error("Expected source-fed retrieval gate to render provider/access-gap status.");
  process.exit(1);
}
if (!pageText.includes("Model Gate") || !pageText.includes("canonicalizedGateGreen") || !pageText.includes("trainSplitAllowed")) {
  console.error("Expected source-fed model gate to render wrapper and split status.");
  process.exit(1);
}
if (
  !pageText.includes("Cross-publisher row scope") ||
  !pageText.includes("READY checkpoints") ||
  !pageText.includes("Official API v2") ||
  !pageText.includes("officialApiRowExpansionV2Decision") ||
  !pageText.includes("API row feedback") ||
  !pageText.includes("officialApiRowScopeFeedbackV2Decision") ||
  !pageText.includes("LAHSA contract PDFs") ||
  !pageText.includes("lacityLahsaContractFetchQualityDecision") ||
  !pageText.includes("LAHSA PDF text") ||
  !pageText.includes("lacityLahsaContractPdfFieldAtomDecision") ||
  !pageText.includes("LAHSA atom feedback") ||
  !pageText.includes("lacityLahsaContractPdfAtomFeedbackDecision") ||
  !pageText.includes("HealthRIGHT crawler") ||
  !pageText.includes("Direct entity excerpts") ||
  !pageText.includes("Funding excerpt facts") ||
  !pageText.includes("Funding feedback rows") ||
  !pageText.includes("sfgovHealthrightCrawlerExcerptTermsDecision") ||
  !pageText.includes("sfgovHealthrightCrawlerFundingExcerptVerifiedFacts") ||
  !pageText.includes("sfgovHealthrightCrawlerFundingFeedbackRows") ||
  !pageText.includes("crossPublisherRowScopeEvalDecision") ||
  !pageText.includes("sfgovHealthrightCrawlerQualityDecision")
) {
  console.error("Expected source-fed model gate to render cross-publisher, crawler, and live checkpoint status.");
  process.exit(1);
}
if (!pageText.includes("source-meta") || !pageText.includes("Amounts:") || !pageText.includes("Terms:")) {
  console.error("Expected targeted extract metadata to render in evidence rail.");
  process.exit(1);
}

for (const casePacket of library.cases) {
  if (!casePacket.caseId || !casePacket.dossier || !Array.isArray(casePacket.sources)) {
    console.error(`Invalid case packet shape: ${casePacket.caseId || "(missing)"}`);
    process.exit(1);
  }
  if (!casePacket.dossier.findings?.length) {
    console.error(`Case has no front-end findings: ${casePacket.caseId}`);
    process.exit(1);
  }
  if (!casePacket.sources.length) {
    console.error(`Case has no sources: ${casePacket.caseId}`);
    process.exit(1);
  }
  if (casePacket.officialAwardFacts?.length) {
    const factSourceIds = new Set(casePacket.sources.map((source) => source.sourceId));
    for (const fact of casePacket.officialAwardFacts) {
      if (!fact.evidenceId || !fact.url || !fact.allowedClaimScope || !factSourceIds.has(fact.evidenceId)) {
        console.error(`Invalid official award fact in ${casePacket.caseId}`);
        process.exit(1);
      }
    }
  }
  if (casePacket.officialOcrVendorFacts?.length) {
    const factSourceIds = new Set(casePacket.sources.map((source) => source.sourceId));
    for (const fact of casePacket.officialOcrVendorFacts) {
      if (!fact.evidenceId || !fact.url || !fact.allowedClaimScope || !factSourceIds.has(fact.evidenceId)) {
        console.error(`Invalid official OCR vendor fact in ${casePacket.caseId}`);
        process.exit(1);
      }
      const unsupported = fact.unsupportedScopes || [];
      for (const scope of ["fraud", "vendor performance", "invoice payment or actual spend"]) {
        if (!unsupported.includes(scope)) {
          console.error("Official OCR vendor fact is missing overclaim guard scopes.");
          process.exit(1);
        }
      }
      if (fact.promotionScope !== "narrow_official_record_reference_only") {
        console.error("Official OCR vendor fact promotion scope is not narrow.");
        process.exit(1);
      }
    }
  }
  if (casePacket.officialLacityControllerRowFacts?.length) {
    const factSourceIds = new Set(casePacket.sources.map((source) => source.sourceId));
    for (const fact of casePacket.officialLacityControllerRowFacts) {
      if (!fact.evidenceId || !fact.url || !fact.allowedClaimScope || !fact.vendor || !fact.amount || !factSourceIds.has(fact.evidenceId)) {
        console.error(`Invalid official LA Controller row fact in ${casePacket.caseId}`);
        process.exit(1);
      }
      const unsupported = fact.unsupportedScopes || [];
      for (const scope of ["fraud", "confirmed improper payment", "confirmed procurement irregularity"]) {
        if (!unsupported.includes(scope)) {
          console.error("Official LA Controller row fact is missing overclaim guard scopes.");
          process.exit(1);
        }
      }
      if (fact.trainingConversionAllowed !== false) {
        console.error("Official LA Controller row fact must not allow training conversion.");
        process.exit(1);
      }
    }
  }
  if (casePacket.officialLacityLahsaContractPdfFacts?.length) {
    const factSourceIds = new Set(casePacket.sources.map((source) => source.sourceId));
    for (const fact of casePacket.officialLacityLahsaContractPdfFacts) {
      if (!fact.evidenceId || !fact.url || !fact.allowedClaimScope || !fact.contractId || !fact.entity || !fact.verifiedAmountCandidates?.length || !factSourceIds.has(fact.evidenceId)) {
        console.error(`Invalid official LAHSA contract PDF fact in ${casePacket.caseId}`);
        process.exit(1);
      }
      const unsupported = fact.unsupportedScopes || [];
      for (const scope of ["fraud", "payment impropriety", "program performance", "training conversion"]) {
        if (!unsupported.includes(scope)) {
          console.error("Official LAHSA contract PDF fact is missing overclaim guard scopes.");
          process.exit(1);
        }
      }
      if (fact.trainingConversionAllowed !== false) {
        console.error("Official LAHSA contract PDF fact must not allow training conversion.");
        process.exit(1);
      }
    }
  }
  if (casePacket.officialSfgovHealthrightFinancialRowFacts?.length) {
    const factSourceIds = new Set(casePacket.sources.map((source) => source.sourceId));
    for (const fact of casePacket.officialSfgovHealthrightFinancialRowFacts) {
      if (!fact.evidenceId || !fact.url || !fact.allowedClaimScope || !fact.vendorOrContractor || !fact.primaryAmountLabel || fact.primaryAmount === undefined || !factSourceIds.has(fact.evidenceId)) {
        console.error(`Invalid official SF Data HealthRIGHT row fact in ${casePacket.caseId}`);
        process.exit(1);
      }
      const unsupported = fact.unsupportedScopes || [];
      for (const scope of ["fraud", "confirmed improper payment", "program performance beyond row text"]) {
        if (!unsupported.includes(scope)) {
          console.error("Official SF Data HealthRIGHT row fact is missing overclaim guard scopes.");
          process.exit(1);
        }
      }
      if (fact.trainingConversionAllowed !== false) {
        console.error("Official SF Data HealthRIGHT row fact must not allow training conversion.");
        process.exit(1);
      }
    }
  }
  if (casePacket.browserCaptureTasks?.length) {
    for (const task of casePacket.browserCaptureTasks) {
      if (!task.taskId || !task.url || !task.captureMethod || !task.evidencePosture) {
        console.error(`Invalid browser capture task in ${casePacket.caseId}`);
        process.exit(1);
      }
      if (task.captureMethod !== "browser_or_manual_public_receipt") {
        console.error("Browser capture task has invalid capture method.");
        process.exit(1);
      }
      if (task.findingPromotionAllowed !== false || task.trainingConversionAllowed !== false) {
        console.error("Browser capture task must not allow finding promotion or training conversion.");
        process.exit(1);
      }
    }
  }
  if (casePacket.publicRecordsRequestPacket) {
    const packet = casePacket.publicRecordsRequestPacket;
    if (!packet.officialPraPageUrl || !packet.officialPraEmail || !packet.templateCount || !packet.evidencePosture) {
      console.error(`Invalid public-records request packet in ${casePacket.caseId}`);
      process.exit(1);
    }
    if (packet.findingPromotionAllowed !== false || packet.trainingConversionAllowed !== false) {
      console.error("Public-records request packet must not allow finding promotion or training conversion.");
      process.exit(1);
    }
  }
  if (casePacket.sfdphScopeParity) {
    const parity = casePacket.sfdphScopeParity;
    if (parity.decision !== "SFDPH_SCOPE_PARITY_VERIFIED_REVIEW_ONLY" || parity.laneCount < 4 || !Array.isArray(parity.lanes)) {
      console.error(`Invalid SFDPH scope parity packet in ${casePacket.caseId}`);
      process.exit(1);
    }
    if (parity.blockedCitationsHiddenFromFindings !== true || parity.findingPromotionAllowed !== false || parity.trainingConversionAllowed !== false || parity.fraudOrIntentClaimAllowed !== false) {
      console.error("SFDPH scope parity packet has unsafe gate flags.");
      process.exit(1);
    }
    for (const lane of parity.lanes) {
      if (!lane.laneId || lane.status !== "PASS" || lane.visibleFindingCount < 1 || lane.citationBlockedCount < 1) {
        console.error("Invalid SFDPH scope parity lane.");
        process.exit(1);
      }
      if (lane.blockedCitationsHiddenFromFindings !== true || lane.findingPromotionAllowed !== false || lane.trainingConversionAllowed !== false) {
        console.error("SFDPH scope parity lane has unsafe promotion flags.");
        process.exit(1);
      }
    }
  }
  if (casePacket.chirlaOfficialRecordScope) {
    const scope = casePacket.chirlaOfficialRecordScope;
    if (scope.decision !== "CHIRLA_OFFICIAL_RECORD_SCOPE_VERIFIED_REVIEW_ONLY" || scope.laneCount < 3 || !Array.isArray(scope.lanes)) {
      console.error(`Invalid CHIRLA official-record scope packet in ${casePacket.caseId}`);
      process.exit(1);
    }
    if (scope.unsupportedLinkageRejected !== true || scope.trainingConversionAllowed !== false || scope.sourceBodiesPersisted !== false || scope.modelFindingsGenerated !== false || scope.quidProQuoOrIntentClaimAllowed !== false) {
      console.error("CHIRLA official-record scope packet has unsafe gate flags.");
      process.exit(1);
    }
    for (const lane of scope.lanes) {
      if (!lane.laneId || lane.status !== "PASS" || lane.officialRecordCount < 1 || lane.visibleFindingCount < 1 || lane.citationPassCount < 1) {
        console.error("Invalid CHIRLA official-record scope lane.");
        process.exit(1);
      }
      if (lane.trainingConversionAllowed !== false || lane.sourceBodiesPersisted !== false || lane.modelFindingsGenerated !== false) {
        console.error("CHIRLA official-record scope lane has unsafe retrieval flags.");
        process.exit(1);
      }
    }
  }
  if (casePacket.calaccessEntityLookup) {
    const lookup = casePacket.calaccessEntityLookup;
    if (lookup.decision !== "CALACCESS_ENTITY_LOOKUP_HASH_ONLY_READY" || lookup.totalMatches < 0 || !Array.isArray(lookup.lookups)) {
      console.error(`Invalid CAL-ACCESS entity lookup packet in ${casePacket.caseId}`);
      process.exit(1);
    }
    if (lookup.rawRowsPersisted !== false || lookup.findingPromotionAllowed !== false || lookup.trainingConversionAllowed !== false || lookup.linkageOrInfluenceClaimAllowed !== false) {
      console.error("CAL-ACCESS entity lookup has unsafe gate flags.");
      process.exit(1);
    }
    if (lookup.followupTaskCount < 1 || !Array.isArray(lookup.followupTasks)) {
      console.error("CAL-ACCESS entity lookup is missing follow-up work orders.");
      process.exit(1);
    }
    if (lookup.filingAtomCount < 1 || lookup.exactTargetEntityMatches < 1 || lookup.surnameOnlyNonTargetCount < 1 || !Array.isArray(lookup.filingAtoms)) {
      console.error("CAL-ACCESS entity lookup is missing verified filing atoms.");
      process.exit(1);
    }
    for (const row of lookup.lookups) {
      if (!row.table || row.status !== "LOOKUP_COMPLETE_HASH_ONLY" || row.rowCountScanned < 1 || row.matchCount < 0) {
        console.error("Invalid CAL-ACCESS lookup row.");
        process.exit(1);
      }
    }
    for (const task of lookup.followupTasks) {
      if (!task.taskId || task.retrievalStatus !== "QUEUED_REVIEW_ONLY" || task.findingPromotionAllowed !== false || task.trainingConversionAllowed !== false || task.linkageOrInfluenceClaimAllowed !== false) {
        console.error("Invalid or unsafe CAL-ACCESS follow-up task.");
        process.exit(1);
      }
    }
    for (const atom of lookup.filingAtoms) {
      if (!atom.atomId || !atom.filingId || !atom.allowedClaimScope || atom.linkageOrInfluenceClaimAllowed !== false) {
        console.error("Invalid or unsafe CAL-ACCESS filing atom.");
        process.exit(1);
      }
      if (atom.exactTargetEntityMatch === false && atom.allowedClaimScope !== "surname_only_non_target_locator_only") {
        console.error("Surname-only CAL-ACCESS atom must remain locator-only.");
        process.exit(1);
      }
    }
  }
  if (library.officialStateLocalRowFacts?.length) {
    for (const fact of library.officialStateLocalRowFacts) {
      if (!fact.evidenceId || !fact.url || !fact.allowedClaimScope || !fact.surface || !fact.rowHash || !fact.rowIndex) {
        console.error("Invalid official state/local row fact.");
        process.exit(1);
      }
      const unsupported = fact.unsupportedScopes || [];
      if (!unsupported.includes("fraud") || !unsupported.includes("program performance")) {
        console.error("State/local row fact is missing overclaim guard scopes.");
        process.exit(1);
      }
    }
  }
  const targetedSources = casePacket.sources.filter((source) => source.role?.includes("targeted_extract"));
  if (targetedSources.length && !targetedSources.some((source) => source.pageNumber || source.matchedTerms?.length || source.amountCandidates?.length)) {
    console.error(`Targeted extract sources are missing page/term/amount metadata: ${casePacket.caseId}`);
    process.exit(1);
  }
  const sourceIds = new Set(casePacket.sources.map((source) => source.sourceId));
  for (const finding of casePacket.dossier.findings) {
    for (const sourceId of finding.sourceIds || []) {
      if (!sourceIds.has(sourceId)) {
        console.error(`Finding references missing source ${sourceId} in ${casePacket.caseId}`);
        process.exit(1);
      }
    }
  }
}

const combined = `${JSON.stringify(library)}\n${jsText}`;
for (const forbidden of ["raw_response_persisted", "raw_provider", "secret-value", "PRIVATE KEY"]) {
  if (combined.includes(forbidden)) {
    console.error(`Forbidden raw/private marker found: ${forbidden}`);
    process.exit(1);
  }
}

console.log("Source-fed case-board adapter verification passed.");
