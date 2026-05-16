import { ROLES } from "../lib/access-control.js";
import {
  canAccessRunRecord,
  createMembership,
  createWorkspaceRecord,
  filterRunsForUser,
  validateTenancyDataset
} from "../lib/aculeus-tenancy.js";

const workspaceA = createWorkspaceRecord({ id: "workspace_a", name: "Workspace A" });
const workspaceB = createWorkspaceRecord({ id: "workspace_b", name: "Workspace B" });
const userA = { id: "user_a", role: ROLES.operator, approvalStatus: "approved" };
const userB = { id: "user_b", role: ROLES.viewer, approvalStatus: "approved" };
const memberships = [
  createMembership({ workspace_id: workspaceA.workspace_id, user_id: userA.id, role: ROLES.operator }),
  createMembership({ workspace_id: workspaceB.workspace_id, user_id: userB.id, role: ROLES.viewer })
];
const runs = [
  { runId: "run_a_1", workspace_id: workspaceA.workspace_id, caseId: "case_a" },
  { runId: "run_b_1", workspace_id: workspaceB.workspace_id, caseId: "case_b" }
];

const issues = validateTenancyDataset({ workspaces: [workspaceA, workspaceB], memberships, runs });
if (issues.length) throw new Error(`Tenancy dataset failed validation:\n${issues.join("\n")}`);
if (!canAccessRunRecord(userA, runs[0], memberships)) throw new Error("workspace A operator could not access own run");
if (canAccessRunRecord(userA, runs[1], memberships)) throw new Error("workspace A operator accessed workspace B run");
if (!canAccessRunRecord(userB, runs[1], memberships)) throw new Error("workspace B viewer could not access own run");
if (canAccessRunRecord({ id: "user_c", role: ROLES.admin, approvalStatus: "pending" }, runs[0], memberships)) {
  throw new Error("pending user accessed workspace run");
}
const visibleToA = filterRunsForUser(userA, runs, memberships);
if (visibleToA.length !== 1 || visibleToA[0].runId !== "run_a_1") throw new Error("run filter leaked cross-tenant run");

console.log("Tenancy verification passed.");
