import { hardenInvestigationQuery } from "../lib/aculeus-source-fed-contracts.js";
import { planOfficialApiTasks, validateOfficialApiTasks } from "../lib/aculeus-official-source-router.js";

const failures = [];

const cases = [
  {
    name: "LA homelessness",
    spec: hardenInvestigationQuery({ rawQuery: "LA homelessness and where the fraud, waste, and abuse is." }),
    expected: ["socrata_lacity_catalog", "california_ckan_package_search", "usaspending_award_search"]
  },
  {
    name: "SF rehabilitation",
    spec: hardenInvestigationQuery({ rawQuery: "San Francisco drug rehabilitation program and where the fraud is." }),
    expected: ["socrata_sfgov_catalog", "california_ckan_package_search"]
  },
  {
    name: "CHIRLA nonprofit",
    spec: hardenInvestigationQuery({ rawQuery: "Xavier Bacerra and his connection to CHIRLA." }),
    expected: ["irs_teos_bulk_download_links", "usaspending_award_search"]
  }
];

for (const item of cases) {
  const tasks = planOfficialApiTasks(item.spec, { maxTasks: 8, maxResults: 5 });
  const issues = validateOfficialApiTasks(tasks);
  failures.push(...issues.map((issue) => `${item.name}: ${issue}`));
  const ids = tasks.map((task) => task.source_id);
  for (const expected of item.expected) {
    if (!ids.includes(expected)) failures.push(`${item.name}: missing ${expected}`);
  }
  if (tasks.some((task) => task.evidence_promotion_allowed !== false || task.candidate_only_until_receipted !== true)) {
    failures.push(`${item.name}: official API task allowed evidence promotion`);
  }
  if (tasks.some((task) => task.status === "needs_secret" && !task.requires_secret)) {
    failures.push(`${item.name}: public task incorrectly marked needs_secret`);
  }
}

if (failures.length) {
  console.error(`Official source router verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Official source router verification passed.");
