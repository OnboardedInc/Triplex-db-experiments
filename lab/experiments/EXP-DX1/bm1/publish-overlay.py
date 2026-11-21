"""Assemble the single-account benchmark harness from the pinned ACT1/ACT2 producer."""
from pathlib import Path
import subprocess
import sys

PIN = "0196b9952e496c883a24b9ed05ef17fa886dfb00"
JOIN = Path("lab/experiments/EXP-DX1/actv-lazy/join")
DELTA = JOIN.parent.parent / "actv-delta"


def replace(source, old, new):
    assert source.count(old) == 1, old
    return source.replace(old, new, 1)


def assemble(checkout):
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=checkout, text=True).strip() == PIN
    join = checkout / JOIN
    delta = checkout / DELTA
    source, _ = (join / "queue-study.ts").read_text().split("type SeedImage =", 1)
    # [DX-BM1] Why: keep the tested ACT2 offer, receipt, and independent oracle loop on the exact ACT1 integration.
    # Rejected: rebuilding a second driver or running the 24-cell, three-account Mac experiment.
    source = replace(source, 'import { mkdirSync, writeFileSync }', 'import { mkdirSync, readFileSync, writeFileSync }')
    source = replace(source, 'import { randomUUID }', 'import { createHash, randomUUID }')
    source = replace(source, 'import { ids, type Fact }', 'import { ids, subjectOf, type Fact }')
    source = replace(source, 'import { Reference }', 'import { compareSource } from "./deep-reference.ts";\nimport { Reference }')
    source = replace(source, '../../actv-delta/audit-clock.ts', '../../actv-delta/bm1-priority-clock.ts')
    source = replace(source, 'const seats = 64;', 'const seats = 0;')
    start = source.index("async function cpu(")
    end = source.index("// [DX-ACT2] Why: allocate", start)
    source = source[:start] + '''async function cpu(_attempt: Identity) {
  return { at: ms(), host: readFileSync("/proc/pressure/cpu", "utf8") };
}

''' + source[end:]
    source = replace(source, '        if (screen.reason) stop = observedAt;\n', '')
    source = replace(source, '        if (screen.reason) return;\n', '')
    source = replace(source, '    assert.equal(offers.length, screen.reason ? 0 : count);\n    assert.equal(!!treatment, !screen.reason);',
                     '    assert.equal(offers.length, count);\n    assert(treatment);')
    source = replace(source, '    const byCut = new Map<number, Map<string, string>>();',
                     '    const byCut = new Map<number, Map<string, string>>();\n    const replayInputs: unknown[] = [];')
    source = replace(source, '''        const expected = JSON.parse(
          await ref.oracle.call("check", {
            document: doc,
            old: null,
            basis: { tx: cut, validTime: valid },
            worlds,
            fold: false,
          }),
        );''', '''        const replay = { document: doc, old: null, basis: { tx: cut, validTime: valid }, worlds, fold: false };
        replayInputs.push(replay);
        const expected = JSON.parse(await ref.oracle.call("check", replay));''')
    source = replace(source, '    save(join(folder, "verified.json"), result);',
                     '    save(join(folder, "replay-inputs.json"), replayInputs);\n    save(join(folder, "verified.json"), result);')
    source = replace(source, '        receipt: sha256(canonical(durable.marker)),',
                     '        receipt: sha256(canonical(durable.marker)),\n        marker: durable.marker,')
    source = replace(source, '  intent: string;\n};', '  intent: string;\n  admission: PublishObservation;\n};')
    source = replace(source, '                  intent: sha256(canonical(edit)),',
                     '                  intent: sha256(canonical(edit)),\n                  admission: observation,')
    source = replace(source, '          offers.push(o);',
                     '          save(join(folder, "offer-" + x.order + ".json"), o);\n          offers.push(o);')
    (join / "bm1-priority.ts").write_text(source + Path(__file__).with_name("publish-priority.ts").read_text())
    clock = (delta / "audit-clock.ts").read_text()
    clock = replace(clock, 'o.ack && r.invoked >= o.ingress && r.position >= o.ack.position && r.seq >= o.ack.seq,',
                    '''o.ack &&
          r.offer === i &&
          r.invoked >= o.ingress &&
          r.position >= o.ack.position &&
          r.seq >= o.ack.seq &&
          (!offers[i + 1]?.ack || r.position < offers[i + 1]!.ack!.position),''')
    (delta / "bm1-priority-clock.ts").write_text(clock)


if __name__ == "__main__":
    assemble(Path(sys.argv[1]))
