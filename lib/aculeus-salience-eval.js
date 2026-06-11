// M7 — Eval & training (CYAN, cross-cutting). Two tracks, one rule.
//
// INTEGRITY eval is objective and GATES promotion: binding completeness, substance-lock
// pass-rate, citation resolution, counter-case presence. SALIENCE-QUALITY eval is a
// human rubric that INFORMS only. compareModels picks across providers (DeepSeek / Grok
// / OpenAI) — but only among candidates that pass the integrity gate, using quality as a
// tiebreak. Quality can never override integrity; a quality dip is informational, an
// integrity failure is disqualifying.

const DEFAULT_THRESHOLDS = {
  binding_completeness: 1.0,
  substance_lock_pass_rate: 0.95,
  citation_resolution_rate: 1.0,
  counter_case_rate: 1.0
};

export function integrityEval(samples = [], thresholds = {}) {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const n = samples.length;
  if (!n) return { n: 0, metrics: zeroMetrics(), thresholds: t, gate_passed: false, reason: "no_samples" };

  const metrics = {
    binding_completeness: mean(samples, (s) => (asArray(s.naked_assertions).length === 0 ? 1 : 0)),
    substance_lock_pass_rate: mean(samples, (s) => (s.substance_lock_passed === true ? 1 : 0)),
    citation_resolution_rate: mean(samples, (s) => {
      const markers = asArray(s.claim_markers).length;
      return markers ? Number(s.resolved_citations || 0) / markers : 1;
    }),
    counter_case_rate: mean(samples, (s) => (s.counter_case_included === true ? 1 : 0))
  };
  const gate_passed =
    metrics.binding_completeness >= t.binding_completeness &&
    metrics.substance_lock_pass_rate >= t.substance_lock_pass_rate &&
    metrics.citation_resolution_rate >= t.citation_resolution_rate &&
    metrics.counter_case_rate >= t.counter_case_rate;
  return { n, metrics, thresholds: t, gate_passed };
}

export function salienceQualityEval(ratings = []) {
  const n = ratings.length;
  const avg = (key) => (n ? mean(ratings, (r) => Number(r[key] || 0)) : 0);
  return {
    informational: true, // never gates promotion
    n,
    scores: { resonance: avg("resonance"), clarity: avg("clarity"), on_frame: avg("on_frame") }
  };
}

export function compareModels(candidates = [], { baselineQuality = null, qualityEpsilon = 0.25 } = {}) {
  const ranked = [...candidates]
    .map((c) => ({
      model_id: c.model_id,
      integrity_gate: Boolean(c.integrity?.gate_passed),
      substance_lock_pass_rate: Number(c.integrity?.metrics?.substance_lock_pass_rate || 0),
      resonance: Number(c.quality?.scores?.resonance || 0)
    }))
    .sort((a, b) => b.substance_lock_pass_rate - a.substance_lock_pass_rate || b.resonance - a.resonance);

  // Only integrity-passing candidates are eligible — quality cannot rescue a failing model.
  const eligible = ranked.filter((c) => c.integrity_gate);
  if (!eligible.length) {
    return { recommended: null, reason: "no_candidate_passed_integrity", ranking: ranked };
  }
  const winner = eligible[0];
  const quality_regression = baselineQuality != null && winner.resonance < Number(baselineQuality) - qualityEpsilon;
  return {
    recommended: winner.model_id,
    reason: "highest_integrity_among_passing",
    quality_regression, // informational only — does not block promotion
    ranking: ranked
  };
}

function mean(list, fn) { return list.reduce((acc, x) => acc + fn(x), 0) / list.length; }
function asArray(v) { return Array.isArray(v) ? v : []; }
function zeroMetrics() {
  return { binding_completeness: 0, substance_lock_pass_rate: 0, citation_resolution_rate: 0, counter_case_rate: 0 };
}
