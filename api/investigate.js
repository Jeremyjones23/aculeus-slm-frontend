import { readFileSync } from "node:fs";
import { extractGatewayToken, investigateCase, readJsonRequest } from "../lib/aculeus-case-qa.js";

const demoCasePath = new URL("../data/demo-case.json", import.meta.url);

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const payload = await readJsonRequest(request);
  const library = JSON.parse(readFileSync(demoCasePath, "utf8"));
  const caseId = payload.caseId || library.defaultCaseId;
  const demoCase = library.cases.find((casePacket) => casePacket.caseId === caseId)
    || library.cases.find((casePacket) => casePacket.caseId === library.defaultCaseId)
    || library.cases[0];
  const investigatedCase = await investigateCase({
    baseCase: demoCase,
    lead: payload.lead,
    gatewayAuthToken: extractGatewayToken(request)
  });

  response.status(200).json({
    ok: true,
    mode: investigatedCase.responseMode,
    modelReady: investigatedCase.model.mode === "live_model_configured" || investigatedCase.model.mode === "live_model",
    adapterVersion: investigatedCase.model.version,
    case: investigatedCase
  });
}
