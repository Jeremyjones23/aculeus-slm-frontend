// M2 — Salience Map pass (CYAN, Pass 2). Salience-reasoner role.
//
// Builds the source-locked prompt and, crucially, the post-validator that makes the
// "zero invented facts" guarantee real: any atom_id the model returns that is not in
// the snapshot is dropped, and every required_inclusion atom is force-carried. The
// model selects and frames; it can never add facts. Even if the model writes prose or
// claims, they are ignored — only atom_id selections and framing knobs are taken.

import { createAculeusSalienceAdapter } from "./aculeus-salience-adapter.js";
import { callProvider, providerConfigured, parseJsonObject } from "./aculeus-providers.js";

export function buildSalienceMapMessages(atoms = [], profile = {}) {
  const menu = atoms.map((a) => ({
    atom_id: a.atom_id,
    claim: a.claim_text,
    support: a.support_level,
    required: Boolean(a.required_inclusion),
    lead_eligible: Boolean(a.lead_eligible)
  }));
  return [
    {
      role: "system",
      content: [
        "You are the Aculeus salience mapper.",
        "You select and frame; you never add facts.",
        "Choose which atoms to surface for the given audience, and their order, frame, door-in, messenger, and lexicon.",
        "You may only reference atom_id values present in the provided atoms.",
        "You MUST include every atom whose required flag is true (counter-case and qualifiers).",
        "Do not write prose, claims, or citations. Return only JSON.",
        "Return JSON with keys: selected_atom_ids (array of atom_id), emphasis_order (array of atom_id), door_in, frame, messenger, lexicon (object), do_not_say (array).",
        "Never invent an atom_id and never output a fact that is not already in the atoms."
      ].join(" ")
    },
    { role: "user", content: JSON.stringify({ audience_profile: profile, atoms: menu }) }
  ];
}

// The guardrail: clamp the model's selection to the snapshot and force required inclusions.
export function validateSalienceMap(output = {}, atoms = [], profile = {}, modelId = "") {
  const atomIds = atoms.map((a) => a.atom_id);
  const required = atoms.filter((a) => a.required_inclusion).map((a) => a.atom_id);
  const requested = Array.isArray(output.selected_atom_ids) ? output.selected_atom_ids.map(String) : [];
  const selected = unique([...requested.filter((id) => atomIds.includes(id)), ...required]);
  const emphasis = Array.isArray(output.emphasis_order)
    ? output.emphasis_order.map(String).filter((id) => selected.includes(id))
    : [];
  return {
    role: "salience_map",
    model_id: modelId,
    direct_answer_allowed: false,
    output_type: "salience_map",
    selected_atom_ids: selected,
    required_inclusions: required,
    plan: {
      door_in: clean(output.door_in || profile.frame || ""),
      frame: clean(output.frame || profile.frame || ""),
      messenger: clean(output.messenger || profile.messenger || ""),
      lexicon: isObject(output.lexicon) ? output.lexicon : {},
      emphasis_order: emphasis.length ? unique([...emphasis, ...selected]) : selected
    },
    do_not_say: unique([...toArray(output.do_not_say).map(clean), ...toArray(profile.forbidden).map(clean)]).filter(Boolean),
    gates: ["select_and_frame_only", "no_new_facts", "subset_of_snapshot_atoms", "required_inclusions_carried"]
  };
}

export async function runSalienceMap({ atoms = [], profile = {}, authToken = "", modelId } = {}) {
  const adapter = createAculeusSalienceAdapter();
  const useModel = modelId || adapter.salience_model_id;
  if (!atoms.length) return adapter.roles.salience_map({ atoms });
  if (!providerConfigured(useModel)) {
    return { ...adapter.roles.salience_map({ atoms, profile }), mode: "deterministic_fallback" };
  }
  try {
    const text = await callProvider({ model: useModel, messages: buildSalienceMapMessages(atoms, profile) });
    return { ...validateSalienceMap(parseJsonObject(text), atoms, profile, useModel), mode: "live_model" };
  } catch {
    return { ...adapter.roles.salience_map({ atoms, profile }), mode: "guardrail_fallback" };
  }
}

function clean(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
function unique(list) { return [...new Set(list)]; }
function toArray(v) { return Array.isArray(v) ? v : []; }
function isObject(v) { return v && typeof v === "object" && !Array.isArray(v); }
