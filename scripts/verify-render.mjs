import { FORMAT_SPECS, buildRenderMessages, validateRender, runRender } from "../lib/aculeus-render.js";

const atoms = [
  { atom_id: "atom_a1", claim_text: "$48M flowed to three vendors.", ap_citation: "according to USAspending.gov" },
  { atom_id: "atom_a2", claim_text: "They share an address with two officers.", ap_citation: "according to IRS Form 990" },
  { atom_id: "atom_cc", claim_text: "The auditor found no violation.", required_inclusion: true, ap_citation: "according to the audit" }
];
const map = {
  selected_atom_ids: ["atom_a1", "atom_a2", "atom_cc"],
  required_inclusions: ["atom_cc"],
  plan: { frame: "stewardship", messenger: "the local operator", lexicon: { spend: "your money" } },
  do_not_say: ["smear"]
};

// All four formats exist.
for (const f of ["op_ed", "social", "newsletter", "press_release"]) {
  if (!FORMAT_SPECS[f]) throw new Error(`missing format spec: ${f}`);
}

// Prompt: plain language, atoms-only, markers required, no model-written citations.
const sys = buildRenderMessages(map, atoms, "op_ed", {})[0].content;
if (!/plain language/i.test(sys)) throw new Error("render prompt lacks plain-language instruction");
if (!/only state facts that are present in the provided atoms/i.test(sys)) throw new Error("render prompt not source-locked");
if (!/Do not write citations/i.test(sys)) throw new Error("render prompt allows model-written citations");
if (!/Every claim block MUST carry the atom_id/i.test(sys)) throw new Error("render prompt does not require markers");
// The renderer must not be shown AP citations.
if (/USAspending|IRS Form 990/.test(JSON.stringify(buildRenderMessages(map, atoms, "op_ed", {})))) {
  throw new Error("render prompt leaked AP citations to the model");
}

// Validator: ghost atom dropped → block becomes naked; counter-case tracked.
const adversarial = {
  headline: "They Drained the Safety Net",
  blocks: [
    { text: "$48M flowed to three vendors.", atom_id: "atom_a1", kind: "claim" },
    { text: "They share an address with two officers.", atom_id: "atom_a2", kind: "claim" },
    { text: "The mayor personally took a bribe.", atom_id: "atom_GHOST", kind: "claim" }, // invented
    { text: "The auditor found no violation.", atom_id: "atom_cc", kind: "counter_case" }
  ]
};
const render = validateRender(adversarial, map, atoms, "op_ed", "xai/grok-2");
if (render.claim_markers.includes("atom_GHOST")) throw new Error("validator kept an out-of-scope atom marker");
if (!render.naked_assertions.some((t) => /bribe/.test(t))) throw new Error("validator did not flag the invented claim as naked");
if (render.counter_case_included !== true) throw new Error("counter-case not detected");

// Drop the counter-case block → counter_case_included must go false.
const noCounter = validateRender({ headline: "x", blocks: adversarial.blocks.slice(0, 2) }, map, atoms, "op_ed");
if (noCounter.counter_case_included !== false) throw new Error("missing counter-case not detected");

// No gateway token → deterministic fallback renders the selected atoms with the counter-case.
const fb = await runRender({ map, atoms, format: "social" });
if (fb.mode !== "deterministic_fallback") throw new Error(`expected deterministic fallback, got ${fb.mode}`);
if (fb.counter_case_included !== true) throw new Error("fallback dropped the counter-case");

console.log(`Render verification passed (markers ${render.claim_markers.length}, naked ${render.naked_assertions.length}, fallback ${fb.mode}).`);
