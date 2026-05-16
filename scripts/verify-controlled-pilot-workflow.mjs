import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canAccessWorkspace,
  canCreateCase,
  canReviewEvidence,
  getRequestUser,
  ROLES
} from "../lib/access-control.js";
import { createLocalProductRepository } from "../lib/aculeus-product-store.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const productionEnv = {
  ACULEUS_AUTH_MODE: "production",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test",
  CLERK_SECRET_KEY: "sk_test"
};

const matrix = [
  { role: ROLES.admin, canAccess: true, canCreate: true, canReview: true },
  { role: ROLES.operator, canAccess: true, canCreate: true, canReview: true },
  { role: ROLES.reviewer, canAccess: true, canCreate: false, canReview: true },
  { role: ROLES.viewer, canAccess: true, canCreate: false, canReview: false }
];

for (const row of matrix) {
  const user = getRequestUser(new Request("http://aculeus.local/api/session", {
    headers: {
      "x-clerk-user-id": `pilot_${row.role}`,
      "x-aculeus-email": `${row.role}@pilot.aculeus.local`,
      "x-aculeus-role": row.role,
      "x-aculeus-approval-status": "approved"
    }
  }), productionEnv);
  if (canAccessWorkspace(user) !== row.canAccess) throw new Error(`${row.role}: workspace access mismatch`);
  if (canCreateCase(user) !== row.canCreate) throw new Error(`${row.role}: create-case permission mismatch`);
  if (canReviewEvidence(user) !== row.canReview) throw new Error(`${row.role}: review permission mismatch`);
}

const pending = getRequestUser(new Request("http://aculeus.local/api/session", {
  headers: {
    "x-clerk-user-id": "pilot_pending",
    "x-aculeus-email": "pending@pilot.aculeus.local",
    "x-aculeus-role": ROLES.operator,
    "x-aculeus-approval-status": "pending"
  }
}), productionEnv);
if (canAccessWorkspace(pending) || pending.blockedReason !== "clerk_session_or_approved_role_required") {
  throw new Error("pending pilot account was not denied");
}

const storeDir = mkdtempSync(join(tmpdir(), "aculeus-pilot-access-"));
const repo = createLocalProductRepository({ storeDir });
try {
  const access = repo.saveAccessRequest({
    name: "Pilot Reviewer",
    email: "reviewer@pilot.aculeus.local",
    organization: "Aculeus Pilot",
    work: "Review receipt-backed source promotion.",
    status: "pending"
  });
  if (!access.id || access.status !== "pending" || !access.email.includes("@pilot.aculeus.local")) {
    throw new Error("pilot access request intake failed");
  }
} finally {
  rmSync(storeDir, { recursive: true, force: true });
}

const doc = readFileSync(join(process.cwd(), "docs", "controlled-pilot-account-workflow.md"), "utf8");
for (const phrase of [
  "external pilot onboarding waits",
  "`admin`",
  "`operator`",
  "`reviewer`",
  "`viewer`",
  "approval_status=approved",
  "Clerk DNS Configuration",
  "Vercel Git linking",
  "npm run smoke:nightly-production"
]) {
  if (!doc.includes(phrase)) throw new Error(`controlled pilot workflow missing phrase: ${phrase}`);
}

console.log("Controlled pilot account workflow verification passed.");
