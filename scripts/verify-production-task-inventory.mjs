import { readFileSync } from "node:fs";
import { join } from "node:path";

const text = readFileSync(join(process.cwd(), "docs", "remaining-production-tasks.md"), "utf8");
const requiredSections = [
  "Gate 1: Identity And Account Control",
  "Gate 2: Platform And Deployment",
  "Gate 3: Browserbase And Crawler Execution",
  "Gate 4: Retrieval And Evidence Quality",
  "Gate 5: Reviewer Workflow And Admin UX",
  "Gate 6: Data, Persistence, And Tenancy",
  "Gate 7: Training And Model Path",
  "Gate 8: Spend And Provider Operations",
  "Gate 9: Product Surface And Customer Experience",
  "Gate 10: Observability, Incident Response, And Operations",
  "Gate 11: External Terms, Privacy, And Claim Posture",
  "Pilot-Ready Minimum Remaining Set",
  "Production Invite Minimum Remaining Set"
];
const requiredTasks = [
  "ID-01",
  "ID-08",
  "PL-01",
  "PL-02",
  "BR-03",
  "EV-02",
  "RV-05",
  "DP-07",
  "TR-03",
  "SP-05",
  "UX-04",
  "OP-01",
  "LC-04"
];
const requiredPhrases = [
  "Known-customer pilot ready",
  "Production invite ready",
  "Vercel `Clerk DNS Configuration` failed check",
  "Browserbase Fetch",
  "real Clerk accounts",
  "candidate-only",
  "no secret leakage",
  "known paid customer pilot use",
  "source, legal, or hallucination regressions"
];

const failures = [];
for (const section of requiredSections) {
  if (!text.includes(section)) failures.push(`missing section: ${section}`);
}
for (const task of requiredTasks) {
  if (!text.includes(`| ${task} |`)) failures.push(`missing task id: ${task}`);
}
for (const phrase of requiredPhrases) {
  if (!text.includes(phrase)) failures.push(`missing phrase: ${phrase}`);
}
const taskCount = (text.match(/\| [A-Z]{2}-\d{2} \|/g) || []).length;
if (taskCount < 75) failures.push(`expected at least 75 task rows, found ${taskCount}`);
if (text.includes("Status: production ready")) failures.push("inventory must not claim production ready");
if (/\bTODO\b|\bTBD\b/.test(text)) failures.push("inventory must use explicit open tasks, not TODO/TBD placeholders");

if (failures.length) {
  console.error(`Production task inventory verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`Production task inventory verification passed. Task rows: ${taskCount}.`);
