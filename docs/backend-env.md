# Aculeus Backend Environment

Required production variables:

- `ACULEUS_AUTH_MODE=production`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `ACULEUS_MODEL_ID`

Optional run engine variables:

- Vercel Workflow OIDC variables from `vercel link` and `vercel env pull`

Provider API keys (direct — no gateway):

Every model call goes straight to the provider's own OpenAI-compatible
`/chat/completions` endpoint, routed by the provider prefix on the model id
(`lib/aculeus-providers.js`). Set the key only for the providers you use:

- `DEEPSEEK_API_KEY` — `deepseek/*` model ids → `api.deepseek.com`.
- `XAI_API_KEY` — `xai/*` (alias `grok/*`) model ids → `api.x.ai`. `GROK_API_KEY` is accepted as a fallback.
- `OPENAI_API_KEY` — `openai/*` model ids → `api.openai.com`.

Model selection per salience step (each falls back to `ACULEUS_MODEL_ID`):

- `ACULEUS_SALIENCE_MODEL_ID` — reasoning model for the salience map pass (e.g. `deepseek/deepseek-reasoner`).
- `ACULEUS_RENDER_MODEL_ID` — generation model for the render pass (e.g. `xai/grok-2` or `openai/gpt-4o-mini`).
- `ACULEUS_VERIFY_MODEL_ID` — substance-lock verifier model; set this to a model **different
  from the renderer** so the gestalt check does not share the writer's blind spots
  (e.g. `deepseek/deepseek-chat`).
- `ACULEUS_MODEL_ID` — default model for the Read/case-QA engine and the fallback for the
  three salience model ids above. Use a prefixed direct model id (e.g. `deepseek/deepseek-chat`).
- `ACULEUS_MEDIA_STORE_DIR` — local media-run store directory when `DATABASE_URL` is absent
  (defaults to `.local/media-runs`).

Salience layer behavior:

- Each pass independently checks whether the provider for its chosen model id has a key.
  When that provider key is absent, the salience map, render, and substance-lock passes fall
  back to deterministic shells; because the LLM gestalt check cannot run, every render routes
  to human review and nothing auto-publishes.
- Apply the salience schema with `npm run migrate:salience-schema` (applies the product
  schema first, then the salience layer; no-ops without `DATABASE_URL`).

Local preview behavior:

- If Clerk keys are absent, `/api/session` returns a local approved operator so the product shell can be developed.
- If `ACULEUS_AUTH_MODE=production`, unauthenticated session requests are blocked unless approved role claims are present.
- Supported approved roles are `admin`, `operator`, `reviewer`, and `viewer`; only `admin` and `operator` can create cases.
- If `DATABASE_URL` is absent, access requests and runs use `.local/product-store/local-store.json`.
- If Blob credentials are absent, upload endpoint returns extraction metadata without persisting to Blob.
