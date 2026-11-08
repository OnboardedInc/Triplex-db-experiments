"""The contract's reference model over the claim fixtures (EXP-E01). Usage: python3 -I -B claim_ref.py <input.json>

input = {"fixtures": [{"id", "repo", "claim"}]}. Prints
  {"documents": {id: {"verdict"}},   lab/acceptance/build_contract.py admit_claim (contract 0.3.8) on each document fixture: with no
                                     executor (ev None) the reference judges no document, so every verdict is DIAGNOSTIC (Q55a)
   "contractFixtures": [{...}]}      every admit_claim call the contract's own self-check (ruling_checks) makes: the claim, the pins,
                                     W0 pin, A0 registry, verifier registry and manifest pins it was given, the executor's slots,
                                     every executor call in order (function, arguments, result) and the verdict. lab/bin/claim.mjs
                                     admitCore is checked by replaying those calls: it must make the same calls in the same order
                                     and reach the same verdict, without the fixtures being retyped.

The runner passes no judgement of its own.
"""
import base64
import importlib.util
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
spec = importlib.util.spec_from_file_location("build_contract", REPO / "lab/acceptance/build_contract.py")
bc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bc)
ADMIT = bc.admit_claim


def enc(v):
    """JSON form of an executor argument or result: bytes as {"$bytes": base64}, sets sorted, tuples as lists."""
    if isinstance(v, bytes):
        return {"$bytes": base64.b64encode(v).decode()}
    if isinstance(v, (set, frozenset)):
        return sorted(enc(x) for x in v)
    if isinstance(v, (list, tuple)):
        return [enc(x) for x in v]
    if isinstance(v, dict):
        return {str(k): enc(x) for k, x in v.items()}
    return v


def contract_fixtures():
    calls = []
    source = pathlib.Path(bc.__file__).read_text().splitlines()

    def recorder(claim, ev=None, pins=None, w0=None, a0=None, verifiers=None, pinned=None):
        log, wrapped = [], None
        if ev is not None:
            wrapped = {}
            for k, v in ev.items():
                if callable(v):
                    def f(*args, _k=k, _v=v):
                        r = _v(*args)
                        log.append({"fn": _k, "args": enc(list(args)), "result": enc(r)})
                        return r
                    wrapped[k] = f
                else:
                    wrapped[k] = v
        verdict = ADMIT(claim, ev=wrapped, pins=pins, w0=w0, a0=a0, verifiers=verifiers, pinned=pinned)
        frame = sys._getframe(1)
        while frame.f_code.co_name != "ruling_checks" and frame.f_back is not None:  # label by the self-check line, not the _adm helper
            frame = frame.f_back
        calls.append({"line": frame.f_lineno, "label": source[frame.f_lineno - 1].strip()[:200], "claim": enc(claim),
                      "ev": None if ev is None else {"slots": enc(ev.get("slots", ())), "calls": log},
                      "pins": enc(bc.ORACLE_PINS if pins is None else pins), "w0": enc(bc.W0_PIN if w0 is None else w0),
                      "a0": enc(bc.A0_REGISTRY["entries"] if a0 is None else a0), "verifiers": enc(bc.VERIFIER_REGISTRY["entries"] if verifiers is None else verifiers),
                      "pinned": enc({k: v["manifestSha256"] for k, v in bc.CS.items()} if pinned is None else pinned), "verdict": verdict})
        return verdict
    bc.admit_claim = recorder
    try:
        errors = [e for e in bc.ruling_checks() if any(k in e for k in ("Q38b", "Q42a", "Q47", "Q45a", "Q45b", "Q48a", "Q31i", "Q55", "Q56i"))]
    finally:
        bc.admit_claim = ADMIT
    return calls, errors


def main():
    spec_ = json.loads(pathlib.Path(sys.argv[1]).read_text())
    documents = {fx["id"]: {"verdict": ADMIT(fx["claim"])} for fx in spec_["fixtures"]}
    fixtures, errors = contract_fixtures()
    json.dump({"contractVersion": bc.VERSION if hasattr(bc, "VERSION") else None, "documents": documents, "contractFixtures": fixtures, "selfCheckErrors": errors}, sys.stdout)


if __name__ == "__main__":
    main()
