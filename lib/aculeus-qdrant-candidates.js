export const QDRANT_COLLECTION_VERSION = "aculeus_public_records_candidates_v1";

export function buildQdrantCollectionSchema(collection = QDRANT_COLLECTION_VERSION) {
  return {
    collection,
    vectors: { size: 1536, distance: "Cosine" },
    payload_schema: {
      source_id: "keyword",
      source_family: "keyword",
      url: "keyword",
      title: "text",
      jurisdiction: "keyword",
      receipt_required: "bool",
      evidence_promotion_allowed: "bool"
    },
    candidate_only_policy: true,
    public_safe: true
  };
}

export function planQdrantCandidateLookup(spec = {}, options = {}) {
  return {
    task_id: `qdrant_lookup_${Date.now()}`,
    source_id: "qdrant_candidate_lookup",
    source_family: "qdrant_candidate_lookup",
    collection: options.collection || QDRANT_COLLECTION_VERSION,
    query: String(spec.raw_query || spec.rawQuery || spec.case_scope || "").trim(),
    limit: Math.max(1, Math.min(Number(options.limit || 5), 20)),
    evidence_promotion_allowed: false,
    public_safe: true
  };
}

export async function executeQdrantCandidateLookup(task = {}, options = {}) {
  if (!options.enableNetwork) {
    return {
      status: "DRY_RUN",
      mode: "qdrant_candidate_lookup_dry_run",
      remote_mutation: false,
      collection: task.collection || QDRANT_COLLECTION_VERSION,
      candidates: [candidateFromHit(task, {
        id: "dry_qdrant_candidate",
        score: 0.72,
        payload: {
          title: `Vector candidate for ${task.query || "public records"}`,
          url: "https://example.gov/public-record",
          source_family: "qdrant_candidate_lookup",
          snippet: "Dry-run Qdrant candidate. Fetch and receipt the original public source before evidence use."
        }
      })],
      evidence_promotion_allowed: false,
      public_safe: true
    };
  }

  return {
    status: "NEEDS_EMBEDDING_QUERY",
    mode: "qdrant_candidate_lookup_blocked",
    remote_mutation: false,
    collection: task.collection || QDRANT_COLLECTION_VERSION,
    candidates: [],
    reason: "Live Qdrant query requires an embedding vector supplied by the retrieval planner.",
    evidence_promotion_allowed: false,
    public_safe: true
  };
}

export function planQdrantMigration(options = {}) {
  return {
    migration_id: `qdrant_migration_${QDRANT_COLLECTION_VERSION}`,
    collection: options.collection || QDRANT_COLLECTION_VERSION,
    schema: buildQdrantCollectionSchema(options.collection),
    dry_run: options.dryRun !== false,
    remote_mutation_allowed: options.allowRemoteMutation === true,
    public_safe: true
  };
}

export function executeQdrantMigrationPlan(plan = {}) {
  if (plan.remote_mutation_allowed !== true) {
    return {
      status: "DRY_RUN",
      migration_id: plan.migration_id,
      collection: plan.collection,
      remote_mutation: false,
      operations: ["create_or_verify_collection", "apply_payload_indexes", "enforce_candidate_only_payload"],
      schema: plan.schema,
      public_safe: true
    };
  }
  return {
    status: "BLOCKED_APPROVAL_REQUIRED",
    migration_id: plan.migration_id,
    collection: plan.collection,
    remote_mutation: false,
    reason: "Remote Qdrant mutation must be executed only through an explicit deployment gate.",
    public_safe: true
  };
}

export function validateQdrantCandidateResult(result) {
  const issues = [];
  if (!result || typeof result !== "object") return ["qdrant result must be an object"];
  if (result.remote_mutation !== false) issues.push("qdrant candidate lookup must not mutate remote state");
  if (result.evidence_promotion_allowed !== false) issues.push("qdrant result must not promote evidence");
  for (const candidate of result.candidates || []) {
    if (candidate.source_family !== "qdrant_candidate_lookup") issues.push(`${candidate.candidate_id} source_family mismatch`);
    if (candidate.evidence_id !== null || candidate.evidence_promotion_allowed !== false) issues.push(`${candidate.candidate_id} escaped candidate-only gate`);
    if (candidate.receipt_required !== true) issues.push(`${candidate.candidate_id} must require receipt`);
  }
  return issues;
}

function candidateFromHit(task, hit) {
  const payload = hit.payload || {};
  return {
    candidate_id: `qdrant_${hit.id}`,
    provider: "Qdrant",
    provider_id: task.collection || QDRANT_COLLECTION_VERSION,
    source_family: "qdrant_candidate_lookup",
    url: payload.url || "",
    title: payload.title || "Qdrant candidate",
    snippet: payload.snippet || "Qdrant candidate locator.",
    qdrant_score: hit.score,
    evidence_id: null,
    evidence_promotion_allowed: false,
    candidate_only_until_receipted: true,
    receipt_required: true,
    public_safe: true
  };
}
