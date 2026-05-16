import { hardenInvestigationQuery } from "../lib/aculeus-source-fed-contracts.js";
import { planProviderCandidateTasks } from "../lib/aculeus-provider-candidates.js";
import {
  buildProviderRequest,
  executeProviderCandidateTasks,
  validateProviderExecution
} from "../lib/aculeus-provider-executor.js";

const failures = [];

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  };
}

const spec = hardenInvestigationQuery({ rawQuery: "San Francisco drug rehabilitation program and where the fraud is." });
const tasks = planProviderCandidateTasks(spec, { maxTasks: 2, maxResults: 2, providerCapUsd: 1 });
const keys = { PARALLEL_API_KEY: "parallel-test-key", EXA_API_KEY: "exa-test-key" };
const requests = [];
const fakeFetch = async (url, init = {}) => {
  requests.push({ url: String(url), method: init.method, body: init.body || "", headers: init.headers || {} });
  if (String(url).includes("parallel.ai")) {
    return jsonResponse({
      results: [{
        url: "https://data.sfgov.org/d/abcd-1234",
        title: "SFGov treatment contract dataset",
        excerpts: ["SFGov dataset excerpt about treatment contracts."]
      }]
    });
  }
  if (String(url).includes("exa.ai")) {
    return jsonResponse({
      results: [{
        url: "https://www.sf.gov/departments/department-public-health",
        title: "Department of Public Health",
        highlights: ["Public DPH page mentioning behavioral health programs."]
      }]
    });
  }
  return jsonResponse({}, 404);
};

for (const task of tasks) {
  const request = buildProviderRequest(task, { providerApiKeys: keys });
  if (!request.ok) failures.push(`${task.provider_id}: request builder failed`);
  if (JSON.stringify(request).includes("parallel-test-key") && request.url.includes("exa.ai")) failures.push("provider keys crossed request boundaries");
}

const dryRun = await executeProviderCandidateTasks(tasks, {
  enableNetwork: false,
  providerCapUsd: 1,
  providerApiKeys: keys,
  maxTasks: 2
});
if (dryRun.provider_calls_executed !== false || dryRun.paid_spend_incurred !== false || dryRun.result_sets.some((set) => set.status !== "DRY_RUN")) {
  failures.push("dry-run provider execution should not call paid providers");
}

const capped = await executeProviderCandidateTasks(tasks, {
  enableNetwork: true,
  providerCapUsd: 0.01,
  providerApiKeys: keys,
  fetchFn: fakeFetch,
  maxTasks: 2
});
if (!capped.result_sets.every((set) => set.status === "COST_CAPPED") || capped.provider_calls_executed !== false) {
  failures.push("provider execution below cap should be cost capped before network calls");
}

const executed = await executeProviderCandidateTasks(tasks, {
  enableNetwork: true,
  providerCapUsd: 1,
  providerApiKeys: keys,
  fetchFn: fakeFetch,
  maxTasks: 2
});
failures.push(...validateProviderExecution(executed));
if (executed.provider_calls_executed !== true || executed.paid_spend_incurred !== true) failures.push("live provider execution should mark provider calls/spend");
if (executed.estimated_spend_usd > 1) failures.push("provider execution exceeded cap");
if (executed.candidate_count !== 2) failures.push(`expected two provider candidates, got ${executed.candidate_count}`);
if (executed.result_sets.some((set) => set.candidates.some((candidate) => candidate.evidence_id !== null || candidate.receipt_required !== true))) {
  failures.push("provider candidate promoted before receipt gate");
}
if (!requests.some((request) => request.url.includes("parallel.ai") && request.body.includes("search_queries"))) {
  failures.push("Parallel Search request was not shaped correctly");
}
if (!requests.some((request) => request.url.includes("exa.ai") && request.body.includes("\"contents\":{\"highlights\":true}"))) {
  failures.push("Exa request was not shaped with highlights");
}

const noSecret = await executeProviderCandidateTasks(tasks.slice(0, 1), {
  enableNetwork: true,
  providerCapUsd: 1,
  providerApiKeys: {},
  allowProcessEnvKeys: false,
  fetchFn: fakeFetch,
  maxTasks: 1
});
if (noSecret.result_sets[0]?.status !== "NEEDS_SECRET") failures.push("missing key should produce NEEDS_SECRET");

if (failures.length) {
  console.error(`Provider executor verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Provider executor verification passed.");
