// [DX-XQ8] A Playwright pass over the "Ask across subjects" page, light and dark, with checks recorded as JSON.
//   node examples/console/e2e/questions-pass.mjs --url http://127.0.0.1:<port> --out <screenshot dir> [--protected-url URL]
// --url: a console server on a toy with the question routes on. --protected-url (optional): a second console server
// connected to a scope that declares protected attributes; it shows a protected attribute marked not filterable and the
// store's refusal when one is typed in by hand.
// Why: the page's acceptance is what the owner sees; each step leaves a screenshot to look at and a check to count.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const url = arg("--url");
const out = arg("--out");
const protectedUrl = arg("--protected-url");
if (!url || !out) throw new Error("Give --url and --out");
mkdirSync(out, { recursive: true });
const checks = [];
const check = (ok, what, detail = "") => {
  checks.push({ ok: Boolean(ok), what, detail: String(detail) });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}${detail ? " (" + detail + ")" : ""}`);
};

const browser = await chromium.launch();
async function pass(scheme) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = (name) => page.screenshot({ path: join(out, `${name}-${scheme}.png`), fullPage: true });
  const settled = async (timeout = 30_000) => {
    await page.waitForSelector('[data-testid="question-status"]:not([data-state="running"])', { timeout });
  };
  await page.goto(`${url}/questions`);
  await page.waitForFunction(() => {
    const k = document.querySelector('[data-testid="kind-picker"]');
    return k && !/Reading the kinds|^Kind$/.test(k.textContent ?? "");
  }, null, { timeout: 30_000 });
  await page.waitForTimeout(500);
  await shot("01-empty");
  check(await page.locator('[data-testid="question-empty"]').isVisible(), `${scheme}: empty state before a question`);

  // An example question, one click: a list with columns, with the status line.
  await page.click('[data-testid="example-pending"]');
  await settled();
  const status = await page.locator('[data-testid="question-status"]').innerText();
  check(/Holds for position/.test(status) && /Valid at/.test(status) && /subjects examined/.test(status) && /Complete|Not complete/.test(status) && /Took/.test(status),
    `${scheme}: the status line states position, valid time, subjects examined, completeness and time`, status.replace(/\n/g, " | "));
  const rows = await page.locator('[data-testid="row-link"]').count();
  check(rows > 0, `${scheme}: pending tasks listed`, rows);
  check(await page.locator('[data-testid="how-answered"]').isVisible(), `${scheme}: "How this was answered" shown`);
  check(await page.locator('[data-testid="fast-index-slot"]').isVisible(), `${scheme}: the fast-index place is marked`);
  await shot("02-pending-tasks");

  // [DX-XQ10] The fast answer from the index: which route answered and why, both answers side by side, the route choice,
  // and the indexed attributes with the declare call shown (not run).
  const declared = /on: /.test(await page.locator('[data-testid="fast-index-status"]').innerText());
  check(await page.locator('[data-testid="route-choice"]').isVisible(), `${scheme}: the route can be chosen (auto, index only, slow route only)`);
  check(await page.locator('[data-testid="indexed-attributes"]').isVisible(), `${scheme}: the indexed attributes view is shown`);
  if (declared) {
    // pending tasks has a text column: the index projects only references, so auto answers on the slow route and says why
    check(/Why not the index/.test(await page.locator('[data-testid="fast-index-slot"]').innerText()), `${scheme}: a question the index does not take says why`);
    await page.click('[data-testid="example-per-status"]');
    await settled();
    check(/Answered from the index/.test(await page.locator('[data-testid="route-used"]').innerText()), `${scheme}: tasks per status answered from the index`);
    check(/Index entries examined/.test(await page.locator('[data-testid="how-answered"]').innerText()), `${scheme}: index entries examined are reported`);
    await page.click('[data-testid="compare-routes"]');
    await page.waitForSelector('[data-testid="compare-same"]', { timeout: 60_000 });
    const same = await page.locator('[data-testid="compare-same"]').innerText();
    const costs = [await page.locator('[data-testid="compare-cost-index"]').innerText(), await page.locator('[data-testid="compare-cost-sweep"]').innerText()];
    check(/same answer from both routes/.test(same) && /index entries examined/.test(costs[0]) && /subjects read/.test(costs[1]), `${scheme}: both routes side by side, the same answer, with their costs`, `${same} | ${costs.join(" | ")}`);
    await shot("02b-both-routes");
    await page.click('[data-testid="route-sweep"]');
    await page.click('[data-testid="ask"]');
    await settled();
    check(/reading each subject/.test(await page.locator('[data-testid="route-used"]').innerText()), `${scheme}: the slow route when chosen`);
    await page.click('[data-testid="route-auto"]');
    await page.click('[data-testid="show-declare-call"]');
    const call = await page.locator('[data-testid="declare-call"]').innerText();
    check(/declareIndexes/.test(call) && /Shown, not run/.test(call), `${scheme}: the declare call is shown, not run`, call.slice(0, 120));
    await shot("02c-indexed-attributes");
  } else {
    check(/off: nothing is declared/.test(await page.locator('[data-testid="fast-index-status"]').innerText()), `${scheme}: no declaration: the fast index is marked off`);
  }

  await page.click('[data-testid="example-per-status"]');
  await settled();
  check(await page.locator('[data-testid="groups-answer"]').isVisible(), `${scheme}: count per value shown`);
  await shot("03-tasks-per-status");

  await page.click('[data-testid="example-pending-progress"]');
  await settled();
  check((await page.locator('[data-testid="condition"]').count()) === 2, `${scheme}: two conditions in the builder`);
  await shot("04-two-conditions");

  // [DX-XQ9] The shapes added on exp/DX-XQ9-question-shapes, each from its example (S10, S9, S8, S3/S4, S13).
  const examplesText = await page.locator('[data-testid="examples"]').innerText();
  check(/S10/.test(examplesText) && /S9/.test(examplesText) && !/has no "contains"|not answered/i.test(examplesText), `${scheme}: S9 and S10 examples offered, no "not answered" notes`);
  await page.click('[data-testid="example-has-pending"]');
  await settled(60_000);
  check(await page.locator('[data-testid="has-condition"]').isVisible(), `${scheme}: a "has related entities where" group in the builder`);
  const hasStatus = await page.locator('[data-testid="question-status"]').innerText();
  check(/Complete/.test(hasStatus) && !/Not complete/.test(hasStatus), `${scheme}: subjects with a pending task answered completely`, hasStatus.replace(/\n/g, " | "));
  check(/Related entities read/.test(await page.locator('[data-testid="how-answered"]').innerText()), `${scheme}: related entities read are reported`);
  await shot("04b-has-pending-task");
  await page.click('[data-testid="example-has-open"]');
  await settled(60_000);
  check(await page.locator('[data-testid="count-answer"]').isVisible() && (await page.locator('[data-testid="has-count"]').inputValue()) === "3", `${scheme}: "3 or more open tasks" counted, with the count in the builder`);
  await shot("04c-three-open-tasks");
  await page.click('[data-testid="example-top-pay"]');
  await settled(60_000);
  const topRows = await page.locator('[data-testid="row-link"]').count();
  check(await page.locator('[data-testid="top-answer"]').isVisible() && topRows === 10, `${scheme}: top 10 by pay listed after the whole kind was read`, topRows);
  await shot("04d-top-pay");
  await page.click('[data-testid="example-not-pending-or"]');
  await settled(60_000);
  check(await page.locator('[data-testid="groups"]').isVisible() && (await page.locator('[data-testid="group"]').count()) === 2 && await page.locator('[data-testid="count-answer"]').isVisible(), `${scheme}: "is not" and two "any of" groups answered`);
  await shot("04e-not-pending-or");
  await page.click('[data-testid="example-contains"]');
  await settled(60_000);
  check(await page.locator('[data-testid="count-answer"]').isVisible() && await page.locator('[data-testid="condition-any-case"]').isChecked(), `${scheme}: "contains", any case, counted`);
  await page.click('[data-testid="example-sum-pay"]');
  await settled(60_000);
  const sumText = await page.locator('[data-testid="sum-answer"]').innerText();
  check(/Exact sum/.test(sumText) && /Average/.test(sumText), `${scheme}: an exact sum and average shown`, sumText.replace(/\n/g, " | "));
  await shot("04f-sum-pay");

  if (scheme === "light") {
    // Progress page by page and Stop: 4 subjects per store page over every subtask of the account.
    await page.click('[data-testid="example-total"]');
    await settled();
    await page.locator('[data-testid="page-subjects"]').click();
    await page.getByRole("option", { name: "1 subject per store page", exact: true }).click();
    // The kind: subtasks (sec:), the largest kind on the toy.
    await page.locator('[data-testid="kind-picker"]').click();
    await page.getByRole("option", { name: /^Subtasks/ }).first().click();
    await page.waitForTimeout(800);
    // [DX-XQ10] The index answers a count in one short page, so Stop is shown on the slow route, which reads page by page.
    await page.click('[data-testid="route-sweep"]');
    await page.click('[data-testid="ask"]');
    await page.waitForSelector('[data-testid="stop"]', { timeout: 10_000 });
    await page.waitForTimeout(300);
    await page.click('[data-testid="stop"]', { timeout: 2000, noWaitAfter: true }).catch(() => {});
    await shot("05-stopping");
    await settled();
    const stopped = await page.locator('[data-testid="question-status"]').innerText();
    check(/stopped by you/.test(stopped), "light: a running question stops when asked", stopped.replace(/\n/g, " | "));
    check(await page.locator('[data-testid="continue"]').isVisible(), "light: a stopped question can continue from its cursor");
    await shot("06-stopped");
    await page.click('[data-testid="continue"]');
    await settled(60_000);
    const finished = await page.locator('[data-testid="question-status"]').innerText();
    check(/Complete/.test(finished) && !/Not complete/.test(finished), "light: the continued question completes at the same position", finished.replace(/\n/g, " | "));
    await shot("07-continued");
    await page.click('[data-testid="route-auto"]');

    // A past position: the as-of control, then a subject list whose links keep the position.
    const head = Number((/Holds for position ([\d,]+)/.exec(finished)?.[1] ?? "0").replace(/,/g, ""));
    const past = Math.max(1, head - 20);
    await page.goto(`${url}/questions?recorded=${past}`);
    await page.waitForSelector('[data-testid="kind-picker"]');
    await page.waitForTimeout(1500);
    await page.click('[data-testid="example-subjects"]');
    await settled();
    const pastStatus = await page.locator('[data-testid="question-status"]').innerText();
    check(new RegExp(`Holds for position ${past.toLocaleString("en-US")}`).test(pastStatus), `light: a past position is answered at that position (${past})`, pastStatus.replace(/\n/g, " | "));
    await shot("08-past-position");
    const href = await page.locator('[data-testid="row-link"]').first().getAttribute("href");
    check(href && href.includes(`recorded=${past}`) && /\/subjects\/\d+/.test(href), "light: a subject links to the Subject page at the same position", href);
    await page.locator('[data-testid="row-link"]').first().click();
    await page.waitForTimeout(2500);
    check(page.url().includes(`recorded=${past}`), "light: the Subject page opened at the answer's position", page.url());
    await shot("09-subject-at-same-position");
  }
  check(errors.length === 0, `${scheme}: no page errors`, errors.join("; "));
  await context.close();
}

async function protectedPass(scheme) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme });
  const page = await context.newPage();
  const shot = (name) => page.screenshot({ path: join(out, `${name}-${scheme}.png`), fullPage: true });
  const ask = encodeURIComponent(JSON.stringify({ account: "account-003", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, where: [], result: "list" }));
  await page.goto(`${protectedUrl}/questions?ask=${ask}`);
  await page.waitForTimeout(3000);
  await page.click('[data-testid="add-condition"]');
  await page.locator('[data-testid="condition-attribute"]').last().click();
  const marked = await page.locator('[data-testid="protected-attribute"]').count();
  check(marked > 0, `${scheme}: a protected attribute is shown as not filterable`, marked);
  await page.screenshot({ path: join(out, `10-protected-not-filterable-${scheme}.png`) });
  await page.keyboard.press("Escape");
  if (scheme === "light") {
    // Typed in by hand, the store refuses it, and the page says so with the store's code.
    await page.locator('[data-testid="condition-attribute"]').last().click();
    await page.getByRole("option", { name: "Type another attribute..." }).click();
    await page.fill('[data-testid="condition-attribute-typed"]', ":privacy/identity-number");
    await page.keyboard.press("Enter");
    await page.locator('[data-testid="condition-op"]').last().click();
    await page.getByRole("option", { name: "has a value" }).click();
    await page.click('[data-testid="ask"]');
    await page.waitForSelector('[data-testid="question-refused"]', { timeout: 20_000 });
    const text = await page.locator('[data-testid="question-refused"]').innerText();
    check(/ProtectedValueLookup/.test(text) && /never filters/.test(text), "light: the store's refusal of a protected attribute is shown plainly with its code", text.replace(/\n/g, " | "));
    await shot("11-protected-refused");
  }
  await context.close();
}

try {
  for (const scheme of ["light", "dark"]) await pass(scheme);
  if (protectedUrl) for (const scheme of ["light", "dark"]) await protectedPass(scheme);
} finally {
  await browser.close();
}
const failed = checks.filter((c) => !c.ok).length;
writeFileSync(join(out, "questions-pass.json"), JSON.stringify({ at: new Date().toISOString(), url, protectedUrl: protectedUrl ?? null, passed: checks.length - failed, failed, checks }, null, 2));
console.log(`QUESTIONS PASS ${failed ? "FAILED" : "PASSED"}: ${checks.length - failed} of ${checks.length}`);
process.exitCode = failed ? 1 : 0;
