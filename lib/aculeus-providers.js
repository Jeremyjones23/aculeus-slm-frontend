// Direct provider router — the single seam for every Aculeus model call. There is
// no gateway indirection: each model id carries a provider prefix (provider/model)
// that selects the provider's own OpenAI-compatible /chat/completions endpoint and
// its API key, read from that provider's env var.
//
//   deepseek/deepseek-reasoner -> api.deepseek.com   (DEEPSEEK_API_KEY)
//   xai/grok-2                 -> api.x.ai           (XAI_API_KEY)
//   openai/gpt-4o-mini         -> api.openai.com     (OPENAI_API_KEY)
//
// Each pass module supplies a source-locked system prompt and a deterministic
// post-validator, so the model is fenced on both sides regardless of provider.
// The model id is recorded in full (with prefix); only the HTTP body carries the
// bare model name the provider expects.

const PROVIDERS = {
  deepseek: { chatUrl: "https://api.deepseek.com/v1/chat/completions", keyEnv: ["DEEPSEEK_API_KEY"] },
  xai: { chatUrl: "https://api.x.ai/v1/chat/completions", keyEnv: ["XAI_API_KEY", "GROK_API_KEY"] },
  openai: { chatUrl: "https://api.openai.com/v1/chat/completions", keyEnv: ["OPENAI_API_KEY"] }
};

// Prefixes that show up in model ids but key the same provider.
const PROVIDER_ALIASES = { "x-ai": "xai", grok: "xai", "deepseek-ai": "deepseek", "open-ai": "openai" };

export function resolveModel(modelId = "") {
  const id = String(modelId || "").replace(/^["']|["']$/g, "").trim();
  const slash = id.indexOf("/");
  if (slash < 0) return null; // a direct call needs an explicit provider prefix
  const rawProvider = id.slice(0, slash).toLowerCase();
  const provider = PROVIDER_ALIASES[rawProvider] || rawProvider;
  const spec = PROVIDERS[provider];
  const model = id.slice(slash + 1).trim();
  if (!spec || !model) return null;
  return { provider, model, chatUrl: spec.chatUrl, keyEnv: spec.keyEnv };
}

// Resolve the API key for a model's provider. An explicit overrideKey wins (tests
// or callers that hold a key directly); otherwise the provider's env var is used.
export function providerKey(modelId = "", overrideKey = "") {
  if (overrideKey) return String(overrideKey);
  const resolved = resolveModel(modelId);
  if (!resolved) return "";
  for (const env of resolved.keyEnv) {
    if (process.env[env]) return String(process.env[env]);
  }
  return "";
}

// A model is callable only when its provider is known AND that provider has a key.
export function providerConfigured(modelId = "", overrideKey = "") {
  return Boolean(resolveModel(modelId)) && Boolean(providerKey(modelId, overrideKey));
}

export async function callProvider({ model, messages, temperature = 0.1, authToken = "" }) {
  const resolved = resolveModel(model);
  if (!resolved) throw new Error(`Unknown provider for model id: ${model}`);
  const key = providerKey(model, authToken);
  if (!key) throw new Error(`No API key configured for provider: ${resolved.provider}`);
  const response = await fetch(resolved.chatUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ model: resolved.model, temperature, messages })
  });
  if (!response.ok) throw new Error(`${resolved.provider} request failed: ${response.status}`);
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
