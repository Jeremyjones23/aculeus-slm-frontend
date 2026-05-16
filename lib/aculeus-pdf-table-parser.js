export function createPdfTableParseTask(input = {}) {
  return {
    task_id: input.task_id || `pdf_table_${Date.now()}`,
    source_id: input.source_id || "pdf_source",
    title: input.title || "PDF/table source",
    url: input.url || null,
    source_family: input.source_family || "official_page_or_pdf",
    parser: "text_layer_table_anchor_parser",
    receipt_required: true,
    evidence_promotion_allowed: false,
    public_safe: true
  };
}

export function parsePdfTableText(task = {}, text = "") {
  const rows = [];
  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseAnchoredLine(line);
    if (!parsed) continue;
    rows.push({
      candidate_id: `${task.task_id || task.source_id}_page_${parsed.page}_row_${parsed.row}`,
      source_id: task.source_id,
      task_id: task.task_id,
      provider: "PDF/table parser",
      provider_id: task.source_id,
      source_family: "pdf_table_candidate",
      title: parsed.title || task.title,
      url: task.url,
      snippet: parsed.cells.join(" | "),
      page_number: parsed.page,
      row_label: `Row ${parsed.row}`,
      table_cells: parsed.cells,
      anchor: {
        page_number: parsed.page,
        row_label: `Row ${parsed.row}`,
        source_id: task.source_id,
        public_safe: true
      },
      evidence_id: null,
      evidence_promotion_allowed: false,
      candidate_only_until_receipted: true,
      receipt_required: true,
      public_safe: true
    });
  }

  return {
    status: rows.length ? "PASS" : "NO_ROWS",
    source_id: task.source_id,
    task_id: task.task_id,
    parser: "text_layer_table_anchor_parser",
    extraction_status: "text_layer_parsed",
    row_count: rows.length,
    candidates: rows,
    unsupported_claims_generated: false,
    evidence_promotion_allowed: false,
    public_safe: true
  };
}

export function validatePdfTableParse(result) {
  const issues = [];
  if (!result || typeof result !== "object") return ["pdf table parse result must be an object"];
  if (result.unsupported_claims_generated !== false) issues.push("parser must not generate unsupported claims");
  if (result.evidence_promotion_allowed !== false) issues.push("parser result must not allow evidence promotion");
  for (const candidate of result.candidates || []) {
    if (!candidate.anchor?.page_number || !candidate.anchor?.row_label) issues.push(`${candidate.candidate_id} missing page/row anchor`);
    if (candidate.evidence_promotion_allowed !== false || candidate.evidence_id !== null) issues.push(`${candidate.candidate_id} escaped candidate-only gate`);
    if (candidate.receipt_required !== true) issues.push(`${candidate.candidate_id} must require receipt`);
  }
  return issues;
}

function parseAnchoredLine(line) {
  const match = String(line || "").match(/^\s*page\s+(\d+)\s*\|\s*row\s+([^|]+)\s*\|\s*(.+)$/i);
  if (!match) return null;
  const cells = match[3].split("|").map((cell) => cell.trim()).filter(Boolean);
  if (!cells.length) return null;
  return {
    page: Number(match[1]),
    row: String(match[2]).trim(),
    title: cells[0],
    cells
  };
}
