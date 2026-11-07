"""Serialized public commands and coherent planned reads on owned DuckDB."""
from __future__ import annotations

from contextlib import contextmanager
from collections import OrderedDict
import ctypes
from dataclasses import dataclass
from hashlib import sha256
import json
from pathlib import Path
import threading
import time

import duckdb

from . import compiler, persisted
from .compiler import ir2
from .control import Cancellation, Invocation
from .projection import MaterializedProjection
from . import shared
from .compiler.typed_values import MAX_I64, MIN_I64, decode_slots, exact_int, sql_slots, text

ROOT = Path(__file__).resolve().parent.parent
MAX_HISTORY = 1000000
MAX_COMMAND_ROWS = 4096
MAX_HISTORY_BYTES = 256 * 1024 * 1024


class StoreError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class Assertion:
    id: str
    e: str
    a: str
    value: compiler.Value
    valid_from: int = 0
    valid_to: int = MAX_I64

    def __post_init__(self):
        text(self.id, 128)
        if not self.id:
            raise StoreError('assertion id must be nonempty')
        # Reuse the strict native boundary before any SQL mutation.
        compiler.Fact(self.e, self.a, self.value, self.valid_from, self.valid_to, 1, MAX_I64)


@dataclass(frozen=True, slots=True)
class Receipt:
    command_id: str
    position: int
    asserted: tuple[str, ...]
    retracted: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class HistoryRow:
    assertion: Assertion
    tx_from: int
    tx_to: int
    command_id: str
    corrected_by: str | None


@dataclass(frozen=True, slots=True)
class Snapshot:
    position: int
    known_at: int
    valid_at: int
    result: compiler.Result

    @property
    def rows(self):
        return self.result.rows


@dataclass(frozen=True, slots=True)
class IntervalRow:
    values: tuple[compiler.Value, ...]
    valid_from: int
    valid_to: int


@dataclass(frozen=True, slots=True)
class Timeline:
    position: int
    known_at: int
    intervals: tuple[IntervalRow, ...]
    assertions: tuple[HistoryRow, ...]


def _json(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def _owned_request(command_id, assertions, retract):
    text(command_id, 128)
    if not command_id:
        raise StoreError('command id must be nonempty')
    if type(assertions) not in (list, tuple) or type(retract) not in (list, tuple):
        raise StoreError('command rows must be bounded owned lists or tuples')
    if len(assertions) + len(retract) > MAX_COMMAND_ROWS:
        raise StoreError('command row admission exceeded')
    owned = []
    for item in assertions:
        if type(item) is not Assertion:
            raise StoreError('assertions require exact Assertion values')
        owned.append(Assertion(item.id, item.e, item.a, item.value, item.valid_from, item.valid_to))
    ids = tuple(text(item, 128) for item in retract)
    if any(not item for item in ids):
        raise StoreError('retraction ids must be nonempty')
    if len({item.id for item in owned}) != len(owned) or len(set(ids)) != len(ids):
        raise StoreError('duplicate assertion or retraction id in command')
    if {item.id for item in owned} & set(ids):
        raise StoreError('corrections require a new assertion identity')
    request = {'format': 1, 'assert': [
        [x.id, x.e, x.a, x.value.to_wire(), x.valid_from, x.valid_to] for x in owned],
        'retract': ids}
    return tuple(owned), ids, sha256(_json(request).encode('utf-8')).hexdigest()


class Store:
    """An exclusively owned connection; callers never receive SQL authority.

    Retained storage admits one million assertions / 256 MiB of logical
    payload. SQL reads keep history inside DuckDB; native invocation bounds
    apply to the validated active snapshot, independently of history size.
    """

    def __init__(self, database=':memory:'):
        if duckdb.__version__ != '2.0.0':
            raise StoreError('exact DuckDB 2.0.0 required')
        self._lock = threading.RLock()
        self._closed = False
        self._broken = False
        self._templates = OrderedDict()
        self._template_bytes = 0
        self._compilations = 0
        self._views=[]
        self._pending_views=None
        artifact = ROOT / 'build/temporal_datalog.duckdb_extension'
        library = ROOT / 'build/temporal_datalog.so'
        manifest = json.loads((ROOT / 'build/artifact.json').read_text())
        if (sha256(artifact.read_bytes()).hexdigest() != manifest['extension_sha256']
                or sha256(library.read_bytes()).hexdigest() != manifest['library_sha256']):
            raise StoreError('native artifact differs from the local build manifest')
        self._guard_library = ctypes.CDLL(str(artifact))
        self._fp = self._guard_library.td_require_fp
        self._fp.restype = ctypes.c_int
        self._fp.argtypes = []
        self._guard()
        self._conn = duckdb.connect(str(database), config={
            'allow_unsigned_extensions': 'true', 'threads': '1',
            'memory_limit': '128MB', 'max_temp_directory_size': '64MB'})
        try:
            # Fixed locally built extension, never supplied by a caller.
            self._conn.execute("LOAD '" + str(artifact).replace("'", "''") + "'")
            self._conn.execute('SET enable_external_access=false')
            self._conn.execute('SET autoinstall_known_extensions=false')
            self._conn.execute('SET autoload_known_extensions=false')
            tables = self._conn.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema='main'").fetchall()
            if not tables:
                with self._transaction():
                    self._conn.execute((Path(__file__).parent / 'schema.sql').read_text())
            elif set(t[0] for t in tables) not in (
                    {'store_meta', 'clock', 'commands', 'assertions'},
                    {'store_meta', 'clock', 'commands', 'assertions','storage_usage'}):
                raise StoreError('database is not the owned temporal-store schema')
            version = self._conn.execute('SELECT version FROM main.store_meta').fetchall()
            if version == [(1,)]:
                self._migrate_v1()
                version=[(2,)]
            if version == [(2,)]:
                self._migrate_v2()
                version=[(3,)]
            if version == [(3,)]:
                self._migrate_v3()
                version=[(4,)]
            if version == [(4,)]:
                with self._transaction():shared.migrate(self._conn,self._checkpoint)
            elif version != [(5,)]:
                raise StoreError('unsupported temporal-store schema version')
            self._profile()
        except BaseException:
            self._conn.close()
            self._closed = True
            raise

    def _checkpoint(self, phase):
        """Private fault-test seam; ordinary execution installs no callbacks."""

    def _migrate_v1(self):
        # This migration touches only this product's declared v1 schema.
        # It never opens or adopts any historical prototype database.
        with self._transaction():
            self._conn.execute('DROP INDEX main.snapshot_cut')
            self._conn.execute('DROP INDEX main.eav_lookup')
            self._conn.execute('ALTER TABLE main.assertions ADD COLUMN payload_hash VARCHAR')
            self._conn.execute('UPDATE main.assertions SET payload_hash=sha256(payload)')
            self._conn.execute('ALTER TABLE main.assertions ALTER COLUMN payload_hash SET NOT NULL')
            self._conn.execute('CREATE INDEX snapshot_cut ON main.assertions(tx_from,tx_to,valid_from,valid_to)')
            self._conn.execute('CREATE INDEX eav_lookup ON main.assertions(e,a)')
            self._checkpoint('migration_backfill')
            self._conn.execute('DROP TABLE main.store_meta')
            self._conn.execute('CREATE TABLE main.store_meta(version INTEGER PRIMARY KEY CHECK(version=2))')
            self._conn.execute('INSERT INTO main.store_meta VALUES (2)')

    def _migrate_v2(self):
        with self._transaction():
            for name,sql_type in [('v_tag','UTINYINT'),('v_s','BLOB'),('v_b','BOOLEAN'),('v_i','BIGINT'),('v_f','DOUBLE')]:
                self._conn.execute('ALTER TABLE main.assertions ADD COLUMN '+name+' '+sql_type)
            for ident,tag,payload in self._conn.execute('SELECT assertion_id,tag,payload FROM main.assertions').fetchall():
                value=compiler.Value(tag,json.loads(payload))
                self._conn.execute('UPDATE main.assertions SET v_tag=?,v_s=?,v_b=?,v_i=?,v_f=? WHERE assertion_id=?',
                                   [*sql_slots(value,self._guard),ident])
            self._checkpoint('typed_carrier_backfill')
            self._conn.execute('DROP TABLE main.store_meta')
            self._conn.execute('CREATE TABLE main.store_meta(version INTEGER PRIMARY KEY CHECK(version=3))')
            self._conn.execute('INSERT INTO main.store_meta VALUES (3)')

    def _guard(self):
        if self._closed or self._broken:
            raise StoreError('store is closed or has an unresolved transaction outcome')
        if self._fp() != 1:
            raise StoreError('unsupported floating-point controls')

    def _migrate_v3(self):
        with self._transaction():
            self._conn.execute('CREATE TABLE main.storage_usage(singleton BOOLEAN PRIMARY KEY CHECK(singleton),'
                'retained_count BIGINT NOT NULL CHECK(retained_count>=0),retained_bytes BIGINT NOT NULL CHECK(retained_bytes>=0))')
            self._conn.execute('INSERT INTO main.storage_usage SELECT TRUE,count(*),coalesce(sum('
                'octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))),0) FROM main.assertions')
            self._checkpoint('usage_backfill')
            self._conn.execute('DROP TABLE main.store_meta')
            self._conn.execute('CREATE TABLE main.store_meta(version INTEGER PRIMARY KEY CHECK(version=4))')
            self._conn.execute('INSERT INTO main.store_meta VALUES (4)')

    def _profile(self):
        self._guard()
        # The connection is private and never accepts caller SQL/attachments.
        # Diagnostic only: DuckDB 2.0.0 filters HIDDEN from this SQL view too.
        # Isolation relies on the private fresh connection accepting no caller SQL.
        databases = self._conn.execute('PRAGMA database_list').fetchall()
        if len(databases) != 1:
            raise StoreError('extra database attachments are unsupported')

    @contextmanager
    def _transaction(self):
        self._guard()
        self._pending_views=None
        self._conn.execute('BEGIN TRANSACTION')
        try:
            yield
            self._guard()
        except BaseException:
            self._pending_views=None
            try:
                self._conn.execute('ROLLBACK')
            except BaseException:
                self._broken = True
            raise
        try:
            self._conn.execute('COMMIT')
        except BaseException:
            # COMMIT failure can be ambiguous. No automatic statement replay.
            self._broken = True
            self._pending_views=None
            raise
        if self._pending_views is not None:
            for view,position,supports,rows,route in self._pending_views:
                view._publish(position,supports,rows,route)
            self._pending_views=None
        self._checkpoint('after_commit')

    def _position(self):
        return self._conn.execute('SELECT position FROM main.clock WHERE singleton').fetchone()[0]

    def receipt(self, command_id):
        text(command_id, 128)
        with self._lock:
            self._guard()
            row = self._conn.execute('SELECT receipt FROM main.commands WHERE command_id=?',
                                     [command_id]).fetchone()
            if row is not None and row[0] is None:
                raise StoreError('command was claimed through Triplex; resolve its Triplex receipt')
            return None if row is None else self._decode_receipt(row[0])

    @staticmethod
    def _decode_receipt(raw):
        r = json.loads(raw)
        return Receipt(r['command_id'], r['position'], tuple(r['asserted']), tuple(r['retracted']))

    def transact(self, command_id, assertions=(), retract=()):
        owned, ids, digest = _owned_request(command_id, assertions, retract)
        with self._lock:
            self._profile()
            with self._transaction():
                prior = self._conn.execute(
                    'SELECT request_hash,receipt FROM main.commands WHERE command_id=?', [command_id]).fetchone()
                if prior:
                    if prior[0] != digest:
                        raise StoreError('command id already binds a different request')
                    return self._decode_receipt(prior[1])
                count, byte_count = self._conn.execute(
                    'SELECT retained_count,retained_bytes FROM main.storage_usage WHERE singleton').fetchone()
                added_bytes = sum(len(x.e.encode()) + len(x.a.encode()) + len(_json(x.value.wire).encode()) for x in owned)
                if count + len(owned) > MAX_HISTORY or byte_count + added_bytes > MAX_HISTORY_BYTES:
                    raise StoreError('retained history admission exceeded')
                position = self._position() + 1
                recorded_at=time.time_ns()/1000000
                if position >= MAX_I64:
                    raise StoreError('commit position exhausted')
                receipt = Receipt(command_id, position, tuple(x.id for x in owned), ids)
                encoded = _json({'command_id': command_id, 'position': position,
                                 'asserted': receipt.asserted, 'retracted': ids})
                self._conn.execute('INSERT INTO main.commands VALUES (?,?,?,?,?,?,?)',
                                   [command_id, digest, position, encoded,command_id,recorded_at,'python'])
                self._checkpoint('command_header')
                for ident in ids:
                    changed = self._conn.execute(
                        'UPDATE main.assertions SET tx_to=?,corrected_by=?,retracted_at=?,retract_transaction_id=? '
                        'WHERE assertion_id=? AND tx_to=? RETURNING assertion_id',
                        [position, command_id,recorded_at,command_id,ident,MAX_I64]).fetchall()
                    if changed != [(ident,)]:
                        raise StoreError('retraction must identify one live assertion')
                    self._checkpoint('retraction')
                for offset in range(0,len(owned),256):
                    batch=owned[offset:offset+256]
                    parameters=[]
                    for x in batch:
                        payload = _json(x.value.wire)
                        parameters.extend([x.id, x.e, x.a, x.value.tag, payload, x.valid_from, x.valid_to,
                            position, MAX_I64, command_id, None, sha256(payload.encode('utf-8')).hexdigest(),
                            *sql_slots(x.value,self._guard),recorded_at,None,
                            float(x.valid_from) if 0<=x.valid_from<=shared.MAX_SAFE else None,
                            float(x.valid_to) if 0<=x.valid_to<=shared.MAX_SAFE else None,
                            None,None,command_id,None,None,'python',
                            0<=x.valid_from<=shared.MAX_SAFE and (x.valid_to==MAX_I64 or 0<=x.valid_to<=shared.MAX_SAFE)
                            and (x.value.tag!='i64' or -shared.MAX_SAFE<=int(x.value.wire)<=shared.MAX_SAFE)])
                    self._conn.execute('INSERT INTO main.assertions VALUES '+','.join(
                        '('+','.join('?' for _ in range(28))+')' for _ in batch),parameters)
                    self._checkpoint('assertion')
                self._conn.execute('UPDATE main.clock SET position=? WHERE singleton', [position])
                self._conn.execute('UPDATE main.storage_usage SET retained_count=retained_count+?,retained_bytes=retained_bytes+? '
                                   'WHERE singleton',[len(owned),added_bytes])
                self._checkpoint('clock')
                if self._views:
                    updates=[]
                    history=None
                    for view in self._views:
                        if view._position==position-1:
                            supports,rows=view._delta(owned,ids)
                            route='incremental_supports'
                        else:
                            if history is None:history=self._history()
                            supports,rows=view._fresh(history,position)
                            route='fresh_after_external_commit'
                        updates.append((view,position,supports,rows,route))
                    self._pending_views=updates
                return receipt

    def materialize(self, attribute, *, valid_at=0):
        text(attribute,512)
        exact_int(valid_at, MIN_I64, MAX_I64, 'valid_at')
        with self._lock:
            self._profile()
            if len(self._views)>=8:
                raise StoreError('materialized projection admission exceeded')
            with self._transaction():
                position=self._position()
                view=MaterializedProjection(self,attribute,valid_at)
                supports,rows=view._fresh(self._history(),position)
                view._publish(position,supports,rows,'fresh')
            self._views.append(view)
            return view

    def _history(self):
        count = self._conn.execute('SELECT count(*) FROM main.assertions').fetchone()[0]
        if count > 100000:
            raise StoreError('eager history exceeds 100000 rows; use history_page')
        rows = self._conn.execute('SELECT * FROM main.assertions ORDER BY assertion_id').fetchall()
        if any(sha256(r[4].encode('utf-8')).hexdigest()!=r[11] for r in rows):
            raise StoreError('persisted typed payload hash mismatch')
        if any(decode_slots(r[12:17],self._guard,strings_are_blobs=True)!=compiler.Value(r[3],json.loads(r[4])) for r in rows):
            raise StoreError('persisted SQL carrier disagrees with exact typed payload')
        return tuple(HistoryRow(Assertion(r[0], r[1], r[2], compiler.Value(r[3], json.loads(r[4])), r[5], r[6]),
                                r[7], r[8], r[9], r[10]) for r in rows)

    def history(self):
        """Complete assertion identity, both intervals and correction provenance."""
        with self._lock:
            self._profile()
            with self._transaction():
                return self._history()

    def history_page(self, *, after_id='', limit=1000):
        text(after_id,128)
        exact_int(limit,1,10000,'history page limit')
        with self._lock:
            self._profile()
            with self._transaction():
                rows=self._conn.execute('SELECT * FROM main.assertions WHERE assertion_id>? ORDER BY assertion_id LIMIT ?',
                                        [after_id,limit]).fetchall()
                for row in rows:
                    if sha256(row[4].encode()).hexdigest()!=row[11] or decode_slots(row[12:17],self._guard,strings_are_blobs=True)!=compiler.Value(row[3],json.loads(row[4])):
                        raise StoreError('persisted history payload/carrier validation failed')
                return tuple(HistoryRow(Assertion(r[0],r[1],r[2],compiler.Value(r[3],json.loads(r[4])),r[5],r[6]),
                    r[7],r[8],r[9],r[10]) for r in rows)

    def timeline(self, program, *, valid_from, valid_to, known_at=None, limits=compiler.Limits(), timeout_ms=5000):
        exact_int(valid_from, MIN_I64, MAX_I64, 'valid_from')
        exact_int(valid_to, MIN_I64, MAX_I64, 'valid_to')
        exact_int(timeout_ms, 1, 3600000, 'timeout_ms')
        if valid_from>=valid_to:
            raise StoreError('timeline window must be nonempty')
        with self._lock:
            self._profile()
            with self._transaction():
                invocation=Invocation(self._guard_library,self._conn,timeout_ms,Cancellation())
                try:
                    position=self._position()
                    known=position if known_at is None else exact_int(known_at,0,position,'known_at')
                    history=tuple(x for x in self._history() if x.tx_from<=known<x.tx_to)
                    endpoints=sorted({valid_from,valid_to}|{p for x in history
                        for p in (x.assertion.valid_from,x.assertion.valid_to) if valid_from<p<valid_to})
                    intervals=[]
                    last={}
                    for start,end in zip(endpoints,endpoints[1:]):
                        snapshot=self._query(program,start,known,limits,False,invocation)
                        for row in snapshot.rows:
                            previous=last.get(row)
                            if previous is not None and intervals[previous].valid_to==start:
                                intervals[previous]=IntervalRow(row,intervals[previous].valid_from,end)
                            else:
                                last[row]=len(intervals)
                                intervals.append(IntervalRow(row,start,end))
                    ordered=tuple(sorted(intervals,key=lambda r:(compiler.typed_values.row_key(r.values),r.valid_from)))
                    invocation.guard()
                    return Timeline(position,known,ordered,history)
                finally:
                    invocation.close()

    def query(self, program, *, valid_at=0, known_at=None, limits=compiler.Limits(), force_native=False,
              timeout_ms=5000, cancellation=None):
        exact_int(valid_at, MIN_I64, MAX_I64, 'valid_at')
        exact_int(timeout_ms, 1, 3600000, 'timeout_ms')
        if cancellation is not None and type(cancellation) is not Cancellation:
            raise StoreError('cancellation requires an owned Cancellation token')
        with self._lock:
            self._profile()
            with self._transaction():
                invocation = Invocation(self._guard_library, self._conn, timeout_ms, cancellation or Cancellation())
                try:
                    result=self._query(program, valid_at, known_at, limits, force_native, invocation)
                    invocation.guard()
                    return result
                finally:
                    # Retire and join interrupt delivery before COMMIT/ROLLBACK.
                    # A late timer must not interrupt read-transaction cleanup.
                    invocation.close()

    @property
    def cache_stats(self):
        with self._lock:
            return {'entries':len(self._templates), 'wire_bytes':self._template_bytes,
                    'compilations':self._compilations}

    def _query(self, program, valid_at, known_at, limits, force_native, invocation):
        position=self._position()
        known=position if known_at is None else exact_int(known_at,0,position,'known_at')
        result=persisted.query(self,program,valid_at,known,limits,force_native,invocation)
        return Snapshot(position,known,valid_at,result)

    def _compile_program(self,program,guard):
        guard()
        key = program.encode('utf-8')
        cached = self._templates.get(key)
        if cached is not None:
            self._templates.move_to_end(key)
            return cached[0]
        raw = self._conn.execute('SELECT main.td_plan_ir_v2(?)',[program]).fetchone()[0]
        guard()
        decoded = ir2.decode(raw)
        self._compilations += 1
        weight = len(key) + len(raw.encode('utf-8'))
        # Owned immutable IR only: facts, cuts, proof, parameters,
        # database handles and result state are never cached.
        if weight <= 1024*1024:
            while self._templates and (len(self._templates)>=32 or self._template_bytes+weight>1024*1024):
                _, old = self._templates.popitem(last=False)
                self._template_bytes -= old[1]
            self._templates[key] = (decoded,weight)
            self._template_bytes += weight
        return decoded

    def close(self):
        with self._lock:
            if not self._closed:
                self._conn.close()
                self._closed = True

    def __enter__(self):
        self._guard()
        return self

    def __exit__(self, *_):
        self.close()
