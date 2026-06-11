"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import {
  AccessRequestDialog,
  CitationOverlay,
  Hero,
  OperatorBoard,
  RunFeedbackPanel,
  RunStage,
  SourceBand,
  Topbar,
  WorkGrid
} from "./aculeus-workspace-sections.jsx";
import { createInitialState, workspaceReducer } from "./aculeus-workspace-state.js";
import { buildMediaRunRequestFromBrief, describeMediaRunBlocker } from "../lib/aculeus-media-run-request.js";

const defaultLead = "Open the intermediary network: public money, fiscal agents, sub-grants, source gaps, and the records needed to prove what moved where.";

export function AculeusWorkspace({ recentCases, initialBrief, checkpoints }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialBrief, createInitialState);
  const activeBrief = state.brief;
  const sourceMap = useMemo(() => new Map((activeBrief?.citations || []).map((item) => [item.citationId, item])), [activeBrief]);

  // Turn an approved Read into a media run. Eligibility (needs a counter-case) is honest;
  // the server re-validates via buildReadSnapshot.
  const mediaRequest = useMemo(
    () => buildMediaRunRequestFromBrief(activeBrief || {}, { runId: state.activeRun?.runId }),
    [activeBrief, state.activeRun?.runId]
  );
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  const createMediaRun = useCallback(async () => {
    if (!mediaRequest.ok || mediaBusy) return;
    setMediaBusy(true);
    setMediaError(null);
    try {
      const response = await fetch("/api/media-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mediaRequest.body)
      });
      const payload = await response.json();
      if (payload.ok && payload.media_run?.media_run_id) {
        window.location.assign(`/media-review?id=${payload.media_run.media_run_id}`);
      } else {
        setMediaError(payload.reason || "media_run_failed");
      }
    } catch (error) {
      setMediaError(error.message);
    } finally {
      setMediaBusy(false);
    }
  }, [mediaBusy, mediaRequest]);

  const refreshCaseBoard = useCallback(async (runId = state.activeRun?.runId) => {
    if (!runId) return null;
    const response = await fetch(`/api/runs/${runId}/case-board`);
    const payload = await response.json();
    if (payload.caseBoard) dispatch({ type: "case_board_received", caseBoard: payload.caseBoard });
    return payload.caseBoard || null;
  }, [state.activeRun?.runId]);

  const pollRunLifecycle = useCallback(async (runId) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await sleep(450);
      const response = await fetch(`/api/runs/${runId}`);
      const payload = await response.json();
      const nextRun = payload.run;
      if (!nextRun) return;
      dispatch({ type: "run_polled", run: nextRun });
      if (nextRun.lifecycle?.terminal) {
        await refreshCaseBoard(runId);
        return;
      }
    }
  }, [refreshCaseBoard]);

  const runAculeus = useCallback(async (event) => {
    event.preventDefault();
    const submittedLead = state.lead.trim() || defaultLead;
    dispatch({ type: "run_submitted", lead: submittedLead });

    try {
      const response = await fetch("/api/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: submittedLead, caseId: state.selectedCaseId })
      });
      const payload = await response.json();
      dispatch({ type: "run_received", run: payload.run });
      await pollRunLifecycle(payload.run.runId);
    } catch (error) {
      dispatch({ type: "run_failed", message: error.message });
    }
  }, [pollRunLifecycle, state.lead, state.selectedCaseId]);

  const runOperatorSearch = useCallback(async (kind) => {
    const endpoint = kind === "official" ? "/api/official-api-search" : "/api/provider-search";
    const submittedLead = state.lead.trim() || state.activeRun?.lead || defaultLead;
    dispatch({ type: "operator_started", kind, runId: state.activeRun?.runId });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: state.activeRun?.runId,
          rawQuery: submittedLead,
          caseId: state.selectedCaseId,
          enableNetwork: kind === "official" || (kind === "provider" && state.providerLiveMode && Number(state.providerCapUsd) > 0),
          providerCapUsd: state.providerCapUsd,
          maxTasks: kind === "official" ? 6 : 4,
          maxResults: 3
        })
      });
      const payload = await response.json();
      const candidates = payload?.dedupe?.candidates || payload?.ledger_entry?.candidates || [];
      dispatch({ type: "operator_completed", kind, candidates });
      await refreshCaseBoard(state.activeRun?.runId);
    } catch (error) {
      dispatch({ type: "operator_failed", kind, message: error.message });
    }
  }, [refreshCaseBoard, state.activeRun?.lead, state.activeRun?.runId, state.lead, state.providerCapUsd, state.providerLiveMode, state.selectedCaseId]);

  const fetchReceipt = useCallback(async (candidate) => {
    dispatch({ type: "receipt_started", candidateId: candidate.candidate_id });
    try {
      const response = await fetch("/api/receipt-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: state.activeRun?.runId,
          caseId: state.selectedCaseId,
          candidate,
          quote: candidate.snippet || candidate.title,
          claim: candidate.candidate_reason || candidate.title
        })
      });
      const payload = await response.json();
      dispatch({ type: "receipt_completed", candidateId: candidate.candidate_id, payload });
      await refreshCaseBoard(state.activeRun?.runId);
    } catch (error) {
      dispatch({ type: "operator_failed", kind: candidate.candidate_id, message: error.message });
    }
  }, [refreshCaseBoard, state.activeRun?.runId, state.selectedCaseId]);

  const promoteCandidate = useCallback(async (candidate) => {
    const receiptPayload = state.receiptByCandidate[candidate.candidate_id];
    const response = await fetch("/api/reviewer-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: state.activeRun?.runId,
        caseId: state.selectedCaseId,
        action: "promote_candidate_source",
        candidate,
        receipt_id: receiptPayload?.receipt?.receipt_id,
        quote: state.quoteByCandidate[candidate.candidate_id] || candidate.snippet || candidate.title,
        claim: candidate.candidate_reason || candidate.title,
        reviewer: "local_operator"
      })
    });
    const payload = await response.json();
    dispatch({ type: "review_completed", candidateId: candidate.candidate_id, payload });
    await refreshCaseBoard(state.activeRun?.runId);
  }, [refreshCaseBoard, state.activeRun?.runId, state.quoteByCandidate, state.receiptByCandidate, state.selectedCaseId]);

  const reviewCandidate = useCallback(async (candidate, action) => {
    const response = await fetch("/api/reviewer-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: state.activeRun?.runId,
        caseId: state.selectedCaseId,
        action,
        candidate,
        reason: action === "request_missing_record"
          ? "Request the missing public record needed to verify this candidate."
          : "Reviewer marked this candidate for source triage.",
        note: "Operator annotation from the case board.",
        reviewer: "local_operator"
      })
    });
    const payload = await response.json();
    dispatch({ type: "review_completed", candidateId: candidate.candidate_id, payload });
    await refreshCaseBoard(state.activeRun?.runId);
  }, [refreshCaseBoard, state.activeRun?.runId, state.selectedCaseId]);

  const askFollowUp = useCallback(async (event, preset) => {
    event?.preventDefault();
    const prompt = String(preset || state.question || "").trim();
    if (!prompt) return;

    dispatch({ type: "followup_submitted", prompt });
    const response = await fetch("/api/follow-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: prompt,
        activeRun: state.activeRun || { answerBrief: initialBrief, caseId: initialBrief.caseId }
      })
    });
    const payload = await response.json();
    dispatch({ type: "followup_answered", answer: payload.answer });
  }, [initialBrief, state.activeRun, state.question]);

  const submitFeedback = useCallback(async (feedbackType) => {
    if (!state.activeRun?.runId) return;
    dispatch({ type: "feedback_started", feedbackType });
    try {
      const response = await fetch(`/api/runs/${state.activeRun.runId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: feedbackType })
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error || "feedback_not_recorded");
      dispatch({ type: "feedback_completed", payload });
    } catch (error) {
      dispatch({ type: "feedback_failed", message: error.message });
    }
  }, [state.activeRun?.runId]);

  const openAccess = useCallback(() => dispatch({ type: "access_opened" }), []);
  const closeAccess = useCallback(() => dispatch({ type: "access_closed" }), []);
  const closeCitation = useCallback(() => dispatch({ type: "citation_closed" }), []);
  const changeLead = useCallback((lead) => dispatch({ type: "lead_changed", lead }), []);
  const chooseRecent = useCallback((item) => dispatch({ type: "recent_selected", item }), []);
  const changeQuestion = useCallback((question) => dispatch({ type: "question_changed", question }), []);
  const openCitation = useCallback((citation) => dispatch({ type: "citation_opened", citation }), []);

  return (
    <main className="workspace-shell">
      <Topbar onRequestAccess={openAccess} />
      <Hero
        defaultLead={defaultLead}
        lead={state.lead}
        recentCases={recentCases}
        onLeadChange={changeLead}
        onChooseRecent={chooseRecent}
        onSubmit={runAculeus}
      />
      <RunStage checkpoints={checkpoints} stage={state.stage} />
      <WorkGrid
        activeBrief={activeBrief}
        events={state.events}
        followUps={state.followUps}
        lifecycle={state.runLifecycle}
        question={state.question}
        sourceMap={sourceMap}
        onAskFollowUp={askFollowUp}
        onOpenCitation={openCitation}
        onQuestionChange={changeQuestion}
      />
      <section className="media-trigger" style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", padding: "14px 0" }}>
        <button
          type="button"
          className="media-trigger__cta"
          onClick={createMediaRun}
          disabled={!mediaRequest.ok || mediaBusy}
        >
          {mediaBusy ? "Creating media run…" : "Create media run from this Read"}
        </button>
        {!mediaRequest.ok ? (
          <span className="media-trigger__hint" style={{ fontFamily: "monospace", fontSize: "12px", color: "#94a3b8" }}>
            {describeMediaRunBlocker(mediaRequest.reason)}
          </span>
        ) : null}
        {mediaError ? (
          <span className="media-trigger__error" style={{ fontFamily: "monospace", fontSize: "12px", color: "#ff3b30" }}>
            {mediaError}
          </span>
        ) : null}
      </section>
      <RunFeedbackPanel
        activeRun={state.activeRun}
        feedbackBusy={state.feedbackBusy}
        feedbackEvents={state.feedbackEvents}
        onSubmitFeedback={submitFeedback}
      />
      <OperatorBoard
        candidateQueue={state.candidateQueue}
        caseBoard={state.caseBoard}
        operatorBusy={state.operatorBusy}
        operatorEvents={state.operatorEvents}
        providerCapUsd={state.providerCapUsd}
        providerLiveMode={state.providerLiveMode}
        quoteByCandidate={state.quoteByCandidate}
        receiptByCandidate={state.receiptByCandidate}
        reviewByCandidate={state.reviewByCandidate}
        onFetchReceipt={fetchReceipt}
        onPromoteCandidate={promoteCandidate}
        onProviderBudgetChange={(providerCapUsd) => dispatch({ type: "provider_budget_changed", providerCapUsd })}
        onProviderLiveModeChange={(providerLiveMode) => dispatch({ type: "provider_live_mode_changed", providerLiveMode })}
        onQuoteChange={(candidateId, quote) => dispatch({ type: "quote_changed", candidateId, quote })}
        onReviewCandidate={reviewCandidate}
        onRunSearch={runOperatorSearch}
      />
      <SourceBand />

      {state.activeCitation ? <CitationOverlay citation={state.activeCitation} onClose={closeCitation} /> : null}
      {state.accessState === "open" ? <AccessRequestDialog onClose={closeAccess} /> : null}
    </main>
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
