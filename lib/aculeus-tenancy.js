import { ROLES } from "./access-control.js";

export function createWorkspaceRecord(input = {}) {
  const now = input.created_at || new Date().toISOString();
  return {
    workspace_id: input.workspace_id || input.id || `workspace_${Date.now()}`,
    name: input.name || "Aculeus Workspace",
    slug: input.slug || slug(input.name || "aculeus-workspace"),
    status: input.status || "active",
    created_at: now,
    updated_at: input.updated_at || now
  };
}

export function createMembership(input = {}) {
  return {
    membership_id: input.membership_id || `membership_${Date.now()}`,
    workspace_id: input.workspace_id,
    user_id: input.user_id,
    role: normalizeRole(input.role),
    status: input.status || "active",
    created_at: input.created_at || new Date().toISOString()
  };
}

export function canAccessWorkspaceRecord(user = {}, workspace = {}, memberships = []) {
  if (!user?.id || user.approvalStatus !== "approved" || workspace.status !== "active") return false;
  return memberships.some((membership) =>
    membership.workspace_id === workspace.workspace_id
    && membership.user_id === user.id
    && membership.status === "active"
    && Boolean(normalizeRole(membership.role))
  );
}

export function canAccessRunRecord(user = {}, run = {}, memberships = []) {
  const workspaceId = run.workspace_id || run.workspaceId || "workspace_default";
  const workspace = { workspace_id: workspaceId, status: "active" };
  return canAccessWorkspaceRecord(user, workspace, memberships);
}

export function filterRunsForUser(user = {}, runs = [], memberships = []) {
  return runs.filter((run) => canAccessRunRecord(user, run, memberships));
}

export function validateTenancyDataset(dataset = {}) {
  const issues = [];
  if (!Array.isArray(dataset.workspaces) || !dataset.workspaces.length) issues.push("tenancy dataset missing workspaces");
  if (!Array.isArray(dataset.memberships) || !dataset.memberships.length) issues.push("tenancy dataset missing memberships");
  if (!Array.isArray(dataset.runs) || !dataset.runs.length) issues.push("tenancy dataset missing runs");
  for (const membership of dataset.memberships || []) {
    if (!membership.workspace_id || !membership.user_id || !normalizeRole(membership.role)) issues.push("invalid workspace membership");
  }
  for (const run of dataset.runs || []) {
    if (!run.runId || !(run.workspace_id || run.workspaceId)) issues.push("run missing tenancy scope");
  }
  return issues;
}

function normalizeRole(role) {
  const value = String(role || "").toLowerCase();
  return Object.values(ROLES).includes(value) ? value : null;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "workspace";
}
