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

Local preview behavior:

- If Clerk keys are absent, `/api/session` returns a local approved operator so the product shell can be developed.
- If `ACULEUS_AUTH_MODE=production`, unauthenticated session requests are blocked unless approved role claims are present.
- Supported approved roles are `admin`, `operator`, `reviewer`, and `viewer`; only `admin` and `operator` can create cases.
- If `DATABASE_URL` is absent, access requests and runs use `.local/product-store/local-store.json`.
- If Blob credentials are absent, upload endpoint returns extraction metadata without persisting to Blob.
