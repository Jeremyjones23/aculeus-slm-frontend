import { buildAnswerBriefFromCase } from "../lib/aculeus-product-data.js";
import { buildMediaRunRequestFromBrief } from "../lib/aculeus-media-run-request.js";

// A case packet whose dossier records what the strongest finding does NOT prove.
const casePacket = {
  caseId: "case_la",
  title: "LA grant oversight",
  summary: "$48M flowed to vendors sharing officers' addresses.",
  claims: [
    { title: "Federal awards", body: "$48M flowed to three vendors.", state: "supported", sourceIds: ["s_usa"], confidence: 0.8 },
    { title: "Shared address", body: "They share an address with two officers.", state: "supported", sourceIds: ["s_990"], confidence: 0.8 }
  ],
  sources: [
    { sourceId: "s_usa", title: "USAspending award records", publisher: "USAspending.gov", supportLevel: "supported", url: "https://usaspending.gov" },
    { sourceId: "s_990", title: "IRS Form 990", publisher: "IRS", supportLevel: "supported" }
  ],
  dossier: {
    shortFinding: "$48M flowed; the auditor cleared it.",
    findings: [
      { findingId: "f1", entity: "Grantee", whatRecordSays: "$48M to three vendors.", whatItDoesNotProve: "The independent auditor found no violation, and a shared address can reflect a common registered-agent service.", sourceIds: ["s_990"] }
    ]
  },
  nextRecords: [{ recordId: "r1", priority: "needed", holder: "Agency", request: "Contract file", reason: "Verify scope." }]
};

// BLUE now emits a counter-case.
const brief = buildAnswerBriefFromCase(casePacket);
if (!brief.counterCase) throw new Error("buildAnswerBriefFromCase did not emit a counter-case");
if (!/auditor found no violation/i.test(brief.counterCase.body)) throw new Error("counter-case body not derived from what-it-does-not-prove");
if (!brief.counterCase.citationIds.length) throw new Error("counter-case did not cite the limiting source");

// A case with no contrary content emits no counter-case (honest null).
const noContra = buildAnswerBriefFromCase({ ...casePacket, dossier: { findings: [{ findingId: "f1", whatRecordSays: "x", sourceIds: ["s_990"] }] } });
if (noContra.counterCase !== null) throw new Error("counter-case should be null when the record supplies none");

// The emitted counter-case makes the media-run trigger eligible AND receipt-backs the counter-case.
const request = buildMediaRunRequestFromBrief(brief, { runId: "run_la" });
if (!request.ok) throw new Error(`brief with emitted counter-case should be eligible, got ${request.reason}`);
const cc = request.body.read.evidence_records.find((e) => e.role === "counter_case");
if (!cc) throw new Error("counter-case evidence record missing from media-run request");
if (cc.receipt.publisher !== "IRS") throw new Error("counter-case was not receipt-backed from its citation");

console.log(`Counter-case verification passed (BLUE emits it, receipt-backed via ${cc.receipt.publisher}, media run eligible).`);
