import {
  buildAnswerBriefFromCase,
  getSeedCase,
  listRecentCaseSeeds,
  loadSourceFedBoard
} from "../lib/aculeus-product-data.js";
import { executeOfficialApiTasks } from "../lib/aculeus-official-api-executor.js";
import { executeProviderCandidateTasks } from "../lib/aculeus-provider-executor.js";

const failures = [];

const firstBoard = loadSourceFedBoard();
const secondBoard = loadSourceFedBoard();
if (firstBoard !== secondBoard) failures.push("source-fed board cache did not reuse the parsed board");

const recent = listRecentCaseSeeds();
const fallbackCase = getSeedCase("__missing_case__");
if (!recent.length) failures.push("recent case index returned no cases");
if (!fallbackCase?.caseId) failures.push("case index did not return a fallback case");

const brief = buildAnswerBriefFromCase(fallbackCase);
const citationIds = new Set(brief.citations.map((citation) => citation.citationId));
for (const support of brief.support) {
  for (const citationId of support.citationIds) {
    if (!citationIds.has(citationId)) failures.push(`support row references missing citation ${citationId}`);
  }
}

const officialTasks = ["datagov_catalog_search", "california_ckan_package_search", "arcgis_item_search"].map((sourceId, index) => ({
  task_id: `official_order_${index + 1}`,
  source_id: sourceId,
  endpoint: sourceId === "arcgis_item_search" ? "https://www.arcgis.com/sharing/rest/search" : "https://catalog.data.gov/api/3/action/package_search",
  query: `order test ${index + 1}`,
  max_results: 1,
  source_family: "official_catalog_metadata",
  reliability_tier: "official_catalog_metadata"
}));

const official = await executeOfficialApiTasks(officialTasks, {
  enableNetwork: true,
  concurrency: 2,
  fetchFn: async () => jsonResponse({
    result: { results: [{ id: "dataset", name: "dataset", title: "Dataset", resources: [{ url: "https://example.com/dataset.csv" }] }] },
    results: [{ id: "arcgis", title: "ArcGIS item", url: "https://example.com/item" }]
  })
});
if (official.result_sets.map((set) => set.task_id).join("|") !== officialTasks.map((task) => task.task_id).join("|")) {
  failures.push("official bounded executor did not preserve task order");
}

const providerTasks = ["parallel_search", "exa_deep"].map((providerId, index) => ({
  task_id: `provider_order_${index + 1}`,
  provider_id: providerId,
  provider: providerId === "parallel_search" ? "Parallel Search" : "Exa Deep Search",
  endpoint: providerId === "parallel_search" ? "https://api.parallel.ai/v1/search" : "https://api.exa.ai/search",
  query: `provider order ${index + 1}`,
  max_results: 1
}));
const provider = await executeProviderCandidateTasks(providerTasks, {
  enableNetwork: true,
  concurrency: 2,
  providerCapUsd: 1,
  providerApiKeys: { PARALLEL_API_KEY: "test", EXA_API_KEY: "test" },
  fetchFn: async () => jsonResponse({ results: [{ url: "https://example.com/source", title: "Source", excerpts: ["Source excerpt."] }] })
});
if (provider.result_sets.map((set) => set.task_id).join("|") !== providerTasks.map((task) => task.task_id).join("|")) {
  failures.push("provider bounded executor did not preserve task order");
}
if (Number(provider.estimated_spend_usd || 0) > 1) failures.push("provider bounded executor exceeded spend cap");

if (failures.length) {
  console.error(`Complexity optimization verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Complexity optimization verification passed.");

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body)
  };
}
