import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const jsonPath = join(process.cwd(), "data", "demo-case.json");
const library = JSON.parse(readFileSync(jsonPath, "utf8"));

function source(sourceId, title, type, role, excerpt, limitation) {
  return {
    sourceId,
    title,
    type,
    publisher: "Aculeus source workspace",
    role,
    retrievedAt: "2026-05-15",
    confidence: "dossier_source",
    visibility: "demo_source",
    url: `local-dossier://${sourceId}`,
    hash: `${sourceId}-v1`,
    excerpt,
    limitation
  };
}

function buildCase(spec) {
  return {
    caseId: spec.caseId,
    displayId: spec.displayId,
    caseType: spec.caseType,
    caseScope: spec.caseScope,
    title: spec.title,
    headline: spec.headline,
    lead: spec.lead,
    summary: spec.summary,
    jurisdiction: spec.jurisdiction,
    reviewStatus: "dossier_dispatch_ready",
    publicLabel: spec.publicLabel,
    legalBoundary: spec.legalBoundary,
    caseScore: spec.caseScore,
    model: {
      name: "Aculeus SLM",
      version: "demo-adapter-0.4",
      mode: "demo_ready",
      endpoint: "/api/investigate"
    },
    commandCenter: spec.commandCenter,
    entities: spec.entities,
    sourceFamilies: spec.sourceFamilies,
    dossier: spec.dossier,
    claims: spec.claims,
    sources: spec.sources,
    lanes: spec.lanes,
    nextRecords: spec.nextRecords,
    actions: spec.actions
  };
}

function lanes(items) {
  return items.map(([laneId, label, headline, body, sourceIds], index) => ({
    laneId,
    label,
    headline,
    body,
    state: index < 3 ? "complete" : index < 5 ? "running" : "queued",
    sourceIds
  }));
}

const networkCase = buildCase({
  caseId: "newsom_intermediary_network",
  displayId: "NS-625",
  caseType: "network_review",
  caseScope: "statewide_system",
  title: "California intermediary governance network",
  headline: "Follow the money. Find the machine.",
  lead: "Open the California intermediary-governance network: fiscal agents, state programs, sub-grants, political infrastructure, accountability buffers, and the records needed to prove what moved where.",
  summary: "Aculeus dispatches an investigation across state programs, fiscal intermediaries, funding flows, source gaps, and next records.",
  jurisdiction: "California",
  publicLabel: "statewide_network_review",
  legalBoundary: "The source trail supports a network-governance lead and named record requests. It does not establish intent, guilt, or final liability without the missing contracts, monitoring files, and source review.",
  caseScore: 96,
  commandCenter: {
    break: "State money moves through intermediary networks faster than the public can inspect it.",
    proof: [
      "Aculeus maps more than $6.2B in committed state and federal funds routed through health, workforce, climate, and immigration program lanes.",
      "The recurring structure is agency appropriation, third-party administrator, sub-granting, capacity building, and delayed public accountability.",
      "The strongest next proof lives in contracts, fee terms, selection criteria, monitoring records, recipient lists, and outcomes."
    ],
    missing: "Master contracts, administrative-fee schedules, sub-grantee scoring files, monitoring records, outcome reports, board approvals, and conflict disclosures by program lane.",
    move: "Start with The Center at Sierra Health Foundation and Public Health Institute, then request master contracts, sub-grant lists, fee schedules, scoring files, and monitoring records."
  },
  entities: [
    { name: "The Center at Sierra Health Foundation", role: "Fiscal intermediary", confidence: 94 },
    { name: "Public Health Institute", role: "Third-party administrator", confidence: 91 },
    { name: "California Jobs First / CERF fiscal agents", role: "Regional funding channel", confidence: 87 },
    { name: "California Volunteers / Bay Area Community Resources", role: "Service and workforce channel", confidence: 84 }
  ],
  sourceFamilies: ["Master contracts", "Administrative fee schedules", "Sub-grant recipient lists", "RFA/RFP scoring files", "Program outcomes", "Monitoring reports", "Conflict disclosures"],
  dossier: {
    title: "The intermediary machine",
    deck: "Public money moved into a network. Aculeus names the records that can prove how.",
    posture: "Network lead, not final verdict",
    centralQuestion: "How much public money moved through intermediary organizations, who selected the recipients, and which records prove whether the work matched the public purpose?",
    shortFinding: "Aculeus surfaces a statewide governing pattern: state agencies route large programs through nonprofit administrators, those administrators retain fees and distribute sub-grants, and the decisive records sit outside the easy public narrative. The strongest evidence is the repeated program structure across health, workforce, climate, immigration, and service lanes. The next move is not another summary. It is a targeted records run against contracts, fee terms, scoring files, monitoring records, and outcomes.",
    summary: "Aculeus runs the shadow-network question live: map the funding lanes, identify the intermediaries, classify what the record supports, show what remains missing, and draft the record requests that can move the case.",
    stats: [
      { label: "Committed funds mapped", value: "$6.2B+", detail: "Mapped across major program lanes" },
      { label: "Core lanes", value: "6", detail: "Health, youth, workforce, climate, immigration, service programs" },
      { label: "Priority intermediaries", value: "4", detail: "Center, PHI, CERF agents, BACR/volunteer lane" },
      { label: "Proof families", value: "7", detail: "Contracts, fees, scoring, monitoring, outcomes, conflicts, recipients" }
    ],
    layers: [
      { label: "Structure", title: "Agency money leaves the obvious channel.", body: "Aculeus surfaces a repeat pattern in the record: agency appropriation, third-party administrator, sub-granting, capacity building, then delayed accountability.", sourceIds: ["newsom_dossier", "aggregate_program_table"] },
      { label: "Money", title: "The scale makes this a system case.", body: "The source trail maps more than $6.2B in committed funds across program lanes. That scale turns the next move into a structured records run.", sourceIds: ["aggregate_program_table"] },
      { label: "Actors", title: "Intermediaries become the choke point.", body: "The Center at Sierra Health Foundation, Public Health Institute, California Jobs First fiscal agents, and California Volunteers-related lanes become the entities to inspect first.", sourceIds: ["sierra_center_profile", "phi_profile", "cerf_profile", "volunteers_profile"] },
      { label: "Break", title: "Capacity building blurs the public claim.", body: "When public funds pay for staff, overhead, civic infrastructure, and organizational capacity, the decisive question becomes whether the records show service outcomes or political infrastructure.", sourceIds: ["newsom_dossier", "sierra_center_profile"] }
    ],
    findings: [
      { findingId: "network-scale", entity: "California intermediary network", signal: "Aggregate funding signal", whatRecordSays: "Aculeus maps more than $6.2B in committed public funds routed through intermediary program lanes from 2020-2025.", whyItMatters: "Scale changes the demo from provider review to system review.", whatItDoesNotProve: "It does not prove misuse by itself.", nextRecord: "Program-by-program master contracts, fee schedules, recipient lists, and monitoring files.", sourceFamily: "Aggregate funding table", sourceIds: ["aggregate_program_table"] },
      { findingId: "center-gatekeeper", entity: "The Center at Sierra Health Foundation", signal: "Fiscal intermediary profile", whatRecordSays: "Aculeus identifies The Center as a primary intermediary for DHCS, cannabis tax funds, and opioid settlement/program lanes.", whyItMatters: "One entity can become the first audit target because multiple program streams converge there.", whatItDoesNotProve: "A gatekeeper role is not misconduct.", nextRecord: "DHCS contracts, amendments, fee schedules, sub-grantee scoring files, monitoring records, and outcomes.", sourceFamily: "Program profile", sourceIds: ["sierra_center_profile"] },
      { findingId: "phi-administrator", entity: "Public Health Institute", signal: "Administrator profile", whatRecordSays: "Aculeus identifies PHI as a fiscal manager for CDPH, CYBHI, and State of Equity lanes.", whyItMatters: "The same administrative architecture appears beyond one program.", whatItDoesNotProve: "It does not decide program performance.", nextRecord: "CYBHI contract records, deliverable files, award lists, and monitoring reports.", sourceFamily: "Program profile", sourceIds: ["phi_profile"] }
    ],
    claimLedger: [
      { claim: "California uses intermediary administrators as a governing mechanism.", support: "Supported by the source trail", limitation: "Needs contract-by-contract verification.", nextRecord: "Master contracts and fee terms.", sourceIds: ["newsom_dossier", "aggregate_program_table"] },
      { claim: "Capacity-building grants can move public funds into political or organizational infrastructure.", support: "Partially supported", limitation: "Requires recipient-level scope and deliverable records.", nextRecord: "RFA scoring, grant agreements, deliverables, outcomes.", sourceIds: ["sierra_center_profile"] },
      { claim: "The network buffers accountability.", support: "Partially supported as structural risk", limitation: "Needs monitoring and enforcement records.", nextRecord: "Monitoring files, corrective actions, audit findings.", sourceIds: ["newsom_dossier"] }
    ],
    sourceMatrix: [
      { family: "Aggregate funding table", status: "Opened", proves: "Scale and program lanes", missing: "Underlying contract packet per lane" },
      { family: "Master contracts", status: "Needed", proves: "Legal authority, fees, deliverables", missing: "Contract text, amendments, exhibits" },
      { family: "Sub-grant files", status: "Needed", proves: "Who received funds and why", missing: "Recipient list, scoring, conflict disclosures" },
      { family: "Monitoring and outcomes", status: "Needed", proves: "Whether public purpose matched output", missing: "Reports, corrective actions, closeout files" }
    ],
    followUpQuestions: ["Which intermediary should we audit first?", "What record would falsify the network claim?", "Which contracts should a public-record request target first?", "Where does the source trail stop short of proof?"],
    entityFolders: [
      { entity: "The Center at Sierra Health Foundation", receipts: 4, signal: "DHCS, Prop 64, opioid response lanes", gap: "Master contracts, fees, scoring, monitoring", nextMove: "Request DHCS contract and sub-grant packet." },
      { entity: "Public Health Institute", receipts: 3, signal: "CDPH/CYBHI administrator profile", gap: "CYBHI deliverables and outcomes", nextMove: "Request PHI contract exhibits and monitoring reports." },
      { entity: "California Jobs First fiscal agents", receipts: 2, signal: "Regional fund channel", gap: "Fiscal-agent contracts and award scoring", nextMove: "Request CERF/Catalyst fiscal-agent records." }
    ],
    sourceGroups: [
      { label: "Program architecture", status: "Opened", detail: "Aculeus shows the repeated administrative pattern." },
      { label: "Funding scale", status: "Opened", detail: "Aggregate funding table sets review priority." },
      { label: "Contract packet", status: "Missing", detail: "Contracts decide fees, deliverables, and authority." },
      { label: "Monitoring and outcomes", status: "Missing", detail: "These decide whether the public purpose held." }
    ],
    nextMoves: [
      "Request master contracts, amendments, fee schedules, recipient lists, scoring files, monitoring records, outcomes, and conflict disclosures for the top two intermediaries.",
      "Build a lane-by-lane map that separates public purpose, administrator authority, recipient selection, and measured outcome.",
      "Ask follow-up questions only inside the source trail: what is supported, what is missing, and what record changes the case."
    ]
  },
  claims: [{ title: "This is a network case.", body: "The source trail supports a review of intermediary governance architecture across multiple state program lanes.", state: "Supported as scope", sourceIds: ["newsom_dossier", "aggregate_program_table"], confidence: 88 }],
  sources: [
    source("newsom_dossier", "The Shadow Bureaucracy source run", "attached_dossier", "Primary source run", "Forensic source run of California intermediary governance network, 2020-2025.", "Contract-level records still decide final claims."),
    source("aggregate_program_table", "Aggregate program funding table", "funding_table", "Scale and lane map", "Program table covering CYBHI, Elevate Youth California, SOR, California Jobs First, One California, and volunteer/workforce lanes.", "Table estimates and snippets require underlying source packets."),
    source("sierra_center_profile", "The Center at Sierra Health Foundation profile", "intermediary_profile", "Priority intermediary", "Profile identifies The Center as intermediary for DHCS, cannabis tax, and opioid response lanes.", "Profile needs master contracts, scoring files, and monitoring records."),
    source("phi_profile", "Public Health Institute profile", "intermediary_profile", "Administrator profile", "Profile identifies PHI as fiscal manager for CDPH, CYBHI, and State of Equity lanes.", "Profile needs deliverables and outcome support."),
    source("cerf_profile", "California Jobs First / CERF profile", "program_profile", "Regional fiscal-agent lane", "Profile describes fiscal agents and pre-development cash lane.", "Requires fiscal-agent contracts and award backup."),
    source("volunteers_profile", "California Volunteers / BACR profile", "program_profile", "Volunteer/workforce lane", "Profile connects California Volunteers with Bay Area Community Resources lane.", "Requires service contracts and outcome records.")
  ],
  lanes: lanes([
    ["lead", "Question received", "A system question enters.", "The user asks how public money moved through intermediary governance.", ["newsom_dossier"]],
    ["scope", "Scope built", "The agent defines the lanes.", "Health, youth, workforce, climate, immigration, and volunteer/service channels become the search map.", ["aggregate_program_table"]],
    ["sources", "Sources opened", "The record trail opens.", "Aculeus opens the source run, aggregate table, intermediary profiles, and program lanes.", ["newsom_dossier", "aggregate_program_table"]],
    ["money", "Money mapped", "Scale drives priority.", "The run ranks the top funding and administrator lanes before forming claims.", ["aggregate_program_table"]],
    ["actors", "Actors linked", "Intermediaries surface.", "Priority entities become the first audit targets.", ["sierra_center_profile", "phi_profile"]],
    ["gaps", "Gaps named", "Proof records are missing.", "Contracts, fees, scoring, monitoring, outcomes, and conflicts decide the case.", ["newsom_dossier"]],
    ["action", "Dispatch ready", "The next move writes itself.", "The system drafts a targeted records request and follow-up question path.", ["sierra_center_profile", "phi_profile"]]
  ]),
  nextRecords: [
    { priority: "High", recordId: "center_contract_packet", holder: "DHCS and The Center at Sierra Health Foundation", request: "Please provide master contracts, amendments, fee schedules, sub-grantee lists, scoring files, monitoring records, outcome reports, and conflict disclosures for The Center at Sierra Health Foundation program lanes.", reason: "This packet tests the strongest intermediary lane first." },
    { priority: "High", recordId: "phi_contract_packet", holder: "CDPH / CYBHI administrators", request: "Please provide PHI contracts, exhibits, deliverables, payment records, monitoring files, and outcome reports for the relevant program period.", reason: "This tests whether the same structure appears in another major lane." }
  ],
  actions: {
    directMove: "Request the first two intermediary packets.",
    recordHolder: "DHCS, CDPH, program administrators, and fiscal agents",
    requestLanguage: "Please provide master contracts, amendments, administrative-fee schedules, sub-grantee lists, RFA/RFP scoring files, monitoring reports, outcome records, corrective actions, and conflict disclosures for the identified intermediary program lanes from 2020 through 2025.",
    ifRefused: "Ask for the record index, exemption basis, production schedule, and custodian for each program lane.",
    briefTargets: ["Reviewer", "Records counsel", "Coalition lead"],
    coalitionPath: "Brief the coalition by lane: money, administrator, recipient selection, monitoring, outcome, missing records."
  }
});

const elevateCase = buildCase({
  caseId: "elevate_youth_funding_pipeline",
  displayId: "EY-370",
  caseType: "funding_pipeline_review",
  caseScope: "program_review",
  title: "Elevate Youth California funding pipeline",
  headline: "Cannabis tax money entered the youth-prevention machine.",
  lead: "Investigate Elevate Youth California: cannabis tax funds, DHCS, Sierra Health Foundation, grant recipients, political-organizing signals, participant data, and cost per participant.",
  summary: "Aculeus opens the program structure, funding pipeline, anomalous recipients, performance math, RFA language, source index, and limitations from the retrieved record trail.",
  jurisdiction: "California",
  publicLabel: "program_pipeline_review",
  legalBoundary: "The source trail supports a funding-pipeline review and anomaly questions. It does not prove misuse by any recipient without grant agreements, deliverables, monitoring records, and program outcomes.",
  caseScore: 93,
  commandCenter: {
    break: "A youth substance-use prevention program funded by cannabis taxes appears to include recipients with political organizing missions.",
    proof: ["Aculeus maps over $370M through 517 grants since launch.", "The fiscal intermediary received approximately $71.25M in FY 2024-25 under its DHCS administrative contract.", "The RFA language prioritizes policy, systems, environmental change, civic engagement, and social justice youth development."],
    missing: "Grant agreements, recipient scoring files, deliverables, monitoring records, participant definitions, outcome data, and administrative-fee detail.",
    move: "Request the recipient packet for high-severity grantees and the DHCS/Sierra Health administrative contract files."
  },
  entities: [
    { name: "Department of Health Care Services", role: "Program administrator", confidence: 94 },
    { name: "The Center at Sierra Health Foundation", role: "Fiscal intermediary", confidence: 93 },
    { name: "Elevate Youth California grantees", role: "Recipient universe", confidence: 89 }
  ],
  sourceFamilies: ["DHCS legislative reports", "Governor press release", "Prop 64 Advisory Group minutes", "Grant portal RFAs", "Partner maps", "Recipient mission statements", "Participant data"],
  dossier: {
    title: "Elevate Youth California",
    deck: "The pipeline is visible. The outputs need proof.",
    posture: "Program anomaly lead",
    centralQuestion: "Did cannabis tax funds designated for youth prevention flow through a program structure that rewarded organizing infrastructure instead of measurable prevention outcomes?",
    shortFinding: "Aculeus turns the record into a program-pipeline run. It shows funding scale, administrator structure, a fiscal intermediary, recipient mission mismatch, cost-per-participant math, and RFA language that makes civic engagement part of the program design. The record is not done. The next proof is in grant agreements, scoring files, deliverables, monitoring records, and participant outcome definitions.",
    summary: "Aculeus breaks the case into program authority, funding pipeline, fiscal intermediary, anomalous recipients, performance math, RFA language, source index, and limits.",
    stats: [
      { label: "Grant funding", value: "$370M+", detail: "Prop 64 cannabis tax program funding mapped" },
      { label: "Grants", value: "517", detail: "Community organization awards since launch" },
      { label: "FY 24-25 admin contract", value: "$71.25M", detail: "Sierra Health Foundation / The Center contract estimate" },
      { label: "Youth participants", value: "89,727", detail: "DHCS participant figure mapped" }
    ],
    layers: [
      { label: "Authority", title: "Prop 64 created the funding channel.", body: "The program draws from cannabis tax funds for youth education, prevention, early intervention, and treatment.", sourceIds: ["eyc_legislative_report"] },
      { label: "Pipeline", title: "DHCS routes funds through an intermediary.", body: "The funding path runs from cannabis tax revenue to DHCS, then to The Center at Sierra Health Foundation, then to community-based grantees.", sourceIds: ["eyc_dossier", "prop64_minutes"] },
      { label: "Mismatch", title: "Some recipient missions do not read like prevention work.", body: "Aculeus flags organizations whose public missions emphasize voter contact, base building, grassroots power, or organizing-adjacent work.", sourceIds: ["eyc_partner_map"] },
      { label: "Performance", title: "The cost math demands the next record.", body: "Aculeus compares program funding to DHCS participant data, making participant definitions and outcome files decisive.", sourceIds: ["eyc_legislative_report"] }
    ],
    findings: [
      { findingId: "eyc-scale", entity: "Elevate Youth California", signal: "Funding scale", whatRecordSays: "Aculeus maps DHCS awards above $370M through 517 grants since launch.", whyItMatters: "Scale turns the question into an audit-worthy program review.", whatItDoesNotProve: "Scale does not prove misuse.", nextRecord: "Cohort-level award data, grant agreements, deliverables, monitoring records, and outcomes.", sourceFamily: "DHCS/Governor source trail", sourceIds: ["governor_press_release", "eyc_legislative_report"] },
      { findingId: "eyc-intermediary", entity: "The Center at Sierra Health Foundation", signal: "Administrative contract", whatRecordSays: "Aculeus maps approximately $71.25M in FY 2024-25 under the administrative contract with DHCS.", whyItMatters: "The intermediary contract is a direct records target.", whatItDoesNotProve: "Administrative scale does not prove improper work.", nextRecord: "Administrative contract, fee schedule, scope, deliverables, monitoring files, and amendments.", sourceFamily: "Prop 64 Advisory Group minutes", sourceIds: ["prop64_minutes"] },
      { findingId: "eyc-mission-mismatch", entity: "High-severity recipients", signal: "Mission mismatch", whatRecordSays: "Aculeus identifies recipients with stated missions centered on political organizing, voter contact, base building, or grassroots mobilization.", whyItMatters: "Mission mismatch is the strongest user-visible anomaly.", whatItDoesNotProve: "Mission language does not decide grant performance.", nextRecord: "Recipient grant agreements, scored applications, deliverables, monitoring reviews, and outcome records.", sourceFamily: "Partner map and recipient records", sourceIds: ["eyc_partner_map", "grants_portal_rfa"] }
    ],
    claimLedger: [
      { claim: "The program pipeline is DHCS to Sierra Health to grantees.", support: "Supported by dossier structure", limitation: "Contract records still needed.", nextRecord: "DHCS administrative contract and amendments.", sourceIds: ["eyc_dossier", "prop64_minutes"] },
      { claim: "Some recipients look politically oriented.", support: "Partially supported by mission-language review", limitation: "Needs grant deliverables and monitoring files.", nextRecord: "Recipient application, grant agreement, deliverables.", sourceIds: ["eyc_partner_map"] },
      { claim: "Cost per participant raises audit questions.", support: "Supported as calculation lead", limitation: "Depends on participant definitions and outcome records.", nextRecord: "Participant methodology and outcome reports.", sourceIds: ["eyc_legislative_report"] }
    ],
    sourceMatrix: [
      { family: "DHCS legislative report", status: "Opened", proves: "Program authority and participant figures", missing: "Definitions, raw participant records, outcomes" },
      { family: "Prop 64 minutes", status: "Opened", proves: "Administrative contract signal", missing: "Contract text and fee schedule" },
      { family: "Grant portal RFA", status: "Opened", proves: "Selection language and program priorities", missing: "Application scoring files" },
      { family: "Recipient packets", status: "Needed", proves: "What each grantee promised and delivered", missing: "Agreements, deliverables, monitoring" }
    ],
    followUpQuestions: ["Which recipients are high severity?", "What records prove mission mismatch?", "What is the cost per participant?", "Which request should go first?"],
    entityFolders: [
      { entity: "DHCS", receipts: 3, signal: "Program authority and participant reporting", gap: "Raw participant methodology and outcomes", nextMove: "Request participant definitions and outcome files." },
      { entity: "The Center at Sierra Health Foundation", receipts: 3, signal: "Administrative contract and intermediary role", gap: "Fee schedule and deliverables", nextMove: "Request administrative contract packet." },
      { entity: "High-severity recipients", receipts: 4, signal: "Organizing or voter-contact mission language", gap: "Grant agreement and monitoring file", nextMove: "Request recipient-level grant packet." }
    ],
    sourceGroups: [
      { label: "Funding authority", status: "Opened", detail: "Prop 64 and DHCS materials define the funding lane." },
      { label: "Intermediary contract", status: "Partial", detail: "Minutes show signal; contract packet decides." },
      { label: "Recipient mission review", status: "Opened", detail: "Mission mismatch creates anomaly leads." },
      { label: "Outcomes", status: "Missing", detail: "Participant definitions and outcomes decide strength." }
    ],
    nextMoves: [
      "Request DHCS/Sierra Health contract packet, fee schedules, amendments, deliverables, and monitoring records.",
      "Rank high-severity recipients by mission mismatch, dollars, and source coverage.",
      "Request recipient-level grant agreements, scored applications, deliverables, monitoring records, and outcome support."
    ]
  },
  claims: [{ title: "This is a pipeline case.", body: "The source trail supports a funding path from cannabis tax revenue to DHCS, an intermediary, and grantee recipients.", state: "Supported as structure", sourceIds: ["eyc_dossier", "prop64_minutes"], confidence: 88 }],
  sources: [
    source("eyc_dossier", "Elevate Youth California source run", "attached_dossier", "Primary source run", "Source run covering $370M+ in Proposition 64 cannabis tax funds administered by DHCS through Sierra Health Foundation: The Center.", "The source trail creates leads; contract and monitoring records decide final claims."),
    source("eyc_legislative_report", "DHCS YEPEITA legislative report", "government_report", "Program authority and participant data", "Official legislative reporting for Youth Education, Prevention, Early Intervention, and Treatment Account activity.", "Participant figures require definitions and raw outcome records."),
    source("governor_press_release", "Governor press release, Dec. 19, 2025", "press_release", "Funding total signal", "Press release cited by the dossier for grant funding scale.", "A press release is a public signal, not the underlying grant packet."),
    source("prop64_minutes", "Prop 64 Advisory Group minutes, Mar. 20, 2025", "meeting_minutes", "Administrative contract signal", "Minutes cited for approximately $71.25M in FY 2024-25 administrative contract value.", "Minutes need the actual contract, amendments, and deliverables."),
    source("grants_portal_rfa", "California Grants Portal Cohort 7 RFA", "rfa", "Program language", "RFA language cited for policy, systems, environmental change, civic engagement, and social justice youth development priorities.", "RFA language must be matched to recipient scoring and deliverables."),
    source("eyc_partner_map", "Elevate Youth California partners map", "recipient_map", "Recipient universe", "Partner map and recipient records seed the anomalous-recipient review.", "Recipient mission review does not decide performance without grant files.")
  ],
  lanes: lanes([
    ["lead", "Question received", "The funding question enters.", "Cannabis tax funds, youth-prevention purpose, and recipient missions become the investigation target.", ["eyc_dossier"]],
    ["authority", "Authority opened", "The statute sets the lane.", "Prop 64 and DHCS reports define the public purpose.", ["eyc_legislative_report"]],
    ["pipeline", "Pipeline mapped", "Money moves through the intermediary.", "DHCS and Sierra Health become the central record holders.", ["prop64_minutes"]],
    ["recipients", "Recipients scanned", "Mission mismatch appears.", "The agent flags grantees whose public mission may not match prevention work.", ["eyc_partner_map"]],
    ["math", "Cost checked", "Participant math raises questions.", "The cost-per-participant signal demands outcome definitions.", ["eyc_legislative_report"]],
    ["gaps", "Gaps named", "Grant packets decide.", "Applications, agreements, deliverables, monitoring, and outcomes are missing.", ["grants_portal_rfa"]],
    ["action", "Dispatch ready", "The requests are clear.", "The system drafts the administrative and recipient records request.", ["prop64_minutes", "eyc_partner_map"]]
  ]),
  nextRecords: [
    { priority: "High", recordId: "eyc_admin_packet", holder: "DHCS and The Center at Sierra Health Foundation", request: "Please provide the EYC administrative contract, amendments, fee schedule, deliverables, monitoring records, recipient list, RFA scoring files, and outcome reports.", reason: "This packet tests program control and intermediary authority." },
    { priority: "High", recordId: "eyc_recipient_packets", holder: "DHCS / Sierra Health / grantee record custodians", request: "Please provide grant agreements, applications, scoring sheets, deliverables, monitoring reviews, payment records, and outcome support for high-severity recipients.", reason: "This tests whether mission mismatch is real in the grant files." }
  ],
  actions: {
    directMove: "Request the administrative contract packet and high-severity recipient packets.",
    recordHolder: "DHCS and The Center at Sierra Health Foundation",
    requestLanguage: "Please provide the Elevate Youth California administrative contract, amendments, fee schedules, recipient lists, RFA/RFP scoring files, applications, grant agreements, deliverables, monitoring reports, participant definitions, outcome records, and conflict disclosures for the identified cohorts and recipients.",
    ifRefused: "Ask for the record index, exemption basis, and custodian by cohort and recipient.",
    briefTargets: ["Reviewer", "Records counsel", "Coalition lead"],
    coalitionPath: "Brief the case as a funding-pipeline anomaly: purpose, intermediary, recipient selection, outcomes, missing records."
  }
});

const gridCase = buildCase({
  caseId: "grid_political_infrastructure",
  displayId: "GR-312",
  caseType: "forensic_audit",
  caseScope: "organization_network",
  title: "GRID Alternatives political infrastructure audit",
  headline: "A solar installer became a funding machine.",
  lead: "Audit GRID Alternatives as political infrastructure: federal climate funding, prime awardee status, partner ecosystem, workforce field operations, and electoral/civic engagement correlation.",
  summary: "Aculeus opens the GRID dossier as a layered forensic audit: financial catalyst, strategic architect, field operations, partnership network, electoral correlation, and missing proof.",
  jurisdiction: "United States / California",
  publicLabel: "organization_network_review",
  legalBoundary: "The source trail supports a political-infrastructure review lead. It does not prove unlawful conduct or intent without contracts, sub-recipient records, activity logs, and outcome files.",
  caseScore: 90,
  commandCenter: {
    break: "A technical service nonprofit appears to have become a national funding and field-infrastructure hub.",
    proof: ["Aculeus identifies a major 2024 federal funding catalyst.", "Audited financials and Form 990 data show revenue and asset growth signals.", "The partnership ecosystem connects technical solar deployment, housing networks, workforce programs, and civic engagement organizations."],
    missing: "Federal award agreements, sub-recipient contracts, administrative fees, field-operation logs, partner MOUs, outreach scripts, voter-contact boundaries, and performance outcomes.",
    move: "Request award contracts, sub-recipient lists, fee schedules, partner MOUs, and field-operation records before any public claim moves."
  },
  entities: [
    { name: "GRID Alternatives", role: "Prime awardee / network hub", confidence: 92 },
    { name: "EPA / DOE program lanes", role: "Federal funding source", confidence: 89 },
    { name: "ACCE / GreenLatinos / CIPC and partners", role: "Advocacy ecosystem", confidence: 82 },
    { name: "SolarCorps / workforce infrastructure", role: "Field operation", confidence: 84 }
  ],
  sourceFamilies: ["Federal award announcements", "Audited financials", "IRS Form 990", "Impact reports", "Partner ecosystem records", "Field-operation records", "Legislative/regulatory materials"],
  dossier: {
    title: "GRID Alternatives political infrastructure",
    deck: "The funding catalyst is visible. The field record decides the claim.",
    posture: "Forensic audit lead",
    centralQuestion: "Did federal climate funding and prime-awardee status turn a technical solar nonprofit into civic and political infrastructure?",
    shortFinding: "The GRID dossier is a strong demo for layered institutional analysis. It starts with a financial catalyst, then opens leadership, partnerships, field operations, and electoral/civic correlation. The record supports a serious infrastructure question. The next proof is not rhetoric. It is contracts, sub-recipient agreements, administrative fees, partner MOUs, field-operation records, and outcome data.",
    summary: "Aculeus converts the GRID audit into layers: financial catalyst, strategic architect, partnership ecosystem, field operations, and political correlation.",
    stats: [
      { label: "Federal award signal", value: "$312M", detail: "2024 award exposure mapped" },
      { label: "SANAH program", value: "$249.8M", detail: "Solar Access for Nationwide Affordable Housing pillar" },
      { label: "Program states", value: "30+", detail: "Deployment footprint mapped" },
      { label: "Audit sections", value: "4", detail: "Finance, strategy, field operations, electoral correlation" }
    ],
    layers: [
      { label: "Financial catalyst", title: "Federal money changed the scale.", body: "Aculeus maps GRID moving from California nonprofit installer to national administrative hub for federal climate funding.", sourceIds: ["grid_dossier", "grid_federal_awards"] },
      { label: "Strategic architect", title: "The organization moved into policy infrastructure.", body: "Leadership, DC presence, and partnership structure made GRID more than a technical service provider.", sourceIds: ["grid_dossier", "grid_partnerships"] },
      { label: "Field operations", title: "Deployment creates trust and contact.", body: "Solar installation, utility assistance, door-to-door outreach, workforce programs, and contractor networks become the operational layer to inspect.", sourceIds: ["grid_field_operations"] },
      { label: "Correlation", title: "The electoral question needs hard records.", body: "Aculeus raises civic-engagement and voter-bloc questions only as an investigative lead. The proof requires boundaries, scripts, activity logs, and partner MOUs.", sourceIds: ["grid_partnerships", "grid_field_operations"] }
    ],
    findings: [
      { findingId: "grid-federal-catalyst", entity: "GRID Alternatives", signal: "Federal funding catalyst", whatRecordSays: "Aculeus identifies a 2024 federal grant-award signal of approximately $312.25M and a SANAH pillar provisionally awarded $249.8M.", whyItMatters: "Scale makes GRID a national infrastructure review target.", whatItDoesNotProve: "A federal award does not prove political misuse.", nextRecord: "Award agreements, scopes, administrative fees, sub-recipient contracts, and deliverables.", sourceFamily: "Federal award and audited financial records", sourceIds: ["grid_federal_awards", "grid_financials"] },
      { findingId: "grid-prime-awardee", entity: "GRID Alternatives", signal: "Prime awardee model", whatRecordSays: "Aculeus maps GRID as a lead coalition manager that can capture administrative and technical assistance fees while managing sub-recipients.", whyItMatters: "The prime-awardee role is where money, control, and partner selection meet.", whatItDoesNotProve: "Administrative control is not misconduct.", nextRecord: "Sub-recipient lists, fee schedules, selection criteria, monitoring files.", sourceFamily: "Program administration records", sourceIds: ["grid_financials", "grid_federal_awards"] },
      { findingId: "grid-field-network", entity: "SolarCorps and partner ecosystem", signal: "Field operation and partnership map", whatRecordSays: "Aculeus maps solar installation, workforce infrastructure, direct outreach, and advocacy/housing partners as the field layer.", whyItMatters: "Field infrastructure is the bridge between technical service and civic influence.", whatItDoesNotProve: "The map does not prove electoral activity.", nextRecord: "Partner MOUs, outreach scripts, field logs, AmeriCorps/SolarCorps work plans, and voter-contact boundaries.", sourceFamily: "Field-operation records", sourceIds: ["grid_partnerships", "grid_field_operations"] }
    ],
    claimLedger: [
      { claim: "GRID became a national administrative hub.", support: "Supported as dossier lead", limitation: "Needs federal award and sub-recipient files.", nextRecord: "Award agreements and sub-recipient contracts.", sourceIds: ["grid_dossier", "grid_federal_awards"] },
      { claim: "The partnership ecosystem connects services to political organizing capacity.", support: "Partially supported", limitation: "Needs partner MOUs and activity records.", nextRecord: "Partner MOUs and field logs.", sourceIds: ["grid_partnerships"] },
      { claim: "Field operations may convert service delivery into civic power.", support: "Investigative hypothesis", limitation: "Needs outreach boundaries and activity logs.", nextRecord: "Scripts, logs, training materials, voter-contact guardrails.", sourceIds: ["grid_field_operations"] }
    ],
    sourceMatrix: [
      { family: "Federal awards", status: "Opened", proves: "Scale and program authority", missing: "Full award agreements and amendments" },
      { family: "Financial filings", status: "Opened", proves: "Revenue and asset movement", missing: "Program-level fee allocation" },
      { family: "Partner ecosystem", status: "Partial", proves: "Network map", missing: "MOUs and activity boundaries" },
      { family: "Field operations", status: "Needed", proves: "What happened on the ground", missing: "Logs, scripts, work plans, outcomes" }
    ],
    followUpQuestions: ["What records prove the prime-awardee model?", "Which partners matter most?", "What would falsify the political-infrastructure claim?", "What request should go to GRID or EPA first?"],
    entityFolders: [
      { entity: "GRID Alternatives", receipts: 5, signal: "Federal award and audited financial growth signals", gap: "Award contracts, sub-recipient files, fee schedules", nextMove: "Request award and sub-recipient packet." },
      { entity: "Partner ecosystem", receipts: 4, signal: "Advocacy, housing, workforce, and civic partners mapped", gap: "MOUs and activity records", nextMove: "Request partner agreements and field boundaries." },
      { entity: "SolarCorps / workforce programs", receipts: 3, signal: "Field infrastructure and trusted-messenger posture", gap: "Work plans, outreach scripts, logs", nextMove: "Request field-operation packet." }
    ],
    sourceGroups: [
      { label: "Federal funding", status: "Opened", detail: "Award signals create scale and priority." },
      { label: "Financial filings", status: "Opened", detail: "Audits and 990s anchor growth." },
      { label: "Partnership ecosystem", status: "Partial", detail: "Network map exists; activity records needed." },
      { label: "Field operations", status: "Missing", detail: "This decides whether infrastructure claims hold." }
    ],
    nextMoves: [
      "Request federal award agreements, amendments, administrative fee schedules, sub-recipient lists, deliverables, and monitoring files.",
      "Request partner MOUs, outreach plans, scripts, field logs, and civic-engagement boundaries.",
      "Separate technical service delivery from political infrastructure before any public claim moves."
    ]
  },
  claims: [{ title: "This is an infrastructure audit.", body: "The source trail supports review of how climate funding, program administration, partners, and field operations connect.", state: "Supported as scope", sourceIds: ["grid_dossier", "grid_federal_awards"], confidence: 85 }],
  sources: [
    source("grid_dossier", "GRID Alternatives source run", "attached_dossier", "Primary source run", "Forensic source run on GRID Alternatives political infrastructure.", "Source records decide final claims."),
    source("grid_federal_awards", "Federal climate funding award trail", "federal_award", "Award scale and authority", "Award signal includes approximately $312.25M total and a $249.8M SANAH pillar cited in the dossier.", "Award announcements require full agreements and deliverables."),
    source("grid_financials", "GRID audited financials and Form 990 trail", "financial_filings", "Revenue and asset analysis", "Aculeus tracks revenue, government grants, assets, and net assets across 2021-2024.", "Financial totals need program-level allocation records."),
    source("grid_partnerships", "GRID partnership ecosystem map", "partner_map", "Network map", "Aculeus maps housing, advocacy, workforce, and political-organizing adjacent partners.", "Partner map needs MOUs and activity records."),
    source("grid_field_operations", "SolarCorps and field operations profile", "field_operations", "Field infrastructure", "Aculeus identifies solar installation, utility assistance, door-to-door outreach, contractor networking, and workforce operations.", "Field operations need logs, scripts, training, and outcome records.")
  ],
  lanes: lanes([
    ["lead", "Question received", "The infrastructure question enters.", "The user asks whether technical service became political infrastructure.", ["grid_dossier"]],
    ["finance", "Finance opened", "Federal money changes the scale.", "Award signals and financial filings become the first layer.", ["grid_federal_awards", "grid_financials"]],
    ["admin", "Admin model mapped", "Prime-awardee role surfaces.", "The agent finds where fees, sub-recipients, and program control meet.", ["grid_financials"]],
    ["partners", "Partners linked", "The ecosystem appears.", "Housing, advocacy, workforce, and civic partners become the network map.", ["grid_partnerships"]],
    ["field", "Field checked", "The ground operation matters.", "Door-to-door, workforce, and trusted-messenger records become decisive.", ["grid_field_operations"]],
    ["gaps", "Gaps named", "The proof records are clear.", "Award agreements, MOUs, logs, scripts, and outcomes decide the claim.", ["grid_dossier"]],
    ["action", "Dispatch ready", "Request path generated.", "The agent drafts the first records request.", ["grid_federal_awards", "grid_partnerships"]]
  ]),
  nextRecords: [
    { priority: "High", recordId: "grid_award_packet", holder: "GRID Alternatives and federal program custodians", request: "Please provide federal award agreements, amendments, administrative fee schedules, sub-recipient lists, deliverables, monitoring records, and performance reports for GRID Alternatives climate funding program lanes.", reason: "This tests the financial catalyst and prime-awardee model." },
    { priority: "High", recordId: "grid_field_packet", holder: "GRID Alternatives and partner organizations", request: "Please provide partner MOUs, field-operation plans, outreach scripts, field logs, training materials, civic-engagement boundaries, and outcome records.", reason: "This tests whether technical service delivery became broader field infrastructure." }
  ],
  actions: {
    directMove: "Request the award packet and field-operation packet.",
    recordHolder: "GRID Alternatives, EPA/DOE custodians, and partner organizations",
    requestLanguage: "Please provide award agreements, amendments, administrative-fee schedules, sub-recipient lists, partner MOUs, field-operation plans, outreach scripts, training materials, monitoring reports, deliverables, performance outcomes, and civic-engagement boundaries for GRID Alternatives program lanes.",
    ifRefused: "Ask for record indexes, exemption basis, and custodian by program lane.",
    briefTargets: ["Reviewer", "Records counsel", "Coalition lead"],
    coalitionPath: "Brief the case as infrastructure: money, administrator role, partner network, field operation, missing records."
  }
});

const newCases = [networkCase, elevateCase, gridCase];
const newIds = new Set(newCases.map((item) => item.caseId));
library.defaultCaseId = "newsom_intermediary_network";
library.cases = [...newCases, ...library.cases.filter((item) => !newIds.has(item.caseId))];

writeFileSync(jsonPath, `${JSON.stringify(library, null, 2)}\n`);
console.log(`Updated ${jsonPath} with dossier-driven cases.`);
