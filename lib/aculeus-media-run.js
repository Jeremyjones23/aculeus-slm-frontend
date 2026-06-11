// N1 — Media-run orchestration. Drives one approved Read snapshot through the CYAN
// pipeline for every requested temperament x format, returning a media_run with a
// per-variant status (verified | needs_human). Pure composition over the pass modules;
// no DB, no network unless a gateway token is configured.

import { runSalienceMap } from "./aculeus-salience-map.js";
import { runRender } from "./aculeus-render.js";
import { verifyAndRepair } from "./aculeus-substance-lock.js";

export async function startMediaRun({
  snapshot, profiles = [], formats = ["op_ed"],
  authToken = "", spendCapCents = 0, escalateModelId
} = {}) {
  if (!snapshot) return { ok: false, reason: "snapshot_required" };
  if (!snapshot.eligible) return { ok: false, reason: `read_ineligible:${snapshot.eligibility_reason || "unknown"}` };
  if (!profiles.length) return { ok: false, reason: "profiles_required" };

  const atoms = snapshot.atoms || [];
  const variants = [];

  for (const profile of profiles) {
    const map = await runSalienceMap({ atoms, profile, authToken });
    for (const format of formats) {
      const render = await runRender({ map, atoms, format, profile, authToken });
      const repair = await verifyAndRepair({
        render, snapshot, atoms, authToken, spendCapCents, escalateModelId,
        produceRender: async ({ modelId } = {}) => runRender({ map, atoms, format, profile, authToken, modelId })
      });
      // verifyAndRepair may retry/escalate; its verdict and status describe repair.render,
      // so the stored variant must carry that final draft, not the original failing one.
      const finalRender = repair.render || render;
      variants.push({
        profile_id: profileKey(profile),
        format,
        status: repair.status,
        escalated_to: repair.escalated_to,
        headline: finalRender.headline,
        claim_markers: finalRender.claim_markers,
        counter_case_included: finalRender.counter_case_included,
        verdict: {
          blocked: repair.verdict.blocked,
          substance_lock_passed: repair.verdict.substance_lock_passed,
          gestalt_checked: repair.verdict.gestalt_checked
        },
        render: finalRender
      });
    }
  }

  const media_run = {
    media_run_id: `media_${Date.now()}`,
    source_run_id: snapshot.source_run_id,
    read_snapshot_id: snapshot.content_hash, // pin the snapshot by its content hash
    snapshot_version: snapshot.snapshot_version,
    case_id: snapshot.case_id,
    atoms: snapshot.atoms || [],
    status: variants.length && variants.every((v) => v.status === "verified") ? "verified" : "review",
    profile_set: profiles.map(profileKey),
    format_set: formats,
    variants,
    created_at: new Date().toISOString()
  };
  return { ok: true, media_run };
}

function profileKey(profile = {}) {
  return String(profile.profile_key || profile.profileKey || profile.id || profile.label || "").trim();
}
