import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const port = 4397;
const storeDir = mkdtempSync(join(tmpdir(), "aculeus-api-run-store-"));
const child = spawn(process.execPath, ["scripts/serve.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    ACULEUS_RUN_STORE_DIR: storeDir
  },
  stdio: "ignore"
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(fn, attempts = 40, delay = 150) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await sleep(delay);
    }
  }
  throw lastError;
}

try {
  await retry(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/source-fed.html`);
    if (!response.ok) throw new Error(`server not ready: ${response.status}`);
  });

  const createResponse = await fetch(`http://127.0.0.1:${port}/api/investigation-runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      rawQuery: "What were red flags surrounding Urban Alchemy in California?",
      caseId: "source_la_homelessness_fwa",
      providerCapUsd: 0
    })
  });
  if (createResponse.status !== 202) throw new Error(`run create returned ${createResponse.status}`);
  const created = await createResponse.json();
  if (!created.run_id || created.status !== "submitted") throw new Error("run create missing submitted run");
  if (created.provider_calls_executed || created.official_api_calls_executed || created.paid_spend_incurred || created.remote_mutation_executed || created.model_findings_generated || created.candidate_sources_are_evidence) {
    throw new Error("run create violated no-provider/no-spend/no-mutation/no-direct-findings contract");
  }
  if (!created.official_api_tasks?.length) throw new Error("run create missing official API tasks");
  if (!created.provider_candidate_tasks?.length) throw new Error("run create missing provider candidate tasks");
  if (!created.provider_candidates?.length) throw new Error("run create missing provider candidates");
  if (created.provider_candidate_tasks.some((task) => task.evidence_promotion_allowed !== false || task.candidate_only_until_receipted !== true || task.receipt_required !== true)) {
    throw new Error("provider task allowed evidence promotion");
  }
  if (created.provider_candidates.some((candidate) => candidate.evidence_id !== null || candidate.evidence_promotion_allowed !== false || candidate.receipt_required !== true)) {
    throw new Error("provider candidate became evidence");
  }
  if (created.official_api_tasks.some((task) => task.evidence_promotion_allowed !== false || task.candidate_only_until_receipted !== true)) {
    throw new Error("official API task allowed evidence promotion");
  }

  await sleep(4300);
  const readyResponse = await fetch(`http://127.0.0.1:${port}/api/investigation-runs/${encodeURIComponent(created.run_id)}`);
  if (!readyResponse.ok) throw new Error(`run poll returned ${readyResponse.status}`);
  const ready = await readyResponse.json();
  const failures = [];
  if (ready.status !== "ready") failures.push(`expected ready, got ${ready.status}`);
  if (!ready.action_brief?.what_we_found?.length) failures.push("ready run missing Action Brief");
  if (!ready.case_board?.candidate_sources?.length) failures.push("ready run missing candidate sources");
  if (!ready.audit_trail?.some((event) => event.status === "ready")) failures.push("ready run missing audit transition");
  if (!ready.audit_trail?.some((event) => event.event === "provider_candidate_router")) failures.push("ready run missing provider candidate router audit");
  if (!ready.audit_trail?.some((event) => event.event === "official_api_router")) failures.push("ready run missing official API router audit");
  if (!ready.provider_candidate_tasks?.some((task) => task.task_type === "provider_candidate_search")) failures.push("ready run missing provider task plan");
  if (!ready.provider_candidates?.some((candidate) => candidate.source_family === "provider_search_candidate" && candidate.evidence_id === null)) failures.push("ready run missing provider candidates");
  if (!ready.official_api_tasks?.some((task) => task.status === "planned_public_api_candidate_probe" || task.status === "needs_secret")) failures.push("ready run missing official API plan");
  if (!ready.retrieval_queue?.some((task) => task.status === "candidate_only_unverified" || task.status === "needs_records_request")) failures.push("ready run missing candidate/missing queue states");
  if (ready.cost_ledger?.actual_spend_usd !== 0) failures.push("ready run incurred spend");
  if (ready.case_board?.candidate_sources?.some((candidate) => candidate.evidence_id !== null)) failures.push("candidate source promoted to evidence");
  if (failures.length) throw new Error(failures.join("\n"));

  console.log("Investigation run API verification passed.");
} finally {
  child.kill();
  await sleep(250);
  rmSync(storeDir, { recursive: true, force: true });
}
