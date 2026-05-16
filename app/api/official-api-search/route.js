import { NextResponse } from "next/server";
import { buildInvestigationSpec } from "@/lib/aculeus-operator-spec.js";
import { getRun, appendRunLedger, appendRunTrainingTrace } from "@/lib/aculeus-product-store.js";
import { planOfficialApiTasks } from "@/lib/aculeus-official-source-router.js";
import { executeOfficialApiTasks, validateOfficialApiExecution } from "@/lib/aculeus-official-api-executor.js";
import { normalizeCandidateSet } from "@/lib/aculeus-source-quality.js";
import { appendTrainingTrace, buildTrainingTrace } from "@/lib/aculeus-training-trace-exporter.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const run = body.runId ? await getRun(body.runId) : null;
    const spec = buildInvestigationSpec({
      run,
      rawQuery: body.rawQuery || body.raw_query || body.lead,
      caseId: body.caseId || run?.caseId
    });
    const tasks = planOfficialApiTasks(spec, {
      maxTasks: body.maxTasks ?? 6,
      maxResults: body.maxResults ?? 3
    });
    const result = await executeOfficialApiTasks(tasks, {
      maxTasks: body.maxTasks ?? 6,
      maxResults: body.maxResults ?? 3,
      enableNetwork: body.enableNetwork === true || body.enable_network === true
    });
    const validationIssues = validateOfficialApiExecution(result);
    const fallbackResultSets = result.record_count > 0 ? [] : tasks.map((task) => ({
      source_id: task.source_id,
      request_preview: result.result_sets.find((set) => set.source_id === task.source_id)?.request_preview || null,
      records: [{
        record_id: `${task.source_id}_locator`,
        source_id: task.source_id,
        task_id: task.task_id,
        title: task.title,
        url: task.endpoint,
        snippet: `Official API locator for ${task.query}. Execute or refine this source before evidence use.`,
        source_family: task.source_family,
        reliability_tier: task.reliability_tier,
        canonical_ids: { source_id: task.source_id, task_id: task.task_id },
        request_fingerprint: result.result_sets.find((set) => set.source_id === task.source_id)?.request_fingerprint || null,
        response_content_sha256: result.result_sets.find((set) => set.source_id === task.source_id)?.response_content_sha256 || null,
        evidence_id: null,
        evidence_promotion_allowed: false,
        candidate_only_until_receipted: true,
        receipt_required: true,
        public_safe: true
      }]
    }));
    const normalized = normalizeCandidateSet({ official_result_sets: [...result.result_sets, ...fallbackResultSets] });
    const ledgerEntry = {
      ledger_entry_id: `official_api_search_${Date.now()}`,
      entry_type: "official_api_search",
      run_id: run?.runId || body.runId || null,
      case_id: run?.caseId || body.caseId || null,
      status: validationIssues.length ? "needs_operator_review" : "official_candidates_ready",
      labels: ["found", "official", "locator_only", "candidate_only"],
      tasks,
      result_summary: {
        mode: result.mode,
        official_api_calls_executed: result.official_api_calls_executed,
        paid_spend_incurred: false,
        actual_spend_usd: 0,
        record_count: result.record_count,
        validation_issue_count: validationIssues.length
      },
      candidates: normalized.candidates,
      validation_issues: validationIssues,
      evidence_promotion_allowed: false,
      public_safe: true
    };
    if (run?.runId) await appendRunLedger(run.runId, ledgerEntry);
    const trace = buildTrainingTrace({
      runId: run?.runId,
      caseId: run?.caseId || body.caseId,
      action: "official_api_search",
      caseSpec: spec,
      retrievalActions: tasks,
      sourceLedger: normalized.candidates,
      verifierResults: { validation_issues: validationIssues },
      costLatency: ledgerEntry.result_summary,
      finalOutcome: ledgerEntry.status
    });
    const traceRef = appendTrainingTrace(trace);
    if (run?.runId) await appendRunTrainingTrace(run.runId, traceRef);

    return NextResponse.json({
      ok: true,
      mode: "official_api_search_operator",
      runId: run?.runId || body.runId || null,
      spec,
      result,
      dedupe: normalized,
      ledger_entry: ledgerEntry,
      training_trace: traceRef
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
