import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(process.cwd(), "app", "disclaimer", "page.jsx"), "utf8");
const nav = readFileSync(join(process.cwd(), "components", "aculeus-workspace-sections.jsx"), "utf8");
const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

const failures = [];
for (const phrase of [
  "not a final adjudicator",
  "Candidate leads are not proof",
  "No automatic fraud or intent finding",
  "External records control the truth layer",
  "Customer responsibility remains active"
]) {
  if (!page.includes(phrase)) failures.push(`disclaimer page missing phrase: ${phrase}`);
}
if (!nav.includes('href="/disclaimer"')) failures.push("workspace nav missing disclaimer link");
for (const phrase of [".disclaimer-shell", ".disclaimer-grid", "@media (max-width: 980px)"]) {
  if (!css.includes(phrase)) failures.push(`disclaimer styles missing phrase: ${phrase}`);
}
if (page.match(/legal advice|legal opinion/i)) failures.push("disclaimer page should avoid implying legal advice language posture");

if (failures.length) {
  console.error(`Disclaimer page verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("Disclaimer page verification passed.");
