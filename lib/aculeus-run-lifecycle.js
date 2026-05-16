export const RUN_LIFECYCLE_STATES = ["planning", "retrieving", "verifying", "ready", "insufficient", "blocked", "cancelled"];

const STATE_LABELS = {
  planning: "Planning retrieval",
  retrieving: "Retrieving source leads",
  verifying: "Checking candidate gates",
  ready: "Case board ready",
  insufficient: "More records needed",
  blocked: "Blocked",
  cancelled: "Cancelled"
};

export function initializeRunLifecycle(run, options = {}) {
  const now = options.now || new Date().toISOString();
  const lifecycle = {
    state: "planning",
    terminal: false,
    startedAt: now,
    updatedAt: now,
    pollAfterMs: 450,
    taskSummary: {
      official_api: "queued",
      provider_search: "queued",
      crawler: "queued",
      qdrant: "queued",
      pdf_table_parser: "queued"
    },
    checkpoints: [buildCheckpoint("planning", now)],
    partialLedgerAvailable: true
  };
  return {
    ...run,
    status: "planning",
    lifecycle,
    updatedAt: now
  };
}

export function advanceRunLifecycle(run, options = {}) {
  const now = options.now || new Date().toISOString();
  const lifecycle = run.lifecycle || initializeRunLifecycle(run, { now }).lifecycle;
  if (lifecycle.terminal || ["ready", "insufficient", "blocked", "cancelled"].includes(lifecycle.state)) {
    return { ...run, lifecycle };
  }

  const elapsed = Math.max(0, Date.parse(now) - Date.parse(lifecycle.startedAt || now));
  const nextState = options.targetState || inferState(elapsed, run);
  if (nextState === lifecycle.state) {
    return { ...run, lifecycle: { ...lifecycle, updatedAt: now } };
  }

  const nextLifecycle = {
    ...lifecycle,
    state: nextState,
    terminal: ["ready", "insufficient", "blocked", "cancelled"].includes(nextState),
    updatedAt: now,
    pollAfterMs: nextState === "ready" ? null : 450,
    taskSummary: updateTaskSummary(lifecycle.taskSummary, nextState),
    checkpoints: appendProgressCheckpoints(lifecycle.checkpoints, nextState, now)
  };

  return {
    ...run,
    status: nextState,
    lifecycle: nextLifecycle,
    updatedAt: now
  };
}

export function buildLifecycleLedgerEntry(run, state = run.lifecycle?.state) {
  const now = new Date().toISOString();
  return {
    ledger_entry_id: `lifecycle_${state}_${Date.now()}`,
    entry_type: "run_lifecycle",
    run_id: run.runId,
    case_id: run.caseId,
    status: state,
    labels: ["run_state", state],
    lifecycle: run.lifecycle,
    evidence_promotion_allowed: false,
    public_safe: true,
    created_at: now
  };
}

function inferState(elapsed, run) {
  const ledger = Array.isArray(run.ledger) ? run.ledger : [];
  if (ledger.some((entry) => entry.status === "blocked")) return "blocked";
  if (elapsed < 450) return "planning";
  if (elapsed < 900) return "retrieving";
  if (elapsed < 1350) return "verifying";
  const hasCandidates = ledger.some((entry) => Array.isArray(entry.candidates) && entry.candidates.length > 0);
  const hasBriefSources = Array.isArray(run.answerBrief?.citations) && run.answerBrief.citations.length > 0;
  return hasCandidates || hasBriefSources ? "ready" : "insufficient";
}

function updateTaskSummary(taskSummary = {}, state) {
  if (state === "retrieving") {
    return Object.fromEntries(Object.keys(taskSummary).map((key) => [key, key === "crawler" || key === "qdrant" || key === "pdf_table_parser" ? "queued" : "running"]));
  }
  if (state === "verifying") {
    return Object.fromEntries(Object.keys(taskSummary).map((key) => [key, key === "crawler" || key === "qdrant" || key === "pdf_table_parser" ? "queued" : "candidate_gate_check"]));
  }
  if (state === "ready" || state === "insufficient") {
    return Object.fromEntries(Object.keys(taskSummary).map((key) => [key, key === "crawler" || key === "qdrant" || key === "pdf_table_parser" ? "deferred" : "complete"]));
  }
  return taskSummary;
}

function appendCheckpoint(checkpoints = [], state, at) {
  if (checkpoints.some((checkpoint) => checkpoint.state === state)) return checkpoints;
  return [...checkpoints, buildCheckpoint(state, at)];
}

function appendProgressCheckpoints(checkpoints = [], state, at) {
  const order = ["planning", "retrieving", "verifying", state];
  return [...new Set(order)].reduce((items, item) => appendCheckpoint(items, item, at), checkpoints);
}

function buildCheckpoint(state, at) {
  return {
    state,
    label: STATE_LABELS[state] || state,
    detail: detailForState(state),
    at
  };
}

function detailForState(state) {
  if (state === "planning") return "The lead is converted into retrieval tasks and source priorities.";
  if (state === "retrieving") return "Official APIs and search providers are allowed to create candidate leads.";
  if (state === "verifying") return "Candidate rows are checked before anything can enter the reviewer queue.";
  if (state === "ready") return "The case board is ready with ledger, candidates, missing records, and verifier state.";
  if (state === "insufficient") return "The run needs more source material before a strong finding can be supported.";
  if (state === "blocked") return "A deterministic gate blocked progression.";
  return "Run state changed.";
}
