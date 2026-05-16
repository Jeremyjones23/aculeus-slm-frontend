import { listRecentCaseSeeds, getSeedCase, buildAnswerBriefFromCase, buildRunCheckpoints } from "@/lib/aculeus-product-data.js";
import { AculeusWorkspace } from "@/components/aculeus-workspace.jsx";

export default function HomePage() {
  const recentCases = listRecentCaseSeeds();
  const seedCase = getSeedCase("source_la_homelessness_fwa");
  const initialBrief = buildAnswerBriefFromCase(seedCase);
  const checkpoints = buildRunCheckpoints();

  return (
    <AculeusWorkspace
      recentCases={recentCases}
      initialBrief={initialBrief}
      checkpoints={checkpoints}
    />
  );
}
