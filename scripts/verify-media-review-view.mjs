import { buildMediaReviewView, variantKey } from "../lib/aculeus-media-review-view.js";

const atoms = [
  { atom_id: "atom_a1", evidence_record_id: "ev1", ap_citation: "according to USAspending.gov", claim_text: "$48M flowed." },
  { atom_id: "atom_a2", evidence_record_id: "ev2", ap_citation: "according to IRS Form 990", claim_text: "Shared address." },
  { atom_id: "atom_cc", evidence_record_id: "ev3", ap_citation: "according to the audit", claim_text: "Auditor cleared it.", required_inclusion: true }
];

const mediaRun = {
  media_run_id: "media_1",
  status: "review",
  variants: [
    { profile_id: "far_left", format: "op_ed", status: "verified", headline: "They paid themselves",
      claim_markers: ["atom_a1", "atom_a2", "atom_cc"], counter_case_included: true, verdict: { substance_lock_passed: true } },
    { profile_id: "right_of_center", format: "social", status: "needs_human", headline: "Your money",
      claim_markers: ["atom_a1", "atom_a2", "atom_cc"], counter_case_included: true, verdict: { substance_lock_passed: false } }
  ]
};

// The verified variant has reviewer + customer approval; the other has none.
const reviews = {
  [variantKey(mediaRun.variants[0])]: [{ decision: "approve", customer_approval: true, note: "Receipts verified." }]
};

const view = buildMediaReviewView(mediaRun, atoms, reviews);

// Every claim resolves to a receipt.
const v0 = view.variants[0];
if (v0.claims.length !== 3 || v0.unresolved_claims.length) throw new Error("claims did not resolve to receipts");
if (!/USAspending/.test(v0.claims[0].receipt.ap_citation)) throw new Error("claim receipt missing AP citation");

// Cross-demographic diff: same receipts, shared counter-case.
if (view.diff.same_receipts !== true || view.diff.all_share_counter_case !== true) throw new Error("diff did not prove same receipts / shared counter-case");

// Publish gate: only the substance-lock-passed + fully-approved variant is publishable.
if (v0.publish_gate.can_publish !== true) throw new Error("approved + locked variant is not publishable");
if (view.variants[1].publish_gate.can_publish !== false) throw new Error("unapproved/unlocked variant was publishable");

// Summary roll-up.
if (view.summary.total !== 2 || view.summary.verified !== 1 || view.summary.needs_human !== 1 || view.summary.publishable !== 1) {
  throw new Error("summary roll-up is wrong");
}

console.log(`Media review view verification passed (publishable ${view.summary.publishable}/${view.summary.total}, same_receipts=${view.diff.same_receipts}).`);
