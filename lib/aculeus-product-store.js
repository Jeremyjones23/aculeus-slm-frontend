import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hasDatabase, query } from "./database.js";

export const DEFAULT_LOCAL_PRODUCT_STORE_DIR = join(process.cwd(), ".local", "product-store");

function resolveStoreDir() {
  return process.env.ACULEUS_PRODUCT_STORE_DIR || DEFAULT_LOCAL_PRODUCT_STORE_DIR;
}

function resolveMode() {
  const explicit = process.env.ACULEUS_PRODUCT_STORE_MODE;
  if (explicit === "local" || explicit === "database") return explicit;
  return hasDatabase() ? "database" : "local";
}

export function getProductRepository(options = {}) {
  const mode = options.mode || resolveMode();
  if (mode === "database") return createDatabaseProductRepository();
  return createLocalProductRepository({ storeDir: options.storeDir || resolveStoreDir() });
}

export function createLocalProductRepository({ storeDir = resolveStoreDir() } = {}) {
  const storeFile = join(storeDir, "local-store.json");

  function readStore() {
    mkdirSync(storeDir, { recursive: true });
    try {
      return normalizeStore(JSON.parse(readFileSync(storeFile, "utf8")));
    } catch {
      return normalizeStore({});
    }
  }

  function writeStore(nextStore) {
    mkdirSync(storeDir, { recursive: true });
    writeFileSync(storeFile, `${JSON.stringify(normalizeStore(nextStore), null, 2)}\n`, "utf8");
    return normalizeStore(nextStore);
  }

  function saveAccessRequest(request) {
    const store = readStore();
    const item = normalizeAccessRequest(request);
    store.accessRequests.unshift(item);
    writeStore(store);
    return item;
  }

  function saveCase(caseRecord) {
    const store = readStore();
    const item = normalizeCase(caseRecord);
    store.cases = [item, ...store.cases.filter((record) => record.caseId !== item.caseId)];
    writeStore(store);
    return item;
  }

  function getCase(caseId) {
    const store = readStore();
    return store.cases.find((item) => item.caseId === caseId) || null;
  }

  function listCases() {
    return readStore().cases;
  }

  function saveRun(run) {
    const store = readStore();
    const normalized = normalizeRun(run);
    store.runs = [normalized, ...store.runs.filter((item) => item.runId !== normalized.runId)];
    writeStore(store);
    return normalized;
  }

  function getRun(runId) {
    const store = readStore();
    return store.runs.find((item) => item.runId === runId) || null;
  }

  function appendRunLedger(runId, entry) {
    const store = readStore();
    const index = store.runs.findIndex((item) => item.runId === runId);
    if (index < 0) throw new Error(`Run not found: ${runId}`);
    const now = new Date().toISOString();
    const run = normalizeRun(store.runs[index]);
    const ledgerEntry = normalizeLedgerEntry(entry, now);
    run.ledger.unshift(ledgerEntry);
    run.updatedAt = now;
    store.runs[index] = run;
    writeStore(store);
    return ledgerEntry;
  }

  function appendRunTrainingTrace(runId, trace) {
    const store = readStore();
    const index = store.runs.findIndex((item) => item.runId === runId);
    if (index < 0) throw new Error(`Run not found: ${runId}`);
    const now = new Date().toISOString();
    const run = normalizeRun(store.runs[index]);
    const traceRef = normalizeTrainingTrace(trace, now);
    run.trainingTraces.unshift(traceRef);
    run.updatedAt = now;
    store.runs[index] = run;
    writeStore(store);
    return traceRef;
  }

  return {
    mode: "local",
    storeDir,
    readStore,
    writeStore,
    saveAccessRequest,
    saveCase,
    getCase,
    listCases,
    saveRun,
    getRun,
    appendRunLedger,
    appendRunTrainingTrace
  };
}

export function createDatabaseProductRepository() {
  async function readStore() {
    const [accessRequests, runs] = await Promise.all([
      query("select payload from access_requests order by created_at desc limit 250"),
      query("select run_payload from runs order by updated_at desc limit 250")
    ]);
    return normalizeStore({
      accessRequests: accessRequests.map((row) => row.payload).filter(Boolean),
      runs: runs.map((row) => row.run_payload).filter(Boolean)
    });
  }

  async function writeStore(nextStore) {
    const store = normalizeStore(nextStore);
    for (const run of store.runs) {
      await saveRun(run);
    }
    return store;
  }

  async function saveAccessRequest(request) {
    const item = normalizeAccessRequest(request);
    await query(
      `insert into access_requests (id, email, name, organization, requested_work, status, payload, created_at)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
       on conflict (id) do update set
         email = excluded.email,
         name = excluded.name,
         organization = excluded.organization,
         requested_work = excluded.requested_work,
         status = excluded.status,
         payload = excluded.payload`,
      [item.id, item.email, item.name, item.organization, item.work, item.status, JSON.stringify(item), item.createdAt]
    );
    return item;
  }

  async function saveCase(caseRecord) {
    const item = normalizeCase(caseRecord);
    await query(
      `insert into cases (id, title, lead, jurisdiction, status, visibility, case_spec, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz, $9::timestamptz)
       on conflict (id) do update set
         title = excluded.title,
         lead = excluded.lead,
         jurisdiction = excluded.jurisdiction,
         status = excluded.status,
         visibility = excluded.visibility,
         case_spec = excluded.case_spec,
         updated_at = excluded.updated_at`,
      [
        item.caseId,
        item.title,
        item.lead,
        item.jurisdiction,
        item.status,
        item.visibility,
        JSON.stringify(item.caseSpec || {}),
        item.createdAt,
        item.updatedAt
      ]
    );
    return item;
  }

  async function getCase(caseId) {
    const rows = await query(
      "select id, title, lead, jurisdiction, status, visibility, case_spec, created_at, updated_at from cases where id = $1 limit 1",
      [caseId]
    );
    return rows[0] ? normalizeCase({
      caseId: rows[0].id,
      title: rows[0].title,
      lead: rows[0].lead,
      jurisdiction: rows[0].jurisdiction,
      status: rows[0].status,
      visibility: rows[0].visibility,
      caseSpec: rows[0].case_spec,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at
    }) : null;
  }

  async function listCases() {
    const rows = await query(
      "select id, title, lead, jurisdiction, status, visibility, case_spec, created_at, updated_at from cases order by updated_at desc limit 250"
    );
    return rows.map((row) => normalizeCase({
      caseId: row.id,
      title: row.title,
      lead: row.lead,
      jurisdiction: row.jurisdiction,
      status: row.status,
      visibility: row.visibility,
      caseSpec: row.case_spec,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async function saveRun(run) {
    const normalized = normalizeRun(run);
    await upsertCaseForRun(normalized);
    await query(
      `insert into runs (id, case_id, user_id, status, adapter_mode, model_id, run_payload, created_at, updated_at)
       values ($1, $2, null, $3, $4, $5, $6::jsonb, $7::timestamptz, $8::timestamptz)
       on conflict (id) do update set
         case_id = excluded.case_id,
         status = excluded.status,
         adapter_mode = excluded.adapter_mode,
         model_id = excluded.model_id,
         run_payload = excluded.run_payload,
         updated_at = excluded.updated_at`,
      [
        normalized.runId,
        normalized.caseId || "case_unspecified",
        normalized.status || "submitted",
        normalized.adapterMode || normalized.adapter_mode || "source_fed",
        normalized.modelId || normalized.model_id || null,
        JSON.stringify(normalized),
        normalized.createdAt || new Date().toISOString(),
        normalized.updatedAt || new Date().toISOString()
      ]
    );
    return normalized;
  }

  async function getRun(runId) {
    const rows = await query("select run_payload from runs where id = $1 limit 1", [runId]);
    return rows[0]?.run_payload ? normalizeRun(rows[0].run_payload) : null;
  }

  async function appendRunLedger(runId, entry) {
    const run = await getRun(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    const now = new Date().toISOString();
    const ledgerEntry = normalizeLedgerEntry(entry, now);
    run.ledger.unshift(ledgerEntry);
    run.updatedAt = now;
    await saveRun(run);
    await query(
      `insert into run_ledger_entries (id, run_id, case_id, entry_type, status, labels, payload, public_safe, created_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9::timestamptz)
       on conflict (id) do update set
         status = excluded.status,
         labels = excluded.labels,
         payload = excluded.payload,
         public_safe = excluded.public_safe`,
      [
        ledgerEntry.ledger_entry_id,
        runId,
        run.caseId || ledgerEntry.case_id || null,
        ledgerEntry.entry_type || "ledger_entry",
        ledgerEntry.status || "recorded",
        JSON.stringify(ledgerEntry.labels || []),
        JSON.stringify(ledgerEntry),
        ledgerEntry.public_safe !== false,
        ledgerEntry.created_at
      ]
    );
    return ledgerEntry;
  }

  async function appendRunTrainingTrace(runId, trace) {
    const run = await getRun(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    const now = new Date().toISOString();
    const traceRef = normalizeTrainingTrace(trace, now);
    run.trainingTraces.unshift(traceRef);
    run.updatedAt = now;
    await saveRun(run);
    await query(
      `insert into training_traces (id, run_id, case_id, trace_type, payload, reviewed, public_safe, created_at)
       values ($1, $2, $3, $4, $5::jsonb, false, $6, $7::timestamptz)
       on conflict (id) do update set
         payload = excluded.payload,
         public_safe = excluded.public_safe`,
      [
        traceRef.trace_id,
        runId,
        run.caseId || traceRef.case_id || null,
        traceRef.action || traceRef.trace_type || "retrieval_trace",
        JSON.stringify(traceRef),
        traceRef.public_safe !== false,
        traceRef.created_at
      ]
    );
    return traceRef;
  }

  return {
    mode: "database",
    readStore,
    writeStore,
    saveAccessRequest,
    saveCase,
    getCase,
    listCases,
    saveRun,
    getRun,
    appendRunLedger,
    appendRunTrainingTrace
  };
}

async function upsertCaseForRun(run) {
  const caseId = run.caseId || "case_unspecified";
  await query(
    `insert into cases (id, title, lead, status, visibility, created_at, updated_at)
     values ($1, $2, $3, $4, 'private', $5::timestamptz, $6::timestamptz)
     on conflict (id) do update set
       title = excluded.title,
       lead = excluded.lead,
       status = excluded.status,
       updated_at = excluded.updated_at`,
    [
      caseId,
      run.caseTitle || run.title || "Untitled Aculeus case",
      run.rawQuery || run.lead || run.caseQuestion || "No lead recorded.",
      run.caseStatus || "active",
      run.createdAt || new Date().toISOString(),
      run.updatedAt || new Date().toISOString()
    ]
  );
}

export function readLocalStore() {
  return createLocalProductRepository().readStore();
}

export function writeLocalStore(nextStore) {
  return createLocalProductRepository().writeStore(nextStore);
}

export function saveAccessRequest(request) {
  return getProductRepository().saveAccessRequest(request);
}

export function saveRun(run) {
  return getProductRepository().saveRun(run);
}

export function saveCase(caseRecord) {
  return getProductRepository().saveCase(caseRecord);
}

export function getCase(caseId) {
  return getProductRepository().getCase(caseId);
}

export function listCases() {
  return getProductRepository().listCases();
}

export function getRun(runId) {
  return getProductRepository().getRun(runId);
}

export function appendRunLedger(runId, entry) {
  return getProductRepository().appendRunLedger(runId, entry);
}

export function appendRunTrainingTrace(runId, trace) {
  return getProductRepository().appendRunTrainingTrace(runId, trace);
}

function normalizeStore(store) {
  return {
    accessRequests: Array.isArray(store?.accessRequests) ? store.accessRequests : [],
    cases: Array.isArray(store?.cases) ? store.cases : [],
    runs: Array.isArray(store?.runs) ? store.runs.map(normalizeRun) : [],
    sources: Array.isArray(store?.sources) ? store.sources : []
  };
}

function normalizeAccessRequest(request) {
  return sanitizePublicObject({
    id: request.id || `access_${Date.now()}`,
    name: String(request.name || "").trim(),
    email: String(request.email || "").trim(),
    organization: String(request.organization || "").trim(),
    work: String(request.work || request.requested_work || "").trim(),
    status: request.status || "pending",
    createdAt: request.createdAt || request.created_at || new Date().toISOString()
  });
}

function normalizeCase(caseRecord) {
  const now = new Date().toISOString();
  return sanitizePublicObject({
    caseId: caseRecord.caseId || caseRecord.id || `case_${Date.now()}`,
    title: String(caseRecord.title || caseRecord.lead || "Untitled Aculeus case").trim(),
    lead: String(caseRecord.lead || caseRecord.rawQuery || caseRecord.title || "").trim(),
    jurisdiction: caseRecord.jurisdiction || "Public records",
    status: caseRecord.status || "intake",
    visibility: caseRecord.visibility || "private",
    caseSpec: caseRecord.caseSpec || caseRecord.case_spec || {},
    createdAt: caseRecord.createdAt || caseRecord.created_at || now,
    updatedAt: caseRecord.updatedAt || caseRecord.updated_at || now
  });
}

function normalizeRun(run) {
  return sanitizePublicObject({
    ...run,
    runId: run?.runId || run?.id,
    caseId: run?.caseId || run?.case_id || "case_unspecified",
    ledger: Array.isArray(run?.ledger) ? run.ledger.map(sanitizePublicObject) : [],
    operatorResults: run?.operatorResults && typeof run.operatorResults === "object" ? sanitizePublicObject(run.operatorResults) : {},
    trainingTraces: Array.isArray(run?.trainingTraces) ? run.trainingTraces.map(sanitizePublicObject) : []
  });
}

function normalizeLedgerEntry(entry, now = new Date().toISOString()) {
  return sanitizePublicObject({
    ledger_entry_id: entry.ledger_entry_id || entry.id || `ledger_${Date.now()}`,
    created_at: entry.created_at || now,
    public_safe: true,
    ...entry
  });
}

function normalizeTrainingTrace(trace, now = new Date().toISOString()) {
  return sanitizePublicObject({
    trace_id: trace.trace_id || trace.id || `trace_${Date.now()}`,
    created_at: trace.created_at || now,
    public_safe: true,
    ...trace
  });
}

export function sanitizePublicObject(value) {
  return JSON.parse(JSON.stringify(value, (key, child) => {
    if (/api[_-]?key|authorization|secret|token|raw_text|rawText|request_headers/i.test(key)) return undefined;
    return child;
  }));
}
