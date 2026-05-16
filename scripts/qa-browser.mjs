import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9223);
const root = process.cwd();
const artifactsDir = join(root, "qa-artifacts");
const userDataDir = join(tmpdir(), `aculeus-agent-chrome-${Date.now()}`);
const qaServerPort = Number(process.env.QA_PORT || 4398);
const targetUrl = process.env.QA_URL || `http://localhost:${qaServerPort}/`;
const fileUrl = `file:///${resolve(root, "index.html").replace(/\\/g, "/")}`;

mkdirSync(artifactsDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function retry(fn, attempts = 60, delay = 140) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await sleep(delay);
    }
  }
  throw lastError;
}

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolveCommand, rejectCommand } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) rejectCommand(new Error(message.error.message));
        else resolveCommand(message.result || {});
        return;
      }
      const listeners = this.events.get(message.method) || [];
      listeners.forEach((listener) => listener(message.params || {}));
    });
  }

  command(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolveCommand, rejectCommand) => {
      this.pending.set(id, { resolveCommand, rejectCommand });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(eventName, listener) {
    const listeners = this.events.get(eventName) || [];
    listeners.push(listener);
    this.events.set(eventName, listeners);
  }
}

async function connectPage(url) {
  const createdResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  const createdTarget = await createdResponse.json().catch(() => null);
  const target = await retry(async () => {
    if (createdTarget?.webSocketDebuggerUrl) return createdTarget;
    const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
    const pages = await response.json();
    const page = pages.find((item) => item.id === createdTarget?.id)
      || pages.find((item) => item.type === "page" && item.url === url)
      || pages.find((item) => item.type === "page");
    if (!page?.webSocketDebuggerUrl) throw new Error("Chrome target not ready");
    return page;
  });
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", rejectOpen, { once: true });
  });
  return new CdpSession(socket);
}

async function waitForLoad(session) {
  await new Promise((resolveLoad) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolveLoad();
    };
    session.on("Page.loadEventFired", finish);
    setTimeout(finish, 2600);
  });
}

async function evaluate(session, expression, awaitPromise = true) {
  const result = await session.command("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || "Runtime evaluation failed");
  }
  return result.result?.value;
}

async function waitFor(session, expression, label, attempts = 150, delay = 150) {
  return retry(async () => {
    const value = await evaluate(session, expression);
    if (!value) throw new Error(`Timed out waiting for ${label}`);
    return value;
  }, attempts, delay);
}

async function screenshot(session, name) {
  const shot = await session.command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  const filePath = join(artifactsDir, name);
  writeFileSync(filePath, Buffer.from(shot.data, "base64"));
  return filePath;
}

async function assertNoHorizontalOverflow(session, prefix) {
  const overflow = await evaluate(session, "document.documentElement.scrollWidth - window.innerWidth");
  if (overflow > 2) throw new Error(`${prefix} has horizontal overflow: ${overflow}px`);
}

async function assertNoTinyText(session, prefix) {
  const tiny = await evaluate(session, `(() => {
    return [...document.querySelectorAll('button, p, span, strong, em, h1, h2, h3, label')]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 8 && rect.height > 8 && style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.fontSize) < 8.5;
      })
      .map((node) => node.textContent.replace(/\\s+/g, ' ').trim().slice(0, 48))
      .filter(Boolean)
      .slice(0, 8);
  })()`);
  if (tiny.length) throw new Error(`${prefix} has unreadably small text: ${tiny.join(" | ")}`);
}

async function runPage(url, width, height, prefix, interactive = true) {
  const issues = [];
  const session = await connectPage(url);
  session.on("Runtime.exceptionThrown", (params) => {
    issues.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || "Runtime exception");
  });
  session.on("Network.responseReceived", (params) => {
    const status = params.response?.status || 0;
    const responseUrl = params.response?.url || "";
    if (status >= 400) issues.push(`${status} ${responseUrl}`);
  });

  await session.command("Page.enable");
  await session.command("Network.enable");
  await session.command("Runtime.enable");
  await session.command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700
  });
  await session.command("Page.navigate", { url });
  await waitForLoad(session);
  await waitFor(session, "Boolean(document.querySelector('[data-app]'))", "app shell");
  await waitFor(session, "getComputedStyle(document.querySelector('.agent-topbar')).position === 'fixed'", "CSS loaded");
  await sleep(900);

  const hero = await evaluate(session, `({
    title: document.querySelector('#agent-title')?.textContent?.replace(/\\s+/g, ' ').trim(),
    copy: document.querySelector('.lead-copy')?.textContent?.replace(/\\s+/g, ' ').trim(),
    cases: document.querySelectorAll('[data-demo-case-id]').length,
    caseNames: Array.from(document.querySelectorAll('[data-demo-case-id]')).map((button) => button.textContent.replace(/\\s+/g, ' ').trim()).join(' | '),
    leadValue: document.querySelector('#lead-input')?.value || '',
    state: document.querySelector('[data-app]')?.dataset.runState,
    sourceHidden: document.querySelector('[data-source-sheet]')?.hidden,
    sourceFedHref: document.querySelector('[data-source-fed-entry]')?.getAttribute('href') || '',
    dockVisible: getComputedStyle(document.querySelector('.bottom-dock')).display
  })`);

  if (hero.title !== "Bring a lead. Build the case.") throw new Error(`${prefix} weak hero title: ${hero.title}`);
  if (!hero.copy.includes("opens permitted sources") || !hero.copy.includes("drafts the next move")) {
    throw new Error(`${prefix} hero copy misses controlled agent framing: ${hero.copy}`);
  }
  if (interactive && hero.cases !== 3) throw new Error(`${prefix} demo case selector should show three active cases: ${hero.cases}`);
  if (/San Francisco homelessness|California homelessness top 15|Provider deep dive/i.test(hero.caseNames)) {
    throw new Error(`${prefix} hidden cases are still visible: ${hero.caseNames}`);
  }
  if (!/intermediary|public money|source/i.test(hero.leadValue)) throw new Error(`${prefix} lead input should default to the selected case: ${hero.leadValue}`);
  if (!hero.sourceFedHref.includes("source-fed.html")) throw new Error(`${prefix} missing source-fed case-board entry link.`);
  if (hero.state !== "idle" || !hero.sourceHidden) throw new Error(`${prefix} app should start idle with sheets hidden.`);

  await assertNoHorizontalOverflow(session, `${prefix} lead`);
  await assertNoTinyText(session, `${prefix} lead`);

  if (width >= 700) {
    await evaluate(session, `window.dispatchEvent(new PointerEvent('pointermove', { clientX: 333, clientY: 222, pointerType: 'mouse', bubbles: true }));`);
    await sleep(80);
    const cursor = await evaluate(session, `({
      active: document.body.classList.contains('is-cursor-active'),
      hiddenNative: document.body.classList.contains('has-custom-cursor'),
      transform: document.querySelector('[data-cursor-laser]')?.style.transform || ''
    })`);
    if (!cursor.active || !cursor.hiddenNative || !cursor.transform.includes("translate3d(326.5px, 215.5px, 0px)")) {
      throw new Error(`${prefix} cursor laser is not tracking: ${JSON.stringify(cursor)}`);
    }
  }

  const leadShot = await screenshot(session, `${prefix}-agent-lead.png`);
  if (!interactive) return { prefix, shots: [leadShot], issues };

  await evaluate(session, `document.querySelectorAll('[data-demo-case-id]')[1]?.click()`);
  await waitFor(session, "document.querySelector('#lead-input').value.includes('Elevate Youth California')", "case click fills lead");
  await evaluate(session, `document.querySelectorAll('[data-demo-case-id]')[0]?.click()`);
  await waitFor(session, "document.querySelector('#lead-input').value.includes('intermediary-governance network')", "case click resets lead");
  await evaluate(session, "document.querySelector('[data-sample-lead]').click()");
  await waitFor(session, "document.querySelector('#lead-input').value.includes('intermediary-governance network')", "sample lead");
  await evaluate(session, "document.querySelector('[data-start-investigation]').click()");
  await waitFor(session, "document.querySelector('[data-app]').dataset.runState === 'running'", "run started");
  await sleep(9600);
  await waitFor(session, "document.querySelector('[data-app]').dataset.runState === 'complete'", "run complete", 70, 160);
  await waitFor(session, "document.body.innerText.toLowerCase().includes('the intermediary machine')", "dossier opened", 50, 150);
  await waitFor(session, "document.body.innerText.toLowerCase().includes('what the record shows')", "reasoning proof spine", 50, 150);
  await sleep(900);

  const run = await evaluate(session, `({
    state: document.querySelector('[data-app]')?.dataset.runState,
    feedCount: document.querySelectorAll('.feed-item').length,
    headline: document.querySelector('[data-answer-headline]')?.textContent?.trim(),
    body: document.querySelector('[data-answer-body]')?.textContent?.trim(),
    sourceRefs: document.querySelectorAll('[data-source-ref]').length,
    railSteps: document.querySelectorAll('[data-rail-steps] li').length,
    oldBoard: Boolean(document.querySelector('.case-universe, .evidence-lanes, .action-board, .command-panels')),
    visibleText: document.body.innerText
  })`);

  if (run.state !== "complete") throw new Error(`${prefix} run did not complete.`);
  if (run.feedCount < 5) throw new Error(`${prefix} run feed too thin: ${run.feedCount}`);
  if (!/(missing record|next record)/i.test(run.headline) || !/(approve|source|record|request|human)/i.test(run.body)) {
    throw new Error(`${prefix} final answer lacks action approval framing.`);
  }
  if (run.sourceRefs < 3 || run.railSteps < 7) throw new Error(`${prefix} source receipts or run trail missing.`);
  if (!run.visibleText.toLowerCase().includes("question under review") || !run.visibleText.toLowerCase().includes("working hypothesis")) {
    throw new Error(`${prefix} missing reasoning spine.`);
  }
  for (const required of ["the intermediary machine", "$6.2b+", "the center at sierra health foundation", "public health institute", "claim ladder", "what the record shows", "missing record that decides the case", "action route"]) {
    if (!run.visibleText.toLowerCase().includes(required)) throw new Error(`${prefix} missing dossier depth: ${required}`);
  }
  if (run.oldBoard) throw new Error(`${prefix} old noisy board architecture is still visible.`);
  for (const banned of ["Redspire", "Invoice #7784", "duplicate-payment", "Every node is a record", "Direct action board"]) {
    if (run.visibleText.includes(banned)) throw new Error(`${prefix} banned old copy visible: ${banned}`);
  }

  await assertNoHorizontalOverflow(session, `${prefix} run`);
  await assertNoTinyText(session, `${prefix} run`);
  const runShot = await screenshot(session, `${prefix}-agent-run.png`);

  await evaluate(session, "document.querySelector('.evidence-card[data-source-ref]')?.click()");
  await waitFor(session, "!document.querySelector('[data-source-sheet]').hidden", "source sheet");
  const sourceSheet = await evaluate(session, `({
    title: document.querySelector('[data-source-title]')?.textContent?.trim(),
    used: document.querySelector('[data-source-used]')?.textContent?.trim(),
    supports: document.querySelector('[data-source-supports]')?.textContent?.trim(),
    limitation: document.querySelector('[data-source-limitation]')?.textContent?.trim(),
    missing: document.querySelector('[data-source-missing]')?.textContent?.trim(),
    story: document.querySelector('[data-source-story]')?.textContent?.trim(),
    provenance: document.querySelector('[data-source-provenance]')?.textContent?.trim(),
    openText: document.querySelector('[data-source-open]')?.textContent?.trim(),
    openHref: document.querySelector('[data-source-open]')?.getAttribute('href') || ''
  })`);
  if (!sourceSheet.title || !sourceSheet.used || !sourceSheet.supports || !sourceSheet.limitation || !sourceSheet.missing || !sourceSheet.story || !sourceSheet.provenance || !sourceSheet.openHref) {
    throw new Error(`${prefix} source sheet incomplete: ${JSON.stringify(sourceSheet)}`);
  }
  if (!/publisher|locator|document id|method/i.test(sourceSheet.provenance) || !/open (public source|source packet)/i.test(sourceSheet.openText)) {
    throw new Error(`${prefix} source sheet lacks provenance or verification action: ${JSON.stringify(sourceSheet)}`);
  }
  const sourceShot = await screenshot(session, `${prefix}-source-sheet.png`);
  await evaluate(session, "document.querySelector('[data-source-cite]')?.click()");
  await waitFor(session, "document.querySelector('[data-source-sheet]').hidden && document.querySelector('[data-source-ref]')", "show cited source");
  await evaluate(session, "document.querySelector('[data-source-ref]')?.click()");
  await waitFor(session, "!document.querySelector('[data-source-sheet]').hidden", "source sheet reopened");
  await evaluate(session, "document.querySelector('[data-source-ask]')?.click()");
  const sourceQuestion = await evaluate(session, "document.querySelector('[data-command-input]')?.value || ''");
  if (!/what exactly does/i.test(sourceQuestion) || !/prove/i.test(sourceQuestion)) {
    throw new Error(`${prefix} ask-about-source did not seed the command bar: ${sourceQuestion}`);
  }
  await evaluate(session, "document.querySelector('[data-command-input]').value = ''");
  await evaluate(session, "document.querySelector('[data-close-sheet]').click()");
  await waitFor(session, "document.querySelector('[data-source-sheet]').hidden", "source sheet closed");

  await evaluate(session, "document.querySelector('[data-open-draft]').click()");
  await waitFor(session, "!document.querySelector('[data-draft-sheet]').hidden", "draft sheet");
  const draft = await evaluate(session, "document.querySelector('[data-draft-request]')?.textContent || ''");
  if (!draft.includes("Please provide master contracts")) throw new Error(`${prefix} draft request not generated: ${draft.slice(0, 120)}`);
  const draftProvenance = await evaluate(session, "document.querySelector('[data-draft-provenance]')?.textContent || ''");
  if (!draftProvenance.includes("Built from")) throw new Error(`${prefix} draft provenance missing: ${draftProvenance.slice(0, 120)}`);
  const draftShot = await screenshot(session, `${prefix}-draft-sheet.png`);
  await evaluate(session, "document.querySelector('[data-close-sheet]').click()");

  await evaluate(session, `(() => {
    const input = document.querySelector('[data-command-input]');
    input.value = 'What are the strongest findings?';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })), 0);
  })()`, false);
  await waitFor(session, "document.body.innerText.toLowerCase().includes('source-locked answer') && !document.querySelector('[data-command-answer]').hidden", "Q&A answer");
  const qaState = await evaluate(session, `({
    text: document.body.innerText,
    sourceRefs: document.querySelectorAll('[data-source-ref]').length
  })`);
  const qaText = qaState.text.toLowerCase();
  const hasDossierAnswer = qaText.includes("strongest record signals")
    || qaText.includes("strongest findings")
    || (qaText.includes("strongest signal") && qaText.includes("california intermediary network") && qaText.includes("$6.2b"))
    || (qaText.includes("united council of human services") && qaText.includes("homerise"));
  if (!qaText.includes("source-locked answer") || !hasDossierAnswer || qaState.sourceRefs < 3) {
    throw new Error(`${prefix} Q&A answer did not attach source receipts: ${JSON.stringify(qaState)}`);
  }
  const qaShot = await screenshot(session, `${prefix}-qa-answer.png`);

  if (issues.length) throw new Error(`${prefix} browser issues: ${issues.join(" | ")}`);
  return { prefix, shots: [leadShot, runShot, sourceShot, draftShot, qaShot], issues };
}

async function runSourceFedPage(url, width, height, prefix) {
  const issues = [];
  const session = await connectPage(url);
  session.on("Runtime.exceptionThrown", (params) => {
    issues.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || "Runtime exception");
  });
  session.on("Network.responseReceived", (params) => {
    const status = params.response?.status || 0;
    const responseUrl = params.response?.url || "";
    if (status >= 400) issues.push(`${status} ${responseUrl}`);
  });

  await session.command("Page.enable");
  await session.command("Network.enable");
  await session.command("Runtime.enable");
  await session.command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700
  });
  await session.command("Page.navigate", { url });
  await waitForLoad(session);
  await waitFor(session, "Boolean(document.querySelector('[data-case-list]'))", "source-fed case list");
  await waitFor(session, "getComputedStyle(document.querySelector('.topbar')).display === 'flex'", "source-fed CSS loaded");
  await waitFor(session, "document.querySelectorAll('[data-case-id]').length === 4", "imported source-fed cases");
  await waitFor(session, "Boolean(document.querySelector('[data-action-brief]')) && Boolean(document.querySelector('[data-live-investigation]')) && Boolean(document.querySelector('[data-candidate-leads]')) && Boolean(document.querySelector('[data-source-ledger-summary]')) && document.body.innerText.includes('Findings Table') && document.body.innerText.includes('Evidence Rail') && document.body.innerText.includes('Missing Records') && document.body.innerText.includes('Rejected Or Weak Claims')", "case board sections");
  await sleep(500);

  const board = await evaluate(session, `({
    title: document.querySelector('h1')?.textContent?.trim(),
    importedCount: document.querySelector('[data-case-count]')?.textContent?.trim(),
    cases: document.querySelectorAll('[data-case-id]').length,
    selectedPressed: document.querySelectorAll('[data-case-id][aria-pressed="true"]').length,
    actionBrief: Boolean(document.querySelector('[data-action-brief]')),
    liveScaffold: Boolean(document.querySelector('[data-live-investigation]')),
    candidateLeadCount: document.querySelectorAll('[data-candidate-leads] article').length,
    ledgerSummary: Boolean(document.querySelector('[data-source-ledger-summary]')),
    ledgerStatuses: document.querySelectorAll('[data-ledger-status]').length,
    findings: document.querySelectorAll('.findings-table article').length,
    rejectedOrWeak: document.querySelectorAll('.claim-list article').length,
    sourceLinks: document.querySelectorAll('.source-list a[href^="http"], .source-chips a[href^="http"]').length,
    missingRecords: document.querySelectorAll('.missing-list li').length,
    visibleText: document.body.innerText
  })`);

  if (board.title !== "Case Board") throw new Error(`${prefix} title mismatch: ${board.title}`);
  if (board.importedCount !== "4 imported" || board.cases !== 4 || board.selectedPressed !== 1) {
    throw new Error(`${prefix} source-fed case import/selection failed: ${JSON.stringify(board)}`);
  }
  if (!board.actionBrief || !board.liveScaffold || board.candidateLeadCount < 1 || !board.ledgerSummary || board.ledgerStatuses < 8) {
    throw new Error(`${prefix} Action Brief, live scaffold, candidate leads, or ledger summary missing: ${JSON.stringify(board)}`);
  }
  if (board.findings < 1 || board.sourceLinks < 3 || board.missingRecords < 1) {
    throw new Error(`${prefix} source-fed board too thin: ${JSON.stringify(board)}`);
  }
  if (board.rejectedOrWeak < 1 && !board.visibleText.includes("No rejected or weak claims")) {
    throw new Error(`${prefix} rejected/weak claims section missing rows or empty state: ${JSON.stringify(board)}`);
  }
  const visibleLower = board.visibleText.toLowerCase();
  for (const required of ["LA homelessness", "Action Brief", "What we found", "Quick next steps", "Live Investigation Scaffold", "Candidate Leads", "not evidence", "Source Ledger", "Usable Evidence", "Needs Records Request", "Findings Table", "Evidence Rail", "Missing Records", "Rejected Or Weak Claims", "Official LA Controller Row Facts", "ST BARNABAS SENIOR CENTER OF LOS ANGELES"]) {
    if (!visibleLower.includes(required.toLowerCase())) throw new Error(`${prefix} missing source-fed copy: ${required}`);
  }
  for (const banned of ["Loading source-fed case board.", "Invoice #7784", "duplicate-payment"]) {
    if (board.visibleText.includes(banned)) throw new Error(`${prefix} stale or banned copy visible: ${banned}`);
  }

  await assertNoHorizontalOverflow(session, prefix);
  await assertNoTinyText(session, prefix);
  await evaluate(session, `document.querySelector('[data-live-investigation-form] button')?.click()`);
  await waitFor(session, "document.body.innerText.includes('investigation_spec') && document.body.innerText.includes('provider_calls_executed')", "live scaffold spec generated", 40, 150);
  await waitFor(session, "document.body.innerText.includes('ready') && document.body.innerText.includes('output_default') && document.body.innerText.includes('candidate_sources_are_evidence') && document.body.innerText.includes('provider_candidate_tasks') && document.body.innerText.includes('provider_candidates') && document.body.innerText.includes('provider_search_candidate') && document.body.innerText.includes('official_api_tasks') && document.body.innerText.includes('official_api_candidate_probe') && document.body.innerText.includes('retrieval_queue') && document.body.innerText.includes('audit_trail') && document.body.innerText.includes('cost_ledger')", "live scaffold ready", 80, 150);
  const initialShot = await screenshot(session, `${prefix}-source-fed-board.png`);

  await evaluate(session, `document.querySelectorAll('[data-case-id]')[2]?.click()`);
  await waitFor(session, "document.querySelector('[data-case-id][aria-pressed=\"true\"] b')?.textContent?.includes('San Francisco')", "source-fed case switch");
  await waitFor(session, "document.body.innerText.includes('San Francisco drug rehabilitation')", "switched source-fed board");
  await waitFor(session, "document.body.innerText.includes('Official SF Data HealthRIGHT Row Facts') && document.body.innerText.includes('DPH - SUD Prevention')", "SF Data HealthRIGHT row facts visible");
  await waitFor(session, "Array.from(document.querySelectorAll('.claim-list article')).some((article) => article.textContent.includes('blocked_by_citation_verifier') && article.textContent.includes('quoted_or_claim_text_not_supported_by_excerpt'))", "source-fed blocked claims populated");
  await assertNoHorizontalOverflow(session, `${prefix} switched`);
  const switchedShot = await screenshot(session, `${prefix}-source-fed-switched.png`);

  if (issues.length) throw new Error(`${prefix} browser issues: ${issues.join(" | ")}`);
  return { prefix, shots: [initialShot, switchedShot], issues };
}

async function main() {
  const qaRunStoreDir = join(tmpdir(), `aculeus-qa-run-store-${Date.now()}`);
  const appServer = process.env.QA_URL ? null : spawn(process.execPath, ["scripts/serve.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(qaServerPort),
      ACULEUS_RUN_STORE_DIR: qaRunStoreDir
    },
    stdio: "ignore"
  });
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "about:blank"
  ], { stdio: "ignore" });

  try {
    if (appServer) {
      await retry(async () => {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`App server not ready: ${response.status}`);
      }, 80, 120);
    }

    await retry(async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (!response.ok) throw new Error("Chrome not ready");
      return response.json();
    }, 80, 120);

    const runs = [];
    runs.push(await runPage(targetUrl, 390, 960, targetUrl.includes("vercel.app") ? "live-mobile" : "local-mobile"));
    runs.push(await runPage(targetUrl, 1440, 1100, targetUrl.includes("vercel.app") ? "live-desktop" : "local-desktop"));
    runs.push(await runPage(fileUrl, 390, 960, "file-mobile", false));
    const sourceFedUrl = new URL("/source-fed.html", targetUrl).toString();
    runs.push(await runSourceFedPage(sourceFedUrl, 390, 960, targetUrl.includes("vercel.app") ? "source-fed-live-mobile" : "source-fed-local-mobile"));
    runs.push(await runSourceFedPage(sourceFedUrl, 1440, 1100, targetUrl.includes("vercel.app") ? "source-fed-live-desktop" : "source-fed-local-desktop"));

    const shots = runs.flatMap((run) => run.shots);
    console.log(JSON.stringify({ ok: true, url: targetUrl, sourceFedUrl, fileUrl, screenshots: shots }, null, 2));
  } finally {
    chrome.kill();
    if (appServer) appServer.kill();
    await sleep(450);
    rmSync(qaRunStoreDir, { recursive: true, force: true });
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Windows can briefly hold Chrome profile locks after headless shutdown.
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
