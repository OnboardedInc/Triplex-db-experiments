"""Independent bounded native component oracle; no query/side effect on import.

Only the archived pure PreparedModify/journal protocol is imported. No archived
native worker, Docker command, fixture data or historical PASS is reused.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import re
import sys

ARCHIVE = Path(__file__).resolve().parents[1] / 'qlever-managed-writer'
sys.path.insert(0, str(ARCHIVE))
from broker import PreparedModify, canonical


def prepare(packet: str, case: str, operation: str, *, delay: bool = False) -> PreparedModify:
    if not re.fullmatch(r'[a-f0-9-]{36}', packet) or case not in {'cancel','permission','ack-loss'} or operation not in {'old','attempt','next'}:
        raise ValueError('Invalid component oracle identity')
    prefix = 'urn:triplex:fault-v2:' + packet + ':'
    identity = packet + ':' + case + ':' + operation
    graph, marker = prefix + 'graph:' + case + ':' + operation, prefix + 'operation:' + case + ':' + operation
    triples = []
    def add(subject, predicate, value):
        triples.append({'s':subject, 'p':prefix + predicate, 'o':value})
    add(marker, 'operationId', identity); add(marker, 'marker', 'committed'); add(marker, 'position', '1')
    for index in range(3):
        subject = prefix + 'assertion:' + case + ':' + operation + ':' + str(index)
        payload = {'id':identity + ':' + str(index), 'entity':'entity:' + str(index), 'attribute':':native/exact', 'type':'integer', 'value':'9223372036854775807', 'validFrom':'100.125', 'recordedAt':'1000.25', 'recordedPosition':'1'}
        for name, value in payload.items():
            add(subject, name, value)
        add(subject, 'operationId', identity)
        add(subject, 'row', canonical(payload).decode())
    for kind in ['claim','receipt']:
        subject = prefix + kind + ':' + case + ':' + operation
        for name, value in {'kind':kind,'command':identity,'operationId':identity,'assertionCount':'3'}.items():
            add(subject, name, value)
    block = '\n'.join('<' + row['s'] + '> <' + row['p'] + '> ' + json.dumps(row['o']) + ' .' for row in triples)
    where = ''
    if delay:
        values = ' '.join(json.dumps(str(index)) for index in range(200000))
        where = 'VALUES ?n { ' + values + ' } BIND(SHA256(CONCAT(?n,' + json.dumps('x'*2048) + ')) AS ?work) FILTER(?work != "impossible")'
    update = 'INSERT { GRAPH <' + graph + '> { ' + block + ' } } WHERE { ' + where + ' }'
    marker_query = 'SELECT ?marker WHERE { GRAPH <' + graph + '> { <' + marker + '> <' + prefix + 'marker> ?marker } } LIMIT 2'
    footprint = 'SELECT ?s WHERE { GRAPH <' + graph + '> { ?s ?p ?o } } LIMIT 1'
    proof = 'SELECT ?s ?p ?o WHERE { GRAPH <' + graph + '> { ?s ?p ?o } } LIMIT 10001'
    request = PreparedModify(identity, identity + ':attempt:1', hashlib.sha256(canonical(triples)).hexdigest(), update, marker_query, footprint, proof, triples)
    request.validate()
    if len(update.encode()) > 8 * 1024 ** 2:
        raise ValueError('Native component input exceeds8MiB')
    return request


def normalize_bindings(rows):
    result = []
    for row in rows:
        if set(row) != {'s','p','o'} or row['s'].get('type') != 'uri' or row['p'].get('type') != 'uri' or row['o'].get('type') not in {'literal','typed-literal'} or row['o'].get('datatype', 'http://www.w3.org/2001/XMLSchema#string') != 'http://www.w3.org/2001/XMLSchema#string' or row['o'].get('xml:lang'):
            raise ValueError('Native component proof term channel differs from the independently authored string RDF fixture')
        result.append({key:row[key]['value'] for key in ['s','p','o']})
    return result
