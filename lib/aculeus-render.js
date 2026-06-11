// M3 — Render pass (CYAN, Pass 3). Renderer role.
//
// Produces a per-temperament, per-format draft as STRUCTURED blocks — each claim
// block carries its atom_id — instead of free prose with markers, which removes the
// "is this sentence a claim?" ambiguity. The renderer may only state facts present in
// the atoms; it never writes attributions (a separate system injects AP citations from
// receipt metadata). The validator drops any block pointing at a non-selected atom
// (which makes it a naked claim) and confirms the counter-case is present.

import { createAculeusSalienceAdapter } from "./aculeus-salience-adapter.js";
import { callGateway, gatewayConfigured, parseJsonObject } from "./aculeus-gateway.js";

export const FORMAT_SPECS = {
  op_ed: { label: "Op-ed / column", voice: "argued, in a named messenger's voice", target_words: 600 },
  social: { label: "Social post", voice: "short, direct, scannable", target_words: 60 },
  newsletter: { label: "Newsletter", voice: "plain briefing", target_words: 200 },
  press_release: { label: "Press release / pitch", voice: "formal, attributable", target_words: 250 }
};

export function buildRenderMessages(map = {}, atoms = [], format = "op_ed", profile = {}) {
  const spec = FORMAT_SPECS[format] || FORMAT_SPECS.op_ed;
  const selected = new Set(Array.isArray(map.selected_atom_ids) ? map.selected_atom_ids : []);
  // The renderer sees claim text only — never the AP citation, so it cannot garble attributions.
  const menu = atoms
    .filter((a) => selected.has(a.atom_id))
    .map((a) => ({ atom_id: a.atom_id, claim: a.claim_text, required: Boolean(a.required_inclusion) }));
  return [
    {
      role: "system",
      content: [
        `You are the Aculeus renderer producing a ${spec.label}.`,
        `Voice: ${spec.voice}. Write in plain language for the audience; target about ${spec.target_words} words.`,
        "You may only state facts that are present in the provided atoms.",
        "Every claim block MUST carry the atom_id it rests on. Do not merge two atoms into one claim block.",
        "Do not write citations, source names, dates, or attributions — a separate system injects them from the record.",
        "You MUST include the counter-case: render every atom marked required as a block with kind 'counter_case'.",
        "Obey the do_not_say list exactly.",
        "Return only JSON: { headline, blocks: [ { text, atom_id (or null for non-claim context), kind } ] } where kind is 'claim', 'context', or 'counter_case'.",
        "Never invent an atom_id and never assert a fact that is not in the atoms."
      ].join(" ")
    },
    {
      role: "user",
      content: JSON.stringify({
        format,
        frame: map.plan?.frame || profile.frame || "",
        messenger: map.plan?.messenger || profile.messenger || "",
        lexicon: map.plan?.lexicon || {},
        do_not_say: map.do_not_say || profile.forbidden || [],
        atoms: menu
      })
    }
  ];
}

export function validateRender(output = {}, map = {}, atoms = [], format = "op_ed", modelId = "") {
  const selected = new Set(Array.isArray(map.selected_atom_ids) ? map.selected_atom_ids : []);
  const required = Array.isArray(map.required_inclusions) ? map.required_inclusions : [];
  const rawBlocks = Array.isArray(output.blocks) ? output.blocks : [];
  const blocks = rawBlocks.map((b) => {
    const atomId = selected.has(String(b.atom_id)) ? String(b.atom_id) : null; // drop out-of-scope atoms
    const kind = ["claim", "context", "counter_case"].includes(b.kind) ? b.kind : (atomId ? "claim" : "context");
    return { text: clean(b.text), atom_id: atomId, kind };
  });
  const claim_markers = unique(blocks.filter((b) => b.atom_id).map((b) => b.atom_id));
  // A claim/counter_case block with no in-scope atom is a naked assertion.
  const naked_assertions = blocks
    .filter((b) => (b.kind === "claim" || b.kind === "counter_case") && !b.atom_id)
    .map((b) => b.text)
    .filter(Boolean);
  const counter_case_included = required.every((id) => claim_markers.includes(id));
  return {
    role: "render",
    model_id: modelId,
    direct_answer_allowed: false,
    model_writes_attribution: false,
    output_type: "render_variant",
    format,
    headline: clean(output.headline),
    body: { blocks },
    claim_markers,
    naked_assertions,
    counter_case_included,
    gates: ["assert_only_selected_atoms", "marker_on_every_claim", "model_never_writes_attribution"]
  };
}

export async function runRender({ map = {}, atoms = [], format = "op_ed", profile = {}, authToken = "", modelId } = {}) {
  const adapter = createAculeusSalienceAdapter();
  const useModel = modelId || adapter.render_model_id;
  const selected = Array.isArray(map.selected_atom_ids) ? map.selected_atom_ids : [];
  if (!selected.length) return adapter.roles.render({ salience_map: map });

  if (!gatewayConfigured(authToken)) {
    return { ...fallbackRender(map, atoms, format, useModel), mode: "deterministic_fallback" };
  }
  try {
    const text = await callGateway({ model: useModel, messages: buildRenderMessages(map, atoms, format, profile), authToken });
    return { ...validateRender(parseJsonObject(text), map, atoms, format, useModel), mode: "live_model" };
  } catch {
    return { ...fallbackRender(map, atoms, format, useModel), mode: "guardrail_fallback" };
  }
}

function fallbackRender(map, atoms, format, modelId) {
  const selected = new Set(map.selected_atom_ids || []);
  const required = new Set(map.required_inclusions || []);
  const blocks = atoms
    .filter((a) => selected.has(a.atom_id))
    .map((a) => ({ text: a.claim_text, atom_id: a.atom_id, kind: required.has(a.atom_id) ? "counter_case" : "claim" }));
  return validateRender({ headline: "", blocks }, map, atoms, format, modelId);
}

function clean(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
function unique(list) { return [...new Set(list)]; }
