import { MediaReviewPanel } from "@/components/media-review-panel.jsx";
import { getMediaRunAuto } from "@/lib/aculeus-media-run-store.js";
import { canCreateCase, getVerifiedRequestUser } from "@/lib/access-control.js";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Operator-facing mount surface for the media review panel. Load with ?id=<media_run_id>.
export default async function MediaReviewPage({ searchParams }) {
  // Gate before loading any saved run — mirrors the /api/media-runs route, so a media_run_id
  // is not enough to read the payload without an approved operator/admin session.
  const user = await getVerifiedRequestUser({ headers: await headers() });
  if (!canCreateCase(user)) {
    return (
      <main className="media-review-page" style={{ padding: "24px", maxWidth: "960px", margin: "0 auto" }}>
        <p style={{ fontFamily: "monospace", color: "#475569" }}>Approved operator or admin access is required to open media review.</p>
      </main>
    );
  }
  const sp = (await searchParams) || {};
  const id = sp.id;
  const mediaRun = id ? await getMediaRunAuto(id) : null;
  return (
    <main className="media-review-page" style={{ padding: "24px", maxWidth: "960px", margin: "0 auto" }}>
      {mediaRun
        ? <MediaReviewPanel mediaRun={mediaRun} atoms={mediaRun.atoms || []} />
        : <p style={{ fontFamily: "monospace", color: "#475569" }}>Provide a media run id — <code>/media-review?id=…</code></p>}
    </main>
  );
}
