import { createHmac, timingSafeEqual } from "node:crypto";

export const ROLES = {
  admin: "admin",
  operator: "operator",
  reviewer: "reviewer",
  viewer: "viewer"
};

export function resolveAuthMode(env = process.env) {
  if (env.ACULEUS_AUTH_MODE === "production") return "production";
  if (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY) return "clerk_configured";
  return "local_preview";
}

export function getLocalPreviewUser() {
  return {
    id: "local_operator",
    email: "operator@aculeus.local",
    name: "Aculeus Operator",
    role: ROLES.admin,
    approvalStatus: "approved",
    authMode: "local_preview"
  };
}

export function getRequestUser(request, env = process.env) {
  const authMode = resolveAuthMode(env);
  if (authMode === "local_preview") return getLocalPreviewUser();
  const smokeUser = getSignedSmokeHeaderUser(request, env);
  if (smokeUser) return smokeUser;

  return buildBlockedUser(request, authMode);
}

export async function getVerifiedRequestUser(request, env = process.env) {
  const authMode = resolveAuthMode(env);
  if (authMode === "local_preview") return getLocalPreviewUser();

  const clerkUser = await getClerkSessionUser(authMode);
  if (clerkUser) return clerkUser;

  const smokeUser = getSignedSmokeHeaderUser(request, env);
  if (smokeUser) return smokeUser;

  return buildBlockedUser(request, authMode);
}

export function createSmokeSignature({ userId, email, role, approvalStatus, timestamp }, secret) {
  return createHmac("sha256", String(secret || ""))
    .update([userId, email, role, approvalStatus, timestamp].map((value) => String(value || "")).join("\n"))
    .digest("hex");
}

function getSignedSmokeHeaderUser(request, env) {
  const headers = request?.headers;
  const authMode = resolveAuthMode(env);
  const clerkUserId = headers?.get?.("x-clerk-user-id") || headers?.get?.("x-aculeus-user-id") || "";
  const email = headers?.get?.("x-aculeus-email") || headers?.get?.("x-clerk-user-email") || "";
  const role = normalizeRole(headers?.get?.("x-aculeus-role") || headers?.get?.("x-clerk-role") || "");
  const approvalStatus = headers?.get?.("x-aculeus-approval-status") || "";

  if (env.ACULEUS_TRUST_SMOKE_HEADERS === "1") {
    if (!clerkUserId || approvalStatus !== "approved" || !role) return null;
    return {
      id: clerkUserId,
      email,
      name: headers?.get?.("x-aculeus-name") || email || clerkUserId,
      role,
      approvalStatus,
      authMode,
      authSource: "trusted_test_headers"
    };
  }

  const secret = env.ACULEUS_SMOKE_SECRET;
  const timestamp = headers?.get?.("x-aculeus-smoke-ts") || "";
  const signature = headers?.get?.("x-aculeus-smoke-signature") || "";
  if (!secret || !timestamp || !signature || !clerkUserId || approvalStatus !== "approved" || !role) return null;

  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 10 * 60 * 1000) return null;

  const expected = createSmokeSignature({ userId: clerkUserId, email, role, approvalStatus, timestamp }, secret);
  if (!safeEqual(signature, expected)) return null;

  return {
    id: clerkUserId,
    email,
    name: headers?.get?.("x-aculeus-name") || email || clerkUserId,
    role,
    approvalStatus,
    authMode,
    authSource: "signed_smoke_headers"
  };
}

async function getClerkSessionUser(authMode) {
  try {
    const clerk = await import("@clerk/nextjs/server");
    const authState = await clerk.auth();
    if (!authState?.userId) return null;
    const claims = authState.sessionClaims || {};
    let user = null;
    try {
      user = typeof clerk.currentUser === "function" ? await clerk.currentUser() : null;
    } catch {
      user = null;
    }

    const publicMetadata = user?.publicMetadata || {};
    const role = normalizeRole(
      claims.aculeus_role ||
      claims.role ||
      publicMetadata.aculeus_role ||
      publicMetadata.role ||
      mapOrgRole(authState.orgRole)
    );
    const approvalStatus = String(
      claims.aculeus_approval_status ||
      claims.approval_status ||
      publicMetadata.aculeus_approval_status ||
      publicMetadata.approval_status ||
      ""
    );
    const email = String(
      claims.email ||
      claims.email_address ||
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      ""
    );

    if (!role || approvalStatus !== "approved") {
      return {
        id: null,
        email,
        name: "",
        role: role || null,
        approvalStatus: approvalStatus || "unauthenticated",
        authMode,
        authSource: "clerk_session",
        blockedReason: "clerk_session_or_approved_role_required"
      };
    }

    return {
      id: authState.userId,
      email,
      name: user?.fullName || email || authState.userId,
      role,
      approvalStatus,
      authMode,
      authSource: "clerk_session",
      organizationId: authState.orgId || null
    };
  } catch {
    return null;
  }
}

function buildBlockedUser(request, authMode) {
  const headers = request?.headers;
  const email = headers?.get?.("x-aculeus-email") || headers?.get?.("x-clerk-user-email") || "";

  return {
    id: null,
    email,
    name: "",
    role: null,
    approvalStatus: "unauthenticated",
    authMode,
    blockedReason: "clerk_session_or_approved_role_required"
  };
}

export function canAccessWorkspace(user) {
  return user?.approvalStatus === "approved" && [ROLES.admin, ROLES.operator, ROLES.reviewer, ROLES.viewer].includes(user.role);
}

export function canCreateCase(user) {
  return user?.approvalStatus === "approved" && [ROLES.admin, ROLES.operator].includes(user.role);
}

export function canReviewEvidence(user) {
  return user?.approvalStatus === "approved" && [ROLES.admin, ROLES.operator, ROLES.reviewer].includes(user.role);
}

export function buildAccessDeniedPayload(capability, user) {
  return {
    ok: false,
    error: "access_denied",
    capability,
    authMode: user?.authMode || resolveAuthMode(),
    role: user?.role || null,
    approvalStatus: user?.approvalStatus || "unauthenticated",
    blockedReason: user?.blockedReason || "approved_role_required"
  };
}

function normalizeRole(role) {
  const value = String(role || "").toLowerCase();
  return Object.values(ROLES).includes(value) ? value : null;
}

function mapOrgRole(orgRole) {
  const value = String(orgRole || "").toLowerCase();
  if (value.includes("admin")) return ROLES.admin;
  if (value.includes("reviewer")) return ROLES.reviewer;
  if (value.includes("viewer")) return ROLES.viewer;
  if (value.includes("operator") || value.includes("member")) return ROLES.operator;
  return null;
}

function safeEqual(actual, expected) {
  try {
    const actualBuffer = Buffer.from(String(actual), "hex");
    const expectedBuffer = Buffer.from(String(expected), "hex");
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
