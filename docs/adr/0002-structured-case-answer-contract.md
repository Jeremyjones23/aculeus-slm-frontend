# Structured Case Answer Contract

Case-bound Q&A will return structured JSON instead of raw streamed chat text for the first live demo integration. The UI may render the answer conversationally, but the backend response must carry support level, source references, missing records, and a safe next move so guardrails, fallback, and review display stay auditable.

## Considered Options

- Stream raw model text directly into the browser: rejected because it weakens validation and makes unsupported claims harder to catch.
- Return structured JSON and render it conversationally: accepted because it preserves the Aculeus evidence discipline while still letting users ask natural questions.
