import { getWritable } from "workflow";
import { createAculeusRun } from "@/lib/aculeus-run-adapter.js";

export async function aculeusCaseRun(input) {
  "use workflow";

  await emitCheckpoint({ type: "checkpoint", state: "intake", label: "Lead received" });
  await emitCheckpoint({ type: "checkpoint", state: "retrieving", label: "Sources opening" });
  await emitCheckpoint({ type: "checkpoint", state: "reasoning", label: "Claims testing" });

  const run = await buildRun(input);

  await emitCheckpoint({ type: "brief", state: "review", label: "Answer brief ready", run });
  return run;
}

async function buildRun(input) {
  "use step";
  return createAculeusRun(input);
}

async function emitCheckpoint(event) {
  "use step";
  const writer = getWritable().getWriter();
  try {
    await writer.write({
      ...event,
      at: new Date().toISOString()
    });
  } finally {
    writer.releaseLock();
  }
}
