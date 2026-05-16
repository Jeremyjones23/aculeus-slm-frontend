import { scoutRunGaps, validateGapScoutResult } from "../lib/aculeus-gap-scout.js";

const run = {
  runId: "run_gap_scout_fixture",
  lead: "LA homelessness spending oversight",
  answerBrief: {
    title: "LA homelessness",
    missing: [
      { id: "missing_contracts", holder: "LAHSA", request: "Request subrecipient contract attachments." },
      { id: "missing_monitoring", holder: "Los Angeles", request: "Request monitoring reports and corrective action letters." }
    ]
  },
  ledger: [{
    entry_type: "official_api_search",
    tasks: [{
      task_id: "existing_usaspending",
      source_id: "usaspending_award_search",
      endpoint: "https://api.usaspending.gov/api/v2/search/spending_by_award/"
    }]
  }]
};

const result = scoutRunGaps({ run, spec: { raw_query: run.lead, jurisdiction: "Los Angeles" } });
const failures = validateGapScoutResult(result);

if (!result.tasks.length) failures.push("gap scout should add follow-up tasks");
if (result.tasks.some((task) => task.endpoint === "https://api.usaspending.gov/api/v2/search/spending_by_award/")) {
  failures.push("gap scout did not dedupe existing USAspending task");
}
if (!result.tasks.some((task) => task.lane === "provider_search" || task.lane === "custom_crawler")) {
  failures.push("gap scout should diversify beyond official APIs");
}

if (failures.length) {
  console.error(`Gap scout verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Gap scout verification passed.");
