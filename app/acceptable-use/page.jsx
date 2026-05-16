export const metadata = {
  title: "Aculeus Acceptable Use"
};

export default function AcceptableUsePage() {
  return (
    <main className="policy-shell">
      <section className="policy-header">
        <p className="eyebrow">Acceptable use</p>
        <h1>Use Aculeus to investigate records, not to manufacture accusations.</h1>
        <p>
          Aculeus is designed for disciplined public-records work. The source ledger, reviewer gates, and citation verifier exist to stop
          unsupported claims from becoming product output.
        </p>
      </section>

      <section className="policy-grid" aria-label="Aculeus acceptable-use boundaries">
        {rules.map((item) => (
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

const rules = [
  {
    label: "Allowed",
    title: "Public-records investigation is the core use.",
    body: "Approved users may search official APIs, public portals, records, filings, procurement data, meeting materials, contracts, financial rows, and related public evidence."
  },
  {
    label: "Claims",
    title: "Do not overstate what the evidence supports.",
    body: "Users may not present candidate leads, snippets, missing records, model hypotheses, or weak evidence as verified wrongdoing, fraud, intent, abuse, or illegality."
  },
  {
    label: "People",
    title: "Do not use Aculeus to harass or dox.",
    body: "The product may not be used for harassment, threats, intimidation, private-data fishing, doxxing, stalking, or targeting people outside a legitimate public-records purpose."
  },
  {
    label: "Sources",
    title: "Respect access boundaries.",
    body: "Users may not bypass access controls, scrape private systems, misuse credentials, ignore portal restrictions, or attempt to retrieve non-public information without authorization."
  },
  {
    label: "Exports",
    title: "Exports must preserve limitations.",
    body: "Case exports should retain citation links, evidence IDs, verifier status, confidence, missing records, rejected claims, and source limitations so readers can audit the claim."
  },
  {
    label: "Abuse",
    title: "Unsafe use can remove access.",
    body: "Aculeus may suspend accounts, disable provider access, preserve incident artifacts, or revoke pilot access when use creates source, legal, safety, privacy, or trust risk."
  }
];
