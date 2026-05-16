export const metadata = {
  title: "Aculeus Privacy"
};

export default function PrivacyPage() {
  return (
    <main className="policy-shell">
      <section className="policy-header">
        <p className="eyebrow">Privacy and data handling</p>
        <h1>Aculeus stores investigation data to preserve evidence, auditability, and user control.</h1>
        <p>
          This statement describes pilot handling for uploaded sources, public-record receipts, run traces, reviewer notes, exports, access
          requests, and operational telemetry.
        </p>
      </section>

      <section className="policy-grid" aria-label="Aculeus privacy and data handling">
        {privacy.map((item) => (
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

const privacy = [
  {
    label: "Data",
    title: "We keep the materials needed to audit a run.",
    body: "Aculeus may store case prompts, uploaded sources, public URLs, receipts, hashes, excerpts, source ledgers, reviewer notes, feedback, traces, exports, and account-access records."
  },
  {
    label: "Purpose",
    title: "Stored data supports evidence integrity.",
    body: "The data is used to reproduce source paths, verify citations, debug failures, review training traces, measure provider spend, and preserve a case audit trail."
  },
  {
    label: "Training",
    title: "Production traces do not update models directly.",
    body: "User activity can become scored training data only after review, export, eval, shadow deployment, and promotion gates. Raw production use is not a live model-update loop."
  },
  {
    label: "Retention",
    title: "Retention is controlled by dry-run before deletion.",
    body: "Runs, traces, receipts, exports, and access requests must have documented retention windows. Deletion candidates are listed by retention dry-run before any destructive cleanup."
  },
  {
    label: "Access",
    title: "Role gates limit who can see and export data.",
    body: "Admins can operate pilot controls, reviewers can handle evidence workflows, operators can run approved retrieval, and viewers receive read-only access where permitted."
  },
  {
    label: "Requests",
    title: "Customers can request deletion or export review.",
    body: "Deletion, export, and correction requests should be routed through the account owner so evidence preservation, customer obligations, and audit needs can be reconciled."
  }
];
