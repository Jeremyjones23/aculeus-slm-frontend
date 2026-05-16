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

  const headers = request?.headers;
  const clerkUserId = headers?.get?.("x-clerk-user-id") || headers?.get?.("x-aculeus-user-id") || "";
  const email = headers?.get?.("x-aculeus-email") || headers?.get?.("x-clerk-user-email") || "";
  const role = normalizeRole(headers?.get?.("x-aculeus-role") || headers?.get?.("x-clerk-role") || "");
  const approvalStatus = headers?.get?.("x-aculeus-approval-status") || "";

  if (!clerkUserId || approvalStatus !== "approved" || !role) {
    return {
      id: null,
      email,
      name: "",
      role: null,
      approvalStatus: approvalStatus || "unauthenticated",
      authMode,
      blockedReason: "clerk_session_or_approved_role_required"
    };
  }

  return {
    id: clerkUserId,
    email,
    name: headers?.get?.("x-aculeus-name") || email || clerkUserId,
    role,
    approvalStatus,
    authMode
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
