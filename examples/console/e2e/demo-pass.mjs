// [DX-CON1] A Playwright pass over the ten-minute demo (DESIGN.md section 3) on the small database, with screenshots.
// It writes only into account-010, defines one type and moves live back to where it was before, so builder A's gates
// on the shared toy keep their release.
// Usage: node examples/console/e2e/demo-pass.mjs --out <screenshot dir> [--url http://127.0.0.1:28581]
//        [--mcp <repository root whose examples/demo-mcp/src/mcp.ts runs>] [--type Inspection] [--dark]
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
if (!out) throw new Error("Give --out <screenshot directory>");
const base = arg("url", "http://127.0.0.1:28581");
const mcpRoot = arg("mcp");
const typeName = arg("type", "Inspection");
const dark = process.argv.includes("--dark");
const ACCOUNT = "account-010";
const SUBJECT = 5;
const ASSISTANT_SUBJECT = 7;
const prefix = typeName.toLowerCase();
mkdirSync(out, { recursive: true });

const log = [];
const note = (step, text) => {
  const line = `${new Date().toISOString().slice(11, 19)} ${step} ${text}`;
  log.push(line);
  console.log(line);
};
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: dark ? "dark" : "light" });
const page = await context.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror ${e}`));
page.on("console", (m) => m.type() === "error" && !/status of 400/.test(m.text()) && problems.push(`console ${m.text()}`));
let shot = 0;
const snap = async (name, full = false) => {
  await page.waitForTimeout(400); // let dialogs and sheets finish their opening animation
  const file = join(out, `${String(++shot).padStart(2, "0")}-${name}${dark ? "-dark" : ""}.png`);
  await page.screenshot({ path: file, fullPage: full });
  note("shot", file.split("/").pop());
};
const answerLine = async () => (await page.getByTestId("answer-line").first().innerText()).replace(/\s+/g, " ");
const pick = async (trigger, option) => {
  await trigger.click();
  await page.getByRole("option", { name: option, exact: true }).click();
};
const tool = async (name, input) => {
  const r = await fetch(`${base}/api/tools/${name}`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify(input) });
  return r.json();
};

/** One MCP tools/call over stdio, so the change carries actor "assistant" exactly as Claude Code's would. */
async function assistantCall(name, args) {
  if (!mcpRoot) return null;
  const child = spawn(process.execPath, [join(mcpRoot, "examples/demo-mcp/src/mcp.ts")], { stdio: ["pipe", "pipe", "inherit"] });
  let buffer = "";
  const waiters = new Map();
  child.stdout.on("data", (d) => {
    buffer += d;
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      if (!line.trim()) continue;
      const msg = JSON.parse(line);
      waiters.get(msg.id)?.(msg);
    }
  });
  const send = (msg) => child.stdin.write(JSON.stringify(msg) + "\n");
  const request = (id, method, params) => new Promise((resolve) => (waiters.set(id, resolve), send({ jsonrpc: "2.0", id, method, params })));
  await request(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "console-demo-pass", version: "0" } });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  const res = await request(2, "tools/call", { name, arguments: args });
  child.kill();
  return JSON.parse(res.result.content[0].text);
}

try {
  // Step 1: Home, then the account, then one subject opened twice.
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await snap("home");
  await page.goto(`${base}/accounts/${ACCOUNT}`, { waitUntil: "networkidle" });
  await snap("account");
  await page.getByTestId("go-subject").fill(String(SUBJECT));
  await page.getByRole("button", { name: "Open" }).click();
  await page.waitForSelector("[data-testid=answer-line]");
  note("1", "first read: " + (await answerLine()));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=answer-line]");
  note("1", "second read: " + (await answerLine()));
  await snap("subject-facts");

  // Step 2: Query on that subject, then the grouped count with its chart.
  await page.goto(`${base}/query`, { waitUntil: "networkidle" });
  await page.getByText("Tasks that are not complete").click();
  await page.locator('input[placeholder="subject"]').fill(String(SUBJECT));
  await page.getByText("Tasks that are not complete").click();
  await page.getByTestId("run-query").click();
  await page.waitForSelector("[data-testid=answer-line]");
  note("2", await page.getByTestId("query-result").innerText().then((t) => t.split("\n").slice(0, 9).join(" | ")));
  await snap("query-not-complete");
  await page.getByText("Subtasks per task").click();
  await page.getByTestId("run-query").click();
  await page.waitForSelector("[data-testid=answer-line]");
  await page.getByRole("tab", { name: "Chart" }).click();
  await snap("query-chart");

  // Step 3: the same question at the sealed head, then a whole-database question refused.
  await page.getByText("The same question at the sealed head").click();
  await page.getByTestId("run-query").click();
  await page.waitForSelector("[data-testid=answer-line]");
  note("3", "historical: " + (await answerLine()) + " badge " + (await page.getByTestId("basis-badge").innerText()));
  await snap("query-sealed-head");
  await page.getByTestId("basis-control").click();
  await page.getByRole("button", { name: "Back to latest" }).click();
  await page.getByText("Every complete task in the database").click();
  await page.getByTestId("run-query").click();
  await page.waitForSelector("[data-testid=refused]");
  note("3", "refusal: " + (await page.getByTestId("refused").innerText()).replace(/\s+/g, " ").slice(0, 160));
  await snap("query-refused");

  // Step 4: define a type and commit a release.
  const before = await tool("list_releases", { limit: 1 });
  const liveBefore = before.refs.live;
  note("4", `live before: ${liveBefore?.label} ${liveBefore?.id?.slice(0, 16)}`);
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
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
    if (type === "enum") await page.getByTestId(`attr-enum-${i}`).fill("pending, approved, rejected");
    if (type === "ref") await pick(page.getByTestId(`attr-target-${i}`), "Subject");
  }
  await snap("new-type-sheet");
  await page.getByTestId("commit-release").click();
  await page.waitForURL(new RegExp(`/types/${typeName}`), { timeout: 30_000 });
  await page.waitForSelector("[data-testid=answer-line]");
  note("4", "after commit: " + (await page.locator("#screen").innerText()).split("\n").slice(0, 3).join(" | "));
  await snap("type-definition");

  // Step 5: a new entity from the generated form, its Transaction tab, the commit, then read it as a subject.
  await page.getByTestId("new-entity").click();
  await pick(page.getByTestId(`field-:${prefix}/outcome`), "pending");
  await page.getByTestId(`field-:${prefix}/note`).fill("first look");
  await page.getByTestId(`ref-:${prefix}/of`).fill(String(SUBJECT));
  await page.getByTestId("valid-from").fill("2026-11-09");
  await snap("entity-form");
  await page.getByRole("tab", { name: "Transaction" }).click();
  await snap("entity-form-transaction");
  await page.getByTestId("commit-entity").click();
  await page.waitForURL(/\/entities\//, { timeout: 30_000 });
  await page.waitForSelector("[data-testid=answer-line]");
  const entityUrl = page.url();
  note("5", "created: " + decodeURIComponent(entityUrl.split("/entities/")[1]));
  await snap("entity-created");
  await page.getByLabel("Read as subject").click();
  await page.waitForTimeout(1500);
  note("5", "as subject: " + (await answerLine()));
  await snap("entity-as-subject");

  // Step 6: correct the outcome from 16 November, then Both time axes on 17 November and the History tab.
  await page.goto(entityUrl, { waitUntil: "networkidle" });
  await page.getByTestId("change-fact").click();
  await pick(page.getByRole("combobox").filter({ hasText: /:/ }).first(), `:${prefix}/outcome`).catch(() => {});
  await page.getByTestId("new-value").fill("approved");
  await page.getByLabel("a past date (a correction)").click();
  await page.locator('input[type="date"]').last().fill("2026-11-16");
  await page.getByRole("tab", { name: "Transaction" }).click();
  await snap("change-transaction");
  await page.getByTestId("commit-change").click();
  await page.waitForTimeout(2500);
  await snap("change-receipt");
  await page.goto(`${entityUrl}?tab=time&attribute=${encodeURIComponent(`:${prefix}/outcome`)}&at=2026-11-17`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=time-table]", { timeout: 30_000 });
  note("6", "both axes: " + (await page.getByTestId("time-table").innerText()).replace(/\s+/g, " ").slice(0, 260));
  await snap("both-time-axes");
  await page.goto(`${entityUrl}?tab=history&attribute=${encodeURIComponent(`:${prefix}/outcome`)}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=answer-line]");
  await snap("history");

  // Step 7: the Journal open with Live on while the assistant adds an entity through MCP; then Changed since.
  await page.goto(`${base}/journal`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-testid=answer-line]");
  const head = (await tool("database_summary", {})).head;
  const viaAssistant = await assistantCall("create_entity", {
    type: typeName,
    account: ACCOUNT,
    attributes: { [`:${prefix}/outcome`]: "pending", [`:${prefix}/of`]: `acct/${ACCOUNT}/pl:${String(ASSISTANT_SUBJECT).padStart(8, "0")}` },
  });
  note("7", viaAssistant ? `assistant created ${viaAssistant.entity ?? JSON.stringify(viaAssistant).slice(0, 200)}` : "no --mcp given: skipped the assistant's call");
  await page.waitForTimeout(6500);
  await snap("journal-live");
  await page.getByLabel("After position").fill(String(head - 5));
  await page.getByTestId("changed-since-open").click();
  await page.waitForSelector("[data-testid=changed-since]", { timeout: 30_000 });
  note("7", (await page.getByTestId("changed-since").innerText()).replace(/\s+/g, " "));
  await snap("changed-since");
  await page.keyboard.press("Escape");

  // Step 8: move live back to the release it pointed to before step 4. The type leaves the list; its facts still read.
  await page.goto(`${base}/configuration`, { waitUntil: "networkidle" });
  await snap("configuration");
  const row = page.getByRole("row").filter({ hasText: liveBefore.id.slice(0, 15) }).first();
  await row.getByTestId("move-live").click();
  await page.getByTestId("confirm-move").click();
  await page.waitForSelector("[data-testid=moved]", { timeout: 30_000 });
  note("8", (await page.getByTestId("moved").innerText()).replace(/\s+/g, " "));
  await snap("moved-live");
  await page.goto(entityUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=answer-line]");
  note("8", "entity after the move: " + (await page.locator("#screen").innerText()).split("\n").slice(0, 4).join(" | "));
  await snap("entity-after-move");

  // The eleventh minute: a derivation on the subject, reconciled against the sealed head.
  await page.goto(`${base}/accounts/${ACCOUNT}/subjects/${SUBJECT}?tab=derivations`, { waitUntil: "networkidle" });
  if (await page.getByTestId("evaluate").count()) {
    await page.getByRole("button", { name: "Evaluate and reconcile" }).click();
    await page.waitForSelector("[data-testid=candidates]", { timeout: 30_000 });
    await page.getByTestId("candidates").getByRole("row").nth(1).click();
    note("9", (await page.locator("#screen").innerText()).split("\n").filter((l) => /candidates from|Compared with/.test(l)).join(" | "));
    await snap("derivations");
  } else note("9", "evaluate_derivation is not in the catalogue: Derivations tab skipped");

  // Extra screens: About, the assistant page with Try it here, the palette.
  await page.goto(`${base}/about?tab=limits`, { waitUntil: "networkidle" });
  await snap("about-limits");
  await page.goto(`${base}/about?tab=measured`, { waitUntil: "networkidle" });
  await snap("about-measured");
  await page.goto(`${base}/assistant#read_subject_at`, { waitUntil: "networkidle" });
  await page.getByTestId("try-read_subject_at").click();
  await page.getByTestId("try-run").click();
  await page.waitForSelector("[data-testid=try-answer], [data-testid=error], [data-testid=refused]", { timeout: 30_000 });
  await snap("assistant-try-it");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Meta+k");
  await page.keyboard.type(`${ACCOUNT} ${SUBJECT}`);
  await snap("palette");
} catch (error) {
  problems.push(`step failed: ${error.message.split("\n")[0]}`);
  await snap("failure").catch(() => {});
} finally {
  writeFileSync(join(out, `demo-pass${dark ? "-dark" : ""}.log`), [...log, "", "problems:", ...problems].join("\n") + "\n");
  console.log(problems.length ? "PROBLEMS\n" + problems.join("\n") : "no problems");
  await browser.close();
}
