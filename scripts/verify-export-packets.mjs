import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildReviewerExportPacket,
  renderReviewerExportHtml,
  renderReviewerExportPdf,
  scanPublicExportArtifact,
  validateReviewerExportPacket
} from "../lib/aculeus-export-packets.js";
import { buildExportPacket } from "../lib/aculeus-run-api-contracts.js";

const run = {
  runId: "run_export_fixture",
  caseId: "case_export_fixture",
  lead: "Track public funds through contractor records and missing receipts.",
  status: "ready",
  createdAt: "2026-05-16T10:00:00.000Z",
  updatedAt: "2026-05-16T10:05:00.000Z",
  lifecycle: { state: "ready", terminal: true },
  trainingTraces: [{ trace_id: "trace_safe_1", action: "reviewer_action", public_safe: true }],
  answerBrief: {
    title: "Reviewer export fixture",
    support: [{
      id: "finding_1",
      title: "Contract record and receipt show the source trail that needs reviewer attention.",
      body: "A promoted receipt-backed record supports the bounded observation.",
      evidence_ids: ["evidence_1"],
      confidence: "bounded"
    }],
    missing: [{
      id: "missing_1",
      request: "Request the executed amendment and payment backup.",
      reason: "The current source trail does not show all disbursement records."
    }]
  },
  ledger: [{
    ledger_entry_id: "ledger_promote_1",
    entry_type: "reviewer_action",
    status: "source_promoted_to_evidence",
    labels: ["reviewer", "usable_as_evidence"],
    created_at: "2026-05-16T10:04:00.000Z",
    result: {
      evidence_record: {
        evidence_id: "evidence_1",
        receipt_id: "receipt_1",
        source_id: "candidate_1",
        title: "Official contract receipt",
        url: "https://example.gov/contracts/1",
        content_hash: "sha256:abc123",
        provenance: {
          url: "https://example.gov/contracts/1",
          quote: "Contract amount and award date appear in the official record."
        }
      },
      verifier: { issues: [] }
    },
    public_safe: true
  }, {
    ledger_entry_id: "ledger_reject_1",
    entry_type: "reviewer_action",
    status: "candidate_rejected_or_deferred",
    labels: ["reviewer", "candidate_only"],
    created_at: "2026-05-16T10:03:00.000Z",
    public_safe: true
  }, {
    ledger_entry_id: "ledger_candidate_1",
    entry_type: "provider_candidate_set",
    status: "needs_operator_review",
    labels: ["candidate_only", "secondary"],
    created_at: "2026-05-16T10:02:00.000Z",
    public_safe: true,
    raw_text: "this raw fetched text must never survive the public export"
  }]
};

const publicPacket = buildReviewerExportPacket(run, { visibility: "public", generatedAt: "2026-05-16T10:06:00.000Z" });
const privatePacket = buildReviewerExportPacket(run, { visibility: "private", generatedAt: "2026-05-16T10:06:00.000Z" });
const legacyPacket = buildExportPacket(run);
const html = renderReviewerExportHtml(publicPacket);
const pdf = renderReviewerExportPdf(publicPacket);

assertNoIssues(validateReviewerExportPacket(publicPacket), "public packet");
assertNoIssues(validateReviewerExportPacket(privatePacket), "private packet");
assertNoIssues(scanPublicExportArtifact(publicPacket), "public packet scan");
assertNoIssues(scanPublicExportArtifact(html), "public html scan");
assertNoIssues(scanPublicExportArtifact(pdf), "public pdf scan");

if (publicPacket.internal_only) throw new Error("public export leaked internal_only fields");
if (!privatePacket.internal_only?.training_trace_refs?.length) throw new Error("private export missing internal-only training refs");
if (legacyPacket.exportTypes.length !== 3) throw new Error("canonical export route packet must advertise three formats");
if (!legacyPacket.payload.packet?.invariants?.rejected_claims_separated) throw new Error("canonical export packet missing separated rejected-claim invariant");
if (!html.includes("Rejected or weak claims")) throw new Error("HTML export missing rejected/weak section");
if (!pdf.startsWith("%PDF-1.4")) throw new Error("PDF export missing PDF header");
if (!publicPacket.findings.every((finding) => finding.evidence_ids.length > 0)) throw new Error("finding exported without evidence ids");
if (!publicPacket.receipt_refs.some((receipt) => receipt.receipt_id === "receipt_1")) throw new Error("receipt refs missing promoted receipt id");

const outputDir = mkdtempSync(join(tmpdir(), "aculeus-export-packets-"));
writeFileSync(join(outputDir, "reviewer-export.json"), `${JSON.stringify(publicPacket, null, 2)}\n`, "utf8");
writeFileSync(join(outputDir, "reviewer-export.html"), html, "utf8");
writeFileSync(join(outputDir, "reviewer-export.pdf"), pdf, "utf8");

const roundTrip = JSON.parse(readFileSync(join(outputDir, "reviewer-export.json"), "utf8"));
if (roundTrip.export_id !== publicPacket.export_id) throw new Error("JSON export did not round trip");

console.log(`Reviewer export packet verification passed. Artifact dir: ${outputDir}`);

function assertNoIssues(issues, label) {
  if (issues.length) {
    throw new Error(`${label} failed:\n${issues.join("\n")}`);
  }
}
