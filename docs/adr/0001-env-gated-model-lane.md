# Env-Gated Model Lane With Deterministic Fallback

The Aculeus SLM frontend will call the live model only when the required environment configuration is present and the model response passes guardrails. If configuration is missing, the provider fails, or the response cannot be validated, the app keeps the same case-packet contract through a deterministic demo fallback and marks the response as fallback instead of blocking the demo or pretending the model ran.

## Considered Options

- Make the live model mandatory for the demo: rejected because provider or env failure would break the public demo surface.
- Keep the demo fully deterministic with no model lane: rejected because the user needs case-bound Q&A and a real backend integration path.
- Env-gate the live model and preserve deterministic fallback: accepted because it supports a real model path while keeping the demo reliable and evidence-disciplined.
