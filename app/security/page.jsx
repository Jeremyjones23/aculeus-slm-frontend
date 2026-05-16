export const metadata = {
  title: "Aculeus Security"
};

export default function SecurityPage() {
  return (
    <main className="policy-shell">
      <section className="policy-header">
        <p className="eyebrow">Security and incident response</p>
        <h1>Incidents preserve the evidence trail first.</h1>
        <p>
          Aculeus treats auth failures, spend anomalies, source leakage, verifier failures, crawler errors, export mistakes, data-retention
          issues, and platform-check failures as reportable operational events.
        </p>
      </section>

      <section className="policy-grid" aria-label="Aculeus security and incident response">
        {security.map((item) => (
          <article key={item.title}>
            <span>{item.label}</span>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

const security = [
  {
    label: "Packet",
    title: "Incident packet export is the first response artifact.",
    body: "A complete packet should capture run ID, case ID, workspace, role, provider mode, source ledger, verifier issues, telemetry, backup reference, and immediate containment status."
  },
  {
    label: "Containment",
    title: "Disable risky surfaces before editing evidence.",
    body: "Operators should disable live providers, pause exports, preserve ledgers, and keep backup references intact before attempting corrections or cleanup."
  },
  {
    label: "Evidence",
    title: "Do not destructively alter records during triage.",
    body: "Evidence rows, receipts, reviewer notes, and traces should remain available for audit. Retention dry-run identifies deletion candidates before any approved destructive action."
  },
  {
    label: "Auth",
    title: "Identity failures are production blockers.",
    body: "Unexpected access, missing role claims, pending-account access, or Clerk configuration failure blocks customer expansion until reproduced, fixed, and verified."
  },
  {
    label: "Spend",
    title: "Provider caps and alerts are part of security.",
    body: "Spend near-cap alerts, provider disablement, daily totals, and workspace/provider accounting are required for controlled pilots and customer trust."
  },
  {
    label: "Recovery",
    title: "Rollback is tied to a verified smoke path.",
    body: "Production recovery should identify the deployment ID, rollback target, source SHA, smoke artifacts, owner, and customer communication status before normal operation resumes."
  }
];
