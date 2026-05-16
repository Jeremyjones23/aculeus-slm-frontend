# Aculeus Platform Blockers

Status: live blocker ledger for production invite readiness.

Last verified: 2026-05-16.

## Current Production Deployment

- Canonical URL: `https://aculeus-slm-frontend.vercel.app`
- Latest verified source SHA: `5576246e204b6255593cf974ed987700c27ece4f`
- Latest inspected deployment: `dpl_Ek7GyCrRV9sU5hs1r88ePAbDRxtR`
- Latest inspected deployment URL: `https://aculeus-slm-frontend-66wagtzrb-jeremyjones23s-projects.vercel.app`
- Latest deployed status: Ready
- Current deployment mode: GitHub-triggered Vercel production deploy; manual source deploy remains fallback-only.

## Blocker 1: Vercel Clerk DNS Configuration

### Symptom

Vercel deploys build successfully and reach Ready, but the Vercel integration check still reports:

```text
Clerk DNS Configuration
conclusion: failed
url: sso:/domains
```

### Why It Blocks Production Invite Readiness

Aculeus can pass signed internal smoke tests, but known-customer pilot accounts need real Clerk session/JWT behavior with clean platform configuration. A persistent failed Clerk DNS check means the identity provider/domain configuration is not clean enough for unsupervised customer invites.

### Narrow Resolution Path

1. Open the Clerk application connected to Vercel integration resource `app_3Dop5l5cIPMYksrhez2HIBbuKCT`.
2. Open the domains/SSO configuration referenced by the failed Vercel check.
3. Remove stale or incorrect domain records, or complete the required DNS records.
4. Redeploy Production.
5. Confirm Vercel Production has zero failed checks.
6. Run `npm run e2e:production -- https://aculeus-slm-frontend.vercel.app`.
7. Run the real Clerk role-token E2E for admin, operator, reviewer, viewer, and pending.

### Waiver Standard

A controlled paid-customer pilot can waive this only if:

- the pilot uses verified Clerk-hosted sign-in that works for every named account,
- the failed Vercel check is documented with owner and expiry,
- no custom customer domain depends on the failing DNS configuration,
- real role-token E2E passes despite the failed Vercel check.

## Blocker 2: Vercel GitHub Integration Attached, Awaiting Commit-Triggered Deployment Verification

### Symptom

The repository now connects to the Vercel project. The CLI verification command returns a nonzero process exit, but the body confirms:

```text
Jeremyjones23/aculeus-slm-frontend is already connected to your project.
```

### Remaining Verification

GitHub integration is no longer treated as unattached. The remaining proof is a fresh commit from `main` creating a Vercel deployment that records GitHub as the source. Until that happens, manual source deploy remains the fallback release path.

### Narrow Resolution Path

1. Push the next verified commit to `main`.
2. Confirm Vercel creates a deployment from GitHub without `vercel deploy`.
3. Confirm the Vercel deployment page records repository `Jeremyjones23/aculeus-slm-frontend` and the pushed commit SHA.
4. Run production smokes against the Git-triggered deployment or its promoted production alias.
5. Update this ledger with the deployment ID and smoke artifact paths.

### Waiver Standard

If the next push does not trigger deployment despite the project being connected:

- manual deploy and alias commands are followed exactly from the runbook,
- the release manifest records source SHA, deployment ID, alias target, and smoke artifact paths,
- rollback target is known before the pilot window starts,
- the waiver has owner and expiry.

## Blocker 3: Real Clerk Role-Token E2E

### Symptom

The app has Clerk-aware server-side auth and signed internal smoke coverage, but real role accounts have not been created and exercised through deployed Clerk sessions.

### Narrow Resolution Path

1. Set `ACULEUS_CLERK_ROLE_EMAILS` with real pilot account emails.
2. Run `npm run clerk:role-accounts`.
3. Sign in as admin, operator, reviewer, viewer, and pending users.
4. Run role-token E2E for the deployed production URL.
5. Record account IDs, role metadata, session result, route access result, and denied capabilities.

### Waiver Standard

This blocker should not be waived for any known-customer pilot. Smoke headers prove internal route boundaries; they do not prove customer login behavior.

## Blocker 4: Screenshot-Capable Hosted Browser Capture

### Symptom

Deployed Browserbase smoke passes through Browserbase Fetch with receipt hash and candidate-only ledger rows. Browserbase CDP/Playwright screenshot capture still fails in Vercel serverless packaging, so deployed capture currently has no screenshot hash.

Local Browserbase CDP capture with the saved Browserbase key succeeds and produces both `receipt_hash` and `screenshot_sha256`. The active narrowing is Vercel runtime compatibility, not Browserbase account configuration.

### Narrow Resolution Path

1. Keep `/api/browser-capture` pinned to the Node.js runtime with a 60 second maximum duration.
2. Load `playwright-core` directly for remote CDP instead of importing the full Playwright package.
3. Keep Browserbase Fetch as fallback for text/HTML receipt capture.
4. Run `npm run smoke:browserbase:cdp -- https://example.com` locally to prove real screenshot hashing.
5. Run `ACULEUS_REQUIRE_BROWSERBASE_SCREENSHOT=1 npm run smoke:postdeploy:browserbase -- https://aculeus-slm-frontend.vercel.app` after the next Vercel deployment to prove the deployed screenshot path.
6. Persist screenshot artifact metadata without exposing raw private content.

### Waiver Standard

A controlled paid-customer pilot can waive screenshot capture if Browserbase Fetch, regular receipt fetch, and reviewer gates are sufficient for the pilot use case and every dynamic page without a screenshot is marked candidate-only.
