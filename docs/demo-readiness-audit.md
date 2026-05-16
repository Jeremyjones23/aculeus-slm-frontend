# Aculeus SLM Frontend Demo Readiness Audit

## Goal

Make the Aculeus SLM frontend demoable end to end.

The demo must open with a clear claim, load a real Aculeus case we already built, animate the work from lead to review surface, expose source traceability, support account creation in demo mode, and keep a clean integration boundary for the future model backend.

## Current Audit

### What Works

- The visual system is strong: cream field, red Aculeus mark, paper artifacts, source lines, and instrument-panel UI all match the main Aculeus site.
- The current two-state flow is clear enough to understand: lead intake moves into a case canvas.
- Source cards are clickable and already open a trace drawer.
- Desktop and mobile browser QA passed in the previous build.

### What Does Not Yet Clear The Bar

- The headline is too soft. `Every case starts with a lead` is true, but it does not explain what Aculeus does.
- The subline `peel back the layers without showing the noise` sounds nice but does not carry enough meaning.
- `Case` and `Trace` overlap as navigation ideas. Case should load the review surface. Trace should explain the run.
- The account surface is missing. A real demo needs a sign-up path, even if the auth provider is not connected yet.
- The backend contract is implied, not explicit. The future model needs a visible adapter boundary.
- The demo case is currently generic. It should load a real Aculeus case artifact from our work.
- The stage rail spacing is too loose. It reads as tall furniture instead of a focused operating instrument.
- The start button has too much bottom shadow weight. It pulls attention below the action.

## Loaded Demo Case

Use `demo-federal-duplicate-payment-source-ingest-005` from the deterministic Aculeus product baseline.

Why this case:

- It has a real Aculeus case id.
- It has a public packet and internal packet.
- It has official public sources.
- It has anomaly math.
- It has a legal boundary.
- It has a missing-record request.
- It has a trace id.
- It proves the product behavior without pretending the model has made a legal finding.

## UX Decisions

- `Investigate`: lead intake and demo launch.
- `Case`: the loaded case review canvas.
- `Sources`: source trace drawer.
- `Trace`: run log, model steps, and integration contract.
- `Account`: demo sign-up and workspace readiness.

## Execution List

1. Add `data/demo-case.json` and `data/demo-case.js` so the same case works from localhost, Vercel, and file preview.
2. Add API stubs:
   - `GET /api/demo-case`
   - `POST /api/investigate`
   - `POST /api/signup`
3. Add `model-adapter.js` as the front-end boundary between UI and future Aculeus model service.
4. Rewrite all site copy in Jeremy's style:
   - concrete mechanism
   - short sentences
   - no vague gloss
   - no corporate filler
   - no empty slogans
5. Rebuild navigation behavior so each button has a distinct purpose.
6. Add account view with sign-up form, demo response state, and future auth handoff language.
7. Add run trace drawer with animated steps and model-ready route names.
8. Tighten spacing in stage rail, hero, start button, and mobile case flow.
9. Update verification script to enforce the new demo requirements.
10. Run local QA across desktop, wide desktop, and mobile.
11. Deploy to Vercel and run live QA.

## Done Criteria

- A fresh visitor understands the product in three seconds.
- The demo case loads without manual setup.
- Start demo animates the path from lead to case review.
- Case, Trace, Sources, and Account do different jobs.
- Account creation works in demo mode and returns a visible confirmation.
- Model integration points are present and documented in code.
- The UI passes desktop and mobile QA with no console errors and no horizontal overflow.
- The result feels like Aculeus: powerful, precise, art-directed, and usable.
