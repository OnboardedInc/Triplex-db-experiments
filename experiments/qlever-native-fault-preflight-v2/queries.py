"""The entire closed SELECT grammar for this internal read-only preflight.

No raw text is admitted by transport. These four template shapes accept only a
canonical UUID namespace, named/default channel and bounded integer offset.
This is not a parser or a restriction on the application's native SPARQL API.
"""
from __future__ import annotations
from dataclasses import dataclass
import json
import re
import uuid
from read_bounds import LIMITS,require


@dataclass(frozen=True,slots=True)
class ReadQuery:
    kind:str
    channel:str
    prefix:str
    offset:int=0


def render(query:ReadQuery)->str:
    require(type(query) is ReadQuery,'Raw/native query text is not accepted')
    require(query.kind in {'namespace-absent','count','page'} and query.channel in {'named','default'},'Unknown closed query shape/channel')
    require(type(query.offset) is int and 0<=query.offset<LIMITS.rows,'Query offset must be a bounded integer')
    require(query.kind=='page' or query.offset==0,'Only page queries have an offset')
    prefix=query.prefix
    require(isinstance(prefix,str) and re.fullmatch(r'urn:triplex:fault-v2:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}:',prefix) is not None,'Only an exact UUID packet namespace is admitted')
    identity=prefix[len('urn:triplex:fault-v2:'):-1]
    require(str(uuid.UUID(identity))==identity,'Noncanonical packet namespace')
    named=query.channel=='named'
    body='GRAPH ?g { ?s ?p ?o }' if named else '?s ?p ?o'
    value='?g' if named else '?s'
    negate='' if query.kind=='namespace-absent' else '!'
    body+=' FILTER('+negate+'STRSTARTS(STR('+value+'), '+json.dumps(prefix)+'))'
    if query.kind=='namespace-absent':return 'SELECT ?s WHERE { '+body+' } LIMIT 1'
    if query.kind=='count':return 'SELECT (COUNT(*) AS ?count) WHERE { '+body+' }'
    selected='?g ?s ?p ?o' if named else '?s ?p ?o'
    body+=' BIND(IF(isIRI(?o),"iri",IF(isBlank(?o),"blank","literal")) AS ?kind) BIND(IF(isLiteral(?o),STR(DATATYPE(?o)),"") AS ?datatype) BIND(IF(isLiteral(?o),LANG(?o),"") AS ?language)'
    order=('STR(?g) ' if named else '')+'STR(?s) STR(?p) ?kind STR(?o) ?datatype ?language'
    return 'SELECT '+selected+' WHERE { '+body+' } ORDER BY '+order+' LIMIT '+str(LIMITS.page_rows)+' OFFSET '+str(query.offset)
