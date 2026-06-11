// Shared Vercel AI Gateway client — the single seam for every salience-layer model
// call. Mirrors lib/aculeus-case-qa.js: OpenAI-compatible chat completions, model id
// by env, temperature 0.1, JSON-only parsing. The source-locked system prompts and
// the deterministic post-validators live in each pass module, fencing the model on
// both sides.

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

export function gatewayToken(authToken = "") {
  return authToken
    || process.env.AI_GATEWAY_API_KEY
    || process.env.VERCEL_AI_GATEWAY_API_KEY
    || process.env.VERCEL_OIDC_TOKEN
    || "";
}

export function gatewayConfigured(authToken = "") {
  return Boolean(gatewayToken(authToken));
}

export async function callGateway({ model, messages, temperature = 0.1, authToken = "" }) {
  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${gatewayToken(authToken)}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ model, temperature, messages })
  });
  if (!response.ok) throw new Error(`Gateway request failed: ${response.status}`);
  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content || "";
}

export function parseJsonObject(text) {
  const raw = String(text || "").trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model response");
  return JSON.parse(raw.slice(start, end + 1));
}
