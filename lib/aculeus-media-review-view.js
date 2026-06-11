// N3 — Media review view-model. The bug-prone logic the review UI needs, as pure data:
// per-variant rows with each claim resolved to its receipt, the cross-demographic diff
// (same receipts, shared counter-case), the publish-gate state, and a roll-up summary.
// The React panel is thin glue over this.

import { resolveClaimToReceipt, buildCrossDemographicDiff, canPublish } from "./aculeus-render-review.js";

export function variantKey(variant = {}) {
  return `${variant.profile_id || ""}:${variant.format || ""}`;
}

export function buildMediaReviewView(mediaRun = {}, atoms = [], reviewsByVariant = {}) {
  const rawVariants = Array.isArray(mediaRun.variants) ? mediaRun.variants : [];
  const variants = rawVariants.map((v) => {
    const claims = (v.claim_markers || []).map((id) => ({ atom_id: id, receipt: resolveClaimToReceipt(id, atoms) }));
    const reviews = reviewsByVariant[variantKey(v)] || [];
    return {
      key: variantKey(v),
      profile_id: v.profile_id,
      format: v.format,
      status: v.status,
      headline: v.headline,
      counter_case_included: Boolean(v.counter_case_included),
      claims,
      unresolved_claims: claims.filter((c) => !c.receipt).map((c) => c.atom_id),
      publish_gate: canPublish({ verdict: v.verdict || {}, reviews })
    };
  });
  const diff = buildCrossDemographicDiff(rawVariants, atoms);
  const summary = {
    total: variants.length,
    verified: variants.filter((v) => v.status === "verified").length,
    needs_human: variants.filter((v) => v.status === "needs_human").length,
    publishable: variants.filter((v) => v.publish_gate.can_publish).length
  };
  return { media_run_id: mediaRun.media_run_id, status: mediaRun.status, diff, variants, summary };
}
