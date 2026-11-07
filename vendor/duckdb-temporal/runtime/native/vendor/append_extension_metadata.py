#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Write public DuckDB C_STRUCT / C_STRUCT_UNSTABLE extension metadata.

The binary protocol is documented by DuckDB's MIT-licensed extension loader:
https://github.com/duckdb/duckdb/blob/v2.0.0/src/main/extension/extension_load.cpp
No code from extension-ci-tools is vendored or required.
"""
import argparse
from pathlib import Path

parser=argparse.ArgumentParser(description=__doc__)
for flags in [('-l','--library-file'),('-n','--extension-name'),('-o','--out-file'),
              ('-p','--duckdb-platform'),('-dv','--duckdb-version'),('-ev','--extension-version')]:
    parser.add_argument(*flags,required=True)
parser.add_argument('--abi-type',default='C_STRUCT',choices=['C_STRUCT','C_STRUCT_UNSTABLE'])
args=parser.parse_args()
if args.abi_type == 'C_STRUCT_UNSTABLE' and args.duckdb_version != 'v2.0.0':
    parser.error('unstable C API v2 research build is pinned to exact host v2.0.0')
# Footer slots are serialized in reverse logical order and are fixed-width ASCII.
slots=['','','',args.abi_type,args.extension_version,args.duckdb_version,args.duckdb_platform,'4']
encoded=[]
for value in slots:
    item=value.encode('ascii')
    if len(item)>32:
        parser.error('metadata fields must fit in32 ASCII bytes')
    encoded.append(item.ljust(32,b'\0'))
# The protocol uses a WASM custom section header before its512-byte native footer.
# It is harmless for ELF files and preserves byte-exact round reproduction.
section=bytes((0,147,4,16))+b'duckdb_signature'+bytes((128,4))
footer=b''.join(encoded)+bytes(256)
source=Path(args.library_file)
destination=Path(args.out_file)
if source.resolve()==destination.resolve():
    parser.error('output must differ from the input shared library')
destination.write_bytes(source.read_bytes()+section+footer)
print(f'Created {destination} ({args.abi_type} {args.duckdb_version}; {args.duckdb_platform})')
