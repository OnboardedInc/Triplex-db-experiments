"""Parameterized SQL for the independently admitted filter-free acyclic subset."""
from __future__ import annotations

from dataclasses import dataclass

from .typed_values import TAGS, TYPES, SUFFIXES, sql_slots


SQL_BYTES_LIMIT = 2*1024*1024


@dataclass(frozen=True, slots=True)
class SQLPlan:
    sql: str
    parameters: tuple
    parameter_types: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class SourceRelation:
    sql: str
    parameters: tuple = ()
    parameter_types: tuple[str, ...] = ()


def columns(index):
    return tuple('c'+str(index)+suffix for suffix in SUFFIXES)


def reference(alias, index):
    return tuple(alias+'.'+name for name in columns(index))


def _equal(left, right):
    return '('+' AND '.join(a+' IS NOT DISTINCT FROM '+b for a,b in zip(left,right))+')'


class _Builder:
    def __init__(self):
        self.constants = {}

    def constant(self, value):
        if value not in self.constants:
            self.constants[value] = len(self.constants)
        index = self.constants[value]
        return index, tuple('p'+str(index)+'.'+name for name in SUFFIXES)

    def preamble(self, facts, valid_at, known_at, guard, source_sql):
        parameters, types, arms = [], [], []
        if type(source_sql) is SourceRelation:
            parameters.extend(source_sql.parameters);types.extend(source_sql.parameter_types)
            source_sql=source_sql.sql
        raw_types = ('VARCHAR','VARCHAR',*TYPES,'BIGINT','BIGINT','BIGINT','BIGINT')
        for fact in (() if source_sql is not None else facts):
            arms.append('('+','.join('?::'+t for t in raw_types)+')')
            parameters.extend((fact.e,fact.a,*sql_slots(fact.value,guard),
                               fact.valid_from,fact.valid_to,fact.tx_from,fact.tx_to))
            types.extend(raw_types)
        raw = source_sql if source_sql is not None else ('VALUES '+','.join(arms)) if arms else (
            'SELECT '+','.join('NULL::'+t for t in raw_types)+' WHERE FALSE')
        ctes = ['raw(e,a,t,s,b,i,f,vf,vt,kf,kt) AS ('+raw+')',
            '''r0 AS (SELECT DISTINCT
1::UTINYINT AS c0t,main.encode(e) AS c0s,NULL::BOOLEAN AS c0b,NULL::BIGINT AS c0i,NULL::DOUBLE AS c0f,
1::UTINYINT AS c1t,main.encode(a) AS c1s,NULL::BOOLEAN AS c1b,NULL::BIGINT AS c1i,NULL::DOUBLE AS c1f,
t AS c2t,s AS c2s,b AS c2b,i AS c2i,CASE WHEN f=0::DOUBLE THEN 0::DOUBLE ELSE f END AS c2f
FROM raw WHERE vf<=?::BIGINT AND ?::BIGINT<vt AND kf<=?::BIGINT AND ?::BIGINT<kt)''']
        parameters.extend((valid_at,valid_at,known_at,known_at)); types.extend(('BIGINT',)*4)
        for value,index in self.constants.items():
            ctes.append('p'+str(index)+' AS (SELECT '+','.join(
                '?::'+t+' AS '+name for t,name in zip(TYPES,SUFFIXES))+')')
            parameters.extend(sql_slots(value,guard)); types.extend(TYPES)
        return ctes, tuple(parameters), tuple(types)


def _ordinary(rule, builder):
    variables, constants, sources, conditions = {}, set(), [], []
    for index,atom in enumerate(rule.positive):
        alias = 'a'+str(index)
        sources.append('r'+str(atom.relation)+' '+alias)
        for column,term in enumerate(atom.terms):
            refs = reference(alias,column)
            if term.var is not None:
                if term.var in variables:
                    conditions.append(_equal(refs,variables[term.var]))
                else:
                    variables[term.var] = refs
            else:
                constant,known = builder.constant(term.const)
                constants.add(constant); conditions.append(_equal(refs,known))
    projection = []
    for column,term in enumerate(rule.head.terms):
        if term.var is not None:
            refs = variables[term.var]
        else:
            constant,refs = builder.constant(term.const)
            constants.add(constant)
        projection.extend(value+' AS '+name for value,name in zip(refs,columns(column)))
    sources.extend('p'+str(index) for index in sorted(constants))
    query = 'SELECT '+','.join(projection)
    if sources:
        query += ' FROM '+' CROSS JOIN '.join(sources)
    if conditions:
        query += ' WHERE '+' AND '.join(conditions)
    return query


def _aggregate(rule, proof):
    spec = rule.aggregate
    source = 'r'+str(spec.source)
    projection, grouping = [], []
    for output,column in enumerate(spec.keys):
        refs = reference('s',column)
        projection.extend(value+' AS '+name for value,name in zip(refs,columns(output)))
        grouping.extend(refs)
    if spec.op == 'count':
        tag, payload = 'i64','COUNT(*)::BIGINT'
    elif spec.op == 'sum_i64':
        tag = 'i64'
        payload = 'COALESCE(SUM(s.c'+str(spec.measure)+'i::HUGEINT),0::HUGEINT)::BIGINT'
    else:
        tags = proof.domains[spec.source][spec.measure].tags
        # A proved-empty relation yields no extrema row. The unused tag only
        # fixes SQL types; no artificial value/group is published.
        tag = 'i64' if proof.row_bounds[spec.source] == 0 else next(iter(tags))
        suffix = {'str':'s','i64':'i','f64':'f'}[tag]
        payload = spec.op.upper()+'(s.c'+str(spec.measure)+suffix+')'
    slots = ['NULL::BLOB','NULL::BOOLEAN','NULL::BIGINT','NULL::DOUBLE']
    slots[TAGS[tag]-1] = payload
    output = (str(TAGS[tag])+'::UTINYINT',*slots)
    projection.extend(value+' AS '+name for value,name in zip(output,columns(len(spec.keys))))
    query = 'SELECT '+','.join(projection)+' FROM '+source+' s'
    if grouping:
        query += ' GROUP BY '+','.join(grouping)
    if spec.op in ('min','max'):
        query += ' HAVING COUNT(*)>0'
    return query


def build(program, proof, facts, valid_at, known_at, guard, source_sql=None):
    """Receive only the strict decoded genuine program and a complete proof."""
    builder, ctes = _Builder(), []
    for component_id in program.schedule:
        component = program.components[component_id]
        if not component.rules:
            continue
        relation = component.relations[0]
        rules = tuple(program.rules[index] for index in component.rules)
        if rules[0].aggregate is not None:
            body = _aggregate(rules[0],proof)
        else:
            body = 'SELECT DISTINCT * FROM ('+' UNION '.join(_ordinary(rule,builder) for rule in rules)+') u'+str(relation)
        ctes.append('r'+str(relation)+' AS ('+body+')')
    preamble,params,types = builder.preamble(facts,valid_at,known_at,guard,source_sql)
    statement = 'WITH '+',\n'.join(preamble+ctes)+'\nSELECT DISTINCT * FROM r'+str(program.answer)
    if len(statement.encode('utf-8')) > SQL_BYTES_LIMIT:
        return None, 'generated_sql_size_unproved'
    return SQLPlan(statement,params,types), None
