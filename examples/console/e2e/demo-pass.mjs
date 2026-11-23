// [DX-CON1] A Playwright pass over the ten-minute demo (DESIGN.md section 3), with a light and a dark screenshot of every
// step. It runs against a console page server (the built app and its API on one origin), on the toy or on the 1 billion
// database, and fails loudly: any console error or failed step exits 1.
//
//   node examples/console/e2e/demo-pass.mjs --database toy|1b --out <screenshot dir>
//        [--api http://127.0.0.1:28580] [--type Inspection] [--mcp <checkout>] [--state <connection file>] [--far-back N]
//
// --api     the console page server (default 127.0.0.1:28580; the 1 billion database's second server is 28583).
// --database toy: the subject is the middle subject of the last account (the owner's example account stays untouched);
//            1b: subject 50000 of account-003, as the design's script says. Both are read from list_accounts.
// --type    the entity type the script defines (default Inspection). Re-running with the same name re-commits it.
// --mcp     a checkout whose examples/demo-mcp/src/mcp.ts plays the assistant in step 7 (over MCP, actor "assistant");
//            --state is the connection file it should read (the TRIPLEX_DEMO_STATE of the --api server).
// What it writes, on the working copy only: one release (the type), one entity and one correction from the console, one
// entity from the assistant. Cleanup: it always moves live back to the release live pointed to before it started, so the
// type leaves the sidebar again; the release, the entities and their journal entries stay, as a journal must.
// Times on screen come from the tool answers; the pass only reads them.
// Why: the design's acceptance is the demo itself; each step leaves a screenshot to look at.
// Rejected: the repository's Playwright test runner config (it targets the playground and its own servers).
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const out = arg("out");
const database = arg("database");
if (!out || !["toy", "1b"].includes(database))
  throw new Error("Give --database toy|1b and --out <screenshot directory>");
const base = (arg("api") ?? arg("url") ?? "http://127.0.0.1:28580").replace(/\/$/, "");
const mcpRoot = arg("mcp");
const stateFile = arg("state");
const typeName = arg("type", "Inspection");
if (!/^[A-Z][A-Za-z0-9]*$/.test(typeName)) throw new Error("--type is a PascalCase name");
const prefix = typeName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
mkdirSync(out, { recursive: true });

const log = [];
const note = (step, text) => {
  const line = `${new Date().toISOString().slice(11, 19)} ${step} ${text}`;
  log.push(line);
  console.log(line);
};
const tool = async (name, input) => {
  const r = await fetch(`${base}/api/tools/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify(input),
  });
  const body = await r.json();
  if (!r.ok)
    throw Object.assign(new Error(`${name}: ${body.error?.code} ${body.error?.message}`), {
      code: body.error?.code,
    });
  return body;
};

// The connected database decides the subject, never a hard-coded toy number.
const connection = await (await fetch(`${base}/api/connection`)).json();
if (connection.error) throw new Error(`${base} is not connected: ${connection.error.message}`);
if ((connection.kind === "1b") !== (database === "1b"))
  throw new Error(
    `--database ${database} but ${base} is connected to ${connection.label ?? connection.kind}`,
  );
const accounts = (await tool("list_accounts", {})).accounts.map((a) => {
  const [first, last] = a.subjectNumbers.split(" to ").map(Number);
  return { account: a.account, first, last };
});
const target = database === "1b" ? (accounts[2] ?? accounts[0]) : accounts.at(-1);
const ACCOUNT = target.account;
const SUBJECT =
  database === "1b" ? 50000 : target.first + Math.floor((target.last - target.first + 1) / 2);
const ASSISTANT_SUBJECT = Math.min(target.last, SUBJECT + 7);
if (SUBJECT < target.first || SUBJECT > target.last)
  throw new Error(`${ACCOUNT} has subjects ${target.first} to ${target.last}`);
// Step 3's far-back read: position 87,002 on the 1 billion database (the design's script), the seed head on the toy.
const farBack = arg("far-back") ? Number(arg("far-back")) : database === "1b" ? 87002 : connection.clocks?.seedHead;
note(
  "0",
  `${connection.label}: ${ACCOUNT} subject ${SUBJECT}; sealed head ${connection.sealed?.head}; far-back position ${farBack}`,
);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: "light",
});
const page = await context.newPage();
const problems = [];
let expectRefusal = false;
page.on("pageerror", (e) => problems.push(`pageerror ${e}`));
page.on("console", (m) => {
  if (m.type() !== "error") return;
  // A refusal is a 400 from the tool, expected only in the step that asks for one.
  if (expectRefusal && /status of 400/.test(m.text())) return;
  problems.push(`console ${m.text().split("\n")[0]}`);
});
page.on("response", (r) => {
  if (r.url().includes("/api/") && r.status() >= 500)
    problems.push(`HTTP ${r.status()} ${r.url()}`);
});
let shot = 0;
/** One light and one dark screenshot of the same state. */
const snap = async (name) => {
  const stem = join(out, `${String(++shot).padStart(2, "0")}-${name}`);
  await page.waitForTimeout(400); // let dialogs and sheets finish their opening animation
  await page.screenshot({ path: `${stem}.png` });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${stem}-dark.png` });
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForTimeout(150);
  note("shot", stem.split("/").pop());
};
const answerLine = async () =>
  (await page.getByTestId("answer-line").first().innerText()).replace(/\s+/g, " ");
const pick = async (trigger, option) => {
  await trigger.click();
  await page.getByRole("option", { name: option, exact: true }).click();
};
const goto = async (path, idle = true) => {
  await page.goto(base + path, {
    waitUntil: idle ? "networkidle" : "domcontentloaded",
    timeout: 60_000,
  });
};
const pad8 = (n) => String(n).padStart(8, "0");
/** An example in the Query screen's list, by the start of its name. */
const example = (name) => page.getByRole("button", { name: new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });

/** One MCP tools/call over stdio, so the change carries actor "assistant" exactly as Claude Code's would. */
async function assistantCall(name, args) {
  if (!mcpRoot) return null;
  const env = { ...process.env, ...(stateFile ? { TRIPLEX_DEMO_STATE: stateFile } : {}) };
  const child = spawn(process.execPath, [join(mcpRoot, "examples/demo-mcp/src/mcp.ts")], {
    stdio: ["pipe", "pipe", "inherit"],
    env,
  });
  let buffer = "";
  const waiters = new Map();
  child.stdout.on("data", (d) => {
    buffer += d;
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      if (line.trim()) {
        const msg = JSON.parse(line);
        waiters.get(msg.id)?.(msg);
      }
    }
  });
  const send = (msg) => child.stdin.write(JSON.stringify(msg) + "\n");
  const request = (id, method, params) =>
    new Promise(
      (resolve) => (waiters.set(id, resolve), send({ jsonrpc: "2.0", id, method, params })),
    );
  await request(1, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "console-demo-pass", version: "0" },
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  const res = await request(2, "tools/call", { name, arguments: args });
  child.kill();
  const answer = JSON.parse(res.result.content[0].text);
  if (res.result.isError)
    throw new Error(`assistant ${name}: ${answer.error?.code} ${answer.error?.message}`);
  return answer;
}

const liveBefore = (await tool("list_releases", { limit: 1 })).refs.live;
note("0", `live before: ${liveBefore?.label ?? "none"} ${liveBefore?.id?.slice(0, 16) ?? ""}`);
let entityUrl;

try {
  // Step 1: Home, the account, then one subject opened twice (first read, then warm).
  await goto("/");
  await snap("home");
  await goto(`/accounts/${ACCOUNT}`);
  await snap("account");
  await page.getByTestId("go-subject").fill(String(SUBJECT));
  await page.getByRole("button", { name: "Open" }).click();
  await page.waitForSelector("[data-testid=answer-line]");
  note("1", "first read: " + (await answerLine()));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=answer-line]");
  note("1", "second read: " + (await answerLine()));
  await snap("subject-facts");

  // Step 2: Query on that subject; then the grouped count with its chart.
  await goto("/query");
  await pick(page.getByTestId("query-account"), ACCOUNT);
  await page.locator('input[placeholder="subject"]').fill(String(SUBJECT));
  await example("Tasks that are not complete").click();
  await page.getByTestId("run-query").click();
  await page.waitForSelector("[data-testid=query-result] [data-testid=answer-line]", {
    timeout: 60_000,
  });
  note(
    "2",
    (await page.getByTestId("query-result").innerText()).split("\n").slice(0, 10).join(" | "),
  );
  await snap("query-not-complete");
  await example("Subtasks per task").click();
  await page.getByTestId("run-query").click();
  await page.waitForSelector("[data-testid=query-result] [data-testid=answer-line]", {
    timeout: 60_000,
  });
  await page.getByRole("tab", { name: "Chart" }).click();
  await snap("query-chart");

  // Step 3: the same question at the sealed head, then far back (seed), then a whole-database question refused.
  await example("The same question at the sealed head").click();
  await page.getByTestId("run-query").click();
  await page.waitForSelector("[data-testid=query-result] [data-testid=answer-line]", {
    timeout: 60_000,
  });
  note(
    "3",
    "sealed head: " +
      (await answerLine()) +
      " badge " +
      (await page.getByTestId("basis-badge").innerText()),
  );
  await snap("query-sealed-head");
  if (farBack !== undefined) {
    await page.getByTestId("basis-control").click();
    await page.getByTestId("basis-position").fill(String(farBack));
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByTestId("run-query").click();
    await page.waitForSelector("[data-testid=query-result] [data-testid=answer-line]", {
      timeout: 60_000,
    });
    note("3", `position ${farBack}: ` + (await answerLine()));
    await snap("query-far-back");
  }
  await page.getByTestId("basis-control").click();
  await page.getByRole("button", { name: "Back to latest" }).click();
  expectRefusal = true;
  await example("Every complete task in the database").click();
  await page.getByTestId("run-query").click();
  await page.waitForSelector("[data-testid=refused]");
  note(
    "3",
    "refusal: " +
      (await page.getByTestId("refused").innerText()).replace(/\s+/g, " ").slice(0, 160),
  );
  await snap("query-refused");
  expectRefusal = false;

  // Step 4: define a type and commit a release; then Edit type re-commits it unchanged.
  await goto("/");
  await page.getByRole("button", { name: "New entity type" }).first().click();
  await page.getByTestId("type-name").fill(typeName);
  const rows = [
    [`:${prefix}/outcome`, "enum", true],
    [`:${prefix}/note`, "text", false],
    [`:${prefix}/decided-on`, "date", false],
    [`:${prefix}/of`, "ref", true],
  ];
  for (const [i, [key, type, required]] of rows.entries()) {
    if (i > 0) await page.getByRole("button", { name: "+ Add attribute" }).click();
    await page.getByTestId(`attr-key-${i}`).fill(key);
    await pick(page.getByTestId(`attr-type-${i}`), type);
    if (required) await page.getByRole("checkbox", { name: "required" }).nth(i).click();
    if (type === "enum")
      await page.getByTestId(`attr-enum-${i}`).fill("pending, approved, rejected");
    if (type === "ref") await pick(page.getByTestId(`attr-target-${i}`), "Subject");
  }
  await snap("new-type-sheet");
  await page.getByTestId("commit-release").click();
  await page.waitForURL(new RegExp(`/types/${typeName}\\?`), { timeout: 60_000 });
  await page.waitForSelector("[data-testid=answer-line]");
  await page.waitForTimeout(800);
  note(
    "4",
    "after commit: " +
      (await page.locator("#screen").innerText()).split("\n").slice(0, 2).join(" | "),
  );
  await snap("type-definition");
  await page.getByRole("button", { name: "Edit type" }).click();
  await page.getByTestId("commit-release").click();
  await page.waitForSelector("[data-sonner-toast]", { timeout: 60_000 });
  note(
    "4",
    "edit type: " + (await page.locator("[data-sonner-toast]").first().innerText()).split("\n")[0],
  );

  // Step 5: a new entity from the generated form, its Transaction tab, the commit; then read it as a subject.
  await goto(`/types/${typeName}?account=${ACCOUNT}`);
  await page.getByTestId("new-entity").click();
  await pick(page.getByRole("dialog").getByRole("combobox").first(), ACCOUNT).catch(() => {});
  await pick(page.getByTestId(`field-:${prefix}/outcome`), "pending");
  await page.getByTestId(`field-:${prefix}/note`).fill("first look");
  await page.getByTestId(`ref-:${prefix}/of`).fill(String(SUBJECT));
  await page.getByTestId("valid-from").fill("2026-11-09");
  await snap("entity-form");
  await page.getByRole("tab", { name: "Transaction" }).click();
  await snap("entity-form-transaction");
  await page.getByTestId("commit-entity").click();
  await page.waitForURL(/\/entities\//, { timeout: 60_000 });
  await page.waitForSelector("[data-testid=answer-line]");
  entityUrl = page.url().split("?")[0];
  note("5", "created: " + decodeURIComponent(entityUrl.split("/entities/")[1]));
  await snap("entity-created");
  await page.getByLabel("Read as subject").click();
  await page.waitForTimeout(1500);
  note("5", "as subject: " + (await answerLine()));
  await snap("entity-as-subject");

  // Step 6: correct the outcome from 16 November; Both time axes on 17 November; the History tab keeps the retraction.
  await goto(entityUrl.replace(base, ""));
  await page.getByTestId("change-fact").click();
  await pick(page.getByRole("dialog").getByRole("combobox").first(), `:${prefix}/outcome`).catch(
    () => {},
  );
  await page.getByTestId("new-value").fill("approved");
  await page.getByLabel("a past date (a correction)").click();
  await page.locator('input[type="date"]').last().fill("2026-11-16");
  await page.getByRole("tab", { name: "Transaction" }).click();
  await snap("change-transaction");
  await page.getByTestId("commit-change").click();
  await page.waitForSelector("[data-sonner-toast]", { timeout: 60_000 });
  await snap("change-receipt");
  await goto(
    `${entityUrl.replace(base, "")}?tab=time&attribute=${encodeURIComponent(`:${prefix}/outcome`)}&at=2026-11-17`,
  );
  await page.waitForSelector("[data-testid=time-table]", { timeout: 60_000 });
  const axes = (await page.getByTestId("time-table").innerText()).replace(/\s+/g, " ");
  note("6", "both axes: " + axes.slice(0, 220));
  if (!/approved approved pending/.test(axes))
    problems.push(`step 6: expected approved, approved, pending; got ${axes.slice(0, 160)}`);
  await snap("both-time-axes");
  await goto(
    `${entityUrl.replace(base, "")}?tab=history&attribute=${encodeURIComponent(`:${prefix}/outcome`)}`,
  );
  await page.waitForSelector("[data-testid=answer-line]");
  await snap("history");

  // Step 7: the Journal open with Live on while the assistant adds an entity over MCP; then Changed since.
  await goto("/journal", false);
  await page.waitForSelector("[data-testid=answer-line]");
  const head = (await tool("database_summary", {})).head;
  const viaAssistant = await assistantCall("create_entity", {
    type: typeName,
    account: ACCOUNT,
    attributes: {
      [`:${prefix}/outcome`]: "pending",
      [`:${prefix}/of`]: `acct/${ACCOUNT}/pl:${pad8(ASSISTANT_SUBJECT)}`,
    },
  });
  note(
    "7",
    viaAssistant
      ? `assistant created ${viaAssistant.entity} at position ${viaAssistant.position}`
      : "no --mcp given: the assistant's call was skipped",
  );
  if (viaAssistant) {
    await page
      .getByText(String(viaAssistant.position), { exact: true })
      .first()
      .waitFor({ timeout: 40_000 });
    note("7", `the open Journal showed position ${viaAssistant.position} without a reload`);
  }
  await snap("journal-live");
  await page.getByLabel("After position").fill(String(head - 3));
  await page.getByTestId("changed-since-open").click();
  await page.waitForSelector("[data-testid=changed-since]", { timeout: 60_000 });
  note("7", (await page.getByTestId("changed-since").innerText()).replace(/\s+/g, " "));
  await snap("changed-since");
  await page.keyboard.press("Escape");

  // Step 8: move live back to the release it pointed to before. The type leaves the list; its facts still read.
  if (liveBefore) {
    await goto("/configuration");
    await snap("configuration");
    const row = page
      .getByRole("row")
      .filter({ hasText: liveBefore.id.slice(0, 15) })
      .filter({ hasText: liveBefore.label })
      .filter({ has: page.getByTestId("move-live") })
      .first();
    await row.getByTestId("move-live").click();
    await snap("move-live-confirm");
    await page.getByTestId("confirm-move").click();
    await page.waitForSelector("[data-testid=moved]", { timeout: 60_000 });
    note("8", (await page.getByTestId("moved").innerText()).replace(/\s+/g, " ").slice(0, 200));
    await snap("moved-live");
    await goto(entityUrl.replace(base, ""));
    await page.waitForSelector("[data-testid=answer-line]");
    note(
      "8",
      "entity after the move: " +
        (await page.locator("#screen").innerText()).split("\n").slice(0, 3).join(" | "),
    );
    await snap("entity-after-move");
  }

  // The eleventh minute: a derivation on the subject, reconciled against the sealed head.
  await goto(`/accounts/${ACCOUNT}/subjects/${SUBJECT}?tab=derivations`);
  if (await page.getByTestId("evaluate").count()) {
    await page.getByRole("button", { name: "Evaluate and reconcile" }).click();
    await page.waitForSelector("[data-testid=candidates]", { timeout: 60_000 });
    await page.getByTestId("candidates").getByRole("row").nth(1).click();
    note(
      "9",
      (await page.locator("#screen").innerText())
        .split("\n")
        .filter((l) => /candidates from/.test(l))
        .join(" | "),
    );
    await snap("derivations");
  }

  // Other screens: About, the assistant page with Try it here, the palette.
  await goto("/about?tab=limits");
  await snap("about-limits");
  await goto("/about?tab=measured");
  await snap("about-measured");
  await goto("/assistant#read_subject_at");
  await page.getByTestId("try-read_subject_at").click();
  await page.getByTestId("try-run").click();
  await page.waitForSelector("[data-testid=try-answer]", { timeout: 60_000 });
  await snap("assistant-try-it");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Meta+k");
  await page.keyboard.type(`${ACCOUNT} ${SUBJECT}`);
  await snap("palette");
} catch (error) {
  problems.push(`step failed: ${error.message.split("\n")[0]}`);
  await snap("failure").catch(() => {});
} finally {
  // Cleanup: live goes back to where it was, whatever happened above.
  try {
    const now = (await tool("list_releases", { limit: 1 })).refs.live;
    if (liveBefore && now?.id !== liveBefore.id) {
      await tool("move_live", { snapshotId: liveBefore.id });
      note("cleanup", `live moved back to ${liveBefore.label}`);
    } else note("cleanup", `live is ${now?.label ?? "none"}, as before`);
  } catch (error) {
    problems.push(`cleanup failed: ${error.message}`);
  }
  writeFileSync(
    join(out, "demo-pass.log"),
    [...log, "", "problems:", ...problems].join("\n") + "\n",
  );
  console.log(problems.length ? "PROBLEMS\n" + problems.join("\n") : "DEMO PASS CLEAN");
  await browser.close();
  process.exit(problems.length ? 1 : 0);
}
