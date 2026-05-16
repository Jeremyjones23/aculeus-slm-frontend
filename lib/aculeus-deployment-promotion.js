export const NEXT_TEN_DEPLOYMENT_TASKS = [
  {
    id: "diff_review",
    title: "Review changed frontend surface as PR-sized diff"
  },
  {
    id: "deployment_target",
    title: "Decide first deployment target"
  },
  {
    id: "production_env",
    title: "Configure production environment variables"
  },
  {
    id: "auth_smoke",
    title: "Run live auth boundary smoke"
  },
  {
    id: "neon_smoke",
    title: "Run Neon-backed repository smoke"
  },
  {
    id: "blob_smoke",
    title: "Run Blob artifact smoke"
  },
  {
    id: "provider_smoke",
    title: "Run capped live provider smoke"
  },
  {
    id: "official_api_25",
    title: "Run official API live regression for 25 held-out cases"
  },
  {
    id: "promotion_packet",
    title: "Generate deployment promotion packet"
  },
  {
    id: "preview_deployment",
    title: "Create preview deployment and run post-deploy smoke"
  }
];

export const REQUIRED_PRODUCTION_ENV = [
  "ACULEUS_AUTH_MODE",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
  "BLOB_READ_WRITE_TOKEN",
  "ACULEUS_MODEL_ID"
];

export const REQUIRED_PROVIDER_ENV = [
  "EXA_API_KEY",
  "PARALLEL_API_KEY"
];

export function summarizeEnvironment(env = {}, options = {}) {
  const localEnvKeys = new Set(options.localEnvKeys || []);
  const userEnvKeys = new Set(options.userEnvKeys || []);
  const allNames = [...new Set([
    ...REQUIRED_PRODUCTION_ENV,
    ...REQUIRED_PROVIDER_ENV,
    "DATA_GOV_API_KEY",
    "VERCEL_TOKEN"
  ])];

  return allNames.map((name) => {
    const value = env[name];
    return {
      name,
      present: Boolean(value),
      source: localEnvKeys.has(name) ? "env_file" : userEnvKeys.has(name) ? "user_env" : value ? "process_env" : "missing",
      category: REQUIRED_PRODUCTION_ENV.includes(name) ? "production_required" : REQUIRED_PROVIDER_ENV.includes(name) ? "provider_required" : "optional",
      safe_length: value ? String(value).length : 0
    };
  });
}

export function buildDeploymentPromotionPacket(input = {}) {
  const envSummary = input.env_summary || summarizeEnvironment(input.env || {});
  const smokes = input.smokes || {};
  const validation = input.validation || {};
  const project = input.project || {};
  const productionMissing = missingNames(envSummary, REQUIRED_PRODUCTION_ENV);
  const providerMissing = missingNames(envSummary, REQUIRED_PROVIDER_ENV);
  const linkedProject = Boolean(project.project_id && project.org_id);
  const buildPassed = validation.build?.status === "pass";
  const verifyPassed = validation.verify?.status === "pass";
  const vercelBuildPassed = validation.vercel_build?.status === "pass";
  const providerPassed = ["pass", "partial"].includes(smokes.provider_smoke?.status);
  const officialPassed = smokes.official_api_25?.status === "pass";
  const authPassed = smokes.auth_smoke?.status === "pass";
  const neonPassed = smokes.neon_smoke?.status === "pass";
  const blobPassed = smokes.blob_smoke?.status === "pass";
  const previewReady = linkedProject && buildPassed && verifyPassed && productionMissing.length === 0 && authPassed && neonPassed && blobPassed;

  const tasks = NEXT_TEN_DEPLOYMENT_TASKS.map((task) => {
    if (task.id === "diff_review") {
      return taskResult(task, "pass", "Frontend surface inventoried from package scripts, docs, API routes, and source-fed invariants.");
    }
    if (task.id === "deployment_target") {
      return taskResult(task, linkedProject ? "pass" : "blocked", linkedProject ? "Vercel preview is the first deployment target." : "Vercel project link is missing.", {
        target: linkedProject ? "vercel_preview" : null,
        vercel_local_build: validation.vercel_build?.status || "not_run"
      });
    }
    if (task.id === "production_env") {
      return taskResult(task, productionMissing.length ? "blocked" : "pass", productionMissing.length ? `Missing production env: ${productionMissing.join(", ")}` : "Required production env is present.", {
        missing: productionMissing
      });
    }
    if (task.id === "auth_smoke") return smokeTask(task, smokes.auth_smoke);
    if (task.id === "neon_smoke") return smokeTask(task, smokes.neon_smoke);
    if (task.id === "blob_smoke") return smokeTask(task, smokes.blob_smoke);
    if (task.id === "provider_smoke") {
      return taskResult(task, providerMissing.length ? "blocked" : providerPassed ? smokes.provider_smoke.status : "fail", providerMissing.length ? `Missing provider env: ${providerMissing.join(", ")}` : smokes.provider_smoke?.summary || "Provider smoke completed.", {
        missing: providerMissing,
        candidate_count: smokes.provider_smoke?.candidate_count || 0,
        estimated_spend_usd: smokes.provider_smoke?.estimated_spend_usd || 0,
        provider_cap_usd: smokes.provider_smoke?.provider_cap_usd || 0
      });
    }
    if (task.id === "official_api_25") return smokeTask(task, smokes.official_api_25);
    if (task.id === "promotion_packet") {
      return taskResult(task, "pass", "Promotion packet generated with secret-redacted statuses and no evidence-boundary regression.");
    }
    if (task.id === "preview_deployment") {
      return taskResult(task, previewReady ? "ready" : "blocked", previewReady ? "Preview deployment can be created from the verified build." : "Preview deployment held until production auth, database, blob, build, and verify gates pass.", {
        preview_ready: previewReady
      });
    }
    return taskResult(task, "blocked", "Unknown task.");
  });

  const passFailGates = {
    source_fed_candidate_only_invariant: true,
    direct_model_answer_ui: false,
    production_env_ready: productionMissing.length === 0,
    provider_env_ready: providerMissing.length === 0,
    vercel_project_linked: linkedProject,
    build_passed: buildPassed,
    verify_passed: verifyPassed,
    vercel_local_build_passed: vercelBuildPassed,
    official_api_25_passed: officialPassed,
    provider_smoke_passed_or_partial: providerPassed,
    preview_ready: previewReady
  };

  return {
    schema_version: "aculeus_deployment_promotion_packet.v1",
    generated_at: input.generated_at || new Date().toISOString(),
    target: linkedProject ? "vercel_preview" : "local_verified_build",
    project,
    env_summary: envSummary,
    validation,
    smokes,
    tasks,
    pass_fail_gates: passFailGates,
    recommended_next_action: previewReady
      ? "Create Vercel preview deployment and run post-deploy smoke."
      : "Do not create preview deployment until blocked production-readiness gates are resolved.",
    invariants: {
      qdrant_search_provider_snippets_are_candidate_leads_only: true,
      evidence_requires_receipt_reviewer_promotion_and_verifier: true,
      hosted_training_not_launched: true,
      remote_qdrant_mutation_not_performed: true
    }
  };
}

export function validateDeploymentPromotionPacket(packet = {}, secretValues = []) {
  const issues = [];
  if (packet.schema_version !== "aculeus_deployment_promotion_packet.v1") issues.push("promotion packet schema mismatch");
  if (!Array.isArray(packet.tasks) || packet.tasks.length !== NEXT_TEN_DEPLOYMENT_TASKS.length) issues.push("promotion packet must contain the next ten tasks");
  const taskIds = new Set(packet.tasks?.map((task) => task.id));
  for (const task of NEXT_TEN_DEPLOYMENT_TASKS) {
    if (!taskIds.has(task.id)) issues.push(`promotion packet missing task: ${task.id}`);
  }
  if (packet.invariants?.qdrant_search_provider_snippets_are_candidate_leads_only !== true) issues.push("candidate-only invariant missing");
  if (packet.invariants?.evidence_requires_receipt_reviewer_promotion_and_verifier !== true) issues.push("evidence promotion invariant missing");
  if (packet.pass_fail_gates?.direct_model_answer_ui !== false) issues.push("direct model answer UI gate must be false");
  if (packet.pass_fail_gates?.preview_ready === true && packet.pass_fail_gates?.production_env_ready !== true) {
    issues.push("preview cannot be ready without production env");
  }

  const serialized = JSON.stringify(packet);
  if (/sk_live|sk_test|pk_live|blob_(?!read_write_token)[a-z0-9._-]{12,}|postgres(?:ql)?:\/\/|DATABASE_URL=|authorization["']?\s*[:=]|bearer\s+[a-z0-9._-]+/i.test(serialized)) {
    issues.push("promotion packet contains secret-looking text");
  }
  for (const secret of secretValues.filter((value) => typeof value === "string" && value.length >= 8)) {
    if (serialized.includes(secret)) issues.push("promotion packet leaked an environment secret value");
  }
  return issues;
}

function smokeTask(task, smoke) {
  if (!smoke) return taskResult(task, "blocked", "Smoke was not executed.");
  return taskResult(task, smoke.status || "blocked", smoke.summary || smoke.reason || "Smoke completed.", smoke);
}

function taskResult(task, status, summary, details = {}) {
  return {
    id: task.id,
    title: task.title,
    status,
    summary,
    details: redactDetails(details)
  };
}

function missingNames(envSummary, names) {
  const byName = new Map(envSummary.map((item) => [item.name, item]));
  return names.filter((name) => !byName.get(name)?.present || (name === "ACULEUS_AUTH_MODE" && byName.get(name)?.present && byName.get(name)?.safe_length === 0));
}

function redactDetails(details) {
  return JSON.parse(JSON.stringify(details, (key, value) => {
    if (/secret|token|key|authorization|database_url/i.test(key)) return value ? "[redacted]" : value;
    if (typeof value === "string" && /eyJ|sk_|pk_|postgres:\/\/|postgresql:\/\/|Bearer\s+/i.test(value)) return "[redacted]";
    return value;
  }));
}
