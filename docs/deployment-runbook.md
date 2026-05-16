# Aculeus Deployment Runbook

Status: prelegal pilot spine, deployment-ready checks only.

## Health Checks

Run locally before any preview or production promotion:

```powershell
npm run verify
npm run build
npm run test:next-operator
npm run test:auth-boundary
npm run test:telemetry
npm run test:backup-restore
```

## Required Environment

- `ACULEUS_AUTH_MODE=production`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `ACULEUS_MODEL_ID`

## Smoke Sequence

1. Confirm `/api/session` blocks unauthenticated production-mode requests.
2. Confirm approved `admin`, `operator`, or `reviewer` role claims can access reviewer/admin APIs.
3. Run one dry provider search with cap visible and live provider disabled.
4. Run one official API search and confirm candidates are not evidence.
5. Fetch a receipt and confirm verifier gate controls promotion.
6. Open `/admin` and confirm run audit counts are visible.
7. Export JSON, HTML, and PDF packets and run public/private scan.
8. Build telemetry snapshot and verify synthetic alerts trigger.
9. Create backup packet and run restore smoke.

## Promotion Packet

Before a preview deploy, generate the ten-task promotion packet:

```powershell
npm run smoke:deployment-promotion
```

The packet is written to `qa-artifacts/aculeus-deployment-promotion-packet.json`.
It records the deployment target, safe environment presence checks, auth/Neon/Blob/provider/official-API smoke status, preview readiness, and blocked gates without storing secret values.

## Public/Private Leakage Scan

Required before preview promotion:

```powershell
npm run verify
npm run test:export-packets
npm run test:trace-scoring
npm run test:preference-pairs
```

No output may include raw receipt text, provider auth headers, API keys, direct model answer UI, or candidate snippets treated as evidence.

## Rollback

1. Disable live provider mode.
2. Set `ACULEUS_AUTH_MODE=production` and deny unapproved sessions.
3. Revert traffic to the previous verified build.
4. Preserve `.local/product-store` or DB backup packet for incident review.
5. Run `npm run verify` after rollback.

## Incident Steps

1. Capture run ID, case ID, workspace ID, user role, provider mode, and export ID.
2. Pull source ledger, verifier issues, telemetry snapshot, and backup packet.
3. Classify incident as auth, spend, source leakage, verifier failure, crawler failure, export leakage, or data retention.
4. Do not alter evidence records destructively; use retention dry-run first.
5. Add a regression case before reopening live mode.

## Approval Boundaries

Production deployment, customer launch, hosted training/fine-tuning, remote Qdrant mutation, legal claim-posture changes, and external retention-policy changes require an explicit final gate.
