import {
  canAccessWorkspace,
  canCreateCase,
  canReviewEvidence,
  getRequestUser,
  resolveAuthMode,
  ROLES
} from "../lib/access-control.js";

const localUser = getRequestUser(new Request("http://aculeus.local/api/session"), {});
if (resolveAuthMode({}) !== "local_preview") throw new Error("missing env should resolve to local preview");
if (!canAccessWorkspace(localUser) || !canCreateCase(localUser) || localUser.authMode !== "local_preview") {
  throw new Error("local preview fallback did not return approved operator");
}

const productionEnv = { ACULEUS_AUTH_MODE: "production", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test", CLERK_SECRET_KEY: "sk_test" };
const unauthenticated = getRequestUser(new Request("http://aculeus.local/api/session"), productionEnv);
if (canAccessWorkspace(unauthenticated)) throw new Error("production unauthenticated request was not blocked");
if (unauthenticated.blockedReason !== "clerk_session_or_approved_role_required") throw new Error("blocked production request missing reason");

const reviewerRequest = new Request("http://aculeus.local/api/session", {
  headers: {
    "x-clerk-user-id": "user_123",
    "x-aculeus-email": "reviewer@example.com",
    "x-aculeus-role": ROLES.reviewer,
    "x-aculeus-approval-status": "approved"
  }
});
const reviewer = getRequestUser(reviewerRequest, productionEnv);
if (!canAccessWorkspace(reviewer)) throw new Error("approved reviewer could not access workspace");
if (!canReviewEvidence(reviewer)) throw new Error("approved reviewer could not review evidence");
if (canCreateCase(reviewer)) throw new Error("reviewer should not create cases");

const operatorRequest = new Request("http://aculeus.local/api/session", {
  headers: {
    "x-clerk-user-id": "user_456",
    "x-aculeus-email": "operator@example.com",
    "x-aculeus-role": ROLES.operator,
    "x-aculeus-approval-status": "approved"
  }
});
const operator = getRequestUser(operatorRequest, productionEnv);
if (!canCreateCase(operator)) throw new Error("approved operator should create cases");

console.log("Auth boundary verification passed.");
