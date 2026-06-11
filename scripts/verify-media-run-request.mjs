import {
  buildMediaRunRequestFromBrief,
  describeMediaRunBlocker,
  DEFAULT_TEMPERAMENT_PROFILES
} from "../lib/aculeus-media-run-request.js";

const baseBrief = {
  caseId: "case_la",
  runId: "run_la",
  bottomLine: "$48M flowed; the auditor cleared it.",
  support: [
    { id: "s1", title: "Federal awards", body: "$48M flowed to three vendors.", confidence: 0.8, citationIds: ["c1"] },
    { id: "s2", title: "Shared address", body: "They share an address with two officers.", confidence: 0.8, citationIds: ["c2"] }
  ],
  citations: [
    { citationId: "c1", publisher: "USAspending.gov", title: "Federal award records", supportLevel: "supported", url: "https://usaspending.gov" },
    { citationId: "c2", publisher: "IRS Form 990", title: "990", supportLevel: "supported" }
  ]
};

// No counter-case -> honestly ineligible.
const noCounter = buildMediaRunRequestFromBrief(baseBrief);
if (noCounter.ok !== false || noCounter.reason !== "counter_case_required") throw new Error("brief without counter-case should be ineligible");
if (!/counter-case/i.test(describeMediaRunBlocker(noCounter.reason))) throw new Error("blocker message missing");

// With an explicit counter-case -> eligible request with default profiles/formats.
const withCounter = buildMediaRunRequestFromBrief({ ...baseBrief, counterCase: { body: "The auditor found no violation." } });
if (!withCounter.ok) throw new Error(`brief with counter-case should be eligible, got ${withCounter.reason}`);
const evid = withCounter.body.read.evidence_records;
if (!evid.some((e) => e.role === "counter_case")) throw new Error("counter-case evidence record not added");
if (!evid.some((e) => e.evidence_record_id === "s1" && /USAspending/.test(e.receipt.publisher))) throw new Error("support claim did not map to its receipt");
if (withCounter.body.profiles.length !== DEFAULT_TEMPERAMENT_PROFILES.length) throw new Error("default profiles not applied");
if (withCounter.body.formats.length !== 4) throw new Error("default formats not applied");

// A counter-case carried inline as a support item also satisfies eligibility.
const inlineCounter = buildMediaRunRequestFromBrief({
  ...baseBrief,
  support: [...baseBrief.support, { id: "s3", title: "Auditor", body: "Auditor cleared it.", kind: "counter_case", citationIds: [] }]
});
if (!inlineCounter.ok) throw new Error("inline counter-case support item should satisfy eligibility");

// No supported evidence -> ineligible.
const weak = buildMediaRunRequestFromBrief({ caseId: "x", support: [{ id: "s1", body: "maybe", citationIds: ["c1"] }], citations: [{ citationId: "c1", supportLevel: "partially_supported" }], counterCase: { body: "cc" } });
if (weak.ok !== false || weak.reason !== "no_supported_evidence") throw new Error("brief without supported evidence should be ineligible");

console.log(`Media run request verification passed (eligibility honest; ${withCounter.body.profiles.length} profiles, ${withCounter.body.formats.length} formats).`);
