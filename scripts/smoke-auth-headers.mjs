import { createHmac } from "node:crypto";

export function createSmokeAuthHeaders({
  userId = process.env.ACULEUS_SMOKE_USER_ID || "postdeploy_operator",
  email = process.env.ACULEUS_SMOKE_EMAIL || "operator@aculeus.local",
  role = process.env.ACULEUS_SMOKE_ROLE || "operator",
  approvalStatus = "approved",
  name = email
} = {}) {
  const headers = {
    "content-type": "application/json",
    "x-clerk-user-id": userId,
    "x-aculeus-email": email,
    "x-aculeus-role": role,
    "x-aculeus-approval-status": approvalStatus,
    "x-aculeus-name": name
  };

  if (process.env.ACULEUS_TRUST_SMOKE_HEADERS === "1") return headers;

  const secret = process.env.ACULEUS_SMOKE_SECRET;
  if (!secret) {
    throw new Error("ACULEUS_SMOKE_SECRET is required for signed production smoke headers.");
  }

  const timestamp = String(Date.now());
  headers["x-aculeus-smoke-ts"] = timestamp;
  headers["x-aculeus-smoke-signature"] = createHmac("sha256", secret)
    .update([userId, email, role, approvalStatus, timestamp].map((value) => String(value || "")).join("\n"))
    .digest("hex");
  return headers;
}
