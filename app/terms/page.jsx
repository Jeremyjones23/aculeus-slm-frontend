export const metadata = {
  title: "Aculeus Terms"
};

export default function TermsPage() {
  return (
    <main className="policy-shell">
      <section className="policy-header">
        <p className="eyebrow">Known paid customer pilot</p>
        <h1>Terms for controlled public-records investigation work.</h1>
        <p>
          These terms define how approved customers may use Aculeus during the pilot. The product is built for public-records investigation,
          evidence organization, source review, and internal decision support.
        </p>
      </section>

      <section className="policy-grid" aria-label="Aculeus terms">
        {terms.map((item) => (
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

const terms = [
  {
    label: "Scope",
    title: "Aculeus is for source-backed public-records work.",
    body: "Approved users may run investigations, retrieve public records, organize receipts, review candidate leads, export case materials, and create missing-record work orders."
  },
  {
    label: "Responsibility",
    title: "The customer owns downstream use.",
    body: "Customers remain responsible for professional review, lawful use, publication choices, attribution, confidentiality, and any decision made from Aculeus outputs."
  },
  {
    label: "Evidence",
    title: "Candidate leads are not proof.",
    body: "Search results, snippets, crawler records, model plans, and provider summaries remain candidate leads until receipt capture, citation verification, and reviewer promotion gates pass."
  },
  {
    label: "Access",
    title: "Accounts are invite-only and role-bound.",
    body: "Admin, operator, reviewer, viewer, and pending accounts receive different capabilities. Shared credentials, unauthorized access, and attempts to bypass role gates are prohibited."
  },
  {
    label: "Systems",
    title: "Provider and crawler limits are enforceable.",
    body: "Customers must respect configured spend caps, rate limits, source restrictions, robots or portal rules, and any provider limitations surfaced in the source ledger."
  },
  {
    label: "Review",
    title: "Human review is part of the product contract.",
    body: "Aculeus can identify anomalies, conflicts, missing records, and next actions. It does not automatically adjudicate fraud, intent, waste, abuse, legality, or culpability."
  }
];
