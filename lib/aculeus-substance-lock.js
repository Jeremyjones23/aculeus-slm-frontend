// M4 — Binding + Substance-Lock (CYAN, Pass 4–5). The HARD GATE.
//
// bindRender wires every claim marker to its atom/evidence and injects the AP citation
// from receipt metadata BY CODE. The verifier runs two tiers: structural checks that
// hold without a model (unbound claims, dropped required inclusions, missing
// counter-case) and the LLM gestalt pass (drift, misleading implication, selective
// omission, unsupported causation, attribution/ethical issues) on a DIFFERENT model
// than the renderer.
//
// Honest limitation encoded as a gate: a render can only be substance_lock_passed /
// publish_ready when the gestalt pass actually ran. Structural-only verification (no
// gateway configured) is never sufficient to publish — it routes to human review.

import { createAculeusSalienceAdapter, buildRenderVerifierResult } from "./aculeus-salience-adapter.js";
import { callProvider, providerConfigured, parseJsonObject } from "./aculeus-providers.js";

const BLOCK_ISSUE_TYPES = new Set([
  "unbound_claim", "new_fact_introduced", "substance_drift", "attribution_mismatch",
  "missing_counter_case", "forbidden_move", "ethical_floor_violation",
  "selective_omission", "unsupported_causation"
]);

export function bindRender(render = {}, atoms = []) {
  const byId = new Map(atoms.map((a) => [a.atom_id, a]));
  const markers = Array.isArray(render.claim_markers) ? render.claim_markers : [];
  const bindings = markers
    .filter((id) => byId.has(id))
    .map((id) => {
      const atom = byId.get(id);
      return {
        claim_atom_id: id,
        evidence_record_id: clean(atom.evidence_record_id),
        // AP citation injected by code from the frozen atom — never authored by the model.
        ap_citation: clean(atom.ap_citation),
        ap_citation_resolved: Boolean(atom.ap_citation)
      };
    });
  return {
    output_type: "render_bindings",
    bindings,
    naked_assertions: Array.isArray(render.naked_assertions) ? render.naked_assertions : [],
    gates: ["every_assertion_must_bind", "ap_citation_injected_by_code"]
  };
}

export function buildSubstanceLockMessages(render = {}, snapshot = {}) {
  return [
    {
      role: "system",
      content: [
        "You are the Aculeus substance-lock verifier — an adversarial reader.",
        "You are given a rendered piece and the frozen Read it must not exceed.",
        "Sentence-level binding is necessary but NOT sufficient: judge the WHOLE piece against the Read's bottom line.",
        "Tier 1 (per claim): flag new_fact_introduced, substance_drift, attribution_mismatch, thin_evidence_unflagged, forbidden_move, ethical_floor_violation.",
        "Tier 2 (gestalt): flag misleading_implication, selective_omission, unsupported_causation.",
        "Severity is 'block' for anything that changes what the record supports; 'warn' otherwise.",
        "Do not rewrite the piece. Return only JSON: { tier1: [ {issue_type, severity, message} ], tier2: [ {issue_type, severity, message} ] }."
      ].join(" ")
    },
    {
      role: "user",
      content: JSON.stringify({
        read_bottom_line: snapshot.bottom_line || "",
        counter_case_atom_ids: snapshot.counter_case || [],
        render: { headline: render.headline || "", blocks: render.body?.blocks || [] }
      })
    }
  ];
}

export function deterministicSubstanceLock(render, snapshot, bindings, verifyModelId, renderModelId) {
  return buildRenderVerifierResult(
    { bindings, salience_map: { required_inclusions: snapshot.counter_case || [] }, render_variant: render },
    verifyModelId,
    renderModelId
  );
}

export async function runSubstanceLock({ render = {}, snapshot = {}, atoms = [], authToken = "", verifyModelId, renderModelId } = {}) {
  const adapter = createAculeusSalienceAdapter();
  const vModel = verifyModelId || adapter.verify_model_id;
  const rModel = renderModelId || adapter.render_model_id;
  const bindings = bindRender(render, atoms);
  const structural = deterministicSubstanceLock(render, snapshot, bindings, vModel, rModel);

  let gestalt = { tier1: [], tier2: [], gestalt_checked: false };
  if (providerConfigured(vModel, authToken)) {
    try {
      const text = await callProvider({ model: vModel, messages: buildSubstanceLockMessages(render, snapshot), authToken });
      const parsed = parseJsonObject(text);
      gestalt = { tier1: normIssues(parsed.tier1), tier2: normIssues(parsed.tier2), gestalt_checked: true };
    } catch {
      gestalt = { tier1: [], tier2: [], gestalt_checked: false, gestalt_error: true };
    }
  }

  const tier1 = [...structural.tier1, ...gestalt.tier1];
  const tier2 = [...structural.tier2, ...gestalt.tier2];
  const blocked = [...tier1, ...tier2].some((i) => i.severity === "block");
  return {
    role: "substance_lock",
    model_id: vModel,
    output_type: "render_verifier_result",
    cross_model: vModel !== rModel,
    gestalt_checked: gestalt.gestalt_checked,
    tier1,
    tier2,
    blocked,
    // Passing requires BOTH no block issues AND that the gestalt pass actually ran.
    substance_lock_passed: !blocked && gestalt.gestalt_checked,
    publish_ready: !blocked && gestalt.gestalt_checked,
    bindings,
    gates: ["sentence_binding_necessary_not_sufficient", "gestalt_checks", "hard_gate", "verifier_model_differs_from_renderer", "gestalt_required_to_publish"]
  };
}

// Bounded repair → stronger-model fallback → human. Never silently drops; spend-capped.
export async function verifyAndRepair({
  render, snapshot, atoms = [], produceRender, authToken = "",
  maxRetries = 2, escalateModelId, spendCapCents = 0, callCostCents = 1
} = {}) {
  let attempts = 0;
  let escalated_to = null;
  let spent = 0;
  let current = render;
  const verifyModel = createAculeusSalienceAdapter().verify_model_id;

  const lock = async (r) => {
    if (providerConfigured(verifyModel, authToken)) spent += callCostCents;
    return runSubstanceLock({ render: r, snapshot, atoms, authToken });
  };

  let verdict = await lock(current);

  while (verdict.blocked && attempts < maxRetries) {
    if (spendCapCents && spent >= spendCapCents) { escalated_to = "human_review_spend_cap"; break; }
    if (typeof produceRender !== "function") break;
    attempts += 1;
    current = await produceRender({ attempt: attempts });
    verdict = await lock(current);
  }

  if (verdict.blocked && escalated_to === null && escalateModelId && typeof produceRender === "function") {
    escalated_to = "stronger_model";
    attempts += 1;
    current = await produceRender({ attempt: attempts, modelId: escalateModelId });
    verdict = await lock(current);
  }

  let status;
  if (verdict.blocked) {
    status = "needs_human";
    escalated_to = escalated_to || "human_review";
  } else if (!verdict.publish_ready) {
    // Not blocked, but the gestalt pass did not run — cannot publish without a human.
    status = "needs_human";
    escalated_to = "human_review_gestalt_not_run";
  } else {
    status = "verified";
  }

  return { status, render: current, verdict, attempts, escalated_to, spent_cents: spent };
}

function normIssues(list) {
  return (Array.isArray(list) ? list : [])
    .map((i) => ({
      issue_type: clean(i.issue_type),
      severity: i.severity === "block" || (BLOCK_ISSUE_TYPES.has(clean(i.issue_type)) && i.severity !== "warn" && i.severity !== "info") ? "block" : clean(i.severity || "warn"),
      message: clean(i.message)
    }))
    .filter((i) => i.issue_type);
}

function clean(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
