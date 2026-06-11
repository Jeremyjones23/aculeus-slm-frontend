# Aculeus SLM Frontend

This context defines the product language for the Aculeus SLM demo surface and its model interaction boundary.

## Language

**Case-bound Q&A**:
Follow-up model questions answered only from the active case packet, source trail, review state, and explicit limitations.
_Avoid_: General chat, open chat bot, freeform assistant

**Case Answer**:
A structured answer object with support level, source references, missing records, and a safe next move.
_Avoid_: Raw chat text, unsupported narrative answer

**Ask About This Case**:
The case-view panel where users submit case-bound follow-up questions after a case packet is loaded.
_Avoid_: Global chat widget, site-wide assistant

**Case Packet**:
A structured review object containing the lead, sources, findings, limitations, next records, and review state for one demo run.
_Avoid_: Chat transcript, model memory

**Source Trail**:
The set of source records and receipts that anchor what the case packet can claim.
_Avoid_: Evidence from similarity, model recollection

**Live Model Lane**:
The configured backend path that calls the selected language model for investigation or case-bound follow-up work.
_Avoid_: Always-on model dependency, training lane

**Guarded Demo Model**:
The default model contract for the demo lane, currently `deepseek/deepseek-chat` (a direct provider id) with `rag_16k` and `compact_v2` context discipline.
_Avoid_: Unscoped model swap, paid training path

**Deterministic Demo Fallback**:
A verified local response path that keeps the demo usable when the live model lane is unavailable or fails guardrails.
_Avoid_: Silent failure, fake live model run

**Demo Session Data**:
Submitted leads, questions, and answers used only for the current demo request or browser session.
_Avoid_: Durable review receipt, stored user history, private source body archive

**Authenticated Product Backend**:
Real authentication and durable storage for Aculeus Proper: account-native recent cases, persisted runs, saved source-fed boards, question history, draft record requests, and future model integration.
_Avoid_: Frontend-only local state, mailto workflows, temporary demo storage as the primary product path

**Chosen Backend Stack**:
Next.js App Router for Aculeus Proper, Vercel route handlers/functions for API boundaries, Clerk for user authentication, Neon Postgres for relational case state, and Vercel Blob for source artifacts and uploaded records.
_Avoid_: Keeping the primary product as a static-only HTML app once account-native case history and source storage are required

**In-Place Product Rebuild**:
The current static/demo surface can be replaced directly. There is no requirement to preserve the old demo UI, old case selector, or rollback path. Existing work may be mined for brand, copy, source-fed data, and interaction lessons, but `/` should become Aculeus Proper.
_Avoid_: Legacy-first migration, parallel demo shell, or preserving old frontend architecture for safety

**Invite-Only Access**:
Aculeus Proper is an invite-only beta. Users may authenticate, but workspace access, case creation, and durable case storage require an approved account or invite. This protects sensitive case work, source artifacts, and model answers while the product is hardened.
_Avoid_: Open public sign-up, anonymous case creation, unrestricted workspace creation

**Access Request Flow**:
Unapproved visitors can request access with name, email, organization, and the kind of public-records work they want to run. The request is stored for admin review and should support future notification to the Aculeus team.
_Avoid_: Dead-end denied screens, public workspace preview, or automatic approval

**Workspace Roles**:
V1 uses three roles: admin, operator, and viewer. Admins approve users, see all cases, and manage model/source settings. Operators create cases, upload or request records, ask Aculeus, and save drafts. Viewers can read shared cases but cannot create runs or change source state.
_Avoid_: Open-ended permissions, public editing, or role sprawl before the core workflow works

**Case Run States**:
Durable cases move through intake, retrieving, reasoning, review, drafted, and closed. The interface should show progress as an agentic run, not as a noisy project board.
_Avoid_: Instant fake completion, opaque spinner-only runs, or cluttered task dashboards

**Live Tightening Loop**:
While Aculeus retrieves and reasons, the operator can ask follow-up questions, narrow scope, add context, or request a tighter answer. The UI should feel like Codex: calm, command-first, responsive, and readable as work unfolds.
_Avoid_: ChatGPT wrapper feel, dense analytics dashboard, frozen wait-until-complete workflow, or dozens of competing panels

**Staged Checkpoint Run**:
Aculeus shows selective live status while work happens, then reveals findings in completed, readable sections. Small status lines can stream during retrieval and reasoning, but evidence-backed findings should land as clean checkpoints.
_Avoid_: Raw agent logs, constant token streaming, fake progress bars, or dumping every intermediate thought into the UI

**Answer Brief**:
The primary case output after a run. It states the bottom line, why it matters, what supports it, what is missing, the next move, and gives the operator a calm ask/tighten command bar. Sources and deeper detail expand from the brief instead of competing with it.
_Avoid_: Dashboard-first output, dense cards, disconnected receipts, or unsupported story

**Direct Source Citation**:
Every supported claim should link to an actual source location whenever available: live public URL, official record page, uploaded artifact, exact file, row, page, or excerpt reference. Internal side panels are secondary and must add context, not replace citation.
_Avoid_: Decorative source cards, dead source markers, internal-only receipts with no verifiable path

**Private Artifact Citation**:
When a source is private or uploaded, Aculeus must cite the exact artifact location: file name, document title when available, page, row, table, section, excerpt, or generated text span. Private citations should make clear where the information came from without exposing the file publicly.
_Avoid_: "Uploaded dossier says", vague private-source references, or unsupported summaries

**In-App Source Viewer**:
Private and uploaded sources should open inside Aculeus with the relevant page, row, section, excerpt, or text span highlighted. Download is secondary; verification should happen without leaving the workspace.
_Avoid_: Forcing downloads for verification, generic file previews, or source views that do not jump to the cited location

**Source Ingestion**:
Operators can start with a pasted lead or question, uploaded PDFs/docs/CSVs/images, public URLs, and notes/context. Each source gets a visibility label: private, team, or public-safe. Aculeus extracts text, stores artifacts, creates citation anchors, and only then reasons over the case.
_Avoid_: Text-only intake, uncited uploads, unlabelled sensitive material, or reasoning before source extraction

**Research Refinement Loop**:
After findings appear, the operator can dial the research in further: ask clarifying questions, tighten scope, test a claim, request a missing source, draft a public-records request, or turn a finding into a next action. Record requests are one action inside the loop, not the whole loop.
_Avoid_: Treating "next move" as only a records request, forcing the user into a linear case flow, or ending the run after the first answer

**Suggested Next Moves**:
The Answer Brief should offer three to five sharp suggested follow-ups based on the current findings: clarify, tighten, test, request, draft, or act. The command bar remains open for any custom operator instruction.
_Avoid_: Overloading the page with actions, hiding custom follow-up, or making Aculeus feel like a fixed wizard

**Durable Run Engine**:
Aculeus runs use Vercel Workflow DevKit for retrieval, source extraction, model reasoning, staged checkpoints, follow-up tightening, retries, human approval pauses, and long-running case work. Regular Vercel Functions handle fast API work like auth checks, case lists, access requests, uploads, and brief reads.
_Avoid_: One giant request, brittle fake background work, raw queues as the first orchestration layer, or losing run state on refresh/deploy

**Aculeus Run Adapter**:
The frontend never depends on raw chat completion text. The backend model boundary receives the lead, permitted sources, extracted citation anchors, prior case state, and operator follow-up, then returns structured outputs: AnswerBrief, Citations, SuggestedNextMoves, MissingRecords, RunCheckpoints, and FollowUpAnswer.
_Avoid_: Chat completion directly in the UI, unstructured model blobs, or frontend logic that depends on one model provider's response format

**Aculeus Proper**:
The primary product experience at `/`: an operator-facing public-records workflow where a user submits a lead or question, Aculeus retrieves permitted source-fed records, shows the reasoning trail, supports case-bound questions, and drafts the next record request.
_Avoid_: Demo selector, toy case board, standalone marketing page, general chatbot

**Source-Fed Case Board**:
The canonical Aculeus case-board data surface built from source-ledger records, official row facts, missing-record work orders, rejected or weak claims, and model/training gates.
_Avoid_: Static preview artifact, decorative dashboard, final allegation packet

**Operator Workspace**:
The signed-in user's Aculeus working context: recent cases, submitted leads, source-fed case boards, questions, answers, drafts, and next-record actions that belong to that account.
_Avoid_: Global public demo history, shared canned examples presented as user work

## Relationships

- A **Case Packet** may support many **Case-bound Q&A** turns.
- **Ask About This Case** is only available after a **Case Packet** exists.
- **Ask About This Case** submits **Case-bound Q&A** and displays **Case Answers**.
- **Case-bound Q&A** returns a **Case Answer**.
- A **Case Answer** must cite or name the relevant **Source Trail** item when answering supported questions.
- **Case-bound Q&A** must identify the missing source or record when the **Case Packet** does not support an answer.
- The **Live Model Lane** may produce a **Case Packet** only when configured, guardrail-valid, and aligned to the **Guarded Demo Model** contract by default.
- The **Deterministic Demo Fallback** must preserve the same **Case Packet** shape as the **Live Model Lane**.
- **Demo Session Data** remains valid only for fixtures and local previews; Aculeus Proper uses the **Authenticated Product Backend** for real product history.
- **Aculeus Proper** owns the root route `/`; demo-only flows must move behind internal/dev paths or remain only as fixtures.
- **Source-Fed Case Board** feeds **Aculeus Proper** and must preserve source, gate, missing-record, and weak-claim context before model answers are generated.
- **Aculeus Proper** should feel like an operator workflow for public records: query, retrieve, inspect, reason, ask, and request the next record.
- **Aculeus Proper** starts command-first inside the **Operator Workspace**.
- **Operator Workspace** may show recent cases, but those cases are account-native history, not generic demo choices.
- The **Authenticated Product Backend** supports the **Operator Workspace** and makes recent cases native to the signed-in user.
- The **Chosen Backend Stack** implements the **Authenticated Product Backend** unless a later infrastructure constraint forces a documented change.
- The **In-Place Product Rebuild** allows the old static demo architecture to be removed when it blocks Aculeus Proper.
- **Invite-Only Access** gates the **Operator Workspace** before a user can create or persist cases.
- **Access Request Flow** is the only product path for authenticated but unapproved users.
- **Workspace Roles** control what approved users can see and do inside the **Operator Workspace**.
- **Case Run States** describe the durable lifecycle of a case from lead intake through next-record draft.
- **Live Tightening Loop** is available during retrieving, reasoning, and review states.
- **Staged Checkpoint Run** controls what the operator sees during retrieval and reasoning.
- **Answer Brief** is the primary surface for findings, support, missing records, and next action after a run.
- **Direct Source Citation** anchors each supported claim to a verifiable source path before any internal source explanation.
- **Private Artifact Citation** applies the same location-specific citation rule to private uploads and non-public source artifacts.
- **In-App Source Viewer** makes private citations inspectable at the exact cited location.
- **Source Ingestion** creates the source artifacts, visibility labels, extracted text, and citation anchors that feed the **Answer Brief**.
- **Research Refinement Loop** turns the **Answer Brief** into follow-up questions, tighter research, missing-source requests, record drafts, and next actions.
- **Suggested Next Moves** guide the **Research Refinement Loop** without replacing the operator's command bar.
- **Durable Run Engine** powers **Staged Checkpoint Run** and preserves state across refreshes, retries, and long-running work.
- **Aculeus Run Adapter** is the model boundary consumed by Aculeus Proper and the Durable Run Engine.

## Example Dialogue

> **Dev:** "Should the user be able to ask the model anything after the case loads?"
> **Domain expert:** "No. They can ask **Case-bound Q&A** questions, but every answer has to stay inside the **Case Packet** and **Source Trail**."

> **Dev:** "What happens if the model key is missing or the response fails validation?"
> **Domain expert:** "Use the **Deterministic Demo Fallback** and mark the run as fallback instead of pretending the **Live Model Lane** worked."

## Flagged Ambiguities

- "Talk to the model" means **Case-bound Q&A**, not general chat.
- "Wire the model" means env-gated **Live Model Lane** with **Deterministic Demo Fallback**, not a mandatory live dependency.
- "Small language model" means the **Guarded Demo Model** by default unless a later decision changes `ACULEUS_MODEL_ID`.
- "Answer a user question" means return a structured **Case Answer**, not raw streamed chat text.
- "Q&A UI" means **Ask About This Case** inside the case view, not a global chat widget.
- "User-submitted lead or question" means **Demo Session Data** for now, not a durable review receipt.
- "Backend now" means selecting and wiring real auth/storage architecture during this redesign, not postponing persistence until after the frontend is polished.
- "Backend stack" means **Chosen Backend Stack**: Next.js App Router, Vercel Functions, Clerk, Neon Postgres, and Vercel Blob.
- "No rollback" means preserve only what is useful as source material; do not keep the old demo frontend as a supported product route.
- "Invite only" means authentication is necessary but not sufficient; the account must also be approved for workspace access.
- "Request access" means collect enough context to approve the right operators without exposing the workspace.
- "Roles" means admin, operator, and viewer for v1; do not introduce more permission layers unless the product workflow requires them.
- "Codex feel" means focused command surface, visible work progress, compact reasoning output, and follow-up control without visual clutter.
- "Streaming" means selective run status, not raw model text or internal reasoning.
- "Case output" means an **Answer Brief** first, with sources and source detail available on demand.
- "Source inspection" means link out or deep-link to the real source location first; side panels are optional context, not the proof.
- "Private source" means cite the exact file/page/row/section/span inside the user's workspace, not a public link.
- "Open citation" means jump to the cited location in the in-app viewer for private artifacts or the live official source for public records.
- "Ingest source" means store the artifact, extract usable text, label visibility, and create citation anchors before using it in an answer.
- "Record request" is one kind of follow-up action inside the **Research Refinement Loop**, not the default meaning of next move.
- "Suggested action" means a compact recommended follow-up, not a mandatory workflow step.
- "Run engine" means Vercel Workflow DevKit for case work and regular Vercel Functions for fast API endpoints.
- "Model integration" means the **Aculeus Run Adapter**, not raw chat completion inside the browser.
- "Ship Aculeus" means **Aculeus Proper**, not a polished demo selector.
- "Integrate Aculeus into the frontend" means wire the **Source-Fed Case Board**, case-bound model boundary, retrieval gates, and next-record workflow into the primary product experience.
- "Recent cases" means cases in the **Operator Workspace**, not sample cases hard-coded into the primary product surface.
