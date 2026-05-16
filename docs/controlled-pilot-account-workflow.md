# Controlled Pilot Account and Role Workflow

Status: ready for internal rehearsal; external pilot onboarding waits for Vercel Git linking and Clerk DNS residuals to be clean.

## Pilot Roles

| Role | Workspace access | Create case | Run retrieval | Review/promote source | Admin audit/downloads |
| --- | --- | --- | --- | --- | --- |
| `admin` | yes | yes | yes | yes | yes |
| `operator` | yes | yes | yes | yes | no direct admin ownership |
| `reviewer` | yes | no | no | yes | limited review visibility |
| `viewer` | yes | no | no | no | no |

All roles require `approval_status=approved`. Pending or missing approval is denied.

## Clerk Claim Contract

Aculeus currently accepts these request claims from Clerk/session middleware or trusted smoke headers:

- `x-clerk-user-id` or `x-aculeus-user-id`
- `x-aculeus-email` or `x-clerk-user-email`
- `x-aculeus-role` or `x-clerk-role`
- `x-aculeus-approval-status=approved`

The Clerk production session must map the pilot user's role and approval status into equivalent claims before external pilot access is opened.

## First Pilot Cohort

1. Create one internal `admin` account for deployment and incident ownership.
2. Create one `operator` account for running cases and retrieval.
3. Create one `reviewer` account for receipt/citation review and source promotion.
4. Create one `viewer` account for read-only case-board review.
5. Leave one deliberately `pending` test account to confirm denial.

## Pre-Invite Gate

Before sending external invitations:

- `npm run verify` passes.
- `npm run smoke:nightly-production -- https://aculeus-slm-frontend.vercel.app` passes.
- `npm run smoke:postdeploy:admin -- https://aculeus-slm-frontend.vercel.app` passes.
- `npm run pilot:packet` passes and includes current residual platform checks.
- Vercel Git linking is clean or explicitly waived for the pilot.
- Clerk DNS Configuration platform check is clean or explicitly waived for the pilot.

## Rehearsal Script

Run:

```powershell
npm run test:controlled-pilot
```

This verifies the role matrix, approval gate, access request intake, and required runbook phrases without creating external accounts.

## Incident Owner

The `admin` account owns rollback, live-provider disablement, incident packet capture, and pilot access removal for the pilot window.
