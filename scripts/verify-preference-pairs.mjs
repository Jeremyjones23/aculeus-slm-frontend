import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildPreferencePairsFromTraces, validatePreferencePair } from "../lib/aculeus-preference-pairs.js";
import { buildTrainingTrace } from "../lib/aculeus-training-trace-exporter.js";

const trace = buildTrainingTrace({
  trace_id: "trace_preference_fixture",
  caseId: "case_preference_fixture",
  runId: "run_preference_fixture",
  action: "official_api_search",
  caseSpec: {
    case_scope: "school board spending review",
    jurisdiction: "California",
    entities: ["school board"],
    official_api_targets: ["Socrata", "ArcGIS"],
    missing_record_hypotheses: ["board packet attachments", "vendor amendments"]
  },
  retrievalActions: [
    { provider: "official_api", source: "Socrata", query: "school board contracts agenda minutes" },
    { provider: "crawler", source: "board_docs", query: "vendor payment backup" }
  ],
  sourceLedger: [{
    ledger_entry_id: "ledger_pref_1",
    entry_type: "official_api_search",
    status: "found",
    labels: ["official", "candidate_only"],
    receipt_id: "receipt_pref_1",
    evidence_id: "evidence_pref_1",
    public_safe: true,
    raw_text: "must not appear in preference pair"
  }],
  findings: [{
    finding_id: "finding_pref_1",
    claim: "Board records identify a spending lane that needs payment backup.",
    confidence: "bounded",
    evidence_ids: ["evidence_pref_1"],
    next_action: "Request payment backup and amendments."
  }],
  userFeedback: { useful: true, opened_evidence: true },
  costLatency: { actual_spend_usd: 0, provider_cap_usd: 0.25 }
});

const pairs = buildPreferencePairsFromTraces([trace]);
if (pairs.length !== 2) throw new Error(`expected two preference pairs, got ${pairs.length}`);
for (const pair of pairs) {
  const issues = validatePreferencePair(pair);
  if (issues.length) throw new Error(`Preference pair failed validation:\n${issues.join("\n")}`);
  if (!pair.evidence_refs.includes("evidence_pref_1")) throw new Error("preference pair missing evidence ref");
  if (!JSON.stringify(pair.rejected).match(/Broad query|Overclaims|snippets as proof|fraud/i)) {
    throw new Error("preference pair rejected side does not encode weak behavior");
  }
}

const outputDir = mkdtempSync(join(tmpdir(), "aculeus-preference-pairs-"));
const outputPath = join(outputDir, "preference-pairs.jsonl");
writeFileSync(outputPath, pairs.map((pair) => JSON.stringify(pair)).join("\n") + "\n", "utf8");
const text = readFileSync(outputPath, "utf8");
if (text.match(/must not appear|raw_text|api_key|authorization|secret/i)) throw new Error("preference pair export leaked blocked material");

console.log(`Preference pair verification passed. Pair count: ${pairs.length}. Path: ${outputPath}`);
