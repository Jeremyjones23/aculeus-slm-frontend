import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const artifactDir = join(process.cwd(), "qa-artifacts");
const outJson = join(artifactDir, "aculeus-controlled-pilot-packet.json");
const outHtml = join(artifactDir, "aculeus-controlled-pilot-packet.html");
mkdirSync(artifactDir, { recursive: true });

const artifacts = {
  promotion: readRequired("aculeus-deployment-promotion-packet.json"),
  postdeploy: readLatest(/^postdeploy-smoke-\d+\.json$/),
  receipt: readLatest(/^postdeploy-receipt-smoke-\d+\.json$/),
  admin: readLatest(/^postdeploy-admin-smoke-\d+\.json$/),
  liveProvider: readLatest(/^postdeploy-live-provider-smoke-\d+\.json$/),
  fourDossier: readLatest(/^postdeploy-four-dossier-regression-\d+\.json$/),
  shadow: readRequired("aculeus-pilot-shadow-eval-report.json")
};

const packet = sanitize({
  schema_version: "aculeus_controlled_pilot_packet.v1",
  generated_at: new Date().toISOString(),
  reviewer_posture: "controlled_pilot_ready_with_platform_residuals",
  production_url: "https://aculeus-slm-frontend.vercel.app",
  source_repository: "https://github.com/Jeremyjones23/aculeus-slm-frontend",
  gates: {
    promotion_packet_ready: artifacts.promotion?.pass_fail_gates?.preview_ready === true,
    postdeploy_smoke_passed: artifacts.postdeploy?.ok === true,
    receipt_smoke_passed: artifacts.receipt?.ok === true,
    admin_spend_smoke_passed: artifacts.admin?.ok === true,
    live_provider_smoke_passed: artifacts.liveProvider?.ok === true,
    four_dossier_regression_passed: artifacts.fourDossier?.ok === true,
    shadow_eval_passed: artifacts.shadow?.status === "shadow_passed_no_user_promotion",
    user_visible_model_promotion_allowed: false,
    evidence_auto_promotion_allowed: false
  },
  metrics: {
    admin_provider_spend_usd: artifacts.admin?.estimatedProviderSpendUsd || 0,
    admin_provider_cap_usd: artifacts.admin?.providerCapUsd || 0,
    admin_provider_alert: artifacts.admin?.adminProviderAlert || "unknown",
    live_provider_spend_usd: artifacts.liveProvider?.estimatedProviderSpendUsd || 0,
    live_provider_cap_usd: artifacts.liveProvider?.providerCapUsd || 0,
    four_dossier_case_count: artifacts.fourDossier?.caseCount || 0,
    four_dossier_provider_live: artifacts.fourDossier?.liveProvider === true,
    shadow_trace_count: artifacts.shadow?.input_trace_count || 0,
    shadow_run_count: artifacts.shadow?.input_run_count || 0,
    shadow_case_count: artifacts.shadow?.metrics?.case_count || 0
  },
  residual_platform_checks: [
    {
      id: "vercel_git_link",
      status: "blocked",
      summary: "GitHub repo exists and main is pushed, but Vercel CLI/API still cannot attach the repository. Likely Vercel GitHub integration access or dashboard setting."
    },
    {
      id: "clerk_dns_configuration",
      status: "residual",
      summary: "Prior Production deploy returned a Clerk DNS Configuration check failure. The verified deployment URL and canonical alias passed Aculeus application smokes."
    }
  ],
  artifact_index: Object.fromEntries(Object.entries(artifacts).map(([key, value]) => [key, {
    path: value.__artifact_path,
    generated_at: value.generated_at || null,
    ok: value.ok ?? value.status ?? value.pass_fail_gates?.preview_ready ?? null
  }])),
  reviewer_summary: [
    "Production auth boundary passed: unauthenticated requests denied, approved operator/admin headers admitted.",
    "Official API and provider rows remain candidate leads until receipt-backed reviewer promotion.",
    "Receipt smoke passed with content hash, quote hash, source-level promotion, and high-risk finding blockage.",
    "Four dossier regression passed with source-ledger rows, candidate queues, trace refs, and zero auto-promoted evidence.",
    "Shadow eval passed on durable pilot traces without user-visible model promotion."
  ]
});

const issues = validatePacket(packet);
if (issues.length) throw new Error(`Controlled pilot packet failed validation:\n${issues.join("\n")}`);

writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
writeFileSync(outHtml, renderHtml(packet), "utf8");
console.log(JSON.stringify({ ok: true, json: outJson, html: outHtml, gates: packet.gates, metrics: packet.metrics }, null, 2));

function readRequired(name) {
  const path = join(artifactDir, name);
  if (!existsSync(path)) throw new Error(`Required artifact missing: ${name}`);
  return { ...JSON.parse(readFileSync(path, "utf8")), __artifact_path: path };
}

function readLatest(pattern) {
  const files = readdirSync(artifactDir)
    .filter((name) => pattern.test(name))
    .map((name) => ({ name, path: join(artifactDir, name), mtime: statSync(join(artifactDir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!files.length) throw new Error(`Required artifact pattern missing: ${pattern}`);
  return { ...JSON.parse(readFileSync(files[0].path, "utf8")), __artifact_path: files[0].path };
}

function validatePacket(value) {
  const issues = [];
  if (value.schema_version !== "aculeus_controlled_pilot_packet.v1") issues.push("schema mismatch");
  for (const [gate, passed] of Object.entries(value.gates || {})) {
    if (gate.endsWith("_passed") && passed !== true) issues.push(`${gate} is not true`);
  }
  if (value.gates.user_visible_model_promotion_allowed !== false) issues.push("model promotion gate must be false");
  if (value.gates.evidence_auto_promotion_allowed !== false) issues.push("evidence auto-promotion gate must be false");
  const text = JSON.stringify(value);
  if (/api[_-]?key|authorization|secret|raw_text|postgres(?:ql)?:\/\/|bearer\s+[a-z0-9._-]+/i.test(text)) issues.push("packet contains secret-looking material");
  return issues;
}

function sanitize(value) {
  return JSON.parse(JSON.stringify(value, (key, child) => {
    if (/api[_-]?key|authorization|secret|token|raw_text|rawText/i.test(key)) return undefined;
    return child;
  }));
}

function renderHtml(value) {
  const gateRows = Object.entries(value.gates).map(([key, gate]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(gate))}</td></tr>`).join("");
  const metricRows = Object.entries(value.metrics).map(([key, metric]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(metric))}</td></tr>`).join("");
  const residuals = value.residual_platform_checks.map((item) => `<li><strong>${escapeHtml(item.id)}</strong>: ${escapeHtml(item.status)} - ${escapeHtml(item.summary)}</li>`).join("");
  const summary = value.reviewer_summary.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aculeus Controlled Pilot Packet</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #17120d; background: #fffaf2; }
    main { max-width: 1040px; margin: 0 auto; }
    h1 { font-size: 42px; margin-bottom: 8px; }
    h2 { margin-top: 32px; }
    table { border-collapse: collapse; width: 100%; background: white; }
    td, th { border: 1px solid #d8cbbb; padding: 10px; text-align: left; }
    th { background: #17120d; color: white; }
    .posture { font-weight: 700; color: #b42318; }
  </style>
</head>
<body>
  <main>
    <p class="posture">${escapeHtml(value.reviewer_posture)}</p>
    <h1>Aculeus Controlled Pilot Packet</h1>
    <p>Production: <a href="${escapeHtml(value.production_url)}">${escapeHtml(value.production_url)}</a></p>
    <p>Source: <a href="${escapeHtml(value.source_repository)}">${escapeHtml(value.source_repository)}</a></p>
    <h2>Reviewer Summary</h2>
    <ul>${summary}</ul>
    <h2>Gates</h2>
    <table><thead><tr><th>Gate</th><th>Status</th></tr></thead><tbody>${gateRows}</tbody></table>
    <h2>Metrics</h2>
    <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${metricRows}</tbody></table>
    <h2>Residual Platform Checks</h2>
    <ul>${residuals}</ul>
  </main>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}
