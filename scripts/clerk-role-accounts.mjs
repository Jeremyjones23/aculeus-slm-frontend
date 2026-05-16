import { randomUUID } from "node:crypto";

const roleMap = parseRoleEmails();
const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  throw new Error("CLERK_SECRET_KEY is required to create or update real Clerk role accounts.");
}

const { createClerkClient } = await import("@clerk/backend");
const clerk = createClerkClient({ secretKey });
const results = [];

for (const [roleName, config] of Object.entries(roleMap)) {
  const email = String(config.email || "").trim().toLowerCase();
  if (!email) throw new Error(`Missing email for Clerk role ${roleName}`);
  const approvalStatus = config.approvalStatus || (roleName === "pending" ? "pending" : "approved");
  const aculeusRole = roleName === "pending" ? "viewer" : roleName;
  const existing = await findUserByEmail(email);
  const publicMetadata = {
    ...(existing?.publicMetadata || {}),
    aculeus_role: aculeusRole,
    aculeus_approval_status: approvalStatus,
    aculeus_pilot_account: true
  };

  if (existing) {
    const updated = await clerk.users.updateUserMetadata(existing.id, { publicMetadata });
    results.push(publicUserResult("updated", updated, aculeusRole, approvalStatus));
    continue;
  }

  const created = await clerk.users.createUser({
    emailAddress: [email],
    firstName: config.firstName || `Aculeus ${roleName}`,
    lastName: config.lastName || "Pilot",
    skipPasswordRequirement: true,
    publicMetadata,
    privateMetadata: {
      aculeus_fixture_id: `aculeus_${roleName}_${randomUUID()}`
    }
  });
  results.push(publicUserResult("created", created, aculeusRole, approvalStatus));
}

console.log(JSON.stringify({
  ok: true,
  account_count: results.length,
  results,
  passwordless_or_invite_flow_required: true
}, null, 2));

function parseRoleEmails() {
  if (process.env.ACULEUS_CLERK_ROLE_EMAILS) {
    const parsed = JSON.parse(process.env.ACULEUS_CLERK_ROLE_EMAILS);
    return normalizeRoleEmailMap(parsed);
  }
  throw new Error("ACULEUS_CLERK_ROLE_EMAILS JSON is required. Expected keys: admin, operator, reviewer, viewer, pending.");
}

function normalizeRoleEmailMap(input) {
  const out = {};
  for (const key of ["admin", "operator", "reviewer", "viewer", "pending"]) {
    const value = input?.[key];
    out[key] = typeof value === "string" ? { email: value } : { ...(value || {}) };
  }
  return out;
}

async function findUserByEmail(email) {
  const response = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
  return response?.data?.find((user) => user.emailAddresses?.some((item) => String(item.emailAddress).toLowerCase() === email)) || null;
}

function publicUserResult(action, user, role, approvalStatus) {
  return {
    action,
    user_id: user.id,
    email: user.emailAddresses?.[0]?.emailAddress || null,
    aculeus_role: role,
    aculeus_approval_status: approvalStatus,
    public_metadata_written: true
  };
}
