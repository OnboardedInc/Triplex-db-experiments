# Frozen read-only API subset, copied from the modern draft at SHA256
# 12d9b3637192666ee4c58d4a93427ae93959fc3cb1f0ee8fd1be0f59c43b48fb. It has no storage/copy/native
# mutation path and is versioned separately so later operational work cannot
# silently alter an already-reviewed native API preflight contract.
"""Streaming full RDF continuity capture, not an application query evaluator.

Capture both named quads and the native default-graph observation. Every returned
RDF term channel is retained. Full-history/claim payloads are included rather
than a marker count or the older tiny fixture. This source has not queried Q.
"""
from __future__ import annotations
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import time

from read_bounds import LIMITS, canonical, sync_directory
from read_bounds import require

FIELD = "urn:triplex:field:"
SCOPE = "urn:triplex:scope:"
DEFAULT = "urn:triplex:fault-v2:default-graph-observation"
XSD_STRING = "http://www.w3.org/2001/XMLSchema#string"


def iri(value: str) -> str:
    require(value.isascii() and all(character not in value for character in '<>"{}|^`\\\n\r\t '), "Unsafe trusted IRI")
    return "<" + value + ">"


def literal(value: str) -> str:
    require(value.isascii(), "This internal packet prefix must be ASCII")
    return json.dumps(value)


def term(value: dict) -> dict:
    require(isinstance(value, dict) and set(value) <= {"type", "value", "datatype", "xml:lang"}, "Unexpected RDF term channel")
    require(value.get("type") in {"uri", "bnode", "literal", "typed-literal"} and isinstance(value.get("value"), str), "Invalid native RDF term")
    return value


class CappedFile:
    def __init__(self, stream, maximum):
        self.stream, self.maximum, self.bytes = stream, maximum, 0

    def write(self, raw):
        require(self.bytes + len(raw) <= self.maximum, "Compressed continuity capture exceeded16MiB")
        self.bytes += len(raw)
        return self.stream.write(raw)

    def flush(self):
        self.stream.flush()


def capture(native, target: Path, *, packet_prefix: str, expected: dict | None = None) -> dict:
    require(not target.exists() and not any(path.is_symlink() for path in [target, *target.parents]), "Continuity destination already exists or is linked")
    target.parent.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + LIMITS.preflight_seconds
    digest, raw_bytes, total, pages, scopes = hashlib.sha256(), 0, 0, 0, {}
    counts = {}
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "wb") as stream:
        capped = CappedFile(stream, LIMITS.capture_compressed)
        with gzip.GzipFile(filename="", fileobj=capped, mode="wb", mtime=0) as compressed:
            for channel in ["named", "default"]:
                # Own fault subjects/graphs are unique and absent at preflight.
                # They are checked independently against their full fixture;
                # excluding that exact packet namespace keeps original payload
                # continuity comparable across old/attempted/next operations.
                body = ("GRAPH ?g { ?s ?p ?o } FILTER(!STRSTARTS(STR(?g), " + literal(packet_prefix) + "))") if channel == "named" else ("?s ?p ?o FILTER(!STRSTARTS(STR(?s), " + literal(packet_prefix) + "))")
                if expected is None:
                    fresh = ("GRAPH ?g { ?s ?p ?o } FILTER(STRSTARTS(STR(?g), " + literal(packet_prefix) + "))") if channel == "named" else ("?s ?p ?o FILTER(STRSTARTS(STR(?s), " + literal(packet_prefix) + "))")
                    require(not native.select("SELECT ?s WHERE { " + fresh + " } LIMIT 1"), "Fresh packet namespace already has native payload")
                count_rows = native.select("SELECT (COUNT(*) AS ?count) WHERE { " + body + " }")
                require(len(count_rows) == 1 and count_rows[0].get("count", {}).get("value", "").isdigit(), "Malformed full-continuity count")
                count = int(count_rows[0]["count"]["value"])
                require(total + count <= LIMITS.rows, "Full continuity exceeds200000 row budget")
                counts[channel] = count
                read = 0
                while read < count:
                    require(time.monotonic() < deadline, "Full continuity exceeded120s")
                    selected = "?g ?s ?p ?o" if channel == "named" else "?s ?p ?o"
                    order = ("STR(?g) " if channel == "named" else "") + "STR(?s) STR(?p) ?kind STR(?o) ?datatype ?language"
                    query = "SELECT " + selected + " WHERE { " + body + ' BIND(IF(isIRI(?o),"iri",IF(isBlank(?o),"blank","literal")) AS ?kind) BIND(IF(isLiteral(?o),STR(DATATYPE(?o)),"") AS ?datatype) BIND(IF(isLiteral(?o),LANG(?o),"") AS ?language) } ORDER BY ' + order + " LIMIT " + str(LIMITS.page_rows) + " OFFSET " + str(read)
                    rows = native.select(query)
                    require(0 < len(rows) <= min(LIMITS.page_rows, count - read), "Full continuity page is incomplete/oversized")
                    for row in rows:
                        require(set(row) == {name[1:] for name in selected.split()}, "Missing/extra continuity binding")
                        value = {key: term(item) for key, item in row.items()}
                        if channel == "default":
                            value["g"] = {"type": "uri", "value": DEFAULT}
                        require(value["g"]["type"] == "uri" and value["p"]["type"] == "uri", "Invalid graph/predicate binding")
                        raw = canonical({"channel": channel, **value}) + b"\n"
                        raw_bytes += len(raw); total += 1
                        require(raw_bytes <= LIMITS.capture_raw, "Full continuity exceeded64MiB raw budget")
                        compressed.write(raw); digest.update(raw)
                        graph = value["g"]["value"]
                        if channel == "named" and graph.startswith(SCOPE):
                            encoded = graph[len(SCOPE):]
                            decoded = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)).decode()
                            if "\0" not in decoded:
                                scope = scopes.setdefault(decoded, {"positions": [], "commandIds": set(), "quadCount": 0})
                                scope["quadCount"] += 1
                                if value["s"]["value"] == "urn:triplex:meta" and value["p"]["value"] == FIELD + "position":
                                    lexical = value["o"]["value"]
                                    require(lexical.isdigit(), "Malformed current scope position")
                                    scope["positions"].append(int(lexical))
                                if value["p"]["value"] == FIELD + "command_id":
                                    scope["commandIds"].add(value["o"]["value"])
                        require(len(scopes) <= LIMITS.graphs, "Scope inventory exceeded2048 bound")
                    read += len(rows); pages += 1
                # A second independent count refuses moving/incomplete state.
                after = native.select("SELECT (COUNT(*) AS ?count) WHERE { " + body + " }")
                require(after == count_rows, "Continuity row count changed during capture")
        stream.flush(); os.fsync(stream.fileno())
    sync_directory(target.parent)
    summary = {"format": "triplex-qlever-full-rdf-continuity/1", "sha256": digest.hexdigest(), "rows": total, "counts": counts, "rawBytes": raw_bytes, "compressedBytes": capped.bytes, "pages": pages, "capture": str(target), "packetNamespaceExcluded": packet_prefix, "scopeFrontiers": []}
    for name, scope in sorted(scopes.items()):
        require(len(scope["positions"]) <= 1, "Contradictory current scope frontier")
        summary["scopeFrontiers"].append({"scope": name, "position": scope["positions"][0] if scope["positions"] else None, "quadCount": scope["quadCount"], "commandIds": sorted(scope["commandIds"])})
    if expected is not None:
        for key in ["sha256", "rows", "counts", "rawBytes", "scopeFrontiers"]:
            require(summary[key] == expected[key], "Original complete RDF continuity mismatch: " + key)
    return summary


def check_ack_catalog(summary: dict, catalog: dict) -> dict:
    frontiers = {row["scope"]: row for row in summary["scopeFrontiers"]}
    checked, gaps = 0, []
    for scope in catalog["scopes"]:
        for reference in scope["explicitAckReferences"]:
            if not reference["authority"].startswith("ANCHORED_RAW_"):
                gaps.append({"scope": scope["scope"], "run": reference["run"], "authority": reference["authority"]})
                continue
            current = frontiers.get(scope["scope"])
            require(current is not None and current["position"] is not None and current["position"] >= reference["position"], "Acknowledged scope frontier missing from complete native state")
            if reference.get("commandId"):
                require(reference["commandId"] in current["commandIds"], "Acknowledged command claim missing from complete native state")
            checked += 1
    return {"checkedExplicitReferences": checked, "partialOrUnanchoredAuthorityGaps": gaps, "meaning": "Available ACK frontiers/claims plus complete current RDF continuity; no retrospective proof of omitted older ACK payloads"}
