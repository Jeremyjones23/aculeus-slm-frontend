import { readFileSync } from "node:fs";

const demoCasePath = new URL("../data/demo-case.json", import.meta.url);

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const library = JSON.parse(readFileSync(demoCasePath, "utf8"));
  const url = new URL(request.url || "/api/demo-case", "http://localhost");
  const caseId = url.searchParams.get("caseId") || library.defaultCaseId;
  const demoCase = library.cases.find((casePacket) => casePacket.caseId === caseId)
    || library.cases.find((casePacket) => casePacket.caseId === library.defaultCaseId)
    || library.cases[0];
  response.status(200).json({
    ok: true,
    mode: "demo",
    defaultCaseId: library.defaultCaseId,
    cases: library.cases.map(({ caseId, displayId, title, headline, caseType, caseScope }) => ({
      caseId,
      displayId,
      title,
      headline,
      caseType,
      caseScope
    })),
    case: demoCase
  });
}
