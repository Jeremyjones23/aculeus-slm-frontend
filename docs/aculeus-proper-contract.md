# Aculeus Proper Contract

Aculeus Proper is not a demo shell. It is an invite-only operator workspace where the user can query, retrieve, inspect, reason, ask, and refine public-records work.

## Core Objects

- `Answer Brief`: the primary case output.
- `Citations`: public URLs or private artifact anchors attached to claims.
- `SuggestedNextMoves`: three to five sharp follow-up actions.
- `MissingRecords`: records needed before stronger claims.
- `RunCheckpoints`: staged progress events from the durable run.
- `FollowUpAnswer`: a case-bound answer to a user refinement.

## Backend Stack

- Clerk for invite-only authentication.
- Neon Postgres for durable case state.
- Vercel Blob for source artifacts.
- Vercel Workflow for durable Aculeus runs.

## Source Ingestion

Source Ingestion accepts a lead, private files, public URLs, and operator context. It stores artifacts, labels visibility, extracts usable text, and creates citation anchors before reasoning.

## Research Refinement Loop

The Research Refinement Loop lets the operator ask clarifying questions, tighten scope, test claims, request missing records, draft requests, and decide the next action after the Answer Brief lands.
