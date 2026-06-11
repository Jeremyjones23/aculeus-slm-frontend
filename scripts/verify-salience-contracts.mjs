import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createAculeusSalienceAdapter,
  validateSalienceAdapterContract
} from "../lib/aculeus-salience-adapter.js";

// Distinct model ids per role — proves env binding and the cross-model verifier gate.
process.env.ACULEUS_SALIENCE_MODEL_ID = "deepseek/deepseek-reasoner";
process.env.ACULEUS_RENDER_MODEL_ID = "xai/grok-2";
process.env.ACULEUS_VERIFY_MODEL_ID = "deepseek/deepseek-chat";

const adapter = createAculeusSalienceAdapter();

const issues = validateSalienceAdapterContract(adapter);
if (issues.length) throw new Error(`Salience adapter contract failed:\n${issues.join("\n")}`);

if (adapter.salience_model_id !== "deepseek/deepseek-reasoner") throw new Error("adapter did not read ACULEUS_SALIENCE_MODEL_ID");
if (adapter.render_model_id !== "xai/grok-2") throw new Error("adapter did not read ACULEUS_RENDER_MODEL_ID");
if (adapter.verify_model_id !== "deepseek/deepseek-chat") throw new Error("adapter did not read ACULEUS_VERIFY_MODEL_ID");

// Happy path: a clean Read snapshot renders and passes the hard gate.
const atoms = [
  { atom_id: "a1", evidence_record_id: "ev_usaspending", ap_citation: "according to federal award records on USAspending.gov", lead_eligible: true },
  { atom_id: "a2", evidence_record_id: "ev_irs990", ap_citation: "according to the grantee's IRS Form 990", lead_eligible: true },
  { atom_id: "cc", evidence_record_id: "ev_audit", ap_citation: "according to the grantee's independent audit", required_inclusion: true }
];

const map = adapter.roles.salience_map({
  atoms,
  selected_atom_ids: ["a1", "a2"],
  profile: { frame: "stewardship & trust", messenger: "the local operator", forbidden: ["smear"], lexicon: { spend: "your money" } }
});
if (map.output_type !== "salience_map") throw new Error("salience map did not emit a salience_map");
if (!map.selected_atom_ids.includes("cc")) throw new Error("salience map dropped a required inclusion");

const render = adapter.roles.render({ salience_map: map, format: "op_ed" });
if (render.status === "blocked") throw new Error("render blocked on a valid salience map");
if (render.counter_case_included !== true) throw new Error("render did not carry the counter-case");
if (render.model_writes_attribution !== false) throw new Error("render allowed a model-written attribution");

const bindings = adapter.roles.bind({
  claim_markers: render.claim_markers,
  atoms,
  asserted_spans: render.claim_markers.map((id) => ({ marker: id, text: id }))
});
if (bindings.naked_assertions.length) throw new Error("clean render produced naked assertions");

const verdict = adapter.roles.substance_lock({ bindings, salience_map: map, render_variant: render });
if (verdict.blocked !== false || verdict.substance_lock_passed !== true) throw new Error("clean render failed the substance lock");
if (verdict.cross_model !== true) throw new Error("verifier must run on a different model than the renderer");

// Adversarial path: an unbound claim must be blocked by the hard gate.
const tampered = adapter.roles.substance_lock({
  bindings: { naked_assertions: ["the grantee committed fraud"] },
  salience_map: map,
  render_variant: render
});
if (tampered.blocked !== true) throw new Error("substance lock did not block an unbound claim");

// Schema structural check: the DDL parses into statements and defines every salience table.
const sql = readFileSync(join(process.cwd(), "docs", "aculeus-salience-layer-schema.sql"), "utf8");
const statements = sql.split(/;\s*(?:\r?\n|$)/).map((s) => s.trim()).filter(Boolean);
const requiredTables = [
  "temperament_profiles", "read_snapshots", "claim_atoms", "media_runs", "salience_maps",
  "render_variants", "render_claim_bindings", "render_verifier_issues", "render_reviews", "delivery_packages"
];
for (const table of requiredTables) {
  if (!new RegExp(`create table if not exists ${table}\\b`).test(sql)) {
    throw new Error(`salience schema missing table: ${table}`);
  }
}
if (statements.length < requiredTables.length) throw new Error("salience schema did not parse into per-statement DDL");

console.log(`Salience adapter + schema verification passed (${statements.length} DDL statements, ${requiredTables.length} tables).`);
