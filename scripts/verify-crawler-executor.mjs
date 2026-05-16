import { executeCrawlerTasks, planCrawlerTasks, validateCrawlerExecution } from "../lib/aculeus-crawler-executor.js";

const tasks = planCrawlerTasks({
  rawQuery: "San Francisco drug rehabilitation program spending",
  jurisdiction: "San Francisco"
}, { maxTasks: 3 });

const dry = await executeCrawlerTasks(tasks, { enableNetwork: false, maxTasks: 2 });
const failures = [...validateCrawlerExecution(dry)];
if (dry.mode !== "custom_crawler_dry_run") failures.push("dry crawler mode mismatch");
if (!dry.result_sets.every((set) => set.robots?.status === "not_checked")) failures.push("dry crawler should not check robots");

const fetchFn = async (url) => {
  if (String(url).endsWith("/robots.txt")) {
    return new Response("User-agent: *\nAllow: /\n", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("Official host page. Agenda packet, contract, public spending, and program-monitoring records are listed here.", {
    status: 200,
    headers: { "content-type": "text/html" }
  });
};

const liveMock = await executeCrawlerTasks(tasks.slice(0, 1), { enableNetwork: true, fetchFn, maxTasks: 1 });
failures.push(...validateCrawlerExecution(liveMock));
if (liveMock.result_sets[0]?.status !== "PASS") failures.push("mock live crawler did not pass");
if (!liveMock.result_sets[0]?.content_hash) failures.push("mock live crawler missing content hash");
if (!liveMock.result_sets[0]?.robots?.allowed) failures.push("mock live crawler missing allow robots metadata");
if (liveMock.result_sets[0]?.candidates?.[0]?.evidence_promotion_allowed !== false) failures.push("crawler candidate escaped evidence gate");

if (failures.length) {
  console.error(`Crawler executor verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Crawler executor verification passed.");
