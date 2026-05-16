import { readFileSync } from "node:fs";
import { answerCaseQuestion, extractGatewayToken, readJsonRequest } from "../lib/aculeus-case-qa.js";

const demoCasePath = new URL("../data/demo-case.json", import.meta.url);

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const payload = await readJsonRequest(request);
    const library = JSON.parse(readFileSync(demoCasePath, "utf8"));
    const demoCase = library.cases.find((casePacket) => casePacket.caseId === library.defaultCaseId) || library.cases[0];
    const casePacket = payload.case && typeof payload.case === "object" ? payload.case : demoCase;
    const result = await answerCaseQuestion({
      question: payload.question,
      casePacket,
      gatewayAuthToken: extractGatewayToken(request)
    });

    response.status(result.ok ? 200 : 400).json(result);
  } catch {
    response.status(400).json({
      ok: false,
      mode: "validation_error",
      error: "Question could not be reviewed."
    });
  }
}
