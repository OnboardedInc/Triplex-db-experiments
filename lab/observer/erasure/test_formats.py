"""Native-format and coverage regressions, independent of nominal fixture PASS tests."""
import base64
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sqlite3
import struct
import tempfile
import unittest

from compile import compile_normalizer
from fixtures import make_fixture, make_frames, packed, toast_fixture, vocabulary
from fsst import qlever_vocabulary
from formats import (byte_partition, fixture_records, lz4_decode, pglz_decode,
                     postgres_toast, sqlite_database, sqlite_record, sqlite_wal)


class Formats(unittest.TestCase):
    def test_partition_is_complete_and_disjoint(self):
        result = byte_partition(b'123456789', [(1,3),(2,5),(8,9)], ['unknown'])
        self.assertEqual(result['parsedRanges'], [[1,5],[8,9]])
        self.assertEqual([(v['start'],v['end']) for v in result['unparsedRanges']],[(0,1),(5,8)])
        self.assertEqual(result['parsedBytes']+result['unparsedBytes'],9)

    def test_sqlite_overflow_text_and_blob_every_database_encoding(self):
        for encoding in ('UTF-8','UTF-16le','UTF-16be'):
            with self.subTest(encoding=encoding), tempfile.TemporaryDirectory() as tmp:
                p=Path(tmp)/'test.db';db=sqlite3.connect(p)
                try:
                    db.execute('PRAGMA page_size=512');db.execute("PRAGMA encoding='"+encoding+"'")
                    db.execute('CREATE TABLE controls (padding BLOB,value TEXT,tail BLOB)')
                    target='native-\u2603-secret-'+('x'*1500)
                    db.execute('INSERT INTO controls VALUES (?,?,?)',(bytes(29),target,bytes(700)));db.commit()
                    self.assertEqual(db.execute('SELECT value FROM controls').fetchone()[0],target)
                    raw=p.read_bytes();blobs,rows,coverage=sqlite_database(raw)
                    self.assertIn(target.encode(),blobs);self.assertTrue(coverage['overflowPages'])
                    self.assertEqual(coverage['unparsedBytes'],0,coverage)
                finally: db.close()

    def test_sqlite_freelist_residuals_refuse_absence(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'test.db';db=sqlite3.connect(p)
            try:
                db.execute('PRAGMA page_size=512');db.execute('PRAGMA secure_delete=OFF')
                db.execute('CREATE TABLE control(value BLOB)')
                db.execute('INSERT INTO control VALUES (?)',(b'retained-secret'*300,));db.commit()
                db.execute('DELETE FROM control');db.commit()
                _,_,coverage=sqlite_database(p.read_bytes())
                self.assertTrue(coverage['freelistPages']);self.assertGreater(coverage['unparsedBytes'],0)
            finally: db.close()

    def test_wal_committed_utf16_and_checksum_or_truncation(self):
        for encoding in ('UTF-8','UTF-16le','UTF-16be'):
            with self.subTest(encoding=encoding), tempfile.TemporaryDirectory() as tmp:
                p=Path(tmp)/'test.db';db=sqlite3.connect(p)
                try:
                    db.execute("PRAGMA encoding='"+encoding+"'");db.execute('PRAGMA journal_mode=WAL')
                    db.execute('PRAGMA wal_autocheckpoint=0');db.execute('PRAGMA secure_delete=ON');db.execute('CREATE TABLE er01_keys(key_id,tenant,epoch,wrapped)')
                    db.execute('INSERT INTO er01_keys VALUES(?,?,?,?)',('b'*32,'fixture-tenant',2,base64.b64encode(bytes([1])*60).decode()))
                    db.commit();db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
                    row=('a'*32,'fixture-tenant',2,base64.b64encode(bytes(range(60))).decode())
                    db.execute('INSERT INTO er01_keys VALUES(?,?,?,?)',row);db.commit()
                    db.execute('DELETE FROM er01_keys WHERE key_id=?',(row[0],));db.commit()
                    main,wal=p.read_bytes(),Path(str(p)+'-wal').read_bytes()
                    _,rows,coverage=sqlite_wal(wal,main)
                    self.assertIn(list(row),rows)
                    self.assertEqual(coverage['unparsedBytes'],0,coverage)
                    self.assertTrue(coverage['historicalCellPointerRanges'])
                    from formats import supplemental_views
                    for encode in (base64.b64encode, lambda value:value.hex().encode()):
                        views, recovered, errors=supplemental_views(encode(wal),wal_main=main)
                        self.assertFalse(errors,errors)
                        self.assertIn(list(row),recovered)
                        _, _, errors=supplemental_views(encode(wal))
                        self.assertTrue(any('main-file context' in error for error in errors))
                    for bad in (wal[:-1],wal[:40]+bytes([wal[40]^1])+wal[41:]):
                        with self.assertRaises(ValueError): sqlite_wal(bad,main)
                finally: db.close()

    def test_native_toast_plain_pglz_lz4_and_missing_chunks(self):
        value=b'toast-fragment-secret-'*10
        prefix=b'toast-fragment-secret-'
        tokens=[(False,bytes([byte])) for byte in prefix]
        length=len(value)-len(prefix)
        tokens.append((True,bytes([15,len(prefix),length-18])))
        chunks=[]
        for index in range(0,len(tokens),8):
            group=tokens[index:index+8]
            chunks.append(bytes([sum((1<<bit) for bit,item in enumerate(group) if item[0])])+b''.join(item[1] for item in group))
        pglz=b''.join(chunks)
        match_length=len(value)-len(prefix)-5
        lz4=b'\xff'+bytes([len(prefix)-15])+prefix+len(prefix).to_bytes(2,'little')+bytes([match_length-19])+b'\x50'+value[-5:]
        for method,stream in (('none',value),('pglz',struct.pack('<I',len(value))+pglz),('lz4',struct.pack('<I',len(value)|(1<<30))+lz4)):
            with self.subTest(method=method):
                raw,decl=toast_fixture([stream]);decl[0].update(rawSize=len(value),compression=method)
                blobs,_,coverage=postgres_toast(raw,decl)
                self.assertIn(value,blobs);self.assertEqual(coverage['unparsedBytes'],0)
                broken=bytearray(raw);struct.pack_into('<I',broken,24,0)
                try:
                    _,_,bad_coverage=postgres_toast(bytes(broken),decl)
                    self.assertGreater(bad_coverage['unparsedBytes'],0)
                except ValueError: pass
        self.assertEqual(pglz_decode(b'\x02a\x02\x01',6),b'aaaaaa')
        self.assertEqual(lz4_decode(b'\x11a\x01\x00',6),b'aaaaaa')

    def test_toast_stock_chunk_boundary_reassembles_hidden_needle(self):
        needle=b'cross-chunk-secret-00000000000000'
        value=b'x'*1980+needle+b'y'*1000
        raw,decl=toast_fixture([value])
        self.assertNotIn(needle,raw)
        blobs,_,coverage=postgres_toast(raw,decl)
        self.assertIn(value,blobs);self.assertEqual(coverage['unparsedBytes'],0)
        self.assertTrue(any(needle in blob for blob in blobs))

    def test_json_scalar_surrogate_pair_and_escape_closure(self):
        from formats import supplemental_views
        marker = 'secret-😀'.encode()
        for raw in (b'{"value":"secret-\\ud83d\\ude00"}',
                    b'"secret-\\ud83d\\ude00"',
                    b'%73%65%63%72%65%74%2D%F0%9F%98%80',
                    b'secret-\\U0001f600', b'=73=65=63=72=65=74=2D=F0=9F=98=80'):
            views, _, errors = supplemental_views(raw)
            self.assertFalse(errors, errors)
            self.assertTrue(any(marker in view for view in views), raw)
        for codec in ('utf-16le','utf-16be','utf-32le','utf-32be'):
            views, _, errors = supplemental_views('"secret-\\ud83d\\ude00"'.encode(codec))
            self.assertFalse(errors,errors)
            self.assertIn(marker,views)
        views, _, errors = supplemental_views(b'prefix ' + base64.b64encode(b'"secret-\\ud83d\\ude00"') + b' suffix')
        self.assertFalse(errors, errors)
        self.assertTrue(any(marker in view for view in views))
        _, _, errors = supplemental_views(b'"\\ud800"')
        self.assertTrue(errors)
        value=b'secret'
        for _ in range(34): value=value.replace(b'%',b'%25') if b'%' in value else b'%73ecret'
        _, _, errors=supplemental_views(value)
        self.assertTrue(any('budget' in error for error in errors))

    def test_every_ordered_pair_of_scalar_and_native_layers(self):
        from formats import supplemental_views
        from fixtures import fixture_record_file
        marker = b'!pair-secret!'
        def leb(raw):
            return b''.join(bytes([byte]) if byte < 128 else bytes([(byte & 127) | 128, byte >> 7]) for byte in raw)
        layers = {
            'json': lambda raw: json.dumps(raw.decode(), ensure_ascii=True).encode(),
            'backslash': lambda raw: b''.join(('\\x%02x'%b).encode() for b in raw),
            'url': lambda raw: b''.join(('%%%02X'%b).encode() for b in raw),
            'quoted-printable': lambda raw: b''.join(('=%02X'%b).encode() for b in raw),
            'base64': base64.b64encode,
            'base64url': lambda raw: base64.urlsafe_b64encode(raw).rstrip(b'='),
            'hex': lambda raw: raw.hex().encode(),
            'length-le': lambda raw: len(raw).to_bytes(4,'little') + raw,
            'length-be': lambda raw: len(raw).to_bytes(4,'big') + raw,
            'varints': leb,
            'native-record': lambda raw: fixture_record_file([raw]),
            'utf16le':lambda raw:raw.decode().encode('utf-16le'),
            'utf16be':lambda raw:raw.decode().encode('utf-16be'),
            'utf32le':lambda raw:raw.decode().encode('utf-32le'),
            'utf32be':lambda raw:raw.decode().encode('utf-32be'),
        }
        for outer, encode_outer in layers.items():
            for inner, encode_inner in layers.items():
                with self.subTest(outer=outer, inner=inner):
                    try: encoded=encode_outer(encode_inner(marker))
                    except UnicodeError: continue
                    views, _, errors=supplemental_views(encoded)
                    self.assertFalse(errors,errors)
                    self.assertTrue(any(marker in view for view in [encoded]+views),(outer,inner))

    def test_closure_bound_refuses_only_when_new_view_would_be_lost(self):
        from formats import supplemental_views
        value=b'!secret!'
        for _ in range(3): value=base64.b64encode(value)
        views, _, errors=supplemental_views(value,depth_limit=2)
        self.assertTrue(any('budget' in error for error in errors))
        self.assertNotIn(b'!secret!',views)
        views, _, errors=supplemental_views(value,depth_limit=32)
        self.assertFalse(errors,errors)
        self.assertIn(b'!secret!',views)

    def test_utf8_and_folded_base64_layer_pairs(self):
        from formats import supplemental_views
        marker='pair-secret-😀-end'.encode()
        layers={
            'json':lambda raw:json.dumps(raw.decode(),ensure_ascii=True).encode(),
            'byte-escape':lambda raw:b''.join(('\\x%02x'%b).encode() for b in raw),
            'url':lambda raw:b''.join(('%%%02X'%b).encode() for b in raw),
            'qp':lambda raw:b''.join(('=%02X'%b).encode() for b in raw),
            'base64':base64.b64encode,
            'base64url':lambda raw:base64.urlsafe_b64encode(raw).rstrip(b'='),
            'hex':lambda raw:raw.hex().encode(),
            'folded-base64':lambda raw:b'\r\n'.join(base64.b64encode(raw)[i:i+16] for i in range(0,len(base64.b64encode(raw)),16)),
        }
        for outer, encode in layers.items():
            for inner, nested in layers.items():
                with self.subTest(outer=outer,inner=inner):
                    views, _, issues=supplemental_views(encode(nested(marker)))
                    self.assertTrue(all(issue=='invalid backslash/Unicode escaping view' for issue in issues),issues)
                    self.assertTrue(any(marker in view for view in views),(outer,inner))

    def test_fixture_record_tail_is_unparsed(self):
        from fixtures import fixture_record_file
        _,_,report=fixture_records(fixture_record_file([b'control'])+b'compressed-or-other-record')
        self.assertGreater(report['unparsedBytes'],0)


if __name__=='__main__':unittest.main(verbosity=2)
