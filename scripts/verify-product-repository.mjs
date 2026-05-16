import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_LOCAL_PRODUCT_STORE_DIR,
  createLocalProductRepository,
  getProductRepository
} from "../lib/aculeus-product-store.js";

const tempStoreDir = mkdtempSync(join(tmpdir(), "aculeus-product-store-"));

try {
  const repo = createLocalProductRepository({ storeDir: tempStoreDir });
  const accessRequest = repo.saveAccessRequest({
    name: "Reviewer",
    email: "reviewer@example.com",
    organization: "Aculeus",
    work: "Public-records review"
  });
  assert(accessRequest.id.startsWith("access_"), "access request id should be generated");

  const run = repo.saveRun({
    runId: "run_repository_verify",
    caseId: "case_repository_verify",
    status: "submitted",
    rawQuery: "Verify repository persistence",
    ledger: []
  });
  assert(run.runId === "run_repository_verify", "run should round-trip id");

  const ledgerEntry = repo.appendRunLedger("run_repository_verify", {
    entry_type: "provider_search",
    status: "candidate_results_ready",
    labels: ["found", "candidate_only"],
    raw_text: "must not persist",
    request_headers: { authorization: "must not persist" }
  });
  assert(ledgerEntry.raw_text === undefined, "ledger raw text should be redacted");
  assert(ledgerEntry.request_headers === undefined, "ledger request headers should be redacted");

  const traceRef = repo.appendRunTrainingTrace("run_repository_verify", {
    action: "provider_search",
    token: "must not persist",
    finalOutcome: "candidate_results_ready"
  });
  assert(traceRef.token === undefined, "training trace token should be redacted");

  const fetched = repo.getRun("run_repository_verify");
  assert(fetched.ledger.length === 1, "run ledger should persist");
  assert(fetched.trainingTraces.length === 1, "training traces should persist");

  const persisted = JSON.parse(readFileSync(join(tempStoreDir, "local-store.json"), "utf8"));
  assert(persisted.runs[0].ledger[0].raw_text === undefined, "store file should not include raw text");

  const selectedRepo = getProductRepository({ mode: "local", storeDir: tempStoreDir });
  assert(selectedRepo.mode === "local", "explicit local repository mode should be selected");
  assert(DEFAULT_LOCAL_PRODUCT_STORE_DIR.endsWith(join(".local", "product-store")), "default local store must live under .local/product-store");

  console.log("Aculeus product repository verification passed.");
} finally {
  rmSync(tempStoreDir, { recursive: true, force: true });
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}
