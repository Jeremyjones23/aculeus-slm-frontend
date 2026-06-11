import {
  resolveClaimToReceipt,
  buildCrossDemographicDiff,
  recordRenderReview,
  canPublish
} from "../lib/aculeus-render-review.js";

const atoms = [
  { atom_id: "atom_a1", evidence_record_id: "ev1", ap_citation: "according to USAspending.gov", claim_text: "$48M flowed." },
  { atom_id: "atom_a2", evidence_record_id: "ev2", ap_citation: "according to IRS Form 990", claim_text: "Shared address." },
  { atom_id: "atom_cc", evidence_record_id: "ev3", ap_citation: "according to the audit", claim_text: "Auditor cleared it.", required_inclusion: true }
];

// Click-a-claim -> receipt.
const receipt = resolveClaimToReceipt("atom_a1", atoms);
if (!receipt || receipt.evidence_record_id !== "ev1" || !/USAspending/.test(receipt.ap_citation)) throw new Error("claim did not resolve to its receipt");
if (resolveClaimToReceipt("atom_ghost", atoms) !== null) throw new Error("unknown claim should resolve to null");

// Two demographics, same atoms + counter-case -> same receipts, different doors.
const farLeft = { profile_id: "far_left", format: "op_ed", headline: "They paid themselves", claim_markers: ["atom_a2", "atom_a1", "atom_cc"], counter_case_included: true };
const rightOfCenter = { profile_id: "right_of_center", format: "social", headline: "Your money", claim_markers: ["atom_a1", "atom_a2", "atom_cc"], counter_case_included: true };
const diff = buildCrossDemographicDiff([farLeft, rightOfCenter], atoms);
if (diff.same_receipts !== true) throw new Error("identical-evidence variants not detected as same receipts");
if (diff.all_share_counter_case !== true) throw new Error("shared counter-case not detected");
if (diff.receipts.length !== 3) throw new Error("diff did not resolve shared receipts");

// If one variant drops the counter-case, the diff flags it.
const dropped = buildCrossDemographicDiff([farLeft, { ...rightOfCenter, counter_case_included: false }], atoms);
if (dropped.all_share_counter_case !== false) throw new Error("dropped counter-case not flagged in diff");

// Reviews require a note.
if (recordRenderReview({ variantId: "rv1", decision: "approve", note: "" }).ok !== false) throw new Error("review without a note was accepted");
if (recordRenderReview({ variantId: "rv1", decision: "nonsense", note: "x" }).ok !== false) throw new Error("invalid decision accepted");
const approve = recordRenderReview({ variantId: "rv1", actorUserId: "u1", decision: "approve", note: "Receipts check out.", customerApproval: true });
if (!approve.ok) throw new Error("valid review rejected");

// Publish gate: needs substance_lock_passed + reviewer approve + customer approval.
const passed = { substance_lock_passed: true };
if (canPublish({ verdict: passed, reviews: [approve.review] }).can_publish !== true) throw new Error("fully-approved render could not publish");
if (canPublish({ verdict: passed, reviews: [{ decision: "approve", customer_approval: false }] }).can_publish !== false) throw new Error("missing customer approval still published");
if (canPublish({ verdict: { substance_lock_passed: false }, reviews: [approve.review] }).can_publish !== false) throw new Error("published without a passing substance lock");

console.log(`Render review verification passed (same_receipts=${diff.same_receipts}, publish gate enforced).`);
