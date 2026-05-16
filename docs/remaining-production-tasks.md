# Aculeus Remaining Production Tasks

Status: canonical open-task inventory for moving from controlled internal rehearsal to known-customer invite readiness and then production invite readiness.

Last updated: 2026-05-16.

## Readiness Definitions

- Internal rehearsal ready: approved internal operators can run source-fed cases, fetch receipts, review traces, export approved training data, and recover from failures without changing code.
- Known-customer pilot ready: named paid customer users can sign in through real Clerk accounts, use only their permitted role capabilities, and run supervised cases with capped spend and auditable evidence gates.
- Production invite ready: the system can invite additional known users without engineering babysitting; platform checks, identity, observability, data retention, rollback, and incident workflows are operational.

## Current Verified Baseline

- `npm run verify` passed after Browserbase, disclaimer, admin, and trace-review hardening.
- `npm run e2e:local` passed after adding admin portal and run-action browser checks.
- `npm run e2e:production -- https://aculeus-slm-frontend.vercel.app` passed with signed smoke headers.
- `npm run smoke:postdeploy:admin -- https://aculeus-slm-frontend.vercel.app` passed with capped live provider spend.
- `/api/browser-capture` passed deployed smoke through the hosted Browserbase Fetch path with no evidence auto-promotion and no secret leakage.
- Production alias points to `https://aculeus-slm-frontend.vercel.app`.

## Remaining Work By Gate

### Gate 1: Identity And Account Control

| ID | Status | Task | Acceptance Gate |
| --- | --- | --- | --- |
| ID-01 | Open | Provide real pilot emails through `ACULEUS_CLERK_ROLE_EMAILS`. | JSON contains `admin`, `operator`, `reviewer`, `viewer`, and `pending` entries. |
| ID-02 | Open | Run `npm run clerk:role-accounts` against the real Clerk application. | Script returns five created or updated users with public metadata written. |
| ID-03 | Open | Confirm Clerk JWT/session claims include `aculeus_role` and `aculeus_approval_status`. | Server-side `/api/session` returns approved role for real users and denies pending. |
| ID-04 | Open | Build real deployed Clerk role-token E2E for admin. | Real admin can open `/admin`, download training export, and inspect provider budgets. |
| ID-05 | Open | Build real deployed Clerk role-token E2E for operator. | Real operator can start a run and run official/provider retrieval, but cannot access admin exports if policy remains non-admin. |
| ID-06 | Open | Build real deployed Clerk role-token E2E for reviewer. | Real reviewer can fetch receipts and review/promote sources, but cannot create runs unless explicitly promoted. |
| ID-07 | Open | Build real deployed Clerk role-token E2E for viewer. | Real viewer can read permitted case boards and cannot create, retrieve, review, or export. |
| ID-08 | Open | Build real deployed Clerk role-token E2E for pending denial. | Pending account is denied workspace and API capabilities with explicit reason. |
| ID-09 | Open | Decide whether `/admin` remains reviewer/operator accessible or becomes strict admin-only. | Access policy is documented and verified by route/browser E2E. |
| ID-10 | Open | Add account disablement/removal drill. | Admin can remove or block a pilot account and the next request is denied. |

### Gate 2: Platform And Deployment

| ID | Status | Task | Acceptance Gate |
| --- | --- | --- | --- |
| PL-01 | Open | Clear Vercel `Clerk DNS Configuration` failed check. | Latest production deployment has zero failed Vercel checks. |
| PL-02 | Open | Attach Vercel GitHub integration for `Jeremyjones23/aculeus-slm-frontend`. | Commits to `main` trigger Vercel deployment without manual source deploy. |
| PL-03 | Open | Create a formal pilot waiver if GitHub integration remains blocked. | Pilot packet records waiver owner, reason, expiry, and manual deploy procedure. |
| PL-04 | Open | Add release manifest with commit SHA, deployment URL, alias target, checks, and smoke artifact paths. | Manifest is generated after every production deploy. |
| PL-05 | Open | Add rollback drill using Vercel alias reassignment to previous verified deployment. | Drill records previous deployment and smoke result after rollback. |
| PL-06 | Open | Add production health endpoint or admin panel row for deployment ID and source SHA. | `/admin` exposes current deployment metadata without secrets. |
| PL-07 | Open | Move manual deployment steps into a single reproducible command sequence. | Runbook can deploy, alias, smoke, and packetize from one documented sequence. |
| PL-08 | Open | Add Vercel environment parity check for Production and Preview. | Required env names are present in both environments or waived. |
| PL-09 | Open | Resolve Vercel CLI `--force` output collision with workflow-generated functions. | Force deploy either works or runbook records safe non-force alternative. |

### Gate 3: Browserbase And Crawler Execution

| ID | Status | Task | Acceptance Gate |
| --- | --- | --- | --- |
| BR-01 | Done | Add `/api/browser-capture` around hosted Browserbase capture. | Route exists and requires reviewer-capable auth. |
| BR-02 | Done | Add deployed Browserbase Fetch smoke. | Hosted Fetch returns receipt hash, remains candidate-only, and leaks no secrets. |
| BR-03 | Open | Restore screenshot-capable Browserbase CDP capture on Vercel or move screenshot capture to a worker environment. | Smoke confirms screenshot hash on deployed capture path. |
| BR-04 | Open | Add browser capture artifact persistence for screenshots or fetch receipts. | Capture artifacts store hash, size, source URL, and retention metadata. |
| BR-05 | Open | Add Browserbase cost/usage ledger rows to admin provider budget totals. | Admin shows Browserbase captures by day, workspace, case, and provider. |
| BR-06 | Open | Add custom crawler worker queue for pages needing crawl retries or structured extraction. | Crawler queue rows show status, reason, receipt requirement, and retry count. |
| BR-07 | Open | Add dynamic-page capture decisions to reviewer queue. | Reviewer sees why a source needed Browserbase instead of normal receipt fetch. |
| BR-08 | Open | Add public-records-request fallback when Browserbase cannot access a public record. | Ledger marks `needs_public_records_request` with a draft request. |

### Gate 4: Retrieval And Evidence Quality

| ID | Status | Task | Acceptance Gate |
| --- | --- | --- | --- |
| EV-01 | Open | Add source-quality explanation strings, not just scores. | Reviewer queue explains authority, directness, freshness, and receipt status. |
| EV-02 | Open | Add dedupe audit detail per merged source. | Ledger records canonical URL, duplicate URLs, match reason, and kept/discarded fields. |
| EV-03 | Open | Add official API coverage dashboard by source family. | Admin or case board shows official APIs attempted, succeeded, failed, and skipped. |
| EV-04 | Open | Add stale-content and recrawl controls. | Operator can mark source stale and enqueue refreshed receipt/capture. |
| EV-05 | Open | Add stronger PDF/table extraction receipts. | PDF/table rows include page, table, field, hash, and quoted support. |
| EV-06 | Open | Add Qdrant remote mutation boundary test. | Any remote Qdrant write path is blocked unless explicitly enabled. |
| EV-07 | Open | Add failed-fetch reason taxonomy. | Failures are grouped as blocked, dynamic, missing, private, rate-limited, malformed, or needs request. |
| EV-08 | Open | Add case coverage metrics. | Each case board reports official records found, candidates, receipts, promoted sources, and gaps. |

### Gate 5: Reviewer Workflow And Admin UX

| ID | Status | Task | Acceptance Gate |
| --- | --- | --- | --- |
| RV-01 | Done | Require reviewer notes for training trace decisions. | Server rejects review without a note and UI disables decision buttons. |
| RV-02 | Done | Add training trace status filters. | Reviewer can filter pending, approved, rejected, and needs-changes traces. |
| RV-03 | Open | Update trace queue state in-place after review. | Counts and row state update without a manual refresh. |
| RV-04 | Open | Add reviewer filters for official, provider, crawler, PDF, Qdrant, failed fetch, and request-needed rows. | Reviewer queue supports source-family filtering. |
| RV-05 | Open | Add required reviewer notes for source promotion, rejection, defer, annotation, and missing-record request. | API rejects actions missing decision notes where required. |
| RV-06 | Open | Add quote-selection enforcement in UI. | UI prevents promotion if selected quote is absent from stored receipt text/hash proof. |
| RV-07 | Open | Add source-promotion versus finding-promotion split in UI. | Reviewer sees separate gates and cannot confuse source eligibility with allegation support. |
| RV-08 | Open | Add reviewer action history drawer. | Case board shows reviewer, timestamp, action, note, and verifier result. |
| RV-09 | Open | Add admin health panel. | Admin sees auth mode, DB, Blob, provider env, Browserbase, latest smoke, and deployment ID. |
| RV-10 | Open | Add shadow-eval download smoke with real reviewed traces. | Deployed admin can download nonempty shadow/eval artifact or explicit blocked reason. |

### Gate 6: Data, Persistence, And Tenancy

| ID | Status | Task | Acceptance Gate |
| --- | --- | --- | --- |
| DP-01 | Open | Verify Neon migration from an empty database. | Migration creates all required tables and `npm run verify` passes against Neon. |
| DP-02 | Open | Add schema migration status to admin health. | Admin shows current schema version and latest migration time. |
| DP-03 | Open | Add daily backup packet automation. | Backup packet is generated and restorable on schedule or documented manual run. |
| DP-04 | Open | Add restore smoke against disposable DB or isolated fixture after schema changes. | Restore smoke passes and records artifact path. |
| DP-05 | Open | Define retention periods for runs, traces, receipts, exports, and access requests. | Retention policy is documented and enforced by dry-run only until approved. |
| DP-06 | Open | Add retention dry-run and deletion audit logs. | Deletion candidates can be listed without destructive change. |
| DP-07 | Open | Add deployed cross-tenant denial E2E. | User from workspace A cannot read workspace B run, ledger, export, or admin rows. |
| DP-08 | Open | Add leak scan for production packets and exports. | Exported JSON/HTML/PDF/traces contain no raw receipt text, keys, or auth headers. |

### Gate 7: Training And Model Path

| ID | Status | Task | Acceptance Gate |
| --- | --- | --- | --- |
| TR-01 | Done | Export approved SFT and preference rows from reviewed traces. | Deployed training-export smoke passes. |
| TR-02 | Open | Add training dataset manifest. | Manifest lists trace IDs, reviewer decisions, source counts, verifier pass rates, leakage scan, and row count. |
| TR-03 | Open | Add model identity panel. | Admin shows current `ACULEUS_MODEL_ID`, adapter version, eval status, and promotion status. |
| TR-04 | Open | Add shadow deployment comparison against live route. | Candidate model must beat baseline without source, legal, or hallucination regressions. |
| TR-05 | Open | Add planner/scout/analyst/formatter held-out eval gates. | Eval report separates each trained behavior and promotion thresholds. |
| TR-06 | Open | Add model rollback runbook. | Rollback changes model route only and never mutates evidence records. |
| TR-07 | Open | Add production trace sampling controls. | Trace capture can be limited by workspace, case, and role while preserving audits. |
| TR-08 | Open | Add explicit hosted-training launch gate. | No training job starts without a final promotion packet and spend cap. |

### Gate 8: Spend And Provider Operations

| ID | Status | Task | Acceptance Gate |
| --- | --- | --- | --- |
| SP-01 | Done | Add provider spend/cap/call counts to admin. | Admin smoke confirms spend row and near-cap alert. |
| SP-02 | Done | Add budget totals by day, workspace, and provider. | Admin console verifier passes budget totals. |
| SP-03 | Open | Add provider spend by case. | Admin shows case-level spend and candidate yield. |
| SP-04 | Open | Add hard stop for over-cap live provider calls. | Provider route refuses calls above cap and emits reason code. |
| SP-05 | Open | Add live-provider disablement toggle. | Incident operator can disable live providers without code deploy. |
| SP-06 | Open | Add per-provider latency and failure-rate metrics. | Admin shows latency, errors, and useful-candidate rate per provider. |
| SP-07 | Open | Add zero-candidate paid-call audit rows. | Paid provider calls that return no candidates still produce ledger and admin cost rows. |
| SP-08 | Open | Add spend review to pilot packet. | Pilot packet includes total spend, cap, alerts, and waived alerts. |

### Gate 9: Product Surface And Customer Experience

| ID | Status | Task | Acceptance Gate |
| --- | --- | --- | --- |
| UX-01 | Open | Tie request-access flow to real Clerk account creation or admin review queue. | Access request can become Clerk account with correct role metadata. |
| UX-02 | Open | Add visible pilot mode status. | Operators can tell pilot/internal/rehearsal mode from the UI. |
| UX-03 | Open | Add richer empty/error states for official API, provider, receipt, Browserbase, and verifier failures. | UI shows next action and failure reason for each failure family. |
| UX-04 | Open | Run mobile QA for case board, reviewer queue, receipt flow, admin download path, and disclaimer. | Playwright mobile screenshots pass layout checks. |
| UX-05 | Open | Add accessibility checks. | Keyboard focus, labels, contrast, dialogs, and reduced-motion checks pass. |
| UX-06 | Open | Add customer-facing onboarding route or packet. | Pilot users know what the system can and cannot prove before running cases. |
| UX-07 | Open | Keep legacy static demo clearly separated. | Static demo routes cannot be mistaken for production QA or current product lane. |

### Gate 10: Observability, Incident Response, And Operations

| ID | Status | Task | Acceptance Gate |
| --- | --- | --- | --- |
| OP-01 | Open | Add incident packet export. | Packet includes run ID, case ID, workspace, role, provider mode, source ledger, verifier issues, telemetry, and backup reference. |
| OP-02 | Open | Add alert thresholds. | Auth failures, spend, provider failures, receipt failures, export leakage, backup failure, and verifier failure trigger visible status. |
| OP-03 | Open | Add one-click or one-command provider disablement instructions. | Runbook and smoke verify disabled state. |
| OP-04 | Open | Add deployed admin health smoke. | Smoke confirms health panel values and no secret exposure. |
| OP-05 | Open | Add audit log export. | Admin can export immutable run and reviewer action history for a customer case. |
| OP-06 | Open | Add support triage categories. | Support can classify issue as auth, platform, spend, source, verifier, export, training, or data retention. |

### Gate 11: External Terms, Privacy, And Claim Posture

| ID | Status | Task | Acceptance Gate |
| --- | --- | --- | --- |
| LC-01 | Done | Add user-facing disclaimer page. | `/disclaimer` exists and verification passes. |
| LC-02 | Open | Add terms for known paid customer pilot use. | Terms cover permitted use, customer responsibility, public-record boundaries, and account control. |
| LC-03 | Open | Add privacy/data-handling statement. | Statement covers uploaded sources, receipts, traces, exports, retention, and deletion requests. |
| LC-04 | Open | Add acceptable-use boundaries. | Product disallows harassment, doxxing, private-data fishing, unsupported allegations, and unlawful use. |
| LC-05 | Open | Add pre-publication review queue for sensitive exported findings. | Sensitive exported findings require reviewer and customer approval. |
| LC-06 | Open | Add public-records-request wording that avoids legal advice. | Templates are operational, not legal advice. |

## Pilot-Ready Minimum Remaining Set

The smallest credible known-customer pilot gate is:

1. ID-01 through ID-08 complete.
2. PL-01 cleared or formally waived by owner.
3. PL-02 cleared or PL-03 formally waived by owner.
4. BR-02 remains passing on deployed production.
5. RV-05 and RV-07 complete.
6. DP-03 and DP-04 complete for backup/restore confidence.
7. OP-01 complete for incident capture.
8. LC-02 through LC-04 complete for known-customer use.
9. `npm run verify`, `npm run e2e:local`, `npm run e2e:production`, `npm run smoke:postdeploy:admin`, and `npm run smoke:postdeploy:four-dossier` all pass against the aliased production deployment.

## Production Invite Minimum Remaining Set

Production invite readiness additionally requires every open task in this file to be completed, explicitly waived with an owner and expiry, or narrowed into a separate post-launch hardening ticket that cannot affect identity, evidence integrity, spending, data retention, legal posture, or customer trust.
