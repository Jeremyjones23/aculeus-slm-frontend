"use client";

import { memo, useState } from "react";

export const Topbar = memo(function Topbar({ onRequestAccess }) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Aculeus home">
        <img src="/assets/aculeus-logomark.svg" alt="" decoding="async" />
        <span>ACULEUS</span>
      </a>
      <nav className="topnav" aria-label="Workspace">
        <a href="#run">Run</a>
        <a href="#brief">Brief</a>
        <a href="#sources">Sources</a>
        <a href="/disclaimer">Disclaimer</a>
        <button type="button" onClick={onRequestAccess}>Request access</button>
      </nav>
    </header>
  );
});

export const Hero = memo(function Hero({ defaultLead, lead, recentCases, onChooseRecent, onLeadChange, onSubmit }) {
  return (
    <section className="hero" id="run">
      <div className="signal" aria-hidden="true">
        <span />
      </div>
      <p className="eyebrow">Invite-only intelligence for public records</p>
      <h1>Ask Aculeus. Watch the record open.</h1>
      <p className="lede">
        A controlled agentic system for operators who need answers tied to sources, citations, missing records, and the next move.
      </p>

      <form className="command-surface" onSubmit={onSubmit}>
        <label htmlFor="lead-input">Start with one lead</label>
        <textarea
          id="lead-input"
          value={lead}
          onChange={(event) => onLeadChange(event.target.value)}
          placeholder={defaultLead}
          maxLength={480}
        />
        <div className="command-row">
          <span>{lead.length} / 480</span>
          <button type="submit">Run Aculeus <span aria-hidden="true">→</span></button>
        </div>
      </form>

      <div className="recent-strip" aria-label="Recent cases">
        {recentCases.slice(0, 3).map((item) => (
          <button type="button" key={item.caseId} onClick={() => onChooseRecent(item)}>
            <span>{item.displayId}</span>
            <strong>{item.title}</strong>
            <small>{item.sourceCount} sources · {item.missingCount} gaps</small>
          </button>
        ))}
      </div>
    </section>
  );
});

export const RunStage = memo(function RunStage({ checkpoints, stage }) {
  return (
    <section className="run-stage" aria-label="Run checkpoints">
      {checkpoints.map((item) => (
        <article className={stage === item.state ? "checkpoint active" : "checkpoint"} key={item.state}>
          <span>{item.state}</span>
          <strong>{item.label}</strong>
          <p>{item.detail}</p>
        </article>
      ))}
    </section>
  );
});

export const WorkGrid = memo(function WorkGrid({ activeBrief, events, followUps, lifecycle, question, sourceMap, onAskFollowUp, onOpenCitation, onQuestionChange }) {
  return (
    <section className="work-grid">
      <RunFeed events={events} lifecycle={lifecycle} />
      <AnswerBrief
        activeBrief={activeBrief}
        sourceMap={sourceMap}
        onAskFollowUp={onAskFollowUp}
        onOpenCitation={onOpenCitation}
      />
      <RefinePanel
        followUps={followUps}
        onAskFollowUp={onAskFollowUp}
        onQuestionChange={onQuestionChange}
        question={question}
      />
    </section>
  );
});

export const RunFeedbackPanel = memo(function RunFeedbackPanel({ activeRun, feedbackBusy, feedbackEvents, onSubmitFeedback }) {
  return (
    <section className="feedback-panel" aria-label="User product reward signals">
      <div>
        <p className="eyebrow">Training signal gate</p>
        <h2>User feedback is saved for offline review.</h2>
        <p>Signals become scored trace rows. They do not update the model until review, eval, and promotion gates pass.</p>
      </div>
      <div className="feedback-actions">
        {[
          ["useful", "Useful"],
          ["not_useful", "Not useful"],
          ["opened_evidence", "Opened evidence"],
          ["saved_or_exported", "Saved/exported"],
          ["flagged_hallucination", "Flag hallucination"],
          ["dismissed_finding", "Dismiss finding"]
        ].map(([type, label]) => (
          <button
            type="button"
            key={type}
            disabled={!activeRun?.runId || feedbackBusy === type}
            onClick={() => onSubmitFeedback(type)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="feedback-log">
        {(feedbackEvents.length ? feedbackEvents : ["No feedback signals recorded for this run yet."]).map((event, index) => (
          <p key={`${event}-${index}`}><i />{event}</p>
        ))}
      </div>
    </section>
  );
});

export const OperatorBoard = memo(function OperatorBoard({
  candidateQueue,
  caseBoard,
  operatorBusy,
  operatorEvents,
  providerCapUsd,
  providerLiveMode,
  quoteByCandidate,
  receiptByCandidate,
  reviewByCandidate,
  onFetchReceipt,
  onPromoteCandidate,
  onProviderBudgetChange,
  onProviderLiveModeChange,
  onQuoteChange,
  onReviewCandidate,
  onRunSearch
}) {
  return (
    <section className="operator-board" data-operator-controls="source-fed-operator-loop" aria-label="Operator retrieval controls">
      <div className="operator-header">
        <div>
          <p className="eyebrow">Live retrieval loop</p>
          <h2>Route the model through records, not guesses.</h2>
        </div>
        <div className="operator-actions">
          <button type="button" onClick={() => onRunSearch("official")} disabled={Boolean(operatorBusy)}>
            Run public APIs
          </button>
          <button type="button" onClick={() => onRunSearch("provider")} disabled={Boolean(operatorBusy)}>
            Run providers
          </button>
        </div>
      </div>

      <div className="operator-budget-row">
        <label className="provider-budget-control">
          <span>Provider cap</span>
          <input
            min="0"
            step="0.01"
            type="number"
            value={providerCapUsd}
            onChange={(event) => onProviderBudgetChange(event.target.value)}
          />
        </label>
        <label className="provider-live-toggle">
          <input
            type="checkbox"
            checked={Boolean(providerLiveMode)}
            onChange={(event) => onProviderLiveModeChange(event.target.checked)}
          />
          <span>Live provider mode</span>
        </label>
        <small>Hard stop: providers stay fixture-only unless live mode is on and the cap is above zero.</small>
      </div>

      <div className="operator-grid">
        <aside className="operator-log" aria-label="Operator events">
          <span>Run ledger</span>
          {(operatorEvents.length ? operatorEvents : [
            "Public APIs and providers create candidate leads.",
            "Receipt fetch and reviewer promotion decide what can become evidence.",
            "Training traces export from planning, retrieval, and reviewer actions."
          ]).map((item, index) => (
            <p key={`${item}-${index}`}><i />{item}</p>
          ))}
        </aside>

        <div className="candidate-queue" aria-label="Reviewer evidence-promotion queue">
          {candidateQueue.length ? candidateQueue.slice(0, 8).map((candidate) => {
            const receipt = receiptByCandidate[candidate.candidate_id] || { receipt: { excerpt: "" } };
            const review = reviewByCandidate[candidate.candidate_id];
            const selectedQuote = quoteByCandidate[candidate.candidate_id] || receipt.receipt.excerpt || candidate.snippet || candidate.title;
            return (
              <article key={candidate.candidate_id} className="candidate-row">
                <div>
                  <span>{candidate.provider || candidate.source_family} · score {candidate.source_quality_score ?? "n/a"}</span>
                  <h3>{candidate.title}</h3>
                  <p>{candidate.snippet || candidate.candidate_reason}</p>
                  <small>{candidate.normalized_url || candidate.url}</small>
                  <details className="official-drilldown">
                    <summary>Official API drilldown</summary>
                    <dl>
                      <div>
                        <dt>Request preview</dt>
                        <dd>{formatJson(candidate.request_preview || candidate.requestPreview || candidate.search_query || candidate.query)}</dd>
                      </div>
                      <div>
                        <dt>Response hash</dt>
                        <dd>{candidate.response_hash || candidate.content_hash || candidate.receipt_hash || "pending receipt"}</dd>
                      </div>
                      <div>
                        <dt>No secret headers are shown</dt>
                        <dd>{candidate.public_safe === false ? "held for review" : "public-safe metadata only"}</dd>
                      </div>
                    </dl>
                  </details>
                  {receipt.receipt.excerpt ? (
                    <label className="quote-picker">
                      <span>Selected quote</span>
                      <textarea
                        value={selectedQuote}
                        onChange={(event) => onQuoteChange(candidate.candidate_id, event.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
                <div className="candidate-actions">
                  <button type="button" onClick={() => onFetchReceipt(candidate)} disabled={operatorBusy === candidate.candidate_id}>
                    Fetch receipt
                  </button>
                  <button type="button" onClick={() => onPromoteCandidate(candidate)} disabled={!receipt?.receipt?.receipt_id}>
                    Promote source
                  </button>
                  <button type="button" onClick={() => onReviewCandidate(candidate, "reject_candidate_source")}>
                    Reject
                  </button>
                  <button type="button" onClick={() => onReviewCandidate(candidate, "defer_candidate_source")}>
                    Defer
                  </button>
                  <button type="button" onClick={() => onReviewCandidate(candidate, "annotate_candidate_source")}>
                    Annotate
                  </button>
                  <button type="button" onClick={() => onReviewCandidate(candidate, "request_missing_record")}>
                    Request record
                  </button>
                  <strong>{review?.status || receipt?.ledger_entry?.status || candidate.reviewer_queue_status}</strong>
                </div>
              </article>
            );
          }) : (
            <article className="empty-candidate-row">
              <h3>No reviewer candidates yet.</h3>
              <p>Run public APIs or providers to fill the queue. The UI will show leads, quality scores, receipt status, and promotion gates here.</p>
            </article>
          )}
        </div>
      </div>

      <PersistedCaseBoardSections caseBoard={caseBoard} />
    </section>
  );
});

function PersistedCaseBoardSections({ caseBoard }) {
  const missingRecords = caseBoard?.missingRecords || [];
  const rejectedOrWeakClaims = caseBoard?.rejectedOrWeakClaims || [];
  const verifierIssues = caseBoard?.verifierIssues || [];
  const auditTrail = caseBoard?.auditTrail || [];

  return (
    <div className="case-board-sections" aria-label="Persisted case board sections">
      <article>
        <span>persisted ledger rows</span>
        <strong>Missing records</strong>
        {(missingRecords.length ? missingRecords.slice(0, 4) : [{ request: "No missing record tasks persisted yet.", reason: "Run retrieval or request a record from a candidate." }]).map((item, index) => (
          <p key={`missing-${index}`}>{item.request || item.title || item.reason} {item.reason ? `- ${item.reason}` : ""}</p>
        ))}
      </article>
      <article>
        <span>review queue</span>
        <strong>Rejected or weak claims</strong>
        {(rejectedOrWeakClaims.length ? rejectedOrWeakClaims.slice(0, 4) : [{ status: "none", entry_type: "No rejected or weak claims yet." }]).map((item, index) => (
          <p key={`weak-${index}`}>{item.entry_type || item.type}: {item.status || "pending"}</p>
        ))}
      </article>
      <article>
        <span>deterministic gates</span>
        <strong>Verifier failures</strong>
        {(verifierIssues.length ? verifierIssues.slice(0, 4) : [{ message: "No verifier failures recorded for this board." }]).map((item, index) => (
          <p key={`verifier-${index}`}>{item.issue_type || item.severity || "gate"}: {item.message || String(item)}</p>
        ))}
      </article>
      <article>
        <span>operator trace</span>
        <strong>Audit trail</strong>
        {(auditTrail.length ? auditTrail.slice(0, 4) : [{ type: "awaiting_run", status: "pending", created_at: "" }]).map((item, index) => (
          <p key={`audit-${index}`}>{item.type || item.entry_type}: {item.status || "logged"} {item.created_at ? `at ${item.created_at}` : ""}</p>
        ))}
      </article>
    </div>
  );
}

function formatJson(value) {
  if (!value) return "not captured";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "unavailable";
  }
}

export const SourceBand = memo(function SourceBand() {
  return (
    <section className="source-band" id="sources">
      <p className="eyebrow">Source standard</p>
      <h2>Every claim points somewhere real.</h2>
      <p>Public records link out. Private files open inside the workspace with the file, page, row, section, or excerpt Aculeus used.</p>
    </section>
  );
});

export const CitationOverlay = memo(function CitationOverlay({ citation, onClose }) {
  return (
    <div className="citation-overlay" role="dialog" aria-modal="true" aria-label="Citation">
      <article>
        <button type="button" className="close" onClick={onClose}>×</button>
        <span>{citation.supportLevel}</span>
        <h3>{citation.title}</h3>
        <p><strong>Publisher:</strong> {citation.publisher}</p>
        <p><strong>Location:</strong> {citation.location}</p>
        <blockquote>{citation.excerpt}</blockquote>
        <p>{citation.limitation}</p>
        {citation.url ? <a href={citation.url} target="_blank" rel="noreferrer">Open actual source location</a> : <button type="button">Open private artifact anchor</button>}
      </article>
    </div>
  );
});

export function AccessRequestDialog({ onClose }) {
  const [sent, setSent] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await fetch("/api/access-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    setSent(true);
  }

  return (
    <div className="citation-overlay" role="dialog" aria-modal="true" aria-label="Request access">
      <article className="access-card">
        <button type="button" className="close" onClick={onClose}>×</button>
        <span>Invite-only beta</span>
        <h3>Request Aculeus access</h3>
        {sent ? (
          <p>Request captured. The workspace stays locked until an admin approves the account.</p>
        ) : (
          <form onSubmit={submit}>
            <input name="name" placeholder="Name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="organization" placeholder="Organization" />
            <textarea name="work" placeholder="What public-records work do you want to run?" required />
            <button type="submit">Request access</button>
          </form>
        )}
      </article>
    </div>
  );
}

function RunFeed({ events, lifecycle }) {
  const visibleEvents = events.length ? events : ["Ready for a lead.", "Recent cases belong to the operator workspace.", "Nothing leaves without human approval."];
  return (
    <aside className="run-feed" aria-label="Run feed">
      <span>Run trail</span>
      {visibleEvents.map((item, index) => (
        <p key={`${item}-${index}`}><i />{item}</p>
      ))}
      {lifecycle ? (
        <div className="lifecycle-summary">
          <strong>{lifecycle.state}</strong>
          <small>{lifecycle.terminal ? "Terminal state" : "Polling active"} · partial ledger available</small>
        </div>
      ) : null}
    </aside>
  );
}

function AnswerBrief({ activeBrief, sourceMap, onAskFollowUp, onOpenCitation }) {
  return (
    <article className="answer-brief" id="brief">
      {activeBrief ? (
        <>
          <p className="eyebrow">{activeBrief.eyebrow}</p>
          <h2>{activeBrief.title}</h2>
          <section>
            <span>Bottom line</span>
            <p>{activeBrief.bottomLine}</p>
          </section>
          <section>
            <span>Why it matters</span>
            <p>{activeBrief.whyItMatters}</p>
          </section>
          <section>
            <span>What supports it</span>
            <div className="support-list">
              {activeBrief.support.map((item) => (
                <div key={item.id}>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <div className="citation-row">
                    {item.citationIds.map((citationId) => {
                      const citation = sourceMap.get(citationId);
                      return (
                        <button type="button" key={citationId} onClick={() => onOpenCitation(citation)}>
                          {citation?.url ? "Open source" : "Open artifact"} {citationId.replace("cite_", "#")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <span>What is missing</span>
            <div className="missing-list">
              {activeBrief.missing.map((item) => (
                <p key={item.id}><strong>{item.request}</strong> {item.reason}</p>
              ))}
            </div>
          </section>
          <section>
            <span>Suggested next moves</span>
            <div className="move-list">
              {activeBrief.suggestedNextMoves.map((move) => (
                <button type="button" key={move} onClick={() => onAskFollowUp(null, move)}>{move}</button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="empty-brief">
          <p className="eyebrow">Awaiting run</p>
          <h2>The record opens after you ask.</h2>
          <p>Start with a lead. Aculeus will retrieve, reason, cite, and return a brief with the next move.</p>
        </div>
      )}
    </article>
  );
}

function RefinePanel({ followUps, onAskFollowUp, onQuestionChange, question }) {
  return (
    <aside className="refine-panel">
      <form onSubmit={onAskFollowUp}>
        <label htmlFor="follow-up">Ask or tighten</label>
        <textarea
          id="follow-up"
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="Ask which claim holds, what source proves it, what is missing, or how to narrow the answer."
        />
        <button type="submit">Send <span aria-hidden="true">↑</span></button>
      </form>
      <div className="follow-up-thread">
        {followUps.map((item, index) => (
          <article key={index} className={item.role}>
            <span>{item.role === "operator" ? "You" : "Aculeus"}</span>
            <p>{item.text || item.answer}</p>
            {item.safeNextMove ? <small>Next: {item.safeNextMove}</small> : null}
          </article>
        ))}
      </div>
    </aside>
  );
}
