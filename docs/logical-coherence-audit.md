# Aculeus SLM Logical Coherence Audit

## Product Truth

Aculeus is not a chatbot and not a verdict machine.

It is a review system that reads records, keeps facts attached to sources, checks those facts against known risk patterns, names what is missing, and produces a packet a person can review.

The demo must prove that sequence.

## Current Failure

The case opens as if it is already solved. That weakens the product story because the visitor does not get to see Aculeus work.

The experience should start with an unloaded case, then reveal:

1. The lead.
2. The source records.
3. The pattern.
4. The legal boundary.
5. The next record.
6. The review packet.

## Copy Issues

- `Demo case loaded` assumes the outcome before the visitor acts.
- `Control gap is source-backed` is accurate, but still too internal for a first demo.
- `Run trace` is useful after the run, but unclear before the run.
- `Connect` in the sidebar is both visually cramped and less plain than `Link`.
- `SLM`, `adapter`, and endpoint language should stay in the trace drawer, not the main story.

## Revised Demo Logic

- The home state asks for a lead and offers a trial lead.
- The Case tab starts empty if no run has happened.
- Starting the trial moves the visitor into the case and reveals each layer.
- The map is hidden until the run begins.
- The source drawer explains what a record supports and what it cannot prove.
- The trace drawer explains the model boundary only after the product story is visible.
- The account page remains a workspace action, not a technical setup screen.

## UI Decisions

- Sidebar stages become `Find`, `Link`, `Check`, `Packet`, `Move`.
- Initial case score is `0 / Waiting`.
- Trial case action fills or runs the duplicate-payment demo, but the case is not preloaded.
- The stage rail must use non-overlapping label geometry.
- The demo keeps whimsy through paper, orbit, linework, and progressive reveal, not through unexplained jargon.

## Done Criteria

- A visitor sees what Aculeus does before they see technical internals.
- The trial case is not visible until the visitor runs it.
- No stage labels overlap at desktop or mobile widths.
- The demo can be understood without knowing what a case packet, adapter, or SLM is.
- Sources, trace, case, and account each have a distinct job.
