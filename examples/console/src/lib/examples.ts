// [DX-CON1] The one set of example questions, demo/console/questions.json, written for subject 50000 of account-003 on
// the 1 billion database. The console moves each example to the account and subject chosen on screen (the same rule as
// adaptExample in examples/demo-mcp/src/query.ts), so every example works on whichever database is connected.
import questions from "../../../../demo/console/questions.json";

export type Example = {
  name: string;
  note: string;
  from:
    | string
    | {
        subject?: { account: string; subject: number };
        subjects?: { account: string; subjects: number[] };
      };
  basis?: { position?: number };
  explain?: boolean;
  expect?: string;
  query: object;
};
export const examples = questions as Example[];

const pad8 = (n: number) => String(n).padStart(8, "0");

/** The example moved to `account` and `subject`; a recorded position becomes `sealedHead`; 16 subjects stay inside the account. */
export function adaptExample(
  ex: Example,
  account: string,
  subject: number,
  sealedHead: number | undefined,
  lastSubject: number,
): Example {
  const text = JSON.stringify(ex)
    .replaceAll("acct/account-003/", `acct/${account}/`)
    .replaceAll('"account-003"', JSON.stringify(account))
    .replaceAll(":00050000", ":" + pad8(subject));
  const out = JSON.parse(text) as Example;
  if (typeof out.from === "object" && out.from.subject) out.from.subject.subject = subject;
  if (typeof out.from === "object" && out.from.subjects) {
    const n = out.from.subjects.subjects.length;
    const start = Math.max(0, Math.min(subject, lastSubject - n + 1));
    out.from.subjects.subjects = [...Array(n).keys()]
      .map((i) => start + i)
      .filter((x) => x <= lastSubject);
  }
  if (out.basis?.position !== undefined && sealedHead !== undefined)
    out.basis.position = sealedHead;
  out.name = out.name.replace(
    /subjects 50000 to 50015/,
    typeof out.from === "object" && out.from.subjects
      ? `subjects ${out.from.subjects.subjects[0]} to ${out.from.subjects.subjects.at(-1)}`
      : "16 subjects",
  );
  return out;
}
