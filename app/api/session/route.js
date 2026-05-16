import { NextResponse } from "next/server";
import { canAccessWorkspace, canCreateCase, canReviewEvidence, getVerifiedRequestUser, resolveAuthMode } from "@/lib/access-control.js";

export async function GET(request) {
  const user = await getVerifiedRequestUser(request);
  const workspaceAccess = canAccessWorkspace(user);
  return NextResponse.json({
    ok: workspaceAccess,
    user,
    workspaceAccess,
    canCreateCase: canCreateCase(user),
    canReviewEvidence: canReviewEvidence(user),
    inviteOnly: true,
    authMode: resolveAuthMode()
  }, { status: workspaceAccess ? 200 : 401 });
}
