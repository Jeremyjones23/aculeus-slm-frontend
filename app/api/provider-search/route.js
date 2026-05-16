import { NextResponse } from "next/server";
import { buildInvestigationSpec } from "@/lib/aculeus-operator-spec.js";
import { getRun, appendRunLedger, appendRunTrainingTrace } from "@/lib/aculeus-product-store.js";
import { collectProviderCandidates, planProviderCandidateTasks } from "@/lib/aculeus-provider-candidates.js";
import { executeProviderCandidateTasks, validateProviderExecution } from "@/lib/aculeus-provider-executor.js";
import { normalizeCandidateSet } from "@/lib/aculeus-source-quality.js";
import { appendTrainingTrace, buildTrainingTrace } from "@/lib/aculeus-training-trace-exporter.js";
import { buildAccessDeniedPayload, canCreateCase, getVerifiedRequestUser } from "@/lib/access-control.js";

export async function POST(request) {
  try {
    const user = await getVerifiedRequestUser(request);
    if (!canCreateCase(user)) {
      return NextResponse.json(buildAccessDeniedPayload("run_provider_search", user), { status: 403 });
    }
    const body = await request.json();
    const run = body.runId ? await getRun(body.runId) : null;
    const spec = buildInvestigationSpec({
      run,
      rawQuery: body.rawQuery || body.raw_query || body.lead,
      caseId: body.caseId || run?.caseId
    });
    const tasks = planProviderCandidateTasks(spec, {
      maxTasks: body.maxTasks ?? 4,
      maxResults: body.maxResults ?? 3,
      providerCapUsd: body.providerCapUsd ?? body.provider_cap_usd ?? 0.25,
      enableLiveProviderCalls: body.enableNetwork === true || body.enable_network === true
    });
    const result = await executeProviderCandidateTasks(tasks, {
      maxTasks: body.maxTasks ?? 4,
      maxResults: body.maxResults ?? 3,
      providerCapUsd: body.providerCapUsd ?? body.provider_cap_usd ?? 0.25,
      enableNetwork: body.enableNetwork === true || body.enable_network === true
    });
    const validationIssues = validateProviderExecution(result);
    const fixtureFallback = result.candidate_count > 0 ? null : collectProviderCandidates(spec, {
      maxTasks: body.maxTasks ?? 4,
      maxResults: body.maxResults ?? 3,
      candidateCap: body.candidateCap ?? 6
    });
    const normalized = normalizeCandidateSet({
      fixture_candidates: fixtureFallback?.candidates || [],
      provider_result_sets: result.result_sets
    });
    const ledgerEntry = {
      ledger_entry_id: `provider_search_${Date.now()}`,
      entry_type: "provider_search",
      run_id: run?.runId || body.runId || null,
      case_id: run?.caseId || body.caseId || null,
      status: validationIssues.length ? "needs_operator_review" : "candidate_results_ready",
      labels: ["found", "provider", "locator_only", "candidate_only"],
      tasks,
      result_summary: {
        mode: result.mode,
        provider_calls_executed: result.provider_calls_executed,
        paid_spend_incurred: result.paid_spend_incurred,
        estimated_spend_usd: result.estimated_spend_usd,
        provider_cap_usd: result.provider_cap_usd,
        candidate_count: result.candidate_count,
        fallback_candidate_count: fixtureFallback?.candidate_count || 0,
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
      action: "provider_search",
      caseSpec: spec,
      retrievalActions: tasks,
      sourceLedger: normalized.candidates,
      verifierResults: { validation_issues: validationIssues },
      costLatency: ledgerEntry.result_summary,
      finalOutcome: ledgerEntry.status
    });
    const traceRef = run?.runId
      ? await appendRunTrainingTrace(run.runId, trace)
      : appendTrainingTrace(trace);

    return NextResponse.json({
      ok: true,
      mode: "provider_search_operator",
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
