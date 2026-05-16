import { createAculeusModelAdapter, validateModelAdapterContract } from "../lib/aculeus-model-adapter.js";

process.env.ACULEUS_MODEL_ID = "aculeus-candidate-shadow-test";
const adapter = createAculeusModelAdapter();
const issues = validateModelAdapterContract(adapter);
if (issues.length) throw new Error(`Model adapter contract failed:\n${issues.join("\n")}`);
if (adapter.model_id !== "aculeus-candidate-shadow-test") throw new Error("adapter did not read ACULEUS_MODEL_ID");

const plan = adapter.roles.planner({
  raw_query: "school board vendor contracts",
  search_queries: ["school board vendor contracts official records"],
  official_api_targets: ["Socrata"],
  missing_record_hypotheses: ["payment backup"]
});
if (plan.output_type !== "retrieval_plan" || plan.direct_answer_allowed !== false) throw new Error("planner bypassed retrieval gate");

const scout = adapter.roles.gap_scout({
  source_ledger: [{ ledger_entry_id: "ledger_1", status: "found", labels: ["candidate_only"] }]
});
if (scout.status === "blocked" || scout.output_type !== "second_pass_retrieval_tasks") throw new Error("gap scout did not run after ledger");

const blockedSynthesis = adapter.roles.synthesis({
  findings: [{ finding_id: "finding_1", claim: "unsupported direct answer" }],
  verifier_results: { ok: false }
});
if (blockedSynthesis.status !== "blocked") throw new Error("synthesis bypassed verifier/evidence gate");

const synthesis = adapter.roles.synthesis({
  findings: [{ finding_id: "finding_1", claim: "Supported bounded finding.", evidence_ids: ["evidence_1"], confidence: "bounded" }],
  verifier_results: { ok: true, finding_promotion_allowed: true }
});
if (synthesis.status === "blocked" || synthesis.finding_cards[0].evidence_ids[0] !== "evidence_1") {
  throw new Error("synthesis did not produce verifier-gated finding cards");
}
if (JSON.stringify([plan, scout, synthesis]).match(/direct_model_answer_used|direct answer path allowed/i)) {
  throw new Error("model adapter exposed direct answer path");
}

console.log("Model adapter gate verification passed.");
