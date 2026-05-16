import { hardenInvestigationQuery } from "../lib/aculeus-source-fed-contracts.js";
import { planOfficialApiTasks } from "../lib/aculeus-official-source-router.js";
import {
  buildOfficialApiRequest,
  executeOfficialApiTasks,
  validateOfficialApiExecution
} from "../lib/aculeus-official-api-executor.js";

const failures = [];

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  };
}

const spec = hardenInvestigationQuery({ rawQuery: "LA homelessness and where the fraud, waste, and abuse is." });
const tasks = planOfficialApiTasks(spec, { maxTasks: 8, maxResults: 2 });
const executable = tasks.filter((task) => !task.requires_secret && [
  "usaspending_award_search",
  "california_ckan_package_search",
  "socrata_lacity_catalog",
  "arcgis_item_search"
].includes(task.source_id));

const requestedUrls = [];
const fakeFetch = async (url, init = {}) => {
  requestedUrls.push({ url: String(url), method: init.method || "GET", body: init.body || "" });
  if (String(url).includes("usaspending.gov")) {
    return jsonResponse({
      results: [{
        generated_internal_id: "CONT_AWARD_1",
        "Recipient Name": "LOS ANGELES HOMELESS SERVICES AUTHORITY",
        "Award Amount": 1250000,
        "Awarding Agency": "Department of Housing and Urban Development"
      }]
    });
  }
  if (String(url).includes("api.us.socrata.com")) {
    return jsonResponse({
      results: [{
        resource: { id: "abcd-1234", name: "Controller Expenditures", updatedAt: "2026-01-01T00:00:00" },
        metadata: { description: "Payment and expenditure dataset." },
        permalink: "https://data.lacity.org/d/abcd-1234"
      }]
    });
  }
  if (String(url).includes("data.ca.gov")) {
    return jsonResponse({
      result: {
        results: [{
          id: "pkg1",
          name: "homelessness-contracts",
          title: "Homelessness Contracts",
          notes: "Statewide homelessness contract metadata.",
          organization: { title: "California" },
          resources: [{ id: "res1", url: "https://data.ca.gov/dataset/homelessness-contracts.csv" }]
        }]
      }
    });
  }
  if (String(url).includes("arcgis.com")) {
    return jsonResponse({
      results: [{ id: "arc1", title: "Homelessness Services Locations", owner: "lacity", type: "Feature Service", snippet: "Service locations." }]
    });
  }
  return jsonResponse({}, 404);
};

for (const task of executable) {
  const request = buildOfficialApiRequest(task);
  if (!request.ok) failures.push(`${task.source_id}: request builder failed`);
  if (request.method === "GET" && !String(request.url).includes(encodeURIComponent(task.query).replace(/%20/g, "+").slice(0, 10)) && !String(request.url).includes("q=")) {
    failures.push(`${task.source_id}: GET request does not include query params`);
  }
}

const dryRun = await executeOfficialApiTasks(executable.slice(0, 2), { enableNetwork: false, maxTasks: 2 });
if (dryRun.official_api_calls_executed !== false || dryRun.result_sets.some((set) => set.status !== "DRY_RUN")) {
  failures.push("dry-run execution should not call official APIs");
}

const executed = await executeOfficialApiTasks(executable, {
  enableNetwork: true,
  fetchFn: fakeFetch,
  now: "2026-05-16T12:00:00.000Z",
  maxTasks: executable.length
});
failures.push(...validateOfficialApiExecution(executed));
if (executed.official_api_calls_executed !== true) failures.push("live-enabled execution should mark official_api_calls_executed");
if (executed.paid_spend_incurred !== false || executed.actual_spend_usd !== 0) failures.push("official API execution incurred spend");
if (executed.record_count < executable.length) failures.push(`expected at least one parsed record per executable task, got ${executed.record_count}`);
if (executed.result_sets.some((set) => set.records.some((record) => record.evidence_id !== null || record.receipt_required !== true))) {
  failures.push("executed official API record promoted before receipt gate");
}
if (!requestedUrls.some((request) => request.url.includes("usaspending.gov") && request.method === "POST" && request.body.includes("award_type_codes"))) {
  failures.push("USAspending execution did not use expected POST award search body");
}
if (!requestedUrls.some((request) => request.url.includes("api.us.socrata.com") && request.url.includes("data.lacity.org"))) {
  failures.push("Socrata execution did not constrain LA domain");
}

const secretTask = tasks.find((task) => task.requires_secret);
if (secretTask) {
  const secretResult = await executeOfficialApiTasks([secretTask], { enableNetwork: true, fetchFn: fakeFetch });
  if (secretResult.result_sets[0]?.status !== "NEEDS_SECRET") failures.push("secret-gated official task should return NEEDS_SECRET");
  if (requestedUrls.some((request) => request.url.includes(secretTask.endpoint))) failures.push("secret-gated task should not be fetched without secret");
}

if (failures.length) {
  console.error(`Official API executor verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Official API executor verification passed.");
