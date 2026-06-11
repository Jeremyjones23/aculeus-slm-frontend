import {
  buildReadSnapshot,
  atomizeRead,
  buildApCitation,
  isEligibleForMedia
} from "../lib/aculeus-read-snapshot.js";

const read = {
  source_run_id: "run_la_fwa",
  case_id: "case_la",
  bottom_line: "$48M flowed to vendors sharing the grantee's officers' addresses; the auditor cleared it.",
  evidence_records: [
    { evidence_record_id: "ev_usaspending", claim: "$48M flowed to three vendors across FY21-FY23.", support_level: "supported",
      citation_id: "cit_1", receipt: { publisher: "USAspending.gov", title: "Federal award records", date: "2026-01-10" } },
    { evidence_record_id: "ev_irs990", claim: "Three vendors share an address with two officers.", support_level: "supported",
      citation_id: "cit_2", receipt: { publisher: "IRS Form 990", date: "2026-02-01" } },
    { evidence_record_id: "ev_audit", claim: "The grantee's auditor found no violation.", support_level: "partially_supported",
      role: "counter_case", citation_id: "cit_3", receipt: { publisher: "Independent audit", date: "2026-03-01" } },
    { claim: "Naked claim with no evidence record id.", support_level: "supported" } // must be dropped
  ]
};

// Eligibility
if (isEligibleForMedia(read).eligible !== true) throw new Error("eligible Read was rejected");
if (isEligibleForMedia({ evidence_records: [] }).reason !== "no_promoted_evidence") throw new Error("empty Read not rejected");
const noCounter = { evidence_records: [{ evidence_record_id: "e1", claim: "x", support_level: "supported", receipt: {} }] };
if (isEligibleForMedia(noCounter).reason !== "counter_case_required") throw new Error("Read without counter-case not rejected");

// Atomization
const atoms = atomizeRead(read);
if (atoms.length !== 3) throw new Error(`expected 3 atoms (naked dropped), got ${atoms.length}`);
if (atoms.some((a) => !a.evidence_record_id)) throw new Error("atom without an evidence record id");
const cc = atoms.find((a) => a.atom_id === "atom_ev_audit");
if (!cc.required_inclusion) throw new Error("counter-case atom not marked required_inclusion");
if (cc.lead_eligible) throw new Error("counter-case atom must not be lead-eligible");
const lead = atoms.find((a) => a.atom_id === "atom_ev_usaspending");
if (!lead.lead_eligible) throw new Error("strong atom should be lead-eligible");
if (!/USAspending\.gov/.test(lead.ap_citation)) throw new Error("AP citation not built from receipt metadata");

// AP citation determinism
if (buildApCitation({ publisher: "SEC", title: "Form 10-K", date: "2024" }) !== "according to SEC (Form 10-K), 2024") {
  throw new Error("AP citation format drifted");
}

// Snapshot: frozen, hashed, deterministic
const snap = buildReadSnapshot(read);
if (!snap.eligible) throw new Error("snapshot marked ineligible for an eligible Read");
if (!/^[0-9a-f]{64}$/.test(snap.content_hash)) throw new Error("snapshot content_hash is not a sha256");
if (snap.counter_case[0] !== "atom_ev_audit") throw new Error("counter-case not carried in snapshot");
if (buildReadSnapshot(read).content_hash !== snap.content_hash) throw new Error("snapshot hash is not deterministic");
let threw = false;
try { snap.atoms.push({}); } catch { threw = true; }
if (!threw) throw new Error("snapshot is not immutable (atoms mutable)");

console.log(`Read snapshot + atomization verification passed (${atoms.length} atoms, hash ${snap.content_hash.slice(0, 12)}…).`);
