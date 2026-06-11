// M1 — Read Freeze + Atomization (CYAN, Pass 0–1).
//
// Freezes an approved Read into an immutable, content-hashed snapshot and
// decomposes it into claim atoms. The snapshot is the substance boundary: every
// downstream render may only ever assert what is frozen here.
//
// Invariants:
//   - No atom without a bound evidence_record (claims with no evidence are dropped).
//   - The AP-style attribution is built from receipt metadata by code — never a model.
//   - Counter-case / qualifier atoms are marked required_inclusion and can't be dropped.
//   - Thin atoms are not lead_eligible.
//   - Eligibility gate: a Read with no promoted evidence, no lead-eligible atom, or no
//     counter-case is rejected before any media run.

import { createHash } from "node:crypto";

const STRONG_SUPPORT = new Set(["supported", "strong", "high", "verified"]);
const QUALIFIER_ROLES = new Set(["counter_case", "counter-case", "qualifier", "limitation"]);

export function isEligibleForMedia(read = {}) {
  const records = promotedEvidence(read);
  if (!records.length) return { eligible: false, reason: "no_promoted_evidence" };
  if (!records.some(isLeadEligible)) return { eligible: false, reason: "no_lead_eligible_evidence" };
  if (!hasCounterCase(read)) return { eligible: false, reason: "counter_case_required" };
  return { eligible: true, reason: "eligible" };
}

export function buildApCitation(receipt = {}) {
  // AP-style attribution from source identity. Deterministic; no model involved.
  const publisher = clean(receipt.publisher || receipt.agency || receipt.source || "");
  const title = clean(receipt.title || receipt.document || "");
  const date = clean(receipt.date || receipt.captured_at || "");
  const head = publisher || title || "the cited record";
  let s = `according to ${head}`;
  if (publisher && title) s += ` (${title})`;
  if (date) s += `, ${date}`;
  return s;
}

export function atomizeRead(read = {}) {
  const records = promotedEvidence(read);
  return records
    .filter((r) => clean(evidenceId(r))) // no atom without a bound evidence record
    .map((r) => {
      const id = `atom_${evidenceId(r)}`;
      const required = isQualifier(r) || r.required_inclusion === true;
      return {
        atom_id: id,
        evidence_record_id: clean(evidenceId(r)),
        citation_id: clean(r.citation_id || r.citationId || ""),
        claim_text: clean(r.claim || r.claim_text || ""),
        support_level: clean(r.support_level || r.supportLevel || "partially_supported"),
        ap_citation: buildApCitation(r.receipt || r.receipt_meta || r),
        locator: r.locator && typeof r.locator === "object" ? r.locator : {},
        required_inclusion: required,
        lead_eligible: !required && STRONG_SUPPORT.has(clean(r.support_level || r.supportLevel || ""))
      };
    });
}

export function buildReadSnapshot(read = {}, version = 1) {
  const eligibility = isEligibleForMedia(read);
  const atoms = atomizeRead(read).sort((a, b) => a.atom_id.localeCompare(b.atom_id));
  const counterCaseAtoms = atoms.filter((a) => a.required_inclusion).map((a) => a.atom_id);
  const frozenCore = {
    bottom_line: clean(read.bottom_line || read.bottomLine || read.summary || ""),
    counter_case: counterCaseAtoms,
    thin_evidence: atoms.filter((a) => !a.lead_eligible && !a.required_inclusion).map((a) => a.atom_id),
    atoms
  };
  const content_hash = sha256(stableStringify(frozenCore));
  const source_run_id = clean(read.source_run_id || read.sourceRunId || read.runId || "");
  const snapshot_version = Number(version) || 1;
  // Durable row identity is run-scoped: two distinct investigation runs never share a
  // read_snapshots row even when the frozen substance (content_hash) is byte-identical.
  // content_hash remains the substance fingerprint that renders pin.
  const snapshot_id = source_run_id
    ? sha256(`${source_run_id}\n${snapshot_version}\n${content_hash}`)
    : content_hash;
  const snapshot = {
    snapshot_id,
    source_run_id,
    case_id: clean(read.case_id || read.caseId || ""),
    snapshot_version,
    eligible: eligibility.eligible,
    eligibility_reason: eligibility.reason,
    bottom_line: frozenCore.bottom_line,
    counter_case: frozenCore.counter_case,
    thin_evidence: frozenCore.thin_evidence,
    content_hash,
    atoms,
    gates: ["no_atom_without_evidence", "ap_citation_injected_by_code", "required_inclusions_marked", "eligibility_checked"]
  };
  return deepFreeze(snapshot);
}

function promotedEvidence(read) {
  const records = read.evidence_records || read.evidenceRecords || read.promoted_evidence || [];
  return Array.isArray(records) ? records : [];
}
function evidenceId(r) {
  return r && (r.evidence_record_id || r.evidenceRecordId || r.id) || "";
}
function isQualifier(r) {
  return QUALIFIER_ROLES.has(clean(r.role || r.kind || ""));
}
function isLeadEligible(r) {
  return !isQualifier(r) && r.required_inclusion !== true && STRONG_SUPPORT.has(clean(r.support_level || r.supportLevel || ""));
}
function isCounterCaseRecord(r) {
  // Mirrors atomizeRead's required-inclusion rule: a counter-case exists only when a
  // promoted record will actually become a required_inclusion atom. A bare truthy
  // counter_case flag on the request body is never sufficient on its own.
  return isQualifier(r) || (r && r.required_inclusion === true);
}
function hasCounterCase(read) {
  return promotedEvidence(read).some(isCounterCaseRecord);
}

function clean(v) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim();
}
function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",")}}`;
  }
  return JSON.stringify(value);
}
function deepFreeze(obj) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(obj);
}
