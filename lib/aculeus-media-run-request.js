// Maps a workspace Answer Brief into a /api/media-runs request body, with a lightweight
// eligibility precheck (the server re-validates authoritatively via buildReadSnapshot).
// Pure — no node:crypto / fs — so it is safe in the client bundle and testable in node.
//
// Honest behavior: the snapshot requires a counter-case, so a Read that carries none is
// reported ineligible (counter_case_required) rather than silently rendered. This surfaces
// the real dependency: the BLUE Read must emit "the strongest case against it" before the
// CYAN layer can run.

export const DEFAULT_TEMPERAMENT_PROFILES = [
  { profile_key: "far_left", frame: "power & exploitation", messenger: "the organizer", forbidden: ["slur", "dehumanizing language"] },
  { profile_key: "left_of_center", frame: "harm & fairness", messenger: "the affected family", forbidden: ["slur", "dehumanizing language"] },
  { profile_key: "center", frame: "cost & competence", messenger: "the document itself", forbidden: ["slur", "manufactured urgency"] },
  { profile_key: "right_of_center", frame: "stewardship & trust", messenger: "the local operator", forbidden: ["slur", "dehumanizing language"] },
  { profile_key: "far_right", frame: "sovereignty & betrayal", messenger: "the named insider", forbidden: ["slur", "dog-whistle"] }
];

const STRONG_SUPPORT = new Set(["supported", "strong", "high", "verified"]);

export function buildMediaRunRequestFromBrief(brief = {}, { profiles, formats } = {}) {
  const support = Array.isArray(brief.support) ? brief.support : [];
  const citations = Array.isArray(brief.citations) ? brief.citations : [];
  const citeById = new Map(citations.map((c) => [c.citationId, c]));

  const evidence_records = [];
  let counterFound = false;

  support.forEach((item, i) => {
    const cite = (item.citationIds || []).map((id) => citeById.get(id)).find(Boolean) || citations[i] || null;
    const isCounter = item.kind === "counter_case" || item.counterCase === true || /counter|against|rebuttal/i.test(String(item.role || ""));
    if (isCounter) counterFound = true;
    evidence_records.push({
      evidence_record_id: item.id || `ev_${i + 1}`,
      claim: clean(item.body || item.title || ""),
      support_level: clean(cite?.supportLevel || (item.confidence != null ? "supported" : "partially_supported")),
      citation_id: clean(cite?.citationId || ""),
      role: isCounter ? "counter_case" : undefined,
      receipt: cite ? { publisher: cite.publisher, title: cite.title, date: cite.date || "", url: cite.url } : {},
      locator: cite ? { captured_at: cite.date || "", section: cite.location } : {}
    });
  });

  // An explicit counter-case attached to the brief.
  if (!counterFound && brief.counterCase) {
    const cc = brief.counterCase;
    evidence_records.push({
      evidence_record_id: cc.id || "ev_counter_case",
      claim: clean(typeof cc === "string" ? cc : (cc.body || cc.text || "")),
      support_level: "partially_supported",
      role: "counter_case",
      receipt: (cc && cc.receipt) || {},
      locator: {}
    });
    counterFound = true;
  }

  const read = {
    source_run_id: clean(brief.runId || brief.caseId || ""),
    case_id: clean(brief.caseId || ""),
    bottom_line: clean(brief.bottomLine || ""),
    counter_case: counterFound ? true : undefined,
    evidence_records
  };

  const hasSupportedLead = evidence_records.some((e) => !e.role && STRONG_SUPPORT.has(e.support_level));
  if (!hasSupportedLead) return { ok: false, reason: "no_supported_evidence", read };
  if (!counterFound) return { ok: false, reason: "counter_case_required", read };

  return {
    ok: true,
    body: {
      read,
      profiles: profiles && profiles.length ? profiles : DEFAULT_TEMPERAMENT_PROFILES,
      formats: formats && formats.length ? formats : ["op_ed", "social", "newsletter", "press_release"]
    }
  };
}

export function describeMediaRunBlocker(reason) {
  if (reason === "counter_case_required") return "This Read needs a counter-case (the strongest case against it) before media can be created.";
  if (reason === "no_supported_evidence") return "This Read has no receipt-backed supported finding yet.";
  return "This Read is not ready for media.";
}

function clean(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
