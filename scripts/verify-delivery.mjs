import { buildReceiptsAppendix, revalidateReceipts, packageDelivery } from "../lib/aculeus-delivery.js";

const atoms = [
  { atom_id: "atom_a1", evidence_record_id: "ev1", ap_citation: "according to USAspending.gov", claim_text: "$48M flowed.", locator: { captured_at: "2026-01-10" } },
  { atom_id: "atom_a2", evidence_record_id: "ev2", ap_citation: "according to IRS Form 990", claim_text: "Shared address.", locator: { captured_at: "2026-02-01" } },
  { atom_id: "atom_cc", evidence_record_id: "ev3", ap_citation: "according to the audit", claim_text: "Auditor cleared it.", locator: { captured_at: "2026-03-01" } }
];
const variant = { format: "op_ed", headline: "What the filings show", claim_markers: ["atom_a1", "atom_a2", "atom_cc"] };

// Appendix resolves every claim.
const appendix = buildReceiptsAppendix(variant, atoms);
if (!appendix.complete) throw new Error("receipts appendix incomplete for a fully-bound render");
if (appendix.entries.length !== 3) throw new Error("appendix did not resolve every claim");

// Freshness revalidation.
const reval = revalidateReceipts(atoms);
if (reval.needs_refresh !== false) throw new Error("dated receipts wrongly flagged stale");
if (revalidateReceipts([{ atom_id: "x" }]).needs_refresh !== true) throw new Error("undated receipt not flagged for refresh");

// Refuses to package when not publishable.
const blocked = packageDelivery({ variant, channel: "newsletter", atoms, canPublishResult: { can_publish: false, reasons: ["customer_approval_required"] } });
if (blocked.ok !== false || blocked.reason !== "not_publishable") throw new Error("packaged a non-publishable render");

// Refuses when a citation cannot be resolved.
const unresolved = packageDelivery({
  variant: { ...variant, claim_markers: ["atom_a1", "atom_ghost"] },
  channel: "social", atoms, canPublishResult: { can_publish: true }
});
if (unresolved.ok !== false || unresolved.reason !== "unresolved_citations") throw new Error("packaged with an unresolved citation");

// Refuses on a secret leak.
const poisoned = packageDelivery({
  variant: { ...variant, headline: "leak AI_GATEWAY_API_KEY=secret" },
  channel: "social", atoms, canPublishResult: { can_publish: true }
});
if (poisoned.ok !== false || poisoned.reason !== "secret_leak_detected") throw new Error("packaged content with a secret leak");

// Succeeds for an approved render and ships the appendix.
const ok = packageDelivery({ variant, channel: "newsletter", atoms, canPublishResult: { can_publish: true } });
if (!ok.ok) throw new Error("approved render failed to package");
if (ok.package.receipts_appendix.entries.length !== 3 || !ok.package.receipts_revalidated_at) throw new Error("delivery package missing a resolvable appendix");

console.log(`Delivery verification passed (appendix ${ok.package.receipts_appendix.entries.length} receipts, refusals enforced).`);
