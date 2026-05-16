import { getSeedCase } from "./aculeus-product-data.js";

export function buildInvestigationSpec(input = {}) {
  const run = input.run || null;
  const casePacket = input.casePacket || getSeedCase(input.caseId || run?.caseId);
  const rawQuery = clean(input.rawQuery || input.raw_query || input.lead || run?.lead || casePacket?.lead || casePacket?.title || "");
  const text = `${rawQuery} ${casePacket?.title || ""} ${casePacket?.jurisdiction || ""}`;
  return {
    raw_query: rawQuery,
    hardened_query: rawQuery,
    case_scope: clean(casePacket?.title || rawQuery || "Public-records investigation"),
    jurisdictions: inferJurisdictions(text),
    target_entities: inferEntities(text, casePacket),
    concern_types: inferConcernTypes(text),
    suspected_issue_types: inferConcernTypes(text),
    source_priorities: [
      "official_public_records",
      "official_api_catalogs",
      "provider_locator_candidates",
      "receipted_public_urls",
      "missing_record_requests"
    ],
    official_api_targets: [],
    search_queries: [rawQuery].filter(Boolean),
    crawler_tasks: [],
    overclaim_guardrails: [
      "candidate leads are not evidence",
      "fraud or intent claims require adjudicative or direct official support",
      "dollar amounts, names, dates, and allegations require evidence IDs"
    ],
    missing_record_hypotheses: Array.isArray(casePacket?.nextRecords)
      ? casePacket.nextRecords.map((item) => item.request).filter(Boolean)
      : []
  };
}

function inferJurisdictions(text) {
  const lower = text.toLowerCase();
  const rows = [];
  if (/los angeles|lahsa|lausd|\bla\b/.test(lower)) rows.push({ name: "Los Angeles, CA", level: "local" });
  if (/san francisco|sfdph|\bsf\b/.test(lower)) rows.push({ name: "San Francisco, CA", level: "local" });
  if (/california| ca |chirla|bacerra|becerra/.test(` ${lower} `)) rows.push({ name: "California", level: "state" });
  if (/federal|irs|sam|usaspending|sec/.test(lower)) rows.push({ name: "United States federal", level: "federal" });
  return rows.length ? rows : [{ name: "United States public records", level: "multi" }];
}

function inferEntities(text, casePacket) {
  const known = [
    "LAHSA",
    "LAUSD",
    "San Francisco Department of Public Health",
    "HealthRIGHT 360",
    "CHIRLA",
    "Xavier Becerra",
    "USAspending",
    "SAM.gov"
  ];
  const lower = text.toLowerCase();
  const entities = known
    .filter((name) => lower.includes(name.toLowerCase()) || (name === "Xavier Becerra" && /bacerra|becerra/.test(lower)))
    .map((name) => ({ name, type: entityType(name) }));
  if (!entities.length && casePacket?.title) entities.push({ name: clean(casePacket.title), type: "topic" });
  return entities;
}

function inferConcernTypes(text) {
  const lower = text.toLowerCase();
  const concerns = new Set(["public_record_gap_review"]);
  if (/grant|award|funding/.test(lower)) concerns.add("grant_awards");
  if (/contract|vendor|procurement|spending|money|spend/.test(lower)) {
    concerns.add("public_contracts");
    concerns.add("vendor_spend_review");
  }
  if (/fraud|waste|abuse|audit|control/.test(lower)) concerns.add("waste_or_control_gap_review");
  if (/school board|agenda|minutes|board/.test(lower)) concerns.add("board_actions");
  if (/rehab|drug|program|outcome|homeless/.test(lower)) concerns.add("program_outcome_and_monitoring_review");
  if (/nonprofit|chirla|irs|990|tax exempt/.test(lower)) concerns.add("nonprofit_filing_reconciliation");
  return [...concerns];
}

function entityType(name) {
  if (/department|lahsa|lausd/i.test(name)) return "agency";
  if (/chirla|healthright/i.test(name)) return "nonprofit";
  if (/becerra/i.test(name)) return "official";
  return "system";
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
