import {
  buildSalienceMapMessages,
  validateSalienceMap,
  runSalienceMap
} from "../lib/aculeus-salience-map.js";

const atoms = [
  { atom_id: "atom_a1", claim_text: "$48M flowed to three vendors.", support_level: "supported", lead_eligible: true },
  { atom_id: "atom_a2", claim_text: "They share an address with two officers.", support_level: "supported", lead_eligible: true },
  { atom_id: "atom_cc", claim_text: "The auditor found no violation.", support_level: "partially_supported", required_inclusion: true }
];
const profile = { frame: "stewardship & trust", messenger: "the local operator", forbidden: ["smear"] };

// Prompt locks selection to atom ids and forbids new facts.
const messages = buildSalienceMapMessages(atoms, profile);
const system = messages[0].content;
if (!/never (add|invent)/i.test(system) || !/only reference atom_id/i.test(system)) throw new Error("salience prompt is not source-locked");
if (!/MUST include every atom whose required/i.test(system)) throw new Error("salience prompt does not force required inclusions");

// Guardrail: a model that invents an atom and drops the counter-case is corrected.
const adversarialOutput = {
  selected_atom_ids: ["atom_a1", "atom_GHOST"], // ghost invented; counter-case omitted
  emphasis_order: ["atom_GHOST", "atom_a1"],
  door_in: "your money",
  frame: "waste",
  extra_fact: "and the mayor took a bribe" // invented prose — must be ignored
};
const map = validateSalienceMap(adversarialOutput, atoms, profile, "deepseek/deepseek-reasoner");
if (map.selected_atom_ids.includes("atom_GHOST")) throw new Error("validator kept an invented atom id");
if (!map.selected_atom_ids.includes("atom_cc")) throw new Error("validator did not force the required counter-case");
if (JSON.stringify(map).includes("bribe")) throw new Error("validator leaked invented prose");
if (map.plan.emphasis_order.includes("atom_GHOST")) throw new Error("emphasis kept an invented atom");
if (!map.do_not_say.includes("smear")) throw new Error("do_not_say did not inherit profile.forbidden");

// No gateway token here → deterministic fallback, still subset-valid with the counter-case.
const fallback = await runSalienceMap({ atoms, profile });
if (fallback.mode !== "deterministic_fallback") throw new Error(`expected deterministic fallback, got ${fallback.mode}`);
if (!fallback.selected_atom_ids.includes("atom_cc")) throw new Error("fallback dropped the counter-case");

console.log(`Salience map verification passed (selected ${map.selected_atom_ids.length}, fallback mode ${fallback.mode}).`);
