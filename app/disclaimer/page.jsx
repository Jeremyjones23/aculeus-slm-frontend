export const metadata = {
  title: "Aculeus Disclaimer"
};

export default function DisclaimerPage() {
  return (
    <main className="disclaimer-shell">
      <section className="disclaimer-header">
        <p className="eyebrow">Pilot customer terms</p>
        <h1>Aculeus is an investigative records system, not a final adjudicator.</h1>
        <p>
          Aculeus helps approved customers search, organize, and review public-record leads. It does not replace human review, legal analysis,
          accounting judgment, agency determinations, or final editorial responsibility.
        </p>
      </section>
      <section className="disclaimer-grid" aria-label="Aculeus operating disclaimer">
        {items.map((item) => (
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

const items = [
  {
    label: "Evidence",
    title: "Candidate leads are not proof.",
    body: "Search results, provider snippets, crawler findings, and model-generated hypotheses remain candidate leads until a receipt, citation check, and reviewer promotion gate mark the source usable."
  },
  {
    label: "Claims",
    title: "No automatic fraud or intent finding.",
    body: "The product can surface anomalies, missing records, spending patterns, and source conflicts, but allegations of fraud, waste, abuse, intent, or wrongdoing require independent customer review before use."
  },
  {
    label: "Sources",
    title: "External records control the truth layer.",
    body: "Models guide planning, gap analysis, and formatting. Public records, official APIs, receipts, hashes, reviewer notes, and audit logs are the evidence layer."
  },
  {
    label: "Use",
    title: "Customer responsibility remains active.",
    body: "Customers are responsible for lawful use, public-records compliance, confidentiality, attribution, downstream publication decisions, and professional review before acting on any finding."
  }
];
