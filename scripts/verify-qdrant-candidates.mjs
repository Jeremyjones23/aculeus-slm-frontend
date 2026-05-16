import {
  executeQdrantCandidateLookup,
  executeQdrantMigrationPlan,
  planQdrantCandidateLookup,
  planQdrantMigration,
  validateQdrantCandidateResult
} from "../lib/aculeus-qdrant-candidates.js";

const task = planQdrantCandidateLookup({ rawQuery: "LA homelessness spending contracts" }, { limit: 3 });
const result = await executeQdrantCandidateLookup(task, { enableNetwork: false });
const failures = validateQdrantCandidateResult(result);

if (result.mode !== "qdrant_candidate_lookup_dry_run") failures.push("qdrant dry-run mode mismatch");
if (!result.candidates.length) failures.push("qdrant dry-run should emit candidate row");

const dryMigration = executeQdrantMigrationPlan(planQdrantMigration({ dryRun: true }));
if (dryMigration.status !== "DRY_RUN" || dryMigration.remote_mutation !== false) failures.push("qdrant migration dry-run gate failed");
if (dryMigration.schema?.candidate_only_policy !== true) failures.push("qdrant schema missing candidate-only policy");

const gatedMigration = executeQdrantMigrationPlan(planQdrantMigration({ dryRun: false, allowRemoteMutation: true }));
if (gatedMigration.status !== "BLOCKED_APPROVAL_REQUIRED" || gatedMigration.remote_mutation !== false) failures.push("qdrant remote mutation gate failed");

if (failures.length) {
  console.error(`Qdrant candidate verification failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Qdrant candidate verification passed.");
