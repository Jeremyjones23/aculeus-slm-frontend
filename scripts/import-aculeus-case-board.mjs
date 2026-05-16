import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { caseBoardReportToDemoLibrary } from "../lib/aculeus-case-board-adapter.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultSource = resolve(root, "..", "..", "DOGE", "slm_training", "reports", "aculeus_case_board_from_web_harness_20260515.json");
const inputPath = resolve(process.argv[2] || process.env.ACULEUS_CASE_BOARD_JSON || defaultSource);
const outputPath = resolve(process.argv[3] || process.env.ACULEUS_SOURCE_BOARD_JSON || resolve(root, "data", "source-fed-case-board.json"));
const advancementPath = process.argv[4] || process.env.ACULEUS_ADVANCEMENT_PACKET_JSON || "";
const modelAdvancementPath = process.argv[5] || process.env.ACULEUS_MODEL_ADVANCEMENT_JSON || "";
const splitReadinessPath = process.argv[6] || process.env.ACULEUS_SPLIT_READINESS_JSON || "";
const jsOutputPath = outputPath.replace(/\.json$/i, ".js");

const report = JSON.parse(readFileSync(inputPath, "utf8"));
const advancementPacket = advancementPath && existsSync(resolve(advancementPath))
  ? JSON.parse(readFileSync(resolve(advancementPath), "utf8"))
  : null;
const modelAdvancementPacket = modelAdvancementPath && existsSync(resolve(modelAdvancementPath))
  ? JSON.parse(readFileSync(resolve(modelAdvancementPath), "utf8"))
  : null;
const splitReadinessPacket = splitReadinessPath && existsSync(resolve(splitReadinessPath))
  ? JSON.parse(readFileSync(resolve(splitReadinessPath), "utf8"))
  : null;
const library = caseBoardReportToDemoLibrary(report, {
  defaultCaseId: "source_la_homelessness_fwa",
  advancementPacket,
  modelAdvancementPacket,
  splitReadinessPacket
});

writeFileSync(outputPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
writeFileSync(
  jsOutputPath,
  `window.ACULEUS_SOURCE_FED_CASE_BOARD = ${JSON.stringify(library, null, 2)};\n`,
  "utf8"
);

console.log(`Imported ${library.cases.length} source-fed case board cases.`);
console.log(outputPath);
console.log(jsOutputPath);
