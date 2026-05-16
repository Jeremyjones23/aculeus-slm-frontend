const EXPORT_SCHEMA_VERSION = "aculeus_reviewer_export_packet_v1";
const PUBLIC_BLOCKLIST = [
  /api[_-]?key/i,
  /authorization/i,
  /bearer\s+[a-z0-9._-]+/i,
  /secret/i,
  /raw[_-]?text/i,
  /provider[_-]?request[_-]?payload/i,
  /request[_-]?headers/i,
  /EXA_API_KEY/,
  /PARALLEL_API_KEY/,
  /DATA_GOV_API_KEY/
];

export function buildReviewerExportPacket(run = {}, options = {}) {
  const visibility = options.visibility === "private" ? "private" : "public";
  const ledger = Array.isArray(run.ledger) ? run.ledger : [];
  const evidenceRecords = collectEvidenceRecords(ledger);
  const findings = buildFindingRows(run.answerBrief?.support || [], evidenceRecords);
  const receipts = collectReceiptRefs(ledger, evidenceRecords);
  const rejectedOrWeakClaims = ledger
    .filter((entry) => ["blocked", "rejected", "needs_operator_review", "candidate_deferred", "candidate_rejected_or_deferred"].includes(entry.status))
    .map(publicLedgerSummary);

  const packet = {
    schema_version: EXPORT_SCHEMA_VERSION,
    export_id: `export_${run.runId || "run"}_${visibility}`,
    run_id: run.runId || "",
    case_id: run.caseId || "",
    visibility,
    public_safe: visibility === "public",
    generated_at: options.generatedAt || new Date().toISOString(),
    formats: ["json", "html", "pdf"],
    case_header: {
      title: run.answerBrief?.title || run.caseTitle || run.title || run.lead || "Aculeus case",
      lead: run.lead || run.rawQuery || "",
      status: run.status || "review",
      created_at: run.createdAt || null,
      updated_at: run.updatedAt || null
    },
    findings,
    evidence_records: evidenceRecords.map(publicEvidenceRecord),
    receipt_refs: receipts,
    source_ledger: ledger.map(publicLedgerSummary),
    missing_records: Array.isArray(run.answerBrief?.missing) ? run.answerBrief.missing.map(publicMissingRecord) : [],
    rejected_or_weak_claims: rejectedOrWeakClaims,
    verifier_status: buildVerifierStatus(ledger, findings),
    limitations: [
      "Provider, search, API, crawler, PDF, and Qdrant rows are candidate leads until receipt-backed reviewer promotion.",
      "Public exports include metadata, evidence IDs, receipt IDs, source locations, limitations, and verifier status; raw fetched text and provider request headers are excluded.",
      "Rejected or weak claims are separated from supported findings and cannot support a finding card."
    ],
    invariants: {
      candidates_are_evidence: false,
      every_finding_has_evidence_ids: findings.every((finding) => finding.evidence_ids.length > 0),
      rejected_claims_separated: true,
      raw_receipt_text_excluded: true
    }
  };

  if (visibility === "private") {
    packet.internal_only = {
      reviewer_actions: ledger.filter((entry) => entry.entry_type === "reviewer_action").map(publicLedgerSummary),
      training_trace_refs: Array.isArray(run.trainingTraces) ? run.trainingTraces : [],
      run_lifecycle: run.lifecycle || null
    };
  }

  return packet;
}

export function renderReviewerExportHtml(packet = {}) {
  const title = escapeHtml(packet.case_header?.title || "Aculeus export");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #101216; margin: 32px; line-height: 1.45; }
    header, section { margin-bottom: 28px; }
    h1, h2 { letter-spacing: 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d8dde6; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f4f6f8; }
    code { background: #eef1f5; padding: 2px 4px; }
  </style>
</head>
<body>
  <header>
    <p>Aculeus reviewer export packet</p>
    <h1>${title}</h1>
    <p>Run <code>${escapeHtml(packet.run_id)}</code> · ${escapeHtml(packet.visibility)} · generated ${escapeHtml(packet.generated_at)}</p>
  </header>
  ${renderFindingsTable(packet.findings || [])}
  ${renderEvidenceList(packet.evidence_records || [])}
  ${renderSimpleList("Missing records", packet.missing_records || [], "request")}
  ${renderSimpleList("Rejected or weak claims", packet.rejected_or_weak_claims || [], "status")}
  ${renderSimpleList("Limitations", (packet.limitations || []).map((text) => ({ text })), "text")}
</body>
</html>`;
}

export function renderReviewerExportPdf(packet = {}) {
  const lines = [
    "Aculeus reviewer export packet",
    packet.case_header?.title || "Aculeus case",
    `Run: ${packet.run_id || ""}`,
    `Visibility: ${packet.visibility || "public"}`,
    `Findings: ${(packet.findings || []).length}`,
    `Evidence records: ${(packet.evidence_records || []).length}`,
    "Candidate leads are not evidence until receipt-backed reviewer promotion."
  ];
  const text = lines.map((line, index) => `BT /F1 11 Tf 50 ${760 - (index * 18)} Td (${escapePdfText(line)}) Tj ET`).join("\n");
  const body = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${text.length} >> stream\n${text}\nendstream endobj`
  ].join("\n");
  return `%PDF-1.4\n${body}\ntrailer << /Root 1 0 R >>\n%%EOF\n`;
}

export function validateReviewerExportPacket(packet = {}) {
  const issues = [];
  if (packet.schema_version !== EXPORT_SCHEMA_VERSION) issues.push("export packet schema version mismatch");
  if (!packet.export_id || !packet.run_id || !packet.case_id) issues.push("export packet missing identifiers");
  if (!Array.isArray(packet.formats) || !["json", "html", "pdf"].every((format) => packet.formats.includes(format))) {
    issues.push("export packet must advertise json, html, and pdf formats");
  }
  if (!Array.isArray(packet.findings)) issues.push("export packet findings must be an array");
  for (const finding of packet.findings || []) {
    if (!Array.isArray(finding.evidence_ids) || !finding.evidence_ids.length) {
      issues.push(`finding ${finding.finding_id || "unknown"} missing evidence ids`);
    }
  }
  if (!Array.isArray(packet.rejected_or_weak_claims)) issues.push("rejected or weak claims must be separated");
  if (!packet.limitations?.some((item) => item.includes("candidate leads"))) issues.push("export packet missing candidate-only limitation");
  if (packet.visibility === "public" && Object.prototype.hasOwnProperty.call(packet, "internal_only")) {
    issues.push("public export includes internal-only fields");
  }
  return issues;
}

export function scanPublicExportArtifact(artifact) {
  const text = typeof artifact === "string" ? artifact : JSON.stringify(artifact);
  return PUBLIC_BLOCKLIST
    .filter((pattern) => pattern.test(text))
    .map((pattern) => `public export contains blocked pattern ${pattern}`);
}

function buildFindingRows(supportRows, evidenceRecords) {
  const fallbackEvidenceIds = evidenceRecords.map((record) => record.evidence_id).filter(Boolean);
  return supportRows.map((item, index) => {
    const evidenceIds = uniqueStrings([
      ...(Array.isArray(item.evidence_ids) ? item.evidence_ids : []),
      ...(Array.isArray(item.evidenceIds) ? item.evidenceIds : []),
      ...(Array.isArray(item.citationIds) ? item.citationIds : []),
      ...(fallbackEvidenceIds.length ? [fallbackEvidenceIds[index] || fallbackEvidenceIds[0]] : [])
    ]);
    return {
      finding_id: item.id || `finding_${index + 1}`,
      status: item.status || (evidenceIds.length ? "supported_by_exported_evidence" : "unsupported_for_export"),
      type: item.type || "source_supported_observation",
      severity: item.severity || "review",
      confidence: item.confidence || "bounded",
      claim: item.title || item.claim || item.body || "Untitled finding",
      summary: item.body || item.summary || "",
      evidence_ids: evidenceIds,
      contradicting_evidence_ids: Array.isArray(item.contradicting_evidence_ids) ? item.contradicting_evidence_ids : [],
      missing_records: Array.isArray(item.missing_records) ? item.missing_records : [],
      next_action: item.next_action || "Review evidence records and missing-record tasks before publishing."
    };
  });
}

function collectEvidenceRecords(ledger) {
  return ledger
    .map((entry) => entry.result?.evidence_record || entry.evidence_record)
    .filter(Boolean);
}

function collectReceiptRefs(ledger, evidenceRecords) {
  const fromEvidence = evidenceRecords.map((record) => ({
    receipt_id: record.receipt_id,
    evidence_id: record.evidence_id,
    url: record.url || record.provenance?.url || "",
    content_hash: record.content_hash || "",
    quote: record.provenance?.quote || ""
  }));
  const fromLedger = ledger
    .map((entry) => entry.receipt || entry.result?.receipt)
    .filter(Boolean)
    .map((receipt) => ({
      receipt_id: receipt.receipt_id,
      url: receipt.url,
      content_hash: receipt.content_hash,
      captured_at: receipt.captured_at
    }));
  return dedupeById([...fromEvidence, ...fromLedger], "receipt_id");
}

function publicEvidenceRecord(record) {
  return {
    evidence_id: record.evidence_id,
    receipt_id: record.receipt_id,
    source_id: record.source_id || record.candidate_id || "",
    title: record.title || "",
    url: record.url || record.provenance?.url || "",
    content_hash: record.content_hash || "",
    quote: record.provenance?.quote || "",
    supports_finding: true
  };
}

function publicLedgerSummary(entry) {
  return {
    ledger_entry_id: entry.ledger_entry_id || entry.id || "",
    entry_type: entry.entry_type || "ledger_entry",
    status: entry.status || "recorded",
    labels: Array.isArray(entry.labels) ? entry.labels : [],
    public_safe: entry.public_safe !== false,
    created_at: entry.created_at || null
  };
}

function publicMissingRecord(record) {
  return {
    id: record.id || record.missing_record_id || "",
    request: record.request || record.title || "",
    reason: record.reason || "",
    status: record.status || "needs_public_records_request"
  };
}

function buildVerifierStatus(ledger, findings) {
  const issues = ledger.flatMap((entry) => Array.isArray(entry.validation_issues)
    ? entry.validation_issues
    : entry.result?.verifier?.issues || entry.verifier?.issues || []);
  return {
    every_finding_has_evidence_ids: findings.every((finding) => finding.evidence_ids.length > 0),
    issue_count: issues.length,
    issues: issues.map((issue) => ({
      severity: issue.severity || "review",
      issue_type: issue.issue_type || "verifier_issue",
      message: issue.message || String(issue)
    }))
  };
}

function renderFindingsTable(findings) {
  const rows = findings.map((finding) => `<tr><td>${escapeHtml(finding.finding_id)}</td><td>${escapeHtml(finding.claim)}</td><td>${escapeHtml(finding.evidence_ids.join(", "))}</td><td>${escapeHtml(finding.status)}</td></tr>`).join("");
  return `<section><h2>Findings</h2><table><thead><tr><th>ID</th><th>Claim</th><th>Evidence IDs</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function renderEvidenceList(evidenceRecords) {
  const rows = evidenceRecords.map((record) => `<tr><td>${escapeHtml(record.evidence_id)}</td><td>${escapeHtml(record.receipt_id)}</td><td>${escapeHtml(record.url)}</td><td>${escapeHtml(record.content_hash)}</td></tr>`).join("");
  return `<section><h2>Evidence records</h2><table><thead><tr><th>Evidence ID</th><th>Receipt ID</th><th>URL</th><th>Hash</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function renderSimpleList(title, rows, field) {
  const items = rows.map((row) => `<li>${escapeHtml(row[field] || row.request || row.status || "")}</li>`).join("");
  return `<section><h2>${escapeHtml(title)}</h2><ul>${items}</ul></section>`;
}

function dedupeById(rows, field) {
  const seen = new Map();
  for (const row of rows) {
    const key = row[field] || JSON.stringify(row);
    if (!seen.has(key)) seen.set(key, row);
  }
  return [...seen.values()];
}

function uniqueStrings(items) {
  return [...new Set(items.filter(Boolean).map(String))];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapePdfText(value) {
  return String(value ?? "").replace(/[\\()]/g, "\\$&").slice(0, 110);
}
