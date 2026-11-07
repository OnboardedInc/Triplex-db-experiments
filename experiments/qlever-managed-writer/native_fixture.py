"""Bounded, operation-scoped native controls for the private fault packet.

These are genuine QLever INSERT/WHERE operations, not a second fact database or
the public Triplex adapter's transaction mapping. Expected complete rows come
from this independent fixture and are retained only in request evidence. The
coordinator journal receives their count/digest and bounded selectors.
"""
from __future__ import annotations

import hashlib
import json
import re

from broker import PreparedModify, canonical

NS = "urn:triplex:managed-fault:"


def literal(value: str) -> str:
    # Fixtures deliberately use ordinary well-formed ASCII JSON carriers.
    assert value.isascii()
    return json.dumps(value, ensure_ascii=True)


def prepare(operation: str, *, facts: int = 3, delay_rows: int = 0) -> PreparedModify:
    if not re.fullmatch(r"[A-Za-z0-9:._-]{1,128}", operation):
        raise ValueError("A bounded ASCII fixture identity is required")
    if not 1 <= facts <= 100 or not 0 <= delay_rows <= 200000:
        raise ValueError("Native fixture bounds exceeded")
    graph = NS + "graph:" + operation
    marker = NS + "operation:" + operation
    tag = NS + "operationId"
    triples: list[tuple[str, str, str]] = []

    def add(subject: str, predicate: str, value: str):
        triples.append((subject, NS + predicate, value))

    add(marker, "operationId", operation)
    add(marker, "marker", "committed")
    add(marker, "position", "1")
    for n in range(facts):
        subject = NS + f"assertion:{operation}:{n}"
        payload = {"id": f"{operation}:{n}", "entity": f"entity:{n}", "attribute": ":native/exact",
                   "value_type": "integer", "value_integer": "9223372036854775807", "valid_from": "100",
                   "recorded_at": "1000", "recorded_position": "1"}
        for predicate, value in [("operationId", operation), ("assertionId", payload["id"]),
                                 ("entity", payload["entity"]), ("attribute", payload["attribute"]),
                                 ("type", "integer"), ("value", payload["value_integer"]),
                                 ("validFrom", "100"), ("recordedAt", "1000"),
                                 ("recordedPosition", "1"), ("row", canonical(payload).decode())]:
            add(subject, predicate, value)
    for kind in ("claim", "receipt"):
        subject = NS + f"{kind}:{operation}"
        add(subject, "operationId", operation)
        add(subject, "kind", kind)
        add(subject, "command", operation)
        add(subject, "assertionCount", str(facts))
    expected = [{"s": s, "p": p, "o": o} for s, p, o in triples]
    block = "\n".join(f"<{s}> <{p}> {literal(o)} ." for s, p, o in triples)
    where = ""
    if delay_rows:
        # The update fully evaluates this WHERE before converting/applying the
        # insert rows in the pinned implementation. A cancellation trace must
        # still identify its actual phase; elapsed timing alone proves none.
        values = " ".join(literal(str(n)) for n in range(delay_rows))
        where = f'VALUES ?n {{ {values} }} BIND(SHA256(CONCAT(?n, {literal("x" * 2048)})) AS ?work) FILTER(?work != "impossible")'
    modify = f"INSERT {{ GRAPH <{graph}> {{ {block} }} }} WHERE {{ {where} }}"
    marker_query = f"SELECT ?marker WHERE {{ GRAPH <{graph}> {{ <{marker}> <{NS}marker> ?marker }} }} LIMIT 2"
    footprint = f"SELECT ?s WHERE {{ GRAPH <{graph}> {{ ?s <{tag}> {literal(operation)} }} }} LIMIT 1"
    proof = f"SELECT ?s ?p ?o WHERE {{ GRAPH <{graph}> {{ ?s <{tag}> {literal(operation)} . ?s ?p ?o }} }} LIMIT 10001"
    request = PreparedModify(operation, operation + ":attempt:1", hashlib.sha256(canonical(expected)).hexdigest(), modify,
                             marker_query, footprint, proof, expected)
    request.validate()
    return request
