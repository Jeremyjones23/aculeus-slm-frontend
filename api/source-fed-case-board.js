import { readFileSync } from "node:fs";

const sourceFedPath = new URL("../data/source-fed-case-board.json", import.meta.url);

export default function handler(request, response) {
  if (request.method && request.method !== "GET") {
    response.writeHead(405, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  const library = JSON.parse(readFileSync(sourceFedPath, "utf8"));
  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify({ ok: true, mode: "source_fed_case_board", ...library }, null, 2));
}
