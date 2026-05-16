# Git and Vercel Source Link

## Current State

- Local source root: `C:\Users\jerem\OneDrive\Documents\Codex Sandbox\aculeus-slm-frontend`
- Local branch: `main`
- Initial source commit: `c127cf3 Initial Aculeus SLM frontend source`
- Intended GitHub repository: `Jeremyjones23/aculeus-slm-frontend`
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

The GitHub connector and public GitHub API did not show an existing `Jeremyjones23/aculeus-slm-frontend` repository.

`vercel git connect https://github.com/Jeremyjones23/aculeus-slm-frontend.git` was attempted and Vercel returned:

```text
Failed to connect Jeremyjones23/aculeus-slm-frontend to project. Make sure there aren't any typos and that you have access to the repository if it's private.
```

## Decision

The deployable source tree is now durable locally. Remote Git/Vercel linking remains blocked on creating or installing the intended GitHub repository in the GitHub/Vercel integration.

Until that repo exists, Preview deployments must continue through explicit Vercel source deploys from this local Git tree.
