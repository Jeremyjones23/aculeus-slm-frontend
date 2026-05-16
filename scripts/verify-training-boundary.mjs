import { readFileSync } from "node:fs";
import { join } from "node:path";

const config = JSON.parse(readFileSync(join(process.cwd(), "configs", "aculeus-training-readiness.json"), "utf8"));
const doc = readFileSync(join(process.cwd(), "docs", "hosted-training-boundary.md"), "utf8");

if (config.schema_version !== "aculeus_hosted_training_readiness.v1") throw new Error("training readiness schema mismatch");
if (config.status !== "prepared_not_launched") throw new Error("training readiness status must be prepared_not_launched");
if (config.hosted_training_launch_allowed !== false || config.fine_tuning_launch_allowed !== false) {
  throw new Error("hosted training or fine-tuning launch was enabled");
}
if (config.requires_explicit_final_gate !== true) throw new Error("training readiness missing explicit final gate");
if (Number(config.max_configured_spend_usd) > 10) throw new Error("training readiness spend cap exceeds approved cap");
if (config.launch_command !== null) throw new Error("training readiness must not include a launch command");
for (const gate of ["no_raw_receipt_text", "no_provider_auth_headers", "zero_uncited_critical_claims", "shadow_no_regression", "human_reviewed_training_rows_only"]) {
  if (!config.required_prelaunch_gates.includes(gate)) throw new Error(`training readiness missing gate: ${gate}`);
}
for (const phrase of ["prepared, not launched", "Do not run hosted training", "Do not create a fine-tune", "10 USD"]) {
  if (!doc.includes(phrase)) throw new Error(`training boundary doc missing phrase: ${phrase}`);
}
if (doc.match(/prime\s+rl\s+train|fine[- ]?tune\s+create|openai\s+fine_tuning\.jobs\.create/i)) {
  throw new Error("training boundary doc contains launch-like command text");
}

console.log("Hosted training boundary verification passed.");
