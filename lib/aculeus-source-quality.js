const OFFICIAL_HOSTS = /\b(gov|ca\.gov|lacity\.org|sfgov\.org|sf\.gov|lausd\.org|irs\.gov|usaspending\.gov|sam\.gov|sec\.gov|arcgis\.com)\b/i;
const SECONDARY_HOSTS = /\b(org|edu)\b/i;

export function normalizeCandidateSet(input = {}) {
  const rows = [
    ...fromFixtureCandidates(input.fixture_candidates || input.fixtureCandidates || []),
    ...fromProviderExecution(input.provider_result_sets || input.providerResultSets || []),
    ...fromOfficialExecution(input.official_result_sets || input.officialResultSets || [])
  ];
  const deduped = dedupeCandidates(rows);
  return {
    status: "PASS",
    input_count: rows.length,
    deduped_count: deduped.length,
    duplicate_count: rows.length - deduped.length,
    candidates: deduped
  };
}

export function scoreSourceCandidate(candidate = {}) {
  let score = 0;
  const url = String(candidate.url || "");
  const family = String(candidate.source_family || "");
  const tier = String(candidate.reliability_tier || "");
  const text = `${candidate.title || ""} ${candidate.snippet || ""} ${candidate.candidate_reason || ""}`;
  if (OFFICIAL_HOSTS.test(url)) score += 35;
  else if (SECONDARY_HOSTS.test(url)) score += 12;
  if (/official|public_record|api|catalog|audit|filing/i.test(`${family} ${tier}`)) score += 25;
  if (/audit|contract|spending|award|grant|board|agenda|minutes|payment|invoice|financial|filing|monitoring/i.test(text)) score += 20;
  if (candidate.receipt_required === true) score += 5;
  if (candidate.evidence_id === null || candidate.evidence_id === undefined) score += 5;
  if (/candidate_lead_not_evidence|candidate_only/i.test(String(candidate.promotion_status || ""))) score += 5;
  if (!url) score -= 30;
  return Math.max(0, Math.min(100, score));
}

export function decorateCandidateForReview(candidate = {}) {
  const score = scoreSourceCandidate(candidate);
  return {
    ...candidate,
    normalized_url: normalizeUrl(candidate.url),
    source_quality_score: score,
    reviewer_queue_status: score >= 55 ? "ready_for_receipt_fetch" : "needs_better_locator",
    evidence_promotion_allowed: false,
    candidate_only_until_receipted: true,
    receipt_required: true,
    evidence_id: candidate.evidence_id ?? null,
    public_safe: true
  };
}

function fromFixtureCandidates(candidates) {
  return candidates.map((candidate) => decorateCandidateForReview({
    candidate_id: candidate.candidate_id || candidate.source_id,
    provider: candidate.provider || "fixture",
    provider_id: candidate.provider_id || "fixture",
    source_family: candidate.source_family || "fixture_candidate",
    url: candidate.url,
    title: candidate.title,
    snippet: candidate.snippet || candidate.candidate_reason || "",
    candidate_reason: candidate.candidate_reason || "Fixture candidate locator.",
    promotion_status: candidate.promotion_status || "candidate_lead_not_evidence",
    evidence_id: null
  }));
}

function fromProviderExecution(resultSets) {
  const rows = [];
  for (const set of resultSets || []) {
    for (const candidate of set.candidates || []) {
      rows.push(decorateCandidateForReview({
        ...candidate,
        provider: candidate.provider || set.provider,
        provider_id: candidate.provider_id || set.provider_id,
        source_family: candidate.source_family || "provider_search_candidate",
        promotion_status: "candidate_lead_not_evidence",
        evidence_id: null
      }));
    }
  }
  return rows;
}

function fromOfficialExecution(resultSets) {
  const rows = [];
  for (const set of resultSets || []) {
    for (const record of set.records || []) {
      rows.push(decorateCandidateForReview({
        candidate_id: record.record_id,
        provider: "Official API",
        provider_id: set.source_id || record.source_id,
        source_id: record.source_id || set.source_id,
        task_id: record.task_id || set.task_id,
        source_family: record.source_family || "official_api_record_candidate",
        reliability_tier: record.reliability_tier || "official_public_record",
        url: record.url,
        title: record.title,
        snippet: record.snippet,
        canonical_ids: record.canonical_ids || {},
        request_preview: set.request_preview || null,
        request_fingerprint: record.request_fingerprint || set.request_fingerprint || null,
        response_content_sha256: record.response_content_sha256 || set.response_content_sha256 || null,
        parsed_record_count: set.result_count || set.records?.length || 0,
        official_api_status: set.status,
        limitation: "Official API result is a candidate locator only until the public URL is fetched, receipted, quote-selected, and verified.",
        candidate_reason: "Official API record candidate. Must be fetched/receipted before evidence use.",
        promotion_status: "candidate_lead_not_evidence",
        evidence_id: null
      }));
    }
  }
  return rows;
}

function dedupeCandidates(candidates) {
  const seen = new Map();
  for (const candidate of candidates) {
    const key = normalizeUrl(candidate.url) || `id:${candidate.candidate_id}`;
    const previous = seen.get(key);
    if (!previous || candidate.source_quality_score > previous.source_quality_score) {
      seen.set(key, {
        ...candidate,
        duplicate_of: null,
        duplicate_count: previous ? (previous.duplicate_count || 0) + 1 : candidate.duplicate_count || 0
      });
    } else {
      seen.set(key, {
        ...previous,
        duplicate_count: (previous.duplicate_count || 0) + 1
      });
    }
  }
  return [...seen.values()].sort((a, b) => b.source_quality_score - a.source_quality_score || String(a.title).localeCompare(String(b.title)));
}

function normalizeUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    parsed.hash = "";
    parsed.searchParams.sort();
    if (parsed.pathname.endsWith("/") && parsed.pathname !== "/") {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return "";
  }
}
