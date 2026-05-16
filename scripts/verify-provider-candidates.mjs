import { hardenInvestigationQuery } from "../lib/aculeus-source-fed-contracts.js";
import {
  collectProviderCandidates,
  planProviderCandidateTasks,
  validateProviderCandidates,
  validateProviderCandidateTasks
} from "../lib/aculeus-provider-candidates.js";

const failures = [];
const cases = [
  {
    name: "LA homelessness",
    spec: hardenInvestigationQuery({ rawQuery: "LA homelessness and where the fraud, waste, and abuse is." }),
    expected: ["controller.lacity.gov", "lahsa.org"]
  },
  {
    name: "CA school board",
    spec: hardenInvestigationQuery({ rawQuery: "CA school board meetings and what they are spending money on." }),
    expected: ["cde.ca.gov", "lausd.org"]
  },
  {
    name: "SF rehabilitation",
    spec: hardenInvestigationQuery({ rawQuery: "San Francisco drug rehabilitation program and where the fraud is." }),
    expected: ["data.sfgov.org", "sf.gov"]
  },
  {
    name: "CHIRLA",
    spec: hardenInvestigationQuery({ rawQuery: "Xavier Bacerra and his connection to CHIRLA." }),
    expected: ["irs.gov", "cal-access.sos.ca.gov"]
  }
];

for (const item of cases) {
  const tasks = planProviderCandidateTasks(item.spec, { maxTasks: 4, maxResults: 3, providerCapUsd: 0 });
  failures.push(...validateProviderCandidateTasks(tasks).map((issue) => `${item.name}: ${issue}`));
  const result = collectProviderCandidates(item.spec, { maxTasks: 4, candidateCap: 5, providerCapUsd: 0 });
  failures.push(...validateProviderCandidates(result.candidates).map((issue) => `${item.name}: ${issue}`));

  if (result.provider_calls_executed !== false || result.live_provider_calls_executed !== false) failures.push(`${item.name}: fixture mode executed provider calls`);
  if (result.paid_spend_incurred !== false || result.actual_spend_usd !== 0) failures.push(`${item.name}: fixture mode incurred spend`);
  if (result.candidate_count > 5) failures.push(`${item.name}: candidate cap not honored`);
  if (result.tasks.some((task) => task.evidence_promotion_allowed !== false || task.candidate_only_until_receipted !== true || task.receipt_required !== true)) {
    failures.push(`${item.name}: provider task allowed evidence promotion`);
  }
  if (result.candidates.some((candidate) => candidate.evidence_id !== null || candidate.evidence_promotion_allowed !== false || candidate.receipt_required !== true)) {
    failures.push(`${item.name}: provider candidate became evidence`);
  }
  const candidateBlob = JSON.stringify(result.candidates).toLowerCase();
  for (const expected of item.expected) {
    if (!candidateBlob.includes(expected)) failures.push(`${item.name}: missing expected provider locator ${expected}`);
  }
  const taskBlob = JSON.stringify(result.tasks);
  for (const required of ["https://api.parallel.ai/v1/search", "https://api.exa.ai/search", "<redacted>"]) {
    if (!taskBlob.includes(required)) failures.push(`${item.name}: missing request preview marker ${required}`);
  }
  for (const forbidden of ["EXA_API_KEY=", "PARALLEL_API_KEY=", "secret-value", "PRIVATE KEY"]) {
    if (taskBlob.includes(forbidden)) failures.push(`${item.name}: leaked secret marker ${forbidden}`);
  }
}

const capped = planProviderCandidateTasks(cases[0].spec, {
  maxTasks: 2,
  providerCapUsd: 0,
  enableLiveProviderCalls: true
});
if (!capped.every((task) => task.status === "cost_capped" && task.live_execution_allowed === false)) {
  failures.push("live provider request without spend cap must be cost_capped");
}

if (failures.length) {
  console.error(`Provider candidate verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Provider candidate verification passed.");
