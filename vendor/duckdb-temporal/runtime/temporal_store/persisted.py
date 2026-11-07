"""SQL-owned snapshot validation/statistics and bounded native fallback."""
from . import compiler
from .compiler import proof, sql
from .compiler.typed_values import Limits, MAX_I64, MIN_I64, decode_sql, decode_slots, sql_slots

SOURCE='SELECT e,a,v_tag,v_s,v_b,v_i,v_f,valid_from,valid_to,tx_from,tx_to FROM main.assertions'
SNAPSHOT='''SELECT DISTINCT
1::UTINYINT c0t,encode(e) c0s,NULL::BOOLEAN c0b,NULL::BIGINT c0i,NULL::DOUBLE c0f,
1::UTINYINT c1t,encode(a) c1s,NULL::BOOLEAN c1b,NULL::BIGINT c1i,NULL::DOUBLE c1f,
v_tag c2t,v_s c2s,v_b c2b,v_i c2i,v_f c2f
FROM main.assertions WHERE valid_from<=? AND ?<valid_to AND tx_from<=? AND ?<tx_to'''

# The CASE protects JSON extraction from malformed retained payloads. Inactive
# assertions are validated too; SQL pushdown must not hide a persisted fault.
VALID_ROW='''CASE WHEN json_valid(payload) THEN
 payload_hash=sha256(payload) AND (origin='triplex' OR valid_from<valid_to) AND
 (tx_from<tx_to OR (origin='triplex' AND tx_from=tx_to)) AND
 octet_length(encode(e))<=1048576 AND octet_length(encode(a))<=1048576 AND
 NOT contains(e,chr(0)) AND NOT contains(a,chr(0)) AND
 CASE tag
 WHEN 'str' THEN v_tag=1 AND v_s IS NOT NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NULL
  AND json_type(payload)='VARCHAR' AND v_s=encode(json_extract_string(payload,'$'))
  AND octet_length(v_s)<=1048576 AND NOT contains(json_extract_string(payload,'$'),chr(0))
 WHEN 'bool' THEN v_tag=2 AND v_s IS NULL AND v_b IS NOT NULL AND v_i IS NULL AND v_f IS NULL
  AND json_type(payload)='BOOLEAN' AND CAST(v_b AS VARCHAR)=json_extract_string(payload,'$')
 WHEN 'i64' THEN v_tag=3 AND v_s IS NULL AND v_b IS NULL AND v_i IS NOT NULL AND v_f IS NULL
  AND json_type(payload)='VARCHAR' AND CAST(v_i AS VARCHAR)=json_extract_string(payload,'$')
 WHEN 'f64' THEN v_tag=4 AND v_s IS NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NOT NULL
  AND json_type(payload)='VARCHAR' AND CASE WHEN isfinite(v_f) THEN
   main.td_float_bits_v1(v_f)=json_extract_string(payload,'$') ELSE FALSE END
 WHEN 'ref' THEN origin='triplex' AND v_tag=5 AND v_s IS NOT NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NULL
  AND json_type(payload)='VARCHAR' AND octet_length(v_s)>0 AND v_s=encode(json_extract_string(payload,'$'))
  AND NOT contains(json_extract_string(payload,'$'),chr(0))
 WHEN 'datetime' THEN origin='triplex' AND v_tag=6 AND v_s IS NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NOT NULL
  AND json_type(payload)='VARCHAR' AND CASE WHEN isfinite(v_f) THEN main.td_float_bits_v1(v_f)=json_extract_string(payload,'$') ELSE FALSE END
 WHEN 'json' THEN origin='triplex' AND v_tag=7 AND v_s IS NOT NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NULL
  AND json_type(payload)='VARCHAR' AND v_s=encode(json_extract_string(payload,'$')) AND json_valid(decode(v_s))
 WHEN 'blob' THEN origin='triplex' AND v_tag=8 AND v_s IS NOT NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NULL
  AND json_type(payload)='VARCHAR' AND v_s=encode(json_extract_string(payload,'$')) AND extra_json IS NOT NULL AND json_valid(extra_json)
 ELSE FALSE END
 ELSE FALSE END'''


def validate(connection, guard):
    guard()
    invalid=connection.execute('SELECT count(*) FROM main.assertions WHERE ('+VALID_ROW+') IS NOT TRUE').fetchone()[0]
    guard()
    if invalid:raise compiler.PlanError('persisted typed payload/carrier or interval validation failed')


class Statistics:
    def __init__(self, connection, valid, known, guard, scope, parameters):
        self.connection=connection
        self.parameters=(valid,valid,known,known,*parameters)
        self.snapshot_sql=SNAPSHOT+' AND v_tag<=4 AND ('+scope+')'
        self.guard=guard

    def relation(self, conditions=(), parameters=()):
        select=['count(*)',
            'coalesce(sum(octet_length(c0s)+octet_length(c1s)+coalesce(octet_length(c2s),0)),0)']
        for column in range(3):
            prefix='c'+str(column)
            select.extend(['max(CASE WHEN '+prefix+'t='+str(tag)+' THEN 1 ELSE 0 END)' for tag in range(1,5)])
            select.extend(['coalesce(max(octet_length('+prefix+'s)),0)',
                           'min('+prefix+'i)','max('+prefix+'i)'])
        statement='WITH snapshot AS ('+self.snapshot_sql+') SELECT '+','.join(select)+' FROM snapshot'
        if conditions:statement+=' WHERE '+' AND '.join(conditions)
        self.guard()
        row=self.connection.execute(statement,(*self.parameters,*parameters)).fetchone()
        self.guard()
        domains=[]
        for column in range(3):
            offset=2+column*7
            tags=frozenset(tag for tag,exists in zip(('str','bool','i64','f64'),row[offset:offset+4]) if exists)
            domains.append(proof.Domain(tags,row[offset+4],row[offset+5],row[offset+6]))
        return row[0],tuple(domains),row[1]

    def snapshot(self, program):
        count,domains,bytes_=self.relation()
        atoms=[]
        for atom in dict.fromkeys(atom for rule in program.rules for atom in rule.positive if atom.relation==0):
            variables={};conditions=[];parameters=[]
            for column,term in enumerate(atom.terms):
                references=sql.columns(column)
                if term.var is not None:
                    if term.var in variables:
                        conditions.extend(a+' IS NOT DISTINCT FROM '+b for a,b in zip(references,variables[term.var]))
                    else:variables[term.var]=references
                else:
                    conditions.extend(name+' IS NOT DISTINCT FROM ?::'+kind for name,kind in zip(references,compiler.typed_values.TYPES))
                    parameters.extend(sql_slots(term.const,self.guard))
            atom_count,atom_domains,_=self.relation(conditions,parameters)
            atoms.append((atom,atom_count,atom_domains))
        return proof.SnapshotStatistics(count,domains,bytes_,tuple(atoms))


def query(store, program, valid, known, limits, force_native, invocation):
    if type(limits) is not Limits:raise compiler.PlanError('limits must be explicit Limits')
    if type(force_native) is not bool:raise compiler.PlanError('force_native must be exactly bool')
    if type(program) is not str or not 0<len(program.encode('utf-8'))<=65536:
        raise compiler.PlanError('program must contain 1..65536 UTF8 bytes')
    def guard():
        store._guard();invocation.guard()
    validate(store._conn,guard)
    parsed=store._compile_program(program,guard)
    attributes=set();unbound=False
    for rule in parsed.rules:
        for atom in (*rule.positive,*rule.negative):
            if atom.relation!=0:continue
            term=atom.terms[1]
            if term.var is not None:unbound=True
            elif term.const.tag=='str':attributes.add(term.const.wire)
    scoped=tuple(sorted(attributes))
    scope='TRUE' if unbound else ('a IN ('+','.join('?' for _ in scoped)+')' if scoped else 'FALSE')
    parameters=() if unbound else scoped
    guard()
    incompatible=store._conn.execute('SELECT count(*) FROM main.assertions WHERE valid_from<=? AND ?<valid_to '
        'AND tx_from<=? AND ?<tx_to AND ('+scope+') AND (v_tag>4 OR octet_length(encode(e))>512 OR '
        'octet_length(encode(a))>512 OR (v_tag=1 AND octet_length(v_s)>512))',
        (valid,valid,known,known,*parameters)).fetchone()[0]
    guard()
    if incompatible:
        raise compiler.PlanError('query touches values outside the native four-tag/512-byte scalar language; use the Triplex query API')
    reason='forced_native' if force_native else None
    admitted=None
    if reason is None:
        statistics=Statistics(store._conn,valid,known,guard,scope,parameters).snapshot(parsed)
        admitted,reason=proof.analyze(parsed,(),valid,known,limits,statistics=statistics)
    if reason is None:
        source=sql.SourceRelation(SOURCE+' WHERE v_tag<=4 AND ('+scope+')',parameters,('VARCHAR',)*len(parameters))
        generated,reason=sql.build(parsed,admitted,(),valid,known,guard,source)
    arity=parsed.relations[parsed.answer].arity
    if reason is None:
        guard()
        cursor=store._conn.execute(generated.sql,generated.parameters)
        raw=cursor.fetchmany(admitted.answer_rows+1)
        rows=decode_sql(raw,arity,admitted.answer_rows,guard)
        guard()
        explanation=compiler.Explanation('sql',None,admitted.explanation(),arity,generated.sql,
            generated.parameter_types,'sql_snapshot_statistics_and_persisted_relation')
        return compiler.Result(rows,explanation,None)
    # SQL has validated all retained rows already. Only the active set crosses
    # the native boundary; old history cannot enlarge a scalar input list.
    guard()
    snapshot_sql=SNAPSHOT+' AND v_tag<=4 AND ('+scope+')'
    raw=store._conn.execute('WITH snapshot AS ('+snapshot_sql+') SELECT * FROM snapshot',
                           (valid,valid,known,known,*parameters)).fetchmany(100001)
    guard()
    if len(raw)>100000:raise compiler.PlanError('native active snapshot exceeds 100000 tuples')
    facts=tuple(compiler.Fact(decode_slots(row[:5],guard,strings_are_blobs=True).wire,
        decode_slots(row[5:10],guard,strings_are_blobs=True).wire,
        decode_slots(row[10:15],guard,strings_are_blobs=True),MIN_I64,MAX_I64,0,MAX_I64) for row in raw)
    fetched=None
    def execute(statement,parameters,kind):
        nonlocal fetched
        fetched=store._conn.execute(statement,parameters).fetchall()
    session=compiler.Session(execute,lambda kind:fetched,store._profile,guard,None,invocation.token)
    result=compiler.query(session,program,facts,valid,known,limits,force_native=True)
    if len(result.rows)>limits.max_output_rows:raise compiler.PlanError('native output row budget exceeded')
    explanation=compiler.Explanation('native',reason,(),arity,None,(),'native_validated_active_set')
    return compiler.Result(result.rows,explanation,result.native_counters)
