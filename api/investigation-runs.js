import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createInvestigationRun, getInvestigationRun } from "../lib/aculeus-investigation-runner.js";
import { createFileRunStore } from "../lib/aculeus-run-store.js";

const sourceFedPath = new URL("../data/source-fed-case-board.json", import.meta.url);
const runStore = createFileRunStore(process.env.ACULEUS_RUN_STORE_DIR || fileURLToPath(new URL("../.local/investigation-runs", import.meta.url)));

export default async function handler(request, response) {
  const library = JSON.parse(readFileSync(sourceFedPath, "utf8"));

  if (request.method === "POST") {
    const payload = await readJsonRequest(request);
    response.status(202).json(createInvestigationRun(payload, library, { store: runStore }));
    return;
  }

  if (request.method === "GET") {
    const runId = request.query?.run_id || request.query?.runId;
    const result = getInvestigationRun(runId, library, { store: runStore });
    response.status(result.ok ? 200 : 404).json(result);
    return;
  }

  response.status(405).json({ ok: false, error: "Method not allowed" });
}

function readJsonRequest(request) {
  if (request.body && typeof request.body === "object") return request.body;
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}
