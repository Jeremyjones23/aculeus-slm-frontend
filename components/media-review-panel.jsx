"use client";

// N3 — Media Review panel. Thin presentational glue over buildMediaReviewView
// (lib/aculeus-media-review-view.js), which carries all the logic. Renders the
// cross-demographic diff (same receipts, shared counter-case), per-variant cards with
// click-a-claim -> receipt, and the publish gate. Note: not boot-tested in this
// environment (needs the Next build); the view-model it consumes is verified.

import { useMemo } from "react";
import { buildMediaReviewView } from "../lib/aculeus-media-review-view.js";

export function MediaReviewPanel({ mediaRun, atoms = [], reviewsByVariant = {}, onOpenReceipt, onApprove }) {
  const view = useMemo(
    () => buildMediaReviewView(mediaRun || {}, atoms, reviewsByVariant),
    [mediaRun, atoms, reviewsByVariant]
  );

  if (!view.media_run_id) return <div className="media-review media-review--empty">No media run loaded.</div>;

  return (
    <section className="media-review">
      <header className="media-review__head">
        <h2>Media review</h2>
        <p className="media-review__summary">
          {view.summary.publishable}/{view.summary.total} publishable · {view.summary.needs_human} need review
        </p>
      </header>

      <div className={`media-review__diff ${view.diff.same_receipts ? "is-ok" : "is-warn"}`}>
        <strong>{view.diff.same_receipts ? "Same receipts, different doors" : "Receipts differ across variants"}</strong>
        <span>
          {view.diff.shared_evidence.length} shared receipts ·{" "}
          {view.diff.all_share_counter_case ? "counter-case in every variant" : "counter-case missing in a variant"}
        </span>
      </div>

      <ul className="media-review__variants">
        {view.variants.map((v) => (
          <li key={v.key} className={`media-variant media-variant--${v.status}`}>
            <div className="media-variant__top">
              <span className="media-variant__profile">{v.profile_id} · {v.format}</span>
              <span className={`media-variant__chip chip--${v.status}`}>{v.status}</span>
            </div>
            {v.headline ? <h3 className="media-variant__headline">{v.headline}</h3> : null}

            <ul className="media-variant__claims">
              {v.claims.map((c) => (
                <li key={c.atom_id}>
                  <button
                    type="button"
                    className="media-claim"
                    disabled={!c.receipt}
                    onClick={() => c.receipt && onOpenReceipt?.(c.receipt)}
                    title={c.receipt ? c.receipt.ap_citation : "No receipt"}
                  >
                    {c.receipt ? c.receipt.claim_text || c.atom_id : `Unresolved: ${c.atom_id}`}
                    {c.receipt ? <em className="media-claim__cite"> — {c.receipt.ap_citation}</em> : null}
                  </button>
                </li>
              ))}
            </ul>

            <div className="media-variant__gate">
              {v.publish_gate.can_publish ? (
                <button type="button" className="media-variant__publish" onClick={() => onApprove?.(v)}>
                  Publish
                </button>
              ) : (
                <span className="media-variant__blockers">Blocked: {v.publish_gate.reasons.join(", ")}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
