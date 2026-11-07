"""Owned Mac DuckDB wire-v3 transport. All frames contain project data only."""
import ctypes
from hashlib import sha256
import json
import math
from pathlib import Path
import struct
import sys

import duckdb

MAX_FRAME = 16 * 1024 * 1024
ROOT = Path(__file__).resolve().parent.parent


def decode(cell):
    if type(cell) is not list or not cell:
        raise ValueError('invalid cell')
    if cell == ['null']:
        return None
    if len(cell) != 2:
        raise ValueError('invalid cell arity')
    tag, value = cell
    if tag == 'bool' and type(value) is bool:
        return value
    if tag == 'str' and type(value) is str and len(value) <= 1048576 and '\0' not in value:
        value.encode('utf-8', 'strict')
        return value
    if tag == 'i64' and type(value) is str and len(value) <= 20:
        number = int(value)
        if str(number) == value and -(1 << 63) <= number < (1 << 63):
            return number
    if tag == 'f64' and type(value) is str and len(value) == 16 and all(x in '0123456789abcdef' for x in value):
        number = struct.unpack('>d', bytes.fromhex(value))[0]
        if math.isfinite(number):
            return number
    raise ValueError('unsupported wire value')


def encode(value):
    if value is None:
        return ['null']
    if type(value) is bool:
        return ['bool', value]
    if type(value) is int and -(1 << 63) <= value < (1 << 63):
        return ['i64', str(value)]
    if type(value) is float and math.isfinite(value):
        return ['f64', struct.pack('>d', value).hex()]
    if type(value) is str and len(value) <= 1048576 and '\0' not in value:
        return ['str', value]
    raise ValueError('unsupported complete result cell')


def send(frame):
    data = json.dumps(frame, ensure_ascii=True, separators=(',', ':'), allow_nan=False).encode() + b'\n'
    if len(data) > MAX_FRAME:
        raise ValueError('output frame admission')
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


def main():
    sys.path.insert(0,str(ROOT))
    from temporal_store import Store
    store=Store(sys.argv[1])
    connection=store._conn
    fp=store._fp
    try:
        send({'v':3,'kind':'ready','action':'mac-triplex-v1','runtime':'2.0.0'})
        previous = 0
        while True:
            raw = sys.stdin.buffer.readline(MAX_FRAME + 1)
            if not raw:
                return 3
            if len(raw) > MAX_FRAME or not raw.endswith(b'\n'):
                return 4
            request = json.loads(raw)
            if set(request) != {'v','id','op','name','sql','params'} or request['v'] != 3 or request['id'] != previous + 1 or type(request['params']) is not list or len(request['params']) > 1024:
                return 4
            previous = request['id']
            response = {'v':3,'kind':'response','id':previous}
            op = request['op']
            if fp() != 1:
                return 4
            try:
                if op == 'close':
                    store.close()
                    send({**response,'ok':True,'rows':[],'columns':[]})
                    return 0
                statement = {'begin':'BEGIN TRANSACTION', 'commit':'COMMIT', 'rollback':'ROLLBACK'}.get(op)
                if op == 'run':
                    statement = request['sql']
                    if type(statement) is not str or not 0 < len(statement) <= 65536 or '\0' in statement:
                        return 4
                if statement is None:
                    return 4
                cursor = connection.execute(statement, [decode(x) for x in request['params']])
                columns = [x[0] for x in cursor.description]
                rows = cursor.fetchmany(100001)
                if len(rows) > 100000:
                    raise ValueError('result row admission')
                if fp() != 1:
                    return 4
                send({**response,'ok':True,'rows':[[encode(x) for x in row] for row in rows],'columns':columns})
            except Exception as error:
                # Typed failure projection, never raw path or machine diagnostics.
                send({**response,'ok':False,'error':type(error).__name__})
    finally:
        store.close()


if __name__ == '__main__':
    raise SystemExit(main())
