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

Salience / media layer variables:

- `AI_GATEWAY_API_KEY` — Vercel AI Gateway token used by every salience-layer model
  call (`lib/aculeus-gateway.js`), the same seam as the Read engine. `VERCEL_AI_GATEWAY_API_KEY`
  or `VERCEL_OIDC_TOKEN` are accepted fallbacks.
- `ACULEUS_SALIENCE_MODEL_ID` — reasoning model for the salience map pass (e.g. a DeepSeek
  or Grok model id). Falls back to `ACULEUS_MODEL_ID`.
- `ACULEUS_RENDER_MODEL_ID` — generation model for the render pass (e.g. a Grok or OpenAI
  model id). Falls back to `ACULEUS_MODEL_ID`.
- `ACULEUS_VERIFY_MODEL_ID` — substance-lock verifier model; set this to a model **different
  from the renderer** so the gestalt check does not share the writer's blind spots. Falls
  back to `ACULEUS_MODEL_ID`.
- `ACULEUS_MEDIA_STORE_DIR` — local media-run store directory when `DATABASE_URL` is absent
  (defaults to `.local/media-runs`).

Salience layer behavior:

- With no `AI_GATEWAY_API_KEY`, the salience map, render, and substance-lock passes use
  deterministic fallbacks; because the LLM gestalt check cannot run, every render routes to
  human review and nothing auto-publishes.
- Apply the salience schema with `npm run migrate:salience-schema` (applies the product
  schema first, then the salience layer; no-ops without `DATABASE_URL`).

Local preview behavior:

- If Clerk keys are absent, `/api/session` returns a local approved operator so the product shell can be developed.
- If `ACULEUS_AUTH_MODE=production`, unauthenticated session requests are blocked unless approved role claims are present.
- Supported approved roles are `admin`, `operator`, `reviewer`, and `viewer`; only `admin` and `operator` can create cases.
- If `DATABASE_URL` is absent, access requests and runs use `.local/product-store/local-store.json`.
- If Blob credentials are absent, upload endpoint returns extraction metadata without persisting to Blob.
