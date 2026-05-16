import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const jsonPath = join(root, "data", "demo-case.json");
const jsPath = join(root, "data", "demo-case.js");
const library = JSON.parse(readFileSync(jsonPath, "utf8"));

const js = `window.ACULEUS_DEMO_LIBRARY = ${JSON.stringify(library, null, 2)};\n`
  + "window.ACULEUS_DEMO_CASES = window.ACULEUS_DEMO_LIBRARY.cases;\n"
  + "window.ACULEUS_DEMO_CASE = window.ACULEUS_DEMO_CASES.find((demoCase) => demoCase.caseId === window.ACULEUS_DEMO_LIBRARY.defaultCaseId) || window.ACULEUS_DEMO_CASES[0];\n";

writeFileSync(jsPath, js);
console.log("Synced data/demo-case.js from data/demo-case.json.");
