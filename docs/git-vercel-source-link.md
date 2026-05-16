# Git and Vercel Source Link

## Current State

- Local source root: `C:\Users\jerem\OneDrive\Documents\Codex Sandbox\aculeus-slm-frontend`
- Local branch: `main`
- Initial source commit: `c127cf3 Initial Aculeus SLM frontend source`
- Latest verified deployed application commit: `5576246 Close pilot policy and Browserbase gates`
- GitHub repository: `Jeremyjones23/aculeus-slm-frontend`
- Vercel project: `jeremyjones23s-projects/aculeus-slm-frontend`

## Verification

The local frontend folder is committed and pushed to GitHub on `main`. The repository excludes generated, local, and secret-bearing artifacts through `.gitignore`, including `.env*.local`, `.local/`, `.next/`, `.swc/`, `.vercel/`, `node_modules/`, `qa-artifacts/`, `data/product-store/`, and `data/training-traces/`.

GitHub repository attachment is now confirmed from the Vercel CLI:

```text
Jeremyjones23/aculeus-slm-frontend is already connected to your project.
```

The first verified Git-triggered Production deployment from `main` is:

- Source commit: `5576246e204b6255593cf974ed987700c27ece4f`
- Deployment id: `dpl_Ek7GyCrRV9sU5hs1r88ePAbDRxtR`
- Deployment URL: `https://aculeus-slm-frontend-66wagtzrb-jeremyjones23s-projects.vercel.app`
- Vercel alias created by Git integration: `https://aculeus-slm-frontend-git-main-jeremyjones23s-projects.vercel.app`
- Status: Ready

The current release path is Git-triggered Vercel deployment. Explicit source deploy remains documented as fallback-only for emergency recovery.

## Remaining Platform Verification

- Canonical alias `https://aculeus-slm-frontend.vercel.app` should be checked after each Git-triggered production deployment.
- The Vercel `Clerk DNS Configuration` failed check remains separate from Git attachment.
- Browserbase Fetch works on deployed `/api/browser-capture`; screenshot-required Browserbase CDP still needs Vercel runtime proof.
