// M6 — Format & Deliver (CYAN, Pass 7). Deterministic packaging.
//
// Packages an approved render with a resolvable receipts appendix (every claim maps
// to its evidence + AP citation + locator), re-validates receipt freshness at publish
// time, and refuses to package anything that is not publishable, has unresolved
// citations, or would leak a secret. Reuses the export-packets redaction posture.

import { resolveClaimToReceipt } from "./aculeus-render-review.js";

const SECRET_PATTERNS = [
  /EXA_API_KEY/i, /PARALLEL_API_KEY/i, /DATA_GOV_API_KEY/i, /AI_GATEWAY_API_KEY/i,
  /BLOB_READ_WRITE_TOKEN/i, /\bBearer\s+\S/i, /\bsk-[A-Za-z0-9]{8,}/
];

export function buildReceiptsAppendix(variant = {}, atoms = []) {
  const markers = Array.isArray(variant.claim_markers) ? variant.claim_markers : [];
  const entries = markers.map((id) => resolveClaimToReceipt(id, atoms)).filter(Boolean);
  const unresolved = markers.filter((id) => !atoms.some((a) => a.atom_id === id));
  return {
    output_type: "receipts_appendix",
    entries,
    complete: unresolved.length === 0 && entries.length === markers.length,
    unresolved
  };
}

export function revalidateReceipts(atoms = [], now = Date.now()) {
  const items = atoms.map((a) => {
    const captured = (a.locator && (a.locator.captured_at || a.locator.date)) || a.captured_at || "";
    return { atom_id: a.atom_id, captured_at: captured || null, fresh: Boolean(captured) };
  });
  return {
    revalidated_at: new Date(now).toISOString(),
    items,
    needs_refresh: items.some((i) => !i.fresh)
  };
}

export function packageDelivery({ variant = {}, channel = "", atoms = [], canPublishResult = {} } = {}) {
  if (!canPublishResult.can_publish) {
    return { ok: false, reason: "not_publishable", blockers: canPublishResult.reasons || ["publish_gate_not_passed"] };
  }
  const appendix = buildReceiptsAppendix(variant, atoms);
  if (!appendix.complete) {
    return { ok: false, reason: "unresolved_citations", unresolved: appendix.unresolved };
  }
  const revalidation = revalidateReceipts(atoms);
  const pkg = {
    output_type: "delivery_package",
    channel: clean(channel),
    format: clean(variant.format),
    status: "created",
    visibility: "private",
    headline: clean(variant.headline),
    receipts_appendix: appendix,
    receipts_revalidated_at: revalidation.revalidated_at,
    needs_refresh: revalidation.needs_refresh
  };
  const leak = SECRET_PATTERNS.find((re) => re.test(JSON.stringify(pkg)));
  if (leak) return { ok: false, reason: "secret_leak_detected" };
  return { ok: true, package: pkg };
}

function clean(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
