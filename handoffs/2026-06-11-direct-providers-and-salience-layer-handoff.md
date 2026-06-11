# Handoff — Direct Providers + Salience/Media Layer (PR #1)

**Date:** 2026-06-11
**Author:** prior Claude Code session
**Status:** Complete, all checks green, open as PR #1, ready to merge.

---

## 1. TL;DR

This branch delivers two things on top of `aculeus-slm-frontend`:

1. **The CYAN salience/media layer** — freezes an approved Read into an immutable,
   content-hashed snapshot, then runs it through a salience map → render → bind →
   substance-lock → deliver pipeline that renders per-temperament media while locking
   substance (no invented facts, counter-case always carried, every claim bound to an
   evidence record).
2. **A direct-provider model seam** — replaces the single Vercel AI Gateway with direct,
   per-provider OpenAI-compatible calls (DeepSeek / xAI / OpenAI), keyed by each
   provider's own env var. Plus the full round of Bugbot/Codex review hardening on the
   media-run persistence path.

Everything is feature-flagged behind env/keys and degrades to deterministic, human-review
fallbacks when keys/DB are absent — so it is safe to merge without provider keys set.

## 2. Where it lives

| | |
|---|---|
| **Repo** | `Jeremyjones23/aculeus-slm-frontend` |
| **Branch** | `claude/repo-architecture-review-0k9nh9` |
| **PR** | #1 → base `main` |
| **Head SHA** | `b644e63` |
| **Scope** | 30 commits ahead of `main`, 43 files, +4387 / −52 |

> Note: `main` is 30 commits behind this branch — the whole salience/media layer is
> introduced here, not just the gateway change.

## 3. What was built (in order)

**Salience/media layer (commits `f607233` → `500e3ed`):**
- `docs/aculeus-salience-layer-schema.sql` — Neon schema (read_snapshots, media_runs,
  claim_atoms, render tables, FKs to `runs`/`cases`).
- `lib/aculeus-read-snapshot.js` — Read freeze + atomization; eligibility gate
  (promoted evidence + lead-eligible + counter-case required).
- `lib/aculeus-salience-adapter.js` — typed, gated role contracts (salience_map / render /
  bind / substance_lock).
- `lib/aculeus-salience-map.js`, `lib/aculeus-render.js`, `lib/aculeus-substance-lock.js`,
  `lib/aculeus-render-review.js`, `lib/aculeus-delivery.js`, `lib/aculeus-salience-eval.js`
  — the pipeline passes; each has a source-locked prompt + deterministic post-validator.
- `lib/aculeus-media-run.js` (orchestration), `lib/aculeus-media-run-request.js`
  (brief → request), `lib/aculeus-media-run-store.js` (local + Neon persistence),
  `lib/aculeus-media-review-view.js` + `components/media-review-panel.jsx` (review UI),
  `app/api/media-runs/route.js`, `app/media-review/page.jsx`.

**Direct-provider migration (`bb4e62f`, `f15f11a`):**
- `lib/aculeus-providers.js` — **the seam**. Routes each model id's provider prefix
  (`deepseek/…`, `xai/…`, `openai/…`) straight to that provider's `/chat/completions`,
  keyed by `DEEPSEEK_API_KEY` / `XAI_API_KEY` / `OPENAI_API_KEY`. Replaces the deleted
  `lib/aculeus-gateway.js`.
- Rewired the salience passes and the Read/case-QA engine onto `callProvider` /
  `providerConfigured`. Default Read model is now `deepseek/deepseek-chat`.

**Review hardening (`beecccc` → `b644e63`)** — addressed every Bugbot/Codex finding:
- Auth gate on `/media-review` (was readable by anyone with a media_run_id).
- Counter-case eligibility requires a real qualifier/required record (not a bare flag).
- `source_run_id` threaded from `state.activeRun.runId`; never falls back to the case id.
- `verifyAndRepair`'s repaired render is the one persisted/shown.
- POST wraps persistence in try/catch → `persisted:false` instead of a 500; client
  surfaces it instead of redirecting to an empty review page.
- Provider seam is env-key-only (an OIDC/gateway token can never become a Bearer secret).
- `startMediaRun` refuses with `source_run_required` before any model spend; the route
  verifies the run exists in `runs` (when a DB is configured).
- Run-scoped durable `snapshot_id` so two distinct runs with identical substance don't
  collide; `content_hash` stays the substance fingerprint.

## 4. Env / config

Set only what you use; everything degrades gracefully without them.

- **Provider keys:** `DEEPSEEK_API_KEY`, `XAI_API_KEY` (or `GROK_API_KEY`), `OPENAI_API_KEY`.
- **Model ids (prefixed, direct):** `ACULEUS_SALIENCE_MODEL_ID` (e.g. `deepseek/deepseek-reasoner`),
  `ACULEUS_RENDER_MODEL_ID` (e.g. `xai/grok-2`), `ACULEUS_VERIFY_MODEL_ID`
  (e.g. `deepseek/deepseek-chat`, **must differ from the renderer**), `ACULEUS_MODEL_ID`
  (Read engine default + fallback for the three above).
- **Persistence:** `DATABASE_URL` (Neon). Without it, media runs use the local file store
  (`ACULEUS_MEDIA_STORE_DIR`, default `.local/media-runs`). Apply schema with
  `npm run migrate:salience-schema` (also runs automatically on Vercel build).
- Full reference: `docs/backend-env.md`, `docs/deployment-runbook.md`.

## 5. How to verify

```bash
npm install          # @neondatabase/serverless must be installed or verify-product-repository fails
npm run verify       # full suite — 66 checks, exit 0 expected
npm run build
```

Salience-specific: `npm run smoke:salience-pipeline`, `npm run test:media-run`,
`npm run test:substance-lock`, `npm run test:counter-case`.

## 6. How to merge to `main`

This code lives in `aculeus-slm-frontend`; merging means PR #1 → that repo's `main`.

**Preferred — merge the PR:**
1. Confirm PR #1 is green and reviewed.
2. Merge via GitHub (squash or merge commit). No CI gates this repo, so the local
   `npm run verify` pass is the signal of record.

**CLI equivalent:**
```bash
git fetch origin
git checkout main
git merge --no-ff origin/claude/repo-architecture-review-0k9nh9
npm install && npm run verify   # re-confirm green
git push origin main
```

There are no merge conflicts expected (the branch is strictly ahead of `main`).

## 7. ⚠️ Cross-repo note — the `Jeremyjones23/aculeus` repo

The marketing/product site with the "Data in. Intelligence out." hero, the clickable
citation popup, and the salience-map visuals lives in a **separate** repo,
`Jeremyjones23/aculeus` (private, TypeScript) — **not here**. If "merge it over to aculeus
main" means bringing these capabilities into that repo, that is a **port, not a git merge**:
the two are different codebases. The reusable, framework-agnostic core to port is:

- `lib/aculeus-providers.js` (the provider seam),
- `lib/aculeus-read-snapshot.js` and the pipeline passes (`salience-map`, `render`,
  `substance-lock`, `render-review`, `delivery`),
- `docs/aculeus-salience-layer-schema.sql` (the data model).

The Next.js route/page/component glue (`app/api/media-runs`, `app/media-review`,
`components/media-review-panel.jsx`) is specific to this repo's App Router setup and would
need re-wiring to `aculeus`'s structure. Outstanding front-end tasks for that repo
(citation-dismiss bug, hero animation, clickable popups, new salience map, new use-case
copy) are tracked separately and should be done in a session scoped to `aculeus`.

## 8. Open items

- None blocking. All Bugbot/Codex findings on PR #1 are resolved as of `b644e63`.
- Demo lane (`buildAnswerBriefFromCase`) carries no `runId`, so media runs from a pure
  demo brief are intentionally ineligible (`source_run_required`) — real runs supply the id.
- If you wire a new caller into the salience passes, do **not** pass a per-request
  OIDC/gateway token as a credential; provider keys come from env only.
