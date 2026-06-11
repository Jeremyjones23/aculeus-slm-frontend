// M5 — Render Review (CYAN, Pass 6). Human gate + defensibility surface.
//
// Provides the three things review needs: resolve any rendered claim back to its
// receipt (click-a-claim -> source), the cross-demographic diff that proves every
// audience variant rests on the SAME receipts and carries the SAME counter-case
// (different doors, identical record), and the publish gate that requires the
// substance-lock to have passed AND both a reviewer approval and customer approval.

export function resolveClaimToReceipt(atomId, atoms = []) {
  const atom = atoms.find((a) => a.atom_id === atomId);
  if (!atom) return null;
  return {
    claim_atom_id: atom.atom_id,
    evidence_record_id: atom.evidence_record_id || "",
    citation_id: atom.citation_id || "",
    ap_citation: atom.ap_citation || "",
    locator: atom.locator || {},
    claim_text: atom.claim_text || ""
  };
}

export function buildCrossDemographicDiff(variants = [], atoms = []) {
  const list = Array.isArray(variants) ? variants.filter(Boolean) : [];
  const markerSets = list.map((v) => new Set(v.claim_markers || []));
  const evidence_union = unique(list.flatMap((v) => v.claim_markers || []));
  const shared_evidence = evidence_union.filter((id) => markerSets.every((s) => s.has(id)));
  const all_share_counter_case = list.length > 0 && list.every((v) => v.counter_case_included === true);
  return {
    output_type: "cross_demographic_diff",
    variant_count: list.length,
    shared_evidence,
    evidence_union,
    // Same receipts proven when nobody used an atom others didn't (union === shared).
    same_receipts: evidence_union.length > 0 && shared_evidence.length === evidence_union.length,
    all_share_counter_case,
    per_variant: list.map((v) => ({
      profile_id: v.profile_id || v.profile || "",
      format: v.format || "",
      headline: v.headline || "",
      frame: v.frame || (v.plan && v.plan.frame) || "",
      claim_markers: v.claim_markers || [],
      counter_case_included: Boolean(v.counter_case_included)
    })),
    receipts: shared_evidence.map((id) => resolveClaimToReceipt(id, atoms)).filter(Boolean)
  };
}

export function recordRenderReview({ variantId, actorUserId, decision, note, customerApproval = false } = {}) {
  const valid = ["approve", "reject", "request_changes"];
  if (!valid.includes(decision)) return { ok: false, reason: "invalid_decision" };
  if (!clean(note)) return { ok: false, reason: "review_note_required" }; // mirrors reviewer-actions RV-01
  return {
    ok: true,
    review: {
      render_variant_id: clean(variantId),
      actor_user_id: clean(actorUserId),
      decision,
      note: clean(note),
      customer_approval: Boolean(customerApproval),
      created_at: new Date().toISOString()
    }
  };
}

export function canPublish({ verdict = {}, reviews = [] } = {}) {
  const reasons = [];
  if (verdict.substance_lock_passed !== true) reasons.push("substance_lock_not_passed");
  const approvedReviews = (Array.isArray(reviews) ? reviews : []).filter((r) => r.decision === "approve");
  if (!approvedReviews.length) reasons.push("reviewer_approval_required");
  if (!approvedReviews.some((r) => r.customer_approval === true)) reasons.push("customer_approval_required");
  return { can_publish: reasons.length === 0, reasons };
}

function unique(list) { return [...new Set(list)]; }
function clean(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
