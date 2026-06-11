// Aculeus Salience / Media Layer adapter (CYAN). M0 — typed, gated contract shells.
//
// Mirrors lib/aculeus-model-adapter.js discipline: roles are pure functions that
// return typed shells with explicit gates and blocked states; nothing reaches a
// live model here. Live passes (M2+) call the Vercel AI Gateway with the model id
// chosen by env; until then these deterministic shells let the rest of the system
// type against stable contracts.
//
// Invariants encoded as gates:
//   - BLUE binds claims to receipts; CYAN binds renders to claims.
//   - Salience map SELECTS and FRAMES only — it can never add facts.
//   - The renderer places citation MARKERS only; attribution text is injected by code.
//   - required_inclusion atoms (counter-case / qualifiers) can never be dropped.
//   - Substance-lock is a HARD GATE: sentence binding is necessary, not sufficient.
//   - The verifier runs on a different model than the renderer.

const DEFAULT_MODEL_ID = "aculeus-local-salience-shell";

export function salienceModelId(options = {}) {
  return clean(options.salienceModelId || process.env.ACULEUS_SALIENCE_MODEL_ID || process.env.ACULEUS_MODEL_ID || DEFAULT_MODEL_ID);
}
export function renderModelId(options = {}) {
  return clean(options.renderModelId || process.env.ACULEUS_RENDER_MODEL_ID || process.env.ACULEUS_MODEL_ID || DEFAULT_MODEL_ID);
}
export function verifyModelId(options = {}) {
  return clean(options.verifyModelId || process.env.ACULEUS_VERIFY_MODEL_ID || process.env.ACULEUS_MODEL_ID || DEFAULT_MODEL_ID);
}

export function createAculeusSalienceAdapter(options = {}) {
  const salience_model_id = salienceModelId(options);
  const render_model_id = renderModelId(options);
  const verify_model_id = verifyModelId(options);
  return {
    salience_model_id,
    render_model_id,
    verify_model_id,
    direct_answer_allowed: false,
    model_writes_attribution: false,
    gateway: "vercel-ai-gateway",
    roles: {
      salience_map: (input) => buildSalienceMap(input, salience_model_id),
      render: (input) => buildRenderVariant(input, render_model_id),
      bind: (input) => buildRenderBindings(input),
      substance_lock: (input) => buildRenderVerifierResult(input, verify_model_id, render_model_id)
    }
  };
}

// Pass 2 — selects/orders existing atoms and frames them. Cannot add facts.
export function buildSalienceMap(input = {}, modelId = salienceModelId()) {
  const atoms = Array.isArray(input.atoms) ? input.atoms : [];
  if (!atoms.length) {
    return blocked("salience_map", modelId, "read_snapshot_atoms_required_before_salience_map");
  }
  const atomIds = atoms.map((a) => atomId(a)).filter(Boolean);
  const requestedIds = Array.isArray(input.selected_atom_ids) ? input.selected_atom_ids.map(String) : atomIds;
  // Gate: selection is a strict subset of the snapshot's atoms.
  const selected_atom_ids = requestedIds.filter((id) => atomIds.includes(id));
  // Gate: required_inclusion atoms (counter-case / qualifiers) are always carried.
  const required_inclusions = atoms.filter((a) => a.required_inclusion === true).map((a) => atomId(a)).filter(Boolean);
  const selected = unique([...selected_atom_ids, ...required_inclusions]);
  const profile = input.profile && typeof input.profile === "object" ? input.profile : {};
  return {
    role: "salience_map",
    model_id: modelId,
    direct_answer_allowed: false,
    output_type: "salience_map",
    selected_atom_ids: selected,
    required_inclusions,
    plan: {
      door_in: clean(profile.door_in || profile.frame || ""),
      frame: clean(profile.frame || ""),
      messenger: clean(profile.messenger || ""),
      lexicon: profile.lexicon && typeof profile.lexicon === "object" ? profile.lexicon : {},
      emphasis_order: selected
    },
    do_not_say: Array.isArray(profile.forbidden) ? profile.forbidden.map(clean).filter(Boolean) : [],
    gates: ["select_and_frame_only", "no_new_facts", "subset_of_snapshot_atoms", "required_inclusions_carried"]
  };
}

// Pass 3 — drafts a piece, placing citation markers only. Blocks without a salience map.
export function buildRenderVariant(input = {}, modelId = renderModelId()) {
  const map = input.salience_map || {};
  const selected = Array.isArray(map.selected_atom_ids) ? map.selected_atom_ids.map(String) : [];
  if (!selected.length) {
    return blocked("render", modelId, "salience_map_required_before_render");
  }
  const requiredInclusions = Array.isArray(map.required_inclusions) ? map.required_inclusions.map(String) : [];
  const counter_case_included = requiredInclusions.every((id) => selected.includes(id));
  return {
    role: "render",
    model_id: modelId,
    direct_answer_allowed: false,
    model_writes_attribution: false,
    output_type: "render_variant",
    format: clean(input.format || "op_ed"),
    headline: null, // shell: the live render pass fills this
    body: { blocks: selected.map((id) => ({ claim_marker: id, text: null })) },
    claim_markers: selected,
    counter_case_included,
    gates: ["assert_only_selected_atoms", "marker_on_every_assertion", "model_never_writes_attribution"]
  };
}

// Pass 4 — binds each marker to its atom/evidence; flags naked (unmarked) assertions.
export function buildRenderBindings(input = {}) {
  const markers = Array.isArray(input.claim_markers) ? input.claim_markers.map(String) : [];
  const atoms = Array.isArray(input.atoms) ? input.atoms : [];
  const byId = new Map(atoms.map((a) => [atomId(a), a]));
  const bindings = markers
    .filter((id) => byId.has(id))
    .map((id) => {
      const atom = byId.get(id);
      return {
        rendered_span_marker: id,
        claim_atom_id: id,
        evidence_record_id: clean(atom.evidence_record_id || ""),
        ap_citation_resolved: Boolean(atom.ap_citation),
        verified: false
      };
    });
  // Any asserted span without a marker is a naked claim — caught here, blocked at Pass 5.
  const assertedSpans = Array.isArray(input.asserted_spans) ? input.asserted_spans : [];
  const naked_assertions = assertedSpans
    .filter((span) => !markers.includes(String(span && span.marker ? span.marker : span)))
    .map((span) => (span && span.text ? clean(span.text) : clean(span)));
  return {
    output_type: "render_bindings",
    bindings,
    naked_assertions,
    gates: ["every_assertion_must_bind", "ap_citation_injected_by_code"]
  };
}

// Pass 5 — HARD GATE. Two tiers: per-claim, then gestalt (whole piece vs the Read).
export function buildRenderVerifierResult(input = {}, modelId = verifyModelId(), rendererModelId = renderModelId()) {
  const bindings = input.bindings || {};
  const naked = Array.isArray(bindings.naked_assertions) ? bindings.naked_assertions : [];
  const map = input.salience_map || {};
  const render = input.render_variant || {};
  const requiredInclusions = Array.isArray(map.required_inclusions) ? map.required_inclusions.map(String) : [];
  const markers = Array.isArray(render.claim_markers) ? render.claim_markers.map(String) : [];

  const tier1 = [];
  for (const span of naked) tier1.push(issue("unbound_claim", "block", `Asserted without a binding: ${span}`));

  const tier2 = [];
  const droppedRequired = requiredInclusions.filter((id) => !markers.includes(id));
  for (const id of droppedRequired) tier2.push(issue("selective_omission", "block", `Required inclusion dropped: ${id}`));
  if (render.counter_case_included === false) tier2.push(issue("missing_counter_case", "block", "Counter-case is not present in the render."));

  const blockedIssues = [...tier1, ...tier2].filter((i) => i.severity === "block");
  return {
    role: "substance_lock",
    model_id: modelId,
    output_type: "render_verifier_result",
    cross_model: modelId !== rendererModelId,
    tier1,
    tier2,
    blocked: blockedIssues.length > 0,
    substance_lock_passed: blockedIssues.length === 0,
    gates: ["sentence_binding_necessary_not_sufficient", "gestalt_checks", "hard_gate", "verifier_model_differs_from_renderer"]
  };
}

export function validateSalienceAdapterContract(adapter = {}) {
  const issues = [];
  if (!adapter.salience_model_id || !adapter.render_model_id || !adapter.verify_model_id) issues.push("adapter missing a model id");
  if (adapter.direct_answer_allowed !== false) issues.push("adapter must block direct answers");
  if (adapter.model_writes_attribution !== false) issues.push("adapter must block model-written attributions");
  for (const role of ["salience_map", "render", "bind", "substance_lock"]) {
    if (typeof adapter.roles?.[role] !== "function") issues.push(`adapter missing role: ${role}`);
  }

  // Salience map blocks without atoms; otherwise selects a subset only and carries required inclusions.
  if (adapter.roles?.salience_map?.({ atoms: [] })?.status !== "blocked") issues.push("salience map must block without snapshot atoms");
  const map = adapter.roles?.salience_map?.({
    atoms: [{ atom_id: "a1" }, { atom_id: "a2" }, { atom_id: "cc", required_inclusion: true }],
    selected_atom_ids: ["a1", "ghost"], // ghost is not a snapshot atom
    profile: { frame: "stewardship", forbidden: ["smear"] }
  });
  if (map?.output_type !== "salience_map") issues.push("salience map must emit a salience_map");
  if (map?.selected_atom_ids?.includes("ghost")) issues.push("salience map must not select non-snapshot atoms");
  if (!map?.selected_atom_ids?.includes("cc")) issues.push("salience map must carry required inclusions");

  // Render blocks without a salience map; otherwise emits markers and never writes attribution.
  if (adapter.roles?.render?.({ salience_map: {} })?.status !== "blocked") issues.push("render must block without a salience map");
  const render = adapter.roles?.render?.({ salience_map: map, format: "op_ed" });
  if (render?.model_writes_attribution !== false) issues.push("render must not write attribution");
  if (!Array.isArray(render?.claim_markers) || !render.claim_markers.length) issues.push("render must place claim markers");

  // Bindings catch naked assertions.
  const bindings = adapter.roles?.bind?.({
    claim_markers: ["a1"],
    atoms: [{ atom_id: "a1", evidence_record_id: "ev1", ap_citation: "according to USAspending.gov" }],
    asserted_spans: [{ marker: "a1", text: "bound" }, { text: "naked claim" }]
  });
  if (!bindings?.naked_assertions?.length) issues.push("bindings must flag naked assertions");

  // Substance-lock blocks on an unbound claim (Tier 1).
  const unbound = adapter.roles?.substance_lock?.({
    bindings: { naked_assertions: ["naked claim"] },
    salience_map: map,
    render_variant: render
  });
  if (unbound?.blocked !== true) issues.push("substance-lock must block an unbound claim");

  // Substance-lock blocks on a dropped required inclusion (Tier 2 gestalt).
  const droppedRequired = adapter.roles?.substance_lock?.({
    bindings: { naked_assertions: [] },
    salience_map: { required_inclusions: ["cc"] },
    render_variant: { claim_markers: ["a1"], counter_case_included: false }
  });
  if (droppedRequired?.blocked !== true) issues.push("substance-lock must block a dropped required inclusion");

  // No direct-answer or model-authored-attribution path may leak.
  if (JSON.stringify([map, render, bindings, unbound]).match(/direct_answer_used|model_wrote_attribution|"direct_answer_allowed":true/i)) {
    issues.push("salience adapter exposed a direct-answer or model-attribution path");
  }
  return issues;
}

function blocked(role, modelId, reason) {
  return {
    role,
    model_id: modelId,
    status: "blocked",
    reason,
    direct_answer_allowed: false,
    output_type: "blocked_by_snapshot_or_substance_gate"
  };
}

function issue(issue_type, severity, message) {
  return { issue_type, severity, message };
}

function atomId(atom) {
  if (!atom || typeof atom !== "object") return "";
  return String(atom.atom_id || atom.atomId || atom.id || "");
}

function clean(value) {
  return String(value == null ? "" : value).replace(/^["']|["']$/g, "").trim();
}

function unique(list) {
  return [...new Set(list)];
}
