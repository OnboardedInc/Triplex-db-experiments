export type Fact = readonly [
  attribute: string,
  value: string,
  kind?: "ref" | "integer" | "boolean",
];
export type Subject = { id: string; facts: Fact[] };
export type Shape = "deep" | "wide" | "small";
export type Profile = {
  id: string;
  name: string;
  shape: Shape;
  count: number;
  clients: number;
  jobTypes: number;
};

export const seed = 0x51ac09;

// [DX-PLAY1] Why: index-addressed inputs make a shard and a person reproducible independently.
// Rejected: one stateful RNG that requires walking millions of prior employees to resume a shard.
export function draw(index: number) {
  let x = (seed + Math.imul(index + 1, 0x9e3779b9)) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x21f0aaad);
  x ^= x >>> 15;
  x = Math.imul(x, 0x735a2d97);
  return (x ^ (x >>> 15)) >>> 0;
}
export const token = (i: number) => draw(i).toString(36).padStart(7, "0");
export const personId = (account: Profile, n: number) =>
  `person:${account.id}:${String(n + 1).padStart(7, "0")}`;
export const personName = (account: Profile, n: number) =>
  "Vexari " + token(n + accountSeed(account)).toUpperCase();
export const accountSeed = (account: Profile) => Number(account.id.split("-").at(-1)) * 8_000_000;
export const fact = (a: string, v: string): Fact => [a, v];
const ref = (a: string, v: string): Fact => [a, v, "ref"];
const int = (a: string, n: number): Fact => [a, String(n), "integer"];

export function profiles(full = false, larger = false): Profile[] {
  const sizes = full
    ? [100_000, 4_000_000, 40, 360, 2400]
    : larger
      ? [96, 1400, 20, 24, 30]
      : [16, 160, 4, 5, 7];
  return (["deep", "wide", "small", "small", "small"] as const).map((shape, i) => ({
    id: `${shape}-${i + 1}`,
    name: "Quorvex " + (i + 1),
    shape,
    count: sizes[i]!,
    clients: full && !i ? 9500 : Math.max(2, Math.min(100, Math.ceil(sizes[i]! / 80))),
    jobTypes: full && !i ? 490 : Math.max(2, Math.min(12, Math.ceil(sizes[i]! / 250))),
  }));
}

export const catalogId = (a: Profile, kind: string, index = 0) => `${a.id}/${kind}:${index + 1}`;

const formCount = 8;
const fieldsPerSubtask = 3;
const maxSubtasks = 6;
const form = (a: Profile, i: number) => catalogId(a, "form", i % formCount);

export function* catalogs(a: Profile): Generator<Subject> {
  yield { id: a.id, facts: [fact(":account/name", a.name), [":account/test", "true", "boolean"]] };
  for (const [kind, count] of [
    ["employer", 1],
    ["client", a.clients],
    ["job-type", a.jobTypes],
  ] as const)
    for (let n = 0; n < count; n++)
      yield {
        id: catalogId(a, kind, n),
        facts: [
          fact(`:${kind}/name`, kind + " " + token(accountSeed(a) + n)),
          ref(`:${kind}/account`, a.id),
        ],
      };
  for (let n = 0; n < formCount; n++) {
    const id = form(a, n);
    yield {
      id,
      facts: [
        fact(":form/name", "Circuit " + (n + 1)),
        int(":form/version", 1),
        ref(":form/account", a.id),
      ],
    };
    for (let step = 0; step < maxSubtasks; step++) {
      const stepId = `${id}/step:${step + 1}`;
      yield {
        id: stepId,
        facts: [
          int(":step/position", step + 1),
          fact(":step/kind", step % 2 ? "verification" : "form"),
          ref(":step/form", id),
        ],
      };
      for (let f = 0; f < fieldsPerSubtask; f++)
        yield {
          id: `${stepId}/field:${f + 1}`,
          facts: [
            fact(":field-template/path", `profile.value${step + 1}_${f + 1}`),
            fact(":field-template/type", "text"),
            [":field-template/required", f ? "false" : "true", "boolean"],
          ],
        };
    }
  }
}

export function* ownedSubjects(a: Profile, n: number): Generator<Subject> {
  if (a.shape === "wide") return;
  const id = personId(a, n),
    key = n + accountSeed(a);
  const deep = a.shape === "deep";
  const count = (whole: number, tenths: number) => whole + (n % 10 < tenths ? 1 : 0);
  const placements = deep ? count(1, 8) : 1;
  const tasks = deep ? count(5, 7) : 2;
  const fields = deep ? 76 : 8;
  const subtasks = deep ? 31 : 4;
  for (let p = 0; p < placements; p++) {
    const placement = `${id}/placement:${p + 1}`;
    yield {
      id: placement,
      facts: [
        ref(":placement/employer", catalogId(a, "employer")),
        ref(":placement/client", catalogId(a, "client", (key + p) % a.clients)),
        ref(":placement/job-type", catalogId(a, "job-type", (key + p) % a.jobTypes)),
        fact(":placement/start-date", "2020-01-06"),
      ],
    };
  }
  let left = fields;
  let stepIndex = 0;
  for (let t = 0; t < tasks; t++) {
    const placement = `${id}/placement:${(t % placements) + 1}`;
    const task = `${placement}/task:${t + 1}`;
    const formId = form(a, key + t);
    const steps = Math.floor(subtasks / tasks) + (t < subtasks % tasks ? 1 : 0);
    yield {
      id: task,
      facts: [
        ref(":task/form", formId),
        fact(":task/status", t % 3 ? "in_progress" : "completed"),
        int(":task/progress-numerator", t % 3 ? 1 : steps),
        int(":task/progress-denominator", steps),
        fact(":task/started-on", "2020-01-06"),
      ],
    };
    yield {
      id: task + "/verification:1",
      facts: [fact(":verification/status", t % 3 ? "pending" : "verified")],
    };
    for (let s = 0; s < steps; s++, stepIndex++) {
      const step = `${task}/subtask:${s + 1}`;
      yield { id: step, facts: [int(":subtask/progress", t % 3 ? 0 : 1)] };
      const used = Math.min(
        left,
        Math.floor(fields / subtasks) + (stepIndex < fields % subtasks ? 1 : 0),
      );
      left -= used;
      for (let f = 0; f < used; f++)
        yield {
          id: `${step}/field:${f + 1}`,
          facts: [fact(":field/value", "Datum-" + token(key + t * 13 + s * 3 + f))],
        };
    }
  }
  for (let i = 0; i < (deep ? count(6, 6) : 2); i++)
    yield { id: `${id}/custom:${i + 1}`, facts: [fact(":custom/value", "Tag-" + token(key + i))] };
  for (let i = 0; i < (deep ? count(1, 4) : 1); i++) {
    const file = Buffer.from("Synthetic document " + token(key + 620 + i));
    yield {
      id: `${id}/placement:1/task:1/file:${i + 1}`,
      facts: [
        fact(
          ":file/metadata",
          JSON.stringify({
            name: "doc-" + token(key + i) + ".txt",
            mimeType: "text/plain",
            size: file.length,
            content: file.toString("utf8"),
          }),
        ),
      ],
    };
  }
}
