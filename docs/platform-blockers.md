# Aculeus Platform Blockers

Status: live blocker ledger for production invite readiness.

Last verified: 2026-05-16.

## Current Production Deployment

- Canonical URL: `https://aculeus-slm-frontend.vercel.app`
- Latest verified source SHA: `782419f1971c929ecfdf9ba55b0a9c4f36b8f5dc`
- Latest inspected deployment: `dpl_3VtrC2emBWCUyeAtdPnX8bgoDXaJ`
- Latest inspected deployment URL: `https://aculeus-slm-frontend-koxhzitb8-jeremyjones23s-projects.vercel.app`
- Latest deployed status: Ready
- Current deployment mode: explicit Vercel source deploy from the local Git tree

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

## Blocker 2: Vercel GitHub Integration Not Attached

### Symptom

The repository exists, `main` is pushed, and GitHub reports `Jeremyjones23` has `admin` permission on `Jeremyjones23/aculeus-slm-frontend`, but Vercel CLI still returns:

```text
Failed to connect Jeremyjones23/aculeus-slm-frontend to project. Make sure there aren't any typos and that you have access to the repository if it's private.
```

### Why It Blocks Production Invite Readiness

Manual source deploys work, but production invite readiness should not depend on an operator remembering the exact local deploy and alias sequence. GitHub integration gives auditable commit-to-preview behavior and reduces release drift.

### Narrow Resolution Path

1. Open Vercel project `jeremyjones23s-projects/aculeus-slm-frontend`.
2. Open Git repository settings for the project.
3. Attach GitHub repository `Jeremyjones23/aculeus-slm-frontend`.
4. Confirm the Vercel GitHub app has access to that repository.
5. Push a harmless commit.
6. Confirm a Preview deployment is created from the commit.
7. Confirm Production promotion records the Git commit in Vercel.

### Waiver Standard

A controlled paid-customer pilot can waive this only if:

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

### Narrow Resolution Path

1. Move CDP capture to a runtime that can load Playwright core cleanly, or create a Browserbase worker outside the Next serverless bundle.
2. Keep Browserbase Fetch as fallback for text/HTML receipt capture.
3. Add smoke that requires `screenshot_sha256`.
4. Persist screenshot artifact metadata without exposing raw private content.

### Waiver Standard

A controlled paid-customer pilot can waive screenshot capture if Browserbase Fetch, regular receipt fetch, and reviewer gates are sufficient for the pilot use case and every dynamic page without a screenshot is marked candidate-only.
