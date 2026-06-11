import { integrityEval, salienceQualityEval, compareModels } from "../lib/aculeus-salience-eval.js";

const cleanSample = { naked_assertions: [], substance_lock_passed: true, claim_markers: ["a1", "a2"], resolved_citations: 2, counter_case_included: true };
const tamperedSample = { naked_assertions: ["fabricated"], substance_lock_passed: false, claim_markers: ["a1"], resolved_citations: 0, counter_case_included: false };

// Clean set passes the integrity gate; a single tampered render fails it.
const good = integrityEval([cleanSample, cleanSample, cleanSample]);
if (!good.gate_passed) throw new Error("clean set failed the integrity gate");
if (good.metrics.substance_lock_pass_rate !== 1) throw new Error("substance-lock pass-rate miscomputed");
const bad = integrityEval([cleanSample, tamperedSample]);
if (bad.gate_passed) throw new Error("set with a tampered render passed the integrity gate");
if (integrityEval([]).gate_passed) throw new Error("empty set should not pass the gate");

// Quality eval informs only.
const quality = salienceQualityEval([{ resonance: 4, clarity: 5, on_frame: 4 }, { resonance: 5, clarity: 4, on_frame: 5 }]);
if (quality.informational !== true) throw new Error("quality eval must be informational");
if (!(quality.scores.resonance > 4)) throw new Error("quality scores miscomputed");

// Model comparison: quality can NEVER override integrity.
const integrityPass = integrityEval([cleanSample, cleanSample]);
const integrityFail = integrityEval([tamperedSample, tamperedSample]);
const result = compareModels([
  { model_id: "xai/grok-2", integrity: integrityFail, quality: { scores: { resonance: 5 } } },        // best quality, fails integrity
  { model_id: "deepseek/deepseek-reasoner", integrity: integrityPass, quality: { scores: { resonance: 3.5 } } } // lower quality, passes integrity
]);
if (result.recommended !== "deepseek/deepseek-reasoner") throw new Error("quality overrode integrity in model selection");

// No candidate passes integrity -> recommend none (block promotion).
const none = compareModels([{ model_id: "x", integrity: integrityFail, quality: { scores: { resonance: 5 } } }]);
if (none.recommended !== null || none.reason !== "no_candidate_passed_integrity") throw new Error("promoted a model with no integrity-passing candidate");

console.log(`Salience eval verification passed (integrity gates; quality informs; recommended ${result.recommended}).`);
