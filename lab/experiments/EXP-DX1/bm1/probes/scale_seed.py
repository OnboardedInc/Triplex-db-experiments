"""Check and expose the sealed SCALE1 single-account image to isolated BM1 probes."""

import base64
from contextlib import closing
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import uuid


SOURCE = "a072629eb1971f6b6969afd7349b40cbcd1bdef8"
POPULATION = "b7e7d58876cdc13a18f30f0bf32abfea67984e8a4430bceff5a5f1d2a0a5c561"
FACTS = 16_245_647
PEOPLE = 100_000
TAG = "arm-d7-bm1-single-n20"
ORIGIN = Path("/var/tmp/triplex-scale1/decision/attempts") / TAG


def read(file):
    return json.loads(file.read_bytes())


def sha(file):
    with file.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def checked_seed(folder):
    # [DX-BM1] Why: tie the restorable PostgreSQL bytes to the original full claim and feed proof.
    # Rejected: reusing a dump with only a row count or trusting an unqualified terminal label.
    request = read(folder / "request.json")
    attempt = read(folder / "attempt.json")
    seed = read(folder / "seed.json")
    image = read(folder / "image.json")
    unit = read(folder / "unit.json")
    pre = read(folder / "preflight.json")
    transfer = read(folder / "transfer.json")
    assert request == {key: attempt[key] for key in request}
    assert request["tag"] == TAG and request["source"] == SOURCE and request["phase"] == "seed"
    assert request["people"] == PEOPLE and request["layout"] == "single" and request["mode"] == "individual"
    assert attempt["spec"] == dict(accounts=1, scopes=1, people=PEOPLE)
    assert seed == {key: value for key, value in image.items() if key not in ("bytes", "sha256")}
    assert str(uuid.UUID(request["nonce"])) == request["nonce"]
    for row in (seed, pre, unit):
        assert row["source"] == SOURCE and row["slot"] == attempt["slot"] == "tx2-dxscale1-" + TAG
        assert row["nonce"] == request["nonce"]
    assert pre["saves"] == pre["claims"] == 6 and pre["fieldCuts"] == 12 and pre["pinnedAccounts"] == 2
    assert seed["population"] == pre["population"] == POPULATION and seed["facts"] == FACTS
    assert attempt["at"] <= pre["at"] <= seed["started"] <= seed["completed"]
    assert unit["result"] == transfer["result"] == "success"
    assert (transfer["tag"], transfer["source"], transfer["nonce"]) == (TAG, SOURCE, request["nonce"])
    assert read(folder / "cleanup.json") == dict(containers=[], networks=[], volumes=[])
    assert read(folder / "durability.json") == {"settings": "on|on|on"}
    assert seed["verification"] == "full-command-and-feed-with-pinned-member-probes"
    scope, = seed["scopes"]
    proof, = seed["proofs"]
    membership, = seed["membership"]
    cut = scope["seedCut"]
    name = "dx-scale-decision-" + seed["nonce"] + "-0"
    key = json.dumps(["triplex-scope-v1", "test", "test", name, 0], separators=(",", ":"))
    db = "s2-" + base64.urlsafe_b64encode(key.encode()).decode().rstrip("=")
    assert scope == dict(name=name, db=db, cut=cut, seedCut=cut, accounts=[0])
    assert proof["cut"] == cut == proof["observed"] + 1 and proof["facts"] == FACTS
    assert proof["cursor"] == PEOPLE and proof["scope"] == 0
    assert membership == {"db": db, "position": cut, "checked": 4, "coldFields": 2}
    dump = folder / "seed.pgdump"
    ledger = folder / "seed-0.sqlite"
    assert not dump.is_symlink() and not ledger.is_symlink()
    with dump.open("rb") as stream:
        assert stream.read(5) == b"PGDMP"
    assert dump.stat().st_size == image["bytes"] and sha(dump) == image["sha256"]
    assert sha(ledger) == proof["ledgerHash"]
    assert not ledger.with_name(ledger.name + "-wal").exists()
    with closing(sqlite3.connect(ledger.as_uri() + "?mode=ro&immutable=1", uri=True)) as sql:
        cursor, = sql.execute("SELECT cursor FROM session WHERE id=1").fetchone()
        assert cursor == PEOPLE
        last_end, facts, positions, witness = 0, 0, set(), None
        for first, end, position, body in sql.execute("SELECT first,end,position,body FROM frames ORDER BY first"):
            row = json.loads(body)
            assert [row[k] for k in ("first","end","position")] == [first,end,position]
            assert first == last_end < end and position not in positions
            assert isinstance(row["facts"], int) and row["facts"] > 0 and row["txId"]
            assert re.fullmatch(r"[a-f0-9]{64}",row["digest"])
            facts += row["facts"]
            last_end = end
            positions.add(position)
            if position == cut:
                witness = {"commandId": row["command"], "txId": row["txId"], "recordedAt": row["instant"], "position": cut}
        assert positions == set(range(2, cut + 1)) and last_end == PEOPLE and facts == FACTS and witness
    return {"kind":"scale1-single", "source":SOURCE, "slot":seed["slot"], "nonce":seed["nonce"],
            "scope":key, "db":db, "lastPosition":cut, "bytes":image["bytes"],
            "dump":str(dump), "dumpSha256":image["sha256"], "original":str(folder),
            "seed":{"people":PEOPLE,"facts":FACTS,"accounts":1,"population":POPULATION},
            "witness":witness, "sourceSeedSha256":sha(folder/"seed.json"),
            "sourceImageSha256":sha(folder/"image.json"), "ledgerSha256":proof["ledgerHash"]}


def prepare_receipt(destination):
    value = checked_seed(ORIGIN)
    if destination.is_file():
        assert read(destination) == value
    else:
        with destination.open("x") as stream:
            json.dump(value, stream, indent=2)
            stream.write("\n")
    return value
