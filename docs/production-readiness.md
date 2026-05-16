# Aculeus Production Readiness

Status: not external-invite ready. Internal operator rehearsal is acceptable with controlled accounts, no legal publication posture, live-provider caps, and the current source-fed guardrails.

This file is the operating checklist for moving Aculeus from a working MVP into a product that can safely invite real users. It separates three gates:

1. Internal rehearsal ready: the team can run cases and review traces.
2. Controlled pilot ready: selected outside reviewers can access the system under supervision.
3. Production invite ready: invited users can use the system without engineering babysitting.

## North-Star Invariants

- Aculeus is a source-fed public-records investigation system.
- Candidate snippets, provider results, Qdrant matches, official API rows, and crawler finds are leads until receipt-backed reviewer promotion.
- The UI must show a case board, evidence rail, source ledger, missing records, rejected or weak claims, and audit trail.
- No direct model-answer UI can bypass retrieval, evidence gates, or citation verification.
- Production traces can become training data only after review; production use must not update a model directly.
- Every dollar amount, name, date, allegation, receipt quote, and source title must be cited or downgraded.
- Live provider calls must have caps, spend accounting, and operator-visible alerts.
- External launch waits for real identity, real roles, platform checks, backup/restore, incident handling, and legal posture review.

## Current State

### Working

- Next.js operator app is deployed at `https://aculeus-slm-frontend.vercel.app`.
- Source-fed run APIs exist for case start, official APIs, providers, receipt fetch, reviewer actions, ledger, export, retry, cancel, feedback, admin runs, shadow eval, and trace review.
- Four regression dossiers run through official API plus provider candidate retrieval with zero auto-promoted evidence.
- Receipt fetch creates content hashes and quote hashes, and high-risk finding promotion remains blocked.
- Admin API exposes run audit rows, provider spend/cap/call counts, and near-cap alerts.
- Admin UI now exposes a reviewer trace workbench with trace queue, safety gates, review decisions, and reviewed SFT/preference JSONL export links.
- Training traces persist for retrieval, reviewer, feedback, and shadow-eval flows.
- Reviewed traces can be exported through `/api/admin/training-export`, and the export remains offline-only with no production update or hosted-training trigger.
- Blocked crawler and receipt fetches now produce Browserbase/manual public-capture fallback ledger entries instead of being hidden or promoted.
- Hosted Browserbase execution is deployed through `/api/browser-capture`; the Vercel production runtime currently verifies the Browserbase Fetch path with receipt hashes, candidate-only ledger rows, and no secret leakage. Local Browserbase CDP capture with the saved key produces screenshot hashes.
- Controlled pilot packet export exists as JSON and HTML.
- Nightly Production smoke automation exists for auth, receipt, Browserbase capture, provider dry-run, source-ledger, and training-export gates.
- A complete remaining-task inventory is maintained in `docs/remaining-production-tasks.md`.

### Blocking External Invites

- Real Clerk session verification is wired app-side through Clerk middleware, `auth()`, `currentUser()`, role metadata, and approval claims, but real Clerk pilot accounts and deployed JWT/custom-claim E2E are still pending.
- Signed smoke headers remain available for internal postdeploy smokes through `ACULEUS_SMOKE_SECRET`; unsigned trusted headers are local/test-only.
- Vercel still reports `Clerk DNS Configuration` as a failed platform check.
- Vercel GitHub integration is attached according to the CLI confirmation, but the next pushed commit still must prove Git-triggered deployment.
- Real Clerk pilot accounts have not been created and tested with real JWT/custom-claim behavior.
- Screenshot-capable Browserbase CDP capture works locally with `playwright-core`; the next deployment must prove the Vercel Node.js runtime path can return `screenshot_sha256`.
- Known-customer disclaimer, terms, privacy/data-handling, acceptable-use, and security/incident pages exist at `/disclaimer`, `/terms`, `/privacy`, `/acceptable-use`, and `/security`.

## Production-Readiness Task List

### Identity And Access

- Keep verified Clerk server-side session reads as the primary production auth path.
- Map Clerk user metadata or organization roles to `admin`, `operator`, `reviewer`, and `viewer`.
- Require `approval_status=approved` from verified Clerk claims.
- Keep smoke-header fallback restricted to test mode, local preview, or a signed internal smoke secret.
- Create internal `admin`, `operator`, `reviewer`, `viewer`, and `pending` accounts.
- Add deployed E2E tests using real Clerk tokens or a Clerk test-session mechanism.
- Confirm viewer cannot create cases, run retrieval, fetch receipts, review evidence, or access admin exports.
- Confirm reviewer can review evidence and traces but cannot create cases or run retrieval unless explicitly promoted.
- Confirm operator can create cases and run retrieval but cannot perform account administration.
- Confirm admin can audit runs, download shadow eval, manage pilot state, and disable live provider mode.

### Platform And Deployment

- Confirm the attached Vercel GitHub integration creates deployments from pushed commits automatically.
- Clear the Vercel `Clerk DNS Configuration` check.
- Redeploy Production with zero failed Vercel checks.
- Preserve manual source deploy as an emergency fallback, but mark it as fallback-only.
- Add a production release checklist with commit SHA, deployment ID, smoke artifact IDs, and rollback target.
- Add a rollback drill that reassigns the canonical alias to the previous verified deployment.
- Add deployment failure triage for Vercel build, platform checks, Clerk checks, database, blob, and provider failures.

### Data And Persistence

- Verify Neon migrations from an empty database.
- Add schema migration status to admin health.
- Add backup packet creation to nightly smoke or a separate daily automation.
- Add restore smoke against a disposable database or local fixture after every schema-changing release.
- Define retention periods for runs, traces, receipts, exports, and access requests.
- Add retention dry-run and deletion audit logs before any destructive cleanup.
- Confirm no receipt raw text, API keys, auth headers, or private traces appear in exported packets.
- Add workspace/tenant scoping to every persisted query path and admin export.
- Add cross-tenant denial E2E tests against deployed APIs.

### Retrieval And Evidence

- Keep official APIs as no-spend public-record candidate retrieval.
- Keep Exa, Parallel, Browserbase, custom crawlers, PDF parsing, and Qdrant as candidate sources until receipt verification.
- Add per-provider quality scoring explanations in the reviewer queue.
- Add dedupe audit details showing why a source was merged or kept distinct.
- Keep Browserbase Fetch as the deployed fallback and prove screenshot-capable Browserbase CDP with `ACULEUS_REQUIRE_BROWSERBASE_SCREENSHOT=1` after the next deployment.
- Keep deployed Browserbase smoke coverage in the nightly smoke path before pilot invites.
- Add source-fetch status reasons for blocked, failed, needs browser, locator-only, and needs public-records-request cases.
- Add explicit stale-content handling and recrawl controls for records likely to change.
- Add source coverage metrics by case: official records found, providers used, candidate count, receipt count, promoted source count, missing-record count.

### Reviewer Workflow

- Maintain UI controls for training-trace review decisions and extend them with filters and reviewer note requirements.
- Add UI controls for shadow-eval report download from admin and case context.
- Add reviewer queue filters for official, provider, crawler, PDF, Qdrant, failed fetch, locator-only, and needs public-records request.
- Add reviewer note requirements for promotion, rejection, defer, and missing-record requests.
- Add receipt quote selection constraints so reviewer-selected text must be present in the fetched receipt.
- Add a visible distinction between source promotion and finding promotion.
- Add reviewer action history to the audit trail.
- Add source-level promotion test cases and blocked high-risk finding promotion test cases.

### Training And Model Path

- Export approved SFT rows only from reviewed traces through `/api/admin/training-export?format=sft`.
- Export preference rows only from reviewed traces through `/api/admin/training-export?format=preference`.
- Keep `training_conversion_allowed=false` until a reviewer explicitly approves the trace.
- Add a training-data packet manifest with trace IDs, review decisions, source counts, verifier pass rates, and leakage scan status.
- Add held-out eval promotion gates for planner, scout, analyst, and formatter behaviors.
- Add shadow-deployment comparison against the current live route before any model promotion.
- Add a model identity panel showing configured `ACULEUS_MODEL_ID`, adapter version, eval status, and promotion status without exposing secrets.
- Add model rollback instructions that do not alter source/evidence records.

### Spend And Provider Operations

- Add daily provider budget totals by provider, workspace, run, and case.
- Add spend over-cap hard stops with operator-visible reason codes.
- Add live-provider disablement toggle for incidents.
- Add per-provider latency, failure-rate, and useful-candidate metrics.
- Add audit rows for every paid provider call, even when zero candidates are returned.
- Add deployed live-provider smoke with a low cap, artifacted spend, and no auto-promotion.
- Add spend review to the controlled pilot packet.

### UI And Product Surface

- Make the Next operator app the canonical root experience.
- Preserve `/source-fed.html` only as a legacy source-fed demo route until its needed functionality is fully absorbed.
- Keep old static demo commands labeled as legacy so operators do not mistake them for Production QA.
- Add a clean invite/request-access flow tied to real Clerk account creation.
- Add a visible pilot mode status for internal operators.
- Add clear empty/error states for official API failures, provider failures, receipt failures, and verifier failures.
- Add mobile QA for the case board, reviewer queue, receipt flow, and admin download path.
- Add accessibility checks for keyboard focus, dialog close behavior, form labels, contrast, and reduced-motion safety.

### Observability And Incident Response

- Add admin health panel for auth mode, database, blob, provider mode, live-provider caps, latest smoke status, and deployment ID.
- Add incident packet export with run ID, case ID, workspace ID, user role, provider mode, source ledger, verifier issues, telemetry, and backup reference.
- Add failure taxonomy for auth, spend, source leakage, verifier failure, crawler failure, export leakage, data retention, and platform checks.
- Add alert thresholds for auth failures, provider spend, provider failures, receipt failures, export leakage, backup failures, and verifier failures.
- Add one-click live-provider disablement instructions and verify the disablement state in smoke tests.

### Legal And External Posture

- Define what users are allowed to claim from Aculeus output.
- Add product copy that avoids asserting fraud, intent, illegality, or wrongdoing without receipt-backed findings and review.
- Keep `/terms`, `/privacy`, `/acceptable-use`, and `/security` current with product behavior and pilot contracts.
- Add public-records-request workflow language that does not provide legal advice.
- Add a pre-publication review queue for any exported finding that could be reputationally sensitive.
- Add user-facing disclaimer that candidates are leads, not evidence, until promoted.

## Invite-Ready Gate

Aculeus is ready to invite people only when all of these are true:

- `npm run verify` passes.
- `npm run build` passes.
- `npm run e2e:local` passes.
- `npm run e2e:production` passes.
- `npm run smoke:postdeploy:admin -- https://aculeus-slm-frontend.vercel.app` passes.
- `npm run smoke:postdeploy:browserbase -- https://aculeus-slm-frontend.vercel.app` passes.
- `npm run smoke:postdeploy:live-provider -- https://aculeus-slm-frontend.vercel.app` passes under the approved cap.
- Four-dossier deployed regression passes with zero auto-promoted evidence.
- Real Clerk role-token E2E passes for admin, operator, reviewer, viewer, and pending users.
- Vercel Production has zero failed checks.
- Vercel GitHub integration has produced at least one commit-triggered deployment or is formally waived for the pilot.
- Latest pilot packet is generated, reviewed, and free of secret/raw-text leakage.
- Backup/restore smoke passes.
- Incident owner and rollback target are documented.
- Legal/public claim posture is approved.

## Noise-Pruning Decisions

- Canonical product path: Next app under `app/`, `components/`, `lib/`, and `scripts/verify-*`.
- Preserved legacy route: `source-fed.html`, `source-fed.js`, and `source-fed.css` remain available for the source-fed demo contract.
- Legacy static demo lane: `index.html`, root static assets, `model-adapter.js`, `script.js`, `styles.css`, `scripts/serve.mjs`, `scripts/qa-browser.mjs`, and `scripts/verify-legacy-static-demo.mjs` are no longer the production readiness path.
- Ignored generated artifacts under `qa-artifacts/` are evidence for the latest run only; stale local screenshots/logs can be pruned after the latest smoke artifacts and pilot packet are preserved.
