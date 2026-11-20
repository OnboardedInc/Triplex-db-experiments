export {};

type Entry = Record<string, any>;
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const select = (id: string) => el<HTMLSelectElement>(id);
const input = (id: string) => el<HTMLInputElement>(id);
const button = (id: string) => el<HTMLButtonElement>(id);
const note = input("note");
let position: number | undefined;
let stalePosition: number | undefined;
let earlyPosition: number;
let page = 0;
let lastSelection = 0;
let nextOffset: number | null = null;
let displayRevision = 0;
const historyCursor: { snap: number | undefined; before: number | undefined } = {
  snap: undefined,
  before: undefined,
};
const pendingChanges = () => ({
  ":person/status": select("status").value,
  ...(note.value.trim() ? { ":person/note": note.value } : {}),
});

const person = () => ({ accountId: select("account").value, personId: select("person").value });
const print = (target: string, value: unknown) => {
  el(target).textContent = JSON.stringify(value, null, 2);
};
const option = (label: string, value: string) => new Option(label, value);
const cellText = (value: unknown) =>
  value == null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value);
const millis = (ms: number) => ms.toFixed(ms < 10 ? 2 : 1) + " ms";
function append<T extends keyof HTMLElementTagNameMap>(
  target: HTMLElement,
  tag: T,
  value?: string,
) {
  const child = document.createElement(tag);
  if (value !== undefined) child.textContent = value;
  target.append(child);
  return child;
}

function table(target: HTMLElement, records: Entry[]) {
  target.replaceChildren();
  if (!records.length) {
    append(target, "p", "No records returned");
    return;
  }
  const columns = [...new Set(records.flatMap((row) => Object.keys(row)))];
  const element = append(target, "table");
  const header = append(append(element, "thead"), "tr");
  for (const name of columns) append(header, "th", name).scope = "col";
  const body = append(element, "tbody");
  for (const record of records) {
    const row = append(body, "tr");
    for (const name of columns) append(row, "td", cellText(record[name]));
  }
}

function timing(target: HTMLElement, trace: Entry) {
  target.replaceChildren();
  const metrics = [
    ["Action wall time", trace["totalMs"]],
    ["TypeScript client", trace["clientMs"]],
    ["Gateway", trace["gatewayMs"]],
    ["Transactor apply", trace["transactorMs"]],
    ["Storage", trace["storageMs"]],
    ["Peer wait (inclusive)", trace["peerWaitMs"]],
  ] as const;
  const max = Math.max(1, ...metrics.map(([, v]) => v ?? 0));
  for (const [name, ms] of metrics) {
    const metric = append(target, "div");
    metric.className = "timing";
    append(metric, "span", name);
    append(metric, "strong", typeof ms === "number" ? millis(ms) : "Unavailable");
    if (typeof ms === "number") {
      const bar = append(metric, "progress");
      bar.max = max;
      bar.value = ms;
      bar.setAttribute("aria-label", name);
    }
  }
}

async function call(action: string, request: Entry = {}) {
  const res = await fetch("/api/" + action, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  return (await res.json()) as Entry;
}

function show(title: string, request: Entry, reply: Entry) {
  el("result-title").textContent = title;
  el("position").textContent = reply["position"] == null ? "" : "Position " + reply["position"];
  el("status-line").classList.toggle("error", !reply["ok"]);
  el("status-line").textContent = reply["error"]
    ? reply["error"].code + " · " + reply["error"].message
    : reply["attempts"]
      ? "Two submissions, one transaction"
      : reply["duplicate"]
        ? "Recovered original receipt"
        : reply["receipt"]
          ? "Receipt " + reply["receipt"].txId
          : reply["records"].length + " records";
  timing(el("timings"), reply["timings"]);
  const diff = el("diff");
  diff.replaceChildren();
  if (reply["diff"]) {
    append(diff, "h3", "Changes since earlier cut");
    table(append(diff, "div"), reply["diff"]);
  }
  table(el("records"), reply["records"]);
  print("request-json", request);
  print("reply-json", reply);
}

async function action(name: string, title: string, request: Entry) {
  const rev = ++displayRevision;
  el("result-title").textContent = title;
  el("status-line").textContent = "Working…";
  try {
    const reply = await call(name, request);
    if (rev === displayRevision) show(title, request, reply);
    return rev === displayRevision ? reply : undefined;
  } catch (error) {
    if (rev === displayRevision)
      el("status-line").textContent = error instanceof Error ? error.message : "Request failed";
    return undefined;
  }
}

async function current() {
  const reply = await action("current", "Current values", person());
  if (!reply?.["ok"]) return;
  position = reply["position"];
  const state = reply["records"].find((row: Entry) => row["attribute"] === ":person/status")?.value;
  if (state) select("status").value = state;
  note.value = String(
    reply["records"].find((row: Entry) => row["attribute"] === ":person/note")?.value ?? "",
  );
}

async function people(offset: number) {
  const version = ++lastSelection;
  position = stalePosition = undefined;
  historyCursor.snap = historyCursor.before = undefined;
  const reply = await call("people", { accountId: select("account").value, limit: 100, offset });
  if (version !== lastSelection) return;
  page = offset;
  nextOffset = reply["nextOffset"];
  select("person").replaceChildren(
    ...reply["records"].map((p: Entry) => option(p["name"], p["id"])),
  );
  button("previous").disabled = page === 0;
  button("next").disabled = nextOffset == null;
  await current();
}

async function save(mode: "save" | "duplicate" | "stale") {
  if (position === undefined) return;
  const request = {
    ...person(),
    commandId: crypto.randomUUID(),
    expectedPosition: mode === "stale" ? (stalePosition ?? earlyPosition) : position,
    changes: mode === "stale" ? { ":person/note": "Stale trial" } : pendingChanges(),
  };
  const title =
    mode === "duplicate"
      ? "Duplicate save receipt"
      : mode === "stale"
        ? "Stale save"
        : "Save receipt";
  const reply = await action(mode === "duplicate" ? "duplicate" : "save", title, request);
  if (reply?.["ok"]) {
    stalePosition = position;
    position = reply["position"];
  }
}

let watching = false;
let feedGeneration = 0;
let fromT: string | undefined;
let feedRecords: Entry[] = [];
async function watchFeed() {
  const gen = ++feedGeneration;
  while (watching && gen === feedGeneration) {
    const request = { ...(fromT ? { fromT } : {}), waitMs: 1000 };
    try {
      const reply = await call("feed", request);
      if (gen !== feedGeneration) return;
      if (!reply["ok"]) {
        el("feed-status").textContent = reply["error"].message;
        break;
      }
      fromT = reply["nextT"];
      const changed = reply["records"].map((row: Entry) => ({
        t: row["t"],
        kind: row["kind"],
        commands: row["transaction"]?.commandIds?.join(", "),
        changes: row["transaction"]?.changes?.length,
        position: row["transaction"]?.positions?.at(-1),
      }));
      feedRecords = [...changed.reverse(), ...feedRecords].slice(0, 30);
      el("feed-status").textContent =
        "Live · next native position " + fromT + " · " + millis(reply["timings"].totalMs);
      table(el("feed-rows"), feedRecords);
      print("feed-request", request);
      print("feed-reply", reply);
    } catch (error) {
      el("feed-status").textContent =
        error instanceof Error ? error.message : "Feed request failed";
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (gen === feedGeneration) {
    watching = false;
    button("feed").textContent = "Start live feed";
  }
}

let releaseGeneration = 0;
async function followRelease(id: string, subject: Entry, rev: number) {
  const gen = ++releaseGeneration;
  while (gen === releaseGeneration) {
    const request = { ...subject, releaseId: id };
    const reply = await call("release", request);
    if (gen !== releaseGeneration) return;
    if (!reply["ok"]) {
      el("progress").textContent = reply["error"].message;
      return;
    }
    const p = reply["progress"];
    el("progress").textContent =
      p.state +
      " · " +
      p.written +
      " / " +
      p.total +
      " answers · first answer " +
      millis(reply["firstAnswerMs"]);
    if (p.state === "complete" || p.state === "failed") {
      if (rev === displayRevision) show("Materialized release answer", request, reply);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

button("current").onclick = () => void current();
button("earlier").onclick = () => void action("earlier", "Earlier values", person());
button("history").onclick = async () => {
  const args =
    historyCursor.before === undefined
      ? person()
      : { ...person(), snapshotPosition: historyCursor.snap, beforePosition: historyCursor.before };
  const reply = await action("history", "Person journal", args);
  historyCursor.snap = reply?.["position"];
  historyCursor.before = reply?.["nextBeforePosition"] ?? undefined;
  button("history").textContent =
    historyCursor.before === undefined ? "Journal" : "Older journal entries";
};
button("save").onclick = () => void save("save");
button("duplicate").onclick = () => void save("duplicate");
button("stale").onclick = () => void save("stale");
button("feed").onclick = () => {
  watching = !watching;
  button("feed").textContent = watching ? "Pause feed" : "Resume feed";
  if (watching) void watchFeed();
  else {
    ++feedGeneration;
    el("feed-status").textContent = "Paused · next native position " + (fromT ?? "current");
  }
};
button("publish").onclick = async () => {
  const subject = person();
  const result = await action("publish", "First release answer", {
    ...subject,
    label: input("release-label").value,
    reviewStatus: select("review-status").value,
  });
  if (result?.["ok"]) {
    el("progress").textContent =
      "First answer " + millis(result["firstAnswerMs"]) + " · background writing started";
    void followRelease(result["releaseId"], subject, displayRevision).catch(() => {
      el("progress").textContent = "Progress request failed";
    });
  }
};
button("native").onclick = () =>
  void action("native", "Native query results", { query: el<HTMLTextAreaElement>("query").value });
button("load").onclick = () =>
  void action("load", "Laptop diagnostic", {
    savesPerSecond: Number(input("saves").value),
    readsPerSecond: Number(input("reads").value),
    seconds: Number(input("seconds").value),
  });
select("account").onchange = () => void people(0);
select("person").onchange = () => {
  stalePosition = undefined;
  historyCursor.snap = historyCursor.before = undefined;
  button("history").textContent = "Journal";
  void current();
};
button("previous").onclick = () => void people(Math.max(0, page - 100));
button("next").onclick = () => {
  if (nextOffset != null) void people(nextOffset);
};

async function initialize() {
  let reply = await call("accounts");
  while (reply["error"]?.code === "Starting") {
    await new Promise((resolve) => setTimeout(resolve, 800));
    reply = await call("accounts");
  }
  if (!reply["ok"]) throw new Error(reply["error"].message);
  earlyPosition = reply["earlyPosition"];
  el("basis").textContent =
    new Date(reply["earlyAt"]).toISOString().slice(0, 10) +
    " → " +
    new Date(reply["currentAt"]).toISOString().slice(0, 10);
  el("erase-reason").textContent = reply["eraseUnavailable"];
  select("account").replaceChildren(
    ...reply["records"].map((a: Entry) =>
      option(a["name"] + " · " + a["shape"] + " · " + a["people"], a["id"]),
    ),
  );
  for (const example of reply["examples"]) {
    const control = append(el("examples"), "button", example.label);
    control.onclick = () => {
      el<HTMLTextAreaElement>("query").value = example.query;
    };
  }
  el<HTMLTextAreaElement>("query").value = reply["examples"][0].query;
  await people(0);
}
void initialize().catch((error: Error) => {
  el("status-line").textContent = error.message;
});
