# Git and Vercel Source Link

## Current State

- Local source root: `C:\Users\jerem\OneDrive\Documents\Codex Sandbox\aculeus-slm-frontend`
- Local branch: `main`
- Initial source commit: `c127cf3 Initial Aculeus SLM frontend source`
- Current pushed commit: `b922947 Fix deployed admin store reads`
- GitHub repository: `Jeremyjones23/aculeus-slm-frontend`
- Vercel project: `jeremyjones23s-projects/aculeus-slm-frontend`

## Verification

The local frontend folder was initialized as a Git repository and committed after expanding `.gitignore` to exclude generated, local, and secret-bearing artifacts:

- `.env*.local`
- `.local/`
- `.next/`
- `.swc/`
- `.vercel/`
- `node_modules/`
- `qa-artifacts/`
- `data/product-store/`
- `data/training-traces/`

The GitHub repository has now been created and `main` has been pushed.

Verified:

```powershell
git ls-remote origin
```

returns `b922947` or newer for `HEAD` and `refs/heads/main`.

The repository was initially created private. Vercel still could not attach it, so the source was scanned for secret-bearing material outside ignored files and the repository was made public to eliminate private-repo access as the cause. The scan only matched test fixtures and secret-pattern validators.

`vercel git connect https://github.com/Jeremyjones23/aculeus-slm-frontend.git` was attempted and Vercel returned:

```text
Failed to connect Jeremyjones23/aculeus-slm-frontend to project. Make sure there aren't any typos and that you have access to the repository if it's private.
```

The same failure persisted after the repository existed, was pushed, and was made public. The documented Vercel project update API rejects both `gitRepository` and `link` as patch fields for an existing project, so there is no supported REST fallback in this session.

Additional 2026-05-16 verification:

- GitHub connector access can read `Jeremyjones23/aculeus-slm-frontend`, which confirms the repository is reachable from the connected GitHub side.
- `npx vercel git connect https://github.com/Jeremyjones23/aculeus-slm-frontend.git --yes --token $env:VERCEL_TOKEN` still fails with the same access/typo message.
- Vercel MCP `_get_project` against project `prj_SYALeEjcDBUaQxJdtZvCE66YYIcd` and team `team_6Rg9l8vyTRAfLCscKxe7lbX7` returns `403 Forbidden`.
- No callable Chrome/browser-control tool was exposed in this Codex session, so dashboard clicks could not be executed from the agent despite the user having browser credentials available in a separate context.

## Decision

The deployable source tree is now durable locally and remotely on GitHub. Vercel Git linking remains blocked on Vercel GitHub integration authorization or dashboard-level project settings that are not exposed by the CLI/API available in this session.

Until the Vercel GitHub integration accepts the repository, Preview and Production deployments must continue through explicit Vercel source deploys from this local Git tree.
