// End-to-end composition smoke: an approved Read travels the whole CYAN pipeline.
// Runs deterministically (no gateway), proving the modules compose AND that without
// the LLM gestalt pass the pipeline honestly stops at human review and refuses to
// publish — then proves the full green path once the substance lock has passed.

import { buildReadSnapshot } from "../lib/aculeus-read-snapshot.js";
import { runSalienceMap } from "../lib/aculeus-salience-map.js";
import { runRender } from "../lib/aculeus-render.js";
import { verifyAndRepair } from "../lib/aculeus-substance-lock.js";
import { recordRenderReview, canPublish } from "../lib/aculeus-render-review.js";
import { packageDelivery } from "../lib/aculeus-delivery.js";

const read = {
  source_run_id: "run_la_fwa",
  case_id: "case_la",
  bottom_line: "$48M flowed to vendors sharing the grantee's officers' addresses; the auditor cleared it.",
  evidence_records: [
    { evidence_record_id: "ev_usaspending", claim: "$48M flowed to three vendors across FY21-FY23.", support_level: "supported", citation_id: "c1", receipt: { publisher: "USAspending.gov", date: "2026-01-10" }, locator: { captured_at: "2026-01-10" } },
    { evidence_record_id: "ev_irs990", claim: "Three vendors share an address with two officers.", support_level: "supported", citation_id: "c2", receipt: { publisher: "IRS Form 990", date: "2026-02-01" }, locator: { captured_at: "2026-02-01" } },
    { evidence_record_id: "ev_audit", claim: "The grantee's auditor found no violation.", support_level: "partially_supported", role: "counter_case", citation_id: "c3", receipt: { publisher: "Independent audit", date: "2026-03-01" }, locator: { captured_at: "2026-03-01" } }
  ]
};

// Pass 0–1
const snapshot = buildReadSnapshot(read);
if (!snapshot.eligible) throw new Error("eligible Read rejected by snapshot");
const atoms = snapshot.atoms;
const profile = { frame: "stewardship & trust", messenger: "the local operator", forbidden: ["smear"] };

// Pass 2–3
const map = await runSalienceMap({ atoms, profile });
if (!map.selected_atom_ids.includes("atom_ev_audit")) throw new Error("salience map dropped the counter-case");
const render = await runRender({ map, atoms, format: "op_ed", profile });
if (!render.counter_case_included) throw new Error("render dropped the counter-case");

// Pass 4–5: deterministic mode → honest stop at human review (gestalt did not run).
const repair = await verifyAndRepair({ render, snapshot, atoms, produceRender: async () => render });
if (repair.status !== "needs_human" || repair.escalated_to !== "human_review_gestalt_not_run") {
  throw new Error(`deterministic pipeline should stop at human review, got ${repair.status}/${repair.escalated_to}`);
}

// Deterministic verdict cannot publish even with approvals.
const approve = recordRenderReview({ variantId: "rv1", actorUserId: "rev", decision: "approve", note: "Receipts verified.", customerApproval: true }).review;
if (canPublish({ verdict: repair.verdict, reviews: [approve] }).can_publish) throw new Error("published without a passing substance lock");
if (packageDelivery({ variant: render, channel: "newsletter", atoms, canPublishResult: canPublish({ verdict: repair.verdict, reviews: [approve] }) }).ok) {
  throw new Error("packaged a non-publishable render");
}

// Green path: once the gestalt pass has passed and both approvals are in, it ships with a resolvable appendix.
const passedVerdict = { ...repair.verdict, substance_lock_passed: true };
const gate = canPublish({ verdict: passedVerdict, reviews: [approve] });
if (!gate.can_publish) throw new Error(`green path blocked: ${gate.reasons.join(",")}`);
const delivered = packageDelivery({ variant: render, channel: "newsletter", atoms, canPublishResult: gate });
if (!delivered.ok) throw new Error("green-path render failed to package");
if (delivered.package.receipts_appendix.entries.length !== render.claim_markers.length) {
  throw new Error("delivery appendix did not resolve every claim");
}

console.log(`Salience pipeline smoke passed: snapshot(${atoms.length} atoms) -> map -> render -> needs_human(deterministic) -> green-path delivery(${delivered.package.receipts_appendix.entries.length} receipts).`);
