import {
  bindRender,
  buildSubstanceLockMessages,
  normIssues,
  runSubstanceLock,
  verifyAndRepair
} from "../lib/aculeus-substance-lock.js";

// Distinct render/verify models so the cross-model gate is exercised.
process.env.ACULEUS_RENDER_MODEL_ID = "xai/grok-2";
process.env.ACULEUS_VERIFY_MODEL_ID = "deepseek/deepseek-chat";

const atoms = [
  { atom_id: "atom_a1", evidence_record_id: "ev1", ap_citation: "according to USAspending.gov" },
  { atom_id: "atom_a2", evidence_record_id: "ev2", ap_citation: "according to IRS Form 990" },
  { atom_id: "atom_cc", evidence_record_id: "ev3", ap_citation: "according to the audit", required_inclusion: true }
];
const snapshot = { bottom_line: "$48M flowed; the auditor cleared it.", counter_case: ["atom_cc"] };

const cleanRender = {
  headline: "What the filings show",
  body: { blocks: [] },
  claim_markers: ["atom_a1", "atom_a2", "atom_cc"],
  naked_assertions: [],
  counter_case_included: true
};

// Binder injects AP citations by code.
const bindings = bindRender(cleanRender, atoms);
if (bindings.bindings.length !== 3) throw new Error("binder did not bind all markers");
if (bindings.bindings[0].ap_citation !== "according to USAspending.gov") throw new Error("binder did not inject the AP citation");
if (!bindings.bindings.every((b) => b.ap_citation_resolved)) throw new Error("AP citation not resolved from receipt metadata");

// Verifier prompt carries both tiers and the gestalt instruction.
const sys = buildSubstanceLockMessages(cleanRender, snapshot)[0].content;
if (!/necessary but NOT sufficient/i.test(sys)) throw new Error("verifier prompt missing the gestalt principle");
if (!/misleading_implication|selective_omission|unsupported_causation/.test(sys)) throw new Error("verifier prompt missing tier-2 checks");

// Gestalt normalization fails CLOSED: a flagged issue with no severity blocks even when its
// type is not enumerated; only an explicit warn/info on a non-severe type may pass.
if (normIssues([{ issue_type: "misleading_implication" }])[0].severity !== "block") throw new Error("missing-severity gestalt issue did not fail closed");
if (normIssues([{ issue_type: "thin_evidence_unflagged", severity: "" }])[0].severity !== "block") throw new Error("empty-severity gestalt issue did not fail closed");
if (normIssues([{ issue_type: "selective_omission", severity: "warn" }])[0].severity !== "block") throw new Error("an enumerated severe type was downgraded");
if (normIssues([{ issue_type: "style_nit", severity: "warn" }])[0].severity !== "warn") throw new Error("explicit warn on a non-severe type should be allowed");

// Clean render, no gateway: not blocked, but NOT publish-ready (gestalt did not run).
const clean = await runSubstanceLock({ render: cleanRender, snapshot, atoms });
if (clean.blocked !== false) throw new Error("clean render was blocked structurally");
if (clean.gestalt_checked !== false) throw new Error("gestalt should not run without a gateway");
if (clean.substance_lock_passed !== false || clean.publish_ready !== false) throw new Error("structural-only must not be publish-ready");
if (clean.cross_model !== true) throw new Error("verifier must differ from renderer");

// Verifier on the SAME model as the renderer can never certify a publish (cross-model rule).
const sameModel = await runSubstanceLock({ render: cleanRender, snapshot, atoms, verifyModelId: "openai/gpt-4o", renderModelId: "openai/gpt-4o" });
if (sameModel.cross_model !== false) throw new Error("same render/verify model should not be cross_model");
if (sameModel.substance_lock_passed !== false || sameModel.publish_ready !== false) throw new Error("same-model verifier must not pass the substance lock");

// Injected unsupported claim → BLOCKED (Tier 1 unbound_claim).
const tampered = await runSubstanceLock({
  render: { ...cleanRender, naked_assertions: ["the grantee committed fraud"] },
  snapshot, atoms
});
if (tampered.blocked !== true) throw new Error("unbound claim was not blocked");

// Dropped counter-case → BLOCKED (Tier 2 selective_omission / missing_counter_case).
const dropped = await runSubstanceLock({
  render: { ...cleanRender, claim_markers: ["atom_a1", "atom_a2"], counter_case_included: false },
  snapshot, atoms
});
if (dropped.blocked !== true) throw new Error("dropped counter-case was not blocked");

// Repair loop: a render that stays blocked escalates to human after bounded retries.
let calls = 0;
const alwaysBlocked = await verifyAndRepair({
  render: { ...cleanRender, naked_assertions: ["fabricated"] },
  snapshot, atoms, maxRetries: 2,
  produceRender: async () => { calls += 1; return { ...cleanRender, naked_assertions: ["still fabricated"] }; }
});
if (alwaysBlocked.status !== "needs_human") throw new Error("persistent block did not escalate to human");
if (alwaysBlocked.attempts < 2) throw new Error("repair loop did not exhaust retries");
if (calls < 2) throw new Error("repair loop did not re-render");

// A structurally-clean render still routes to human when the gestalt pass never ran.
const cleanLoop = await verifyAndRepair({ render: cleanRender, snapshot, atoms });
if (cleanLoop.status !== "needs_human" || cleanLoop.escalated_to !== "human_review_gestalt_not_run") {
  throw new Error("clean structural-only render should route to human review");
}

console.log(`Substance-lock verification passed (block on unbound + dropped counter-case; escalation after ${alwaysBlocked.attempts} attempts).`);
