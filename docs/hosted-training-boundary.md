# Aculeus Hosted Training Boundary

Status: prepared, not launched.

This checklist exists so Aculeus can prepare SFT, preference, and shadow-eval inputs without accidentally starting hosted training or fine-tuning.

## Hard Boundary

- Hosted training launch allowed: no.
- Fine-tuning launch allowed: no.
- Production promotion allowed: no.
- Required final gate: explicit human approval after scored rows, evals, and shadow report are reviewed.
- Configured spend cap for a future approved attempt: 10 USD.

## Required Inputs

- Scored trace JSONL with `training_conversion_allowed:false`.
- Preference-pair JSONL with chosen/rejected examples and evidence refs.
- 10-case eval report.
- 25-case held-out eval report.
- 100-case broad eval dashboard.
- Shadow-model no-regression report.

## Required Checks

- No raw receipt text.
- No provider auth headers.
- No API keys or secrets.
- Zero uncited critical claims.
- Candidate/search/API/Qdrant/crawler/PDF rows remain candidate-only until receipt-backed reviewer promotion.
- Verifier pass rate is greater than or equal to the current workflow.
- Human-reviewed rows only.

## Non-Actions

Do not run hosted training from this checklist. Do not create a fine-tune. Do not promote a shadow model. Do not deploy a candidate model to production.
