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

## Controlled Pilot Checklist

Complete this checklist before any controlled pilot is opened to an external reviewer, even if the deployment is only a Vercel Preview.

- Identity gate: `ACULEUS_AUTH_MODE=production` is present in Preview and Production, unauthenticated users cannot access operator/reviewer/admin APIs, and only approved `admin`, `operator`, or `reviewer` claims can run retrieval or promotion actions.
- Environment gate: Preview and Production have durable `EXA_API_KEY`, `PARALLEL_API_KEY`, `DATA_GOV_API_KEY`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, and `ACULEUS_MODEL_ID` configured without secret values appearing in logs, exports, traces, or promotion packets.
- Provider cap gate: every live provider run declares `provider_cap_usd`, the admin console shows provider spend/cap/call counts, and any `provider_spend_near_cap` or `provider_spend_over_cap` alert is resolved or explicitly waived in the pilot packet.
- Public API gate: official API runs remain no-spend public-record candidate retrievals; official API, provider, crawler, PDF, and Qdrant rows remain candidate leads until receipt-backed reviewer promotion.
- Receipt gate: at least one deployed `npm run smoke:postdeploy:receipt -- <preview-url>` pass confirms receipt fetch, content hash, quote hash, source-level promotion, and high-risk finding blockage.
- Four-dossier regression gate: the LA homelessness, CA school board spending, San Francisco drug rehabilitation, and Xavier Becerra/CHIRLA scenarios each produce a case board with source-ledger candidates and zero auto-promoted findings.
- Training trace gate: planner, retrieval, reviewer, feedback, score payload, cost/latency, and final-outcome fields persist to durable training traces with `training_conversion_allowed=false` until review.
- Export gate: JSON, HTML, and PDF exports pass the public/private leakage scan and state that candidates are not evidence.
- Backup/restore gate: backup packet creation and restore smoke pass before pilot launch.
- Rollback owner: one named operator owns rollback, live-provider disablement, and incident packet capture for the pilot window.

## Production Promotion Gate

Production promotion is allowed only after the controlled pilot checklist is complete, the latest Preview passes:

```powershell
npm run verify
npm run build
npm run smoke:postdeploy -- <preview-url>
npm run smoke:postdeploy:receipt -- <preview-url>
```

Then generate and retain the promotion packet:

```powershell
npm run smoke:deployment-promotion
```

Do not promote if any verifier, receipt smoke, provider cap alert, auth boundary, training-trace persistence check, source-ledger gate, or export leakage check is failing.

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
