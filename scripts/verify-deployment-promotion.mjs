import {
  buildDeploymentPromotionPacket,
  NEXT_TEN_DEPLOYMENT_TASKS,
  validateDeploymentPromotionPacket
} from "../lib/aculeus-deployment-promotion.js";

const completeEnv = {
  ACULEUS_AUTH_MODE: "production",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_fixture_public",
  CLERK_SECRET_KEY: "sk_fixture_secret",
  DATABASE_URL: "postgres://fixture",
  BLOB_READ_WRITE_TOKEN: "blob_fixture_secret",
  ACULEUS_MODEL_ID: "openai/gpt-oss-20b",
  EXA_API_KEY: "exa_fixture_secret",
  PARALLEL_API_KEY: "parallel_fixture_secret",
  DATA_GOV_API_KEY: "datagov_fixture_secret",
  VERCEL_TOKEN: "vercel_fixture_secret"
};

const packet = buildDeploymentPromotionPacket({
  env: completeEnv,
  project: {
    project_id: "prj_fixture",
    org_id: "team_fixture",
    linked: true
  },
  validation: {
    build: { status: "pass", command: "npm run build" },
    verify: { status: "pass", command: "npm run verify" }
  },
  smokes: {
    auth_smoke: { status: "pass", summary: "Production auth boundary blocks anonymous and admits approved roles." },
    neon_smoke: { status: "pass", summary: "Neon query and repository round trip passed." },
    blob_smoke: { status: "pass", summary: "Blob artifact upload passed." },
    provider_smoke: { status: "pass", summary: "Provider smoke returned candidate leads.", candidate_count: 2, estimated_spend_usd: 0.12, provider_cap_usd: 0.25 },
    official_api_25: { status: "pass", summary: "Official API 25-case regression passed.", case_count: 25 }
  },
  generated_at: "2026-05-16T00:00:00.000Z"
});

let issues = validateDeploymentPromotionPacket(packet, [
  completeEnv.CLERK_SECRET_KEY,
  completeEnv.DATABASE_URL,
  completeEnv.BLOB_READ_WRITE_TOKEN,
  completeEnv.EXA_API_KEY,
  completeEnv.PARALLEL_API_KEY,
  completeEnv.DATA_GOV_API_KEY,
  completeEnv.VERCEL_TOKEN
]);
if (issues.length) throw new Error(`complete promotion packet failed:\n${issues.join("\n")}`);
if (packet.tasks.length !== NEXT_TEN_DEPLOYMENT_TASKS.length) throw new Error("packet did not preserve exactly ten tasks");
if (packet.pass_fail_gates.preview_ready !== true) throw new Error("complete packet should be preview ready");
if (!packet.tasks.find((task) => task.id === "preview_deployment" && task.status === "ready")) {
  throw new Error("preview task should be marked ready when all gates pass");
}

const blocked = buildDeploymentPromotionPacket({
  env: {
    EXA_API_KEY: "exa_fixture_secret",
    PARALLEL_API_KEY: "parallel_fixture_secret"
  },
  project: {
    project_id: "prj_fixture",
    org_id: "team_fixture",
    linked: true
  },
  validation: {
    build: { status: "pass", command: "npm run build" },
    verify: { status: "pass", command: "npm run verify" }
  },
  smokes: {
    auth_smoke: { status: "blocked", summary: "Missing Clerk production env." },
    neon_smoke: { status: "blocked", summary: "Missing DATABASE_URL." },
    blob_smoke: { status: "blocked", summary: "Missing BLOB_READ_WRITE_TOKEN." },
    provider_smoke: { status: "pass", summary: "Provider smoke returned candidate leads.", candidate_count: 2, estimated_spend_usd: 0.12, provider_cap_usd: 0.25 },
    official_api_25: { status: "pass", summary: "Official API 25-case regression passed.", case_count: 25 }
  },
  generated_at: "2026-05-16T00:00:00.000Z"
});

issues = validateDeploymentPromotionPacket(blocked, ["exa_fixture_secret", "parallel_fixture_secret"]);
if (issues.length) throw new Error(`blocked promotion packet failed:\n${issues.join("\n")}`);
if (blocked.pass_fail_gates.preview_ready !== false) throw new Error("blocked packet must not be preview ready");
if (!blocked.tasks.find((task) => task.id === "production_env" && task.status === "blocked")) {
  throw new Error("missing production env should block production_env task");
}
if (!blocked.tasks.find((task) => task.id === "preview_deployment" && task.status === "blocked")) {
  throw new Error("preview deployment should be blocked when production gates are missing");
}

console.log("Deployment promotion packet verification passed.");
