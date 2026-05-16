const MAX_EVENTS = 8;
const MAX_CANDIDATES = 24;

export function createInitialState(initialBrief) {
  return {
    lead: "",
    selectedCaseId: initialBrief.caseId,
    activeRun: null,
    brief: null,
    stage: "idle",
    events: [],
    question: "",
    followUps: [],
    activeCitation: null,
    accessState: "closed",
    operatorBusy: "",
    operatorEvents: [],
    candidateQueue: [],
    receiptByCandidate: {},
    reviewByCandidate: {},
    quoteByCandidate: {},
    runLifecycle: null,
    caseBoard: null,
    feedbackBusy: "",
    feedbackEvents: [],
    providerCapUsd: "0.25",
    providerLiveMode: false
  };
}

export function workspaceReducer(state, action) {
  if (action.type === "lead_changed") return { ...state, lead: action.lead };
  if (action.type === "question_changed") return { ...state, question: action.question };
  if (action.type === "citation_opened") return action.citation ? { ...state, activeCitation: action.citation } : state;
  if (action.type === "citation_closed") return { ...state, activeCitation: null };
  if (action.type === "access_opened") return { ...state, accessState: "open" };
  if (action.type === "access_closed") return { ...state, accessState: "closed" };
  if (action.type === "recent_selected") {
    return {
      ...state,
      selectedCaseId: action.item.caseId,
      lead: `Open ${action.item.title}. Show the source trail, what holds, what is missing, and the next move.`
    };
  }
  if (action.type === "run_submitted") {
    return {
      ...state,
      lead: action.lead,
      activeRun: null,
      brief: null,
      stage: "planning",
      events: ["Lead received.", "Planning retrieval tasks."],
      followUps: [],
      candidateQueue: [],
      receiptByCandidate: {},
      reviewByCandidate: {},
      quoteByCandidate: {},
      operatorEvents: [],
      runLifecycle: null,
      caseBoard: null,
      feedbackBusy: "",
      feedbackEvents: []
    };
  }
  if (action.type === "run_received") {
    return {
      ...state,
      activeRun: action.run,
      runLifecycle: action.run?.lifecycle || null
    };
  }
  if (action.type === "run_polled") {
    const nextRun = action.run;
    const nextState = nextRun.lifecycle?.state || nextRun.status || "planning";
    return {
      ...state,
      activeRun: nextRun,
      runLifecycle: nextRun.lifecycle,
      stage: nextState,
      brief: nextRun.lifecycle?.terminal ? nextRun.answerBrief : state.brief,
      events: prependEvent(state.events, `${nextState} state recorded.`)
    };
  }
  if (action.type === "run_failed") {
    return {
      ...state,
      stage: "blocked",
      events: prependEvent(state.events, `Run blocked: ${action.message}`)
    };
  }
  if (action.type === "operator_started") {
    const label = action.kind === "official" ? "Public APIs" : "Search providers";
    return {
      ...state,
      operatorBusy: action.kind,
      operatorEvents: prependEvent(state.operatorEvents, `${label} queued for ${action.runId || "current lead"}.`)
    };
  }
  if (action.type === "operator_completed") {
    const label = action.kind === "official" ? "Public APIs" : "Providers";
    return {
      ...state,
      operatorBusy: "",
      candidateQueue: mergeCandidates(action.candidates, state.candidateQueue),
      operatorEvents: prependEvent(state.operatorEvents, `${label} returned ${action.candidates.length} candidate leads. Evidence promotion remains blocked until receipt verification.`)
    };
  }
  if (action.type === "operator_failed") {
    return {
      ...state,
      operatorBusy: "",
      operatorEvents: prependEvent(state.operatorEvents, `${action.kind || "Operator task"} failed: ${action.message}`)
    };
  }
  if (action.type === "receipt_started") return { ...state, operatorBusy: action.candidateId };
  if (action.type === "receipt_completed") {
    return {
      ...state,
      operatorBusy: "",
      receiptByCandidate: {
        ...state.receiptByCandidate,
        [action.candidateId]: action.payload
      },
      quoteByCandidate: {
        ...state.quoteByCandidate,
        [action.candidateId]: action.payload?.receipt?.excerpt || state.quoteByCandidate[action.candidateId] || ""
      },
      operatorEvents: prependEvent(
        state.operatorEvents,
        `Receipt ${action.payload?.receipt?.receipt_id || "fetch"} ${action.payload?.verifier?.source_promotion_allowed ? "passed source gate" : "is held for reviewer"}.`
      )
    };
  }
  if (action.type === "review_completed") {
    return {
      ...state,
      reviewByCandidate: {
        ...state.reviewByCandidate,
        [action.candidateId]: action.payload
      },
      operatorEvents: prependEvent(state.operatorEvents, `Reviewer action: ${action.payload.status || "blocked"}.`)
    };
  }
  if (action.type === "case_board_received") {
    return {
      ...state,
      caseBoard: action.caseBoard,
      candidateQueue: action.caseBoard?.candidateQueue || state.candidateQueue
    };
  }
  if (action.type === "quote_changed") {
    return {
      ...state,
      quoteByCandidate: {
        ...state.quoteByCandidate,
        [action.candidateId]: action.quote
      }
    };
  }
  if (action.type === "provider_budget_changed") return { ...state, providerCapUsd: action.providerCapUsd };
  if (action.type === "provider_live_mode_changed") return { ...state, providerLiveMode: action.providerLiveMode };
  if (action.type === "feedback_started") {
    return {
      ...state,
      feedbackBusy: action.feedbackType,
      feedbackEvents: prependEvent(state.feedbackEvents, `Feedback signal queued: ${action.feedbackType}.`)
    };
  }
  if (action.type === "feedback_completed") {
    return {
      ...state,
      feedbackBusy: "",
      feedbackEvents: prependEvent(state.feedbackEvents, `Feedback persisted: ${action.payload?.feedback?.feedback_type || "recorded"}.`)
    };
  }
  if (action.type === "feedback_failed") {
    return {
      ...state,
      feedbackBusy: "",
      feedbackEvents: prependEvent(state.feedbackEvents, `Feedback failed: ${action.message}`)
    };
  }
  if (action.type === "followup_submitted") {
    return {
      ...state,
      question: "",
      followUps: [...state.followUps, { role: "operator", text: action.prompt }]
    };
  }
  if (action.type === "followup_answered") {
    return {
      ...state,
      followUps: [...state.followUps, { role: "aculeus", ...action.answer }]
    };
  }
  return state;
}

function prependEvent(items, item) {
  return [item, ...items].slice(0, MAX_EVENTS);
}

function mergeCandidates(next, existing) {
  const seen = new Map();
  for (const candidate of [...next, ...existing]) {
    const key = candidate.normalized_url || candidate.url || candidate.candidate_id;
    if (!seen.has(key)) seen.set(key, candidate);
  }
  return [...seen.values()].slice(0, MAX_CANDIDATES);
}
