import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildReadSnapshot } from "../lib/aculeus-read-snapshot.js";
import { startMediaRun } from "../lib/aculeus-media-run.js";
import { saveMediaRun, getMediaRun, listMediaRuns } from "../lib/aculeus-media-run-store.js";

process.env.ACULEUS_MEDIA_STORE_DIR = mkdtempSync(join(tmpdir(), "aculeus-media-store-"));

const read = {
  source_run_id: "run_la_fwa",
  case_id: "case_la",
  bottom_line: "$48M flowed; the auditor cleared it.",
  evidence_records: [
    { evidence_record_id: "ev1", claim: "$48M flowed to three vendors.", support_level: "supported", receipt: { publisher: "USAspending.gov", date: "2026-01-10" }, locator: { captured_at: "2026-01-10" } },
    { evidence_record_id: "ev2", claim: "They share an address with two officers.", support_level: "supported", receipt: { publisher: "IRS Form 990", date: "2026-02-01" }, locator: { captured_at: "2026-02-01" } },
    { evidence_record_id: "ev3", claim: "The auditor found no violation.", support_level: "partially_supported", role: "counter_case", receipt: { publisher: "Independent audit", date: "2026-03-01" }, locator: { captured_at: "2026-03-01" } }
  ]
};

try {
  const snapshot = buildReadSnapshot(read);
  const profiles = [
    { profile_key: "far_left", frame: "power & exploitation", messenger: "the organizer", forbidden: ["slur"] },
    { profile_key: "right_of_center", frame: "stewardship & trust", messenger: "the local operator", forbidden: ["smear"] }
  ];
  const formats = ["op_ed", "social"];

  const result = await startMediaRun({ snapshot, profiles, formats });
  if (!result.ok) throw new Error(`media run failed: ${result.reason}`);
  if (result.media_run.variants.length !== 4) throw new Error("expected 4 variants (2 profiles x 2 formats)");
  if (!result.media_run.variants.every((v) => v.counter_case_included)) throw new Error("a variant dropped the counter-case");
  // Deterministic mode (no gateway) -> every variant routes to human review.
  if (!result.media_run.variants.every((v) => v.status === "needs_human")) throw new Error("deterministic variant did not route to human review");
  if (result.media_run.status !== "review") throw new Error("media run status should be review when variants need human");
  if (result.media_run.read_snapshot_id !== snapshot.content_hash) throw new Error("media run did not pin the snapshot hash");

  // Ineligible Read is refused.
  const ineligible = await startMediaRun({ snapshot: { ...snapshot, eligible: false, eligibility_reason: "counter_case_required" }, profiles, formats });
  if (ineligible.ok !== false || !/read_ineligible/.test(ineligible.reason)) throw new Error("ineligible Read was not refused");
  // A snapshot with no source run is refused before any model spend (would break the runs FK).
  const noSourceRun = await startMediaRun({ snapshot: { ...snapshot, source_run_id: "" }, profiles, formats });
  if (noSourceRun.ok !== false || noSourceRun.reason !== "source_run_required") throw new Error("media run without a source run was not refused");
  if ((await startMediaRun({ snapshot, profiles: [], formats })).ok !== false) throw new Error("media run without profiles was not refused");

  // Store round-trip.
  const saved = saveMediaRun(result.media_run);
  if (getMediaRun(saved.media_run_id)?.media_run_id !== saved.media_run_id) throw new Error("media run did not round-trip through the store");
  if (!listMediaRuns().length) throw new Error("listMediaRuns empty after save");

  console.log(`Media run verification passed (${result.media_run.variants.length} variants, status ${result.media_run.status}, store round-trip ok).`);
} finally {
  rmSync(process.env.ACULEUS_MEDIA_STORE_DIR, { recursive: true, force: true });
}
