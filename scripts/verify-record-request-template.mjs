import { buildRecordRequestTemplates, validateRecordRequestTemplates } from "../lib/aculeus-record-request-template.js";

const templates = buildRecordRequestTemplates([
  {
    id: "missing_monitoring_letters",
    holder: "Los Angeles Housing Department",
    request: "Request monitoring letters and corrective action records related to fraud allegations.",
    date_scope: "FY2021-FY2026"
  }
], {
  entities: ["Example Services", "LAHSA"],
  statutoryFraming: "California Public Records Act request for non-exempt records."
});

const failures = validateRecordRequestTemplates(templates);
if (templates[0]?.missing_record_id !== "missing_monitoring_letters") failures.push("template missing missing-record id link");
if (!templates[0]?.entity_scope?.includes("LAHSA")) failures.push("template missing entity scope");
if (/fraud/i.test(templates[0]?.record_description)) failures.push("unsupported allegation was not stripped");

if (failures.length) {
  console.error(`Record request template verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Record request template verification passed.");
