"""Bounded format decoders and byte partitions for ER01-S round 2."""
import base64
import gzip
import hashlib
import json
import struct
import zlib

MAX_DECODED = 16 * 1024 * 1024


def sqlite_varint(raw, start):
    value = 0
    for i in range(9):
        if start + i >= len(raw):
            raise ValueError('truncated SQLite varint')
        byte = raw[start + i]
        if i == 8:
            return (value << 8) | byte, start + i + 1
        value = (value << 7) | (byte & 127)
        if byte < 128:
            return value, start + i + 1
    raise ValueError('invalid SQLite varint')


def sqlite_record(payload, encoding):
    end, offset = sqlite_varint(payload, 0)
    if not offset <= end <= len(payload):
        raise ValueError('invalid SQLite record header')
    serials = []
    while offset < end:
        serial, offset = sqlite_varint(payload, offset)
        serials.append(serial)
    if offset != end:
        raise ValueError('SQLite serial header boundary')
    values = []
    for serial in serials:
        if serial in (10, 11):
            raise ValueError('reserved SQLite serial type')
        length = (serial - 12) // 2 if serial >= 12 else (0, 1, 2, 3, 4, 6, 8, 8, 0, 0)[serial]
        data = payload[offset:offset + length]
        if len(data) != length:
            raise ValueError('truncated SQLite record field')
        offset += length
        if serial >= 12:
            value = data.decode(encoding) if serial & 1 else data
        elif serial == 0:
            value = None
        elif serial in (8, 9):
            value = serial - 8
        elif serial == 7:
            value = struct.unpack('>d', data)[0]
        else:
            value = int.from_bytes(data, 'big', signed=True)
        values.append(value)
    if offset != len(payload):
        raise ValueError('unparsed SQLite record suffix')
    return values


def byte_partition(raw, parsed, reasons=()):
    spans = sorted((max(0, a), min(len(raw), b)) for a, b in parsed if b > a)
    merged = []
    for a, b in spans:
        if merged and a <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    missing, end = [], 0
    for a, b in merged + [[len(raw), len(raw)]]:
        if end < a:
            missing.append({'start': end, 'end': a, 'reason': '; '.join(sorted(set(reasons))) or 'unknown residual layout'})
        end = b
    return {'size': len(raw), 'rawSearchedRanges': [[0, len(raw)]] if raw else [],
            'parsedRanges': merged, 'unparsedRanges': missing,
            'parsedBytes': sum(b - a for a, b in merged), 'unparsedBytes': sum(v['end'] - v['start'] for v in missing)}


def zero_ranges(raw, start, end):
    # [EXP-ER01-S-R2] Why: only zero fill is structurally harmless without a record decoder.
    # Rejected: treating nonzero free space as parsed merely because raw search ran there.
    spans, first = [], None
    for i in range(start, end):
        if raw[i] == 0 and first is None:
            first = i
        if raw[i] != 0 and first is not None:
            spans.append((first, i)); first = None
    if first is not None:
        spans.append((first, end))
    return spans


def sqlite_database(raw):
    if len(raw) < 100 or raw[:16] != b'SQLite format 3\x00':
        raise ValueError('SQLite database header unavailable')
    size = int.from_bytes(raw[16:18], 'big')
    size = 65536 if size == 1 else size
    if size < 512 or size > 65536 or size & (size - 1) or len(raw) % size:
        raise ValueError('invalid SQLite page size/alignment')
    usable = size - raw[20]
    encoding = {1: 'utf8', 2: 'utf-16le', 3: 'utf-16be'}.get(int.from_bytes(raw[56:60], 'big'))
    if not encoding or usable < 480:
        raise ValueError('unsupported SQLite encoding/reserved area')
    pages = len(raw) // size
    marked = [(0, 100)]
    errors, blobs, rows = [], [], []
    overflow_pages, free_pages = set(), set()

    def page(number):
        if number < 1 or number > pages:
            raise ValueError('SQLite page reference outside captured file')
        return raw[(number - 1) * size:number * size]

    def mark(number, a, b):
        marked.append(((number - 1) * size + a, (number - 1) * size + b))

    def payload_bytes(number, position, length, table_leaf):
        if length > MAX_DECODED:
            raise ValueError('SQLite payload exceeds decode budget')
        minimum = ((usable - 12) * 32 // 255) - 23
        maximum = usable - 35 if table_leaf else ((usable - 12) * 64 // 255) - 23
        local = length
        if length > maximum:
            local = minimum + (length - minimum) % (usable - 4)
            if local > maximum:
                local = minimum
        p = page(number)
        if position + local + (4 if local < length else 0) > usable:
            raise ValueError('SQLite cell overlaps page boundary')
        result = bytearray(p[position:position + local])
        mark(number, position, position + local)
        if local < length:
            next_page = int.from_bytes(p[position + local:position + local + 4], 'big')
            mark(number, position + local, position + local + 4)
            visited = set()
            while len(result) < length:
                if next_page in visited:
                    raise ValueError('cyclic SQLite overflow chain')
                visited.add(next_page); overflow_pages.add(next_page)
                body = page(next_page)
                count = min(length - len(result), usable - 4)
                result.extend(body[4:4 + count])
                mark(next_page, 0, 4 + count)
                next_page = int.from_bytes(body[:4], 'big')
            if next_page:
                raise ValueError('SQLite overflow chain exceeds payload size')
        return bytes(result)

    trunk = int.from_bytes(raw[32:36], 'big')
    while trunk:
        if trunk in free_pages:
            raise ValueError('cyclic SQLite freelist')
        body = page(trunk); free_pages.add(trunk)
        count = int.from_bytes(body[4:8], 'big')
        if count > (usable - 8) // 4:
            raise ValueError('invalid SQLite freelist trunk count')
        mark(trunk, 0, 8 + 4 * count)
        for i in range(count):
            number = int.from_bytes(body[8 + 4 * i:12 + 4 * i], 'big')
            page(number)
            if number in free_pages:
                raise ValueError('duplicate SQLite freelist page')
            free_pages.add(number)
        trunk = int.from_bytes(body[:4], 'big')

    for number in range(1, pages + 1):
        if number in overflow_pages or number in free_pages:
            continue
        body = page(number)
        origin = 100 if number == 1 else 0
        kind = body[origin]
        if kind not in (2, 5, 10, 13):
            continue
        try:
            header = 12 if kind in (2, 5) else 8
            cells = int.from_bytes(body[origin + 3:origin + 5], 'big')
            if origin + header + cells * 2 > usable:
                raise ValueError('SQLite cell-pointer array out of bounds')
            mark(number, origin, origin + header + cells * 2)
            free = int.from_bytes(body[origin + 1:origin + 3], 'big')
            seen_free = set()
            while free:
                if free in seen_free or free + 4 > usable:
                    raise ValueError('invalid SQLite freeblock chain')
                seen_free.add(free)
                length = int.from_bytes(body[free + 2:free + 4], 'big')
                if length < 4 or free + length > usable:
                    raise ValueError('invalid SQLite freeblock size')
                mark(number, free, free + 4)
                free = int.from_bytes(body[free:free + 2], 'big')
            for i in range(cells):
                position = int.from_bytes(body[origin + header + 2 * i:origin + header + 2 * i + 2], 'big')
                start = position
                if position < origin + header + 2 * cells or position >= usable:
                    raise ValueError('invalid SQLite cell pointer')
                if kind in (2, 5):
                    child = int.from_bytes(body[position:position + 4], 'big'); page(child)
                    position += 4
                if kind == 5:
                    _, position = sqlite_varint(body, position)
                    mark(number, start, position)
                    continue
                length, position = sqlite_varint(body, position)
                if kind == 13:
                    _, position = sqlite_varint(body, position)
                mark(number, start, position)
                value = payload_bytes(number, position, length, kind == 13)
                values = sqlite_record(value, encoding)
                blobs.append(value); rows.append(values)
                for field in values:
                    if isinstance(field, str):
                        blobs.append(field.encode())
                    elif isinstance(field, bytes):
                        blobs.append(field)
                    elif type(field) is int:
                        blobs.append(str(field).encode())
        except (ValueError, IndexError, UnicodeError) as error:
            errors.append(str(error))
    # Zero fill is searched too; nonzero residual/free bytes remain explicitly unparsed.
    marked.extend(zero_ranges(raw, 0, len(raw)))
    report = byte_partition(raw, [] if errors else marked, errors + ['SQLite residual/free bytes need historical record reconstruction'])
    report.update(format='sqlite/3', encoding=encoding, pageSize=size, overflowPages=sorted(overflow_pages), freelistPages=sorted(free_pages))
    return blobs, rows, report


def sqlite_wal(raw, main):
    if len(raw) < 32 or raw[:4] not in (b'7\x7f\x06\x82', b'7\x7f\x06\x83'):
        raise ValueError('invalid SQLite WAL header')
    if int.from_bytes(raw[4:8], 'big') != 3007000:
        raise ValueError('unsupported SQLite WAL version')
    size = int.from_bytes(raw[8:12], 'big')
    if not main.startswith(b'SQLite format 3\x00') or size != (65536 if main[16:18] == b'\x00\x01' else int.from_bytes(main[16:18], 'big')):
        raise ValueError('WAL lacks matching main-file page-size/encoding context')
    if len(raw[32:]) % (size + 24):
        raise ValueError('partial/trailing SQLite WAL frame')
    order = 'little' if raw[3] == 0x82 else 'big'
    def checksum(data, pair):
        if len(data) % 8:
            raise ValueError('WAL checksum alignment')
        a, b = pair
        for at in range(0, len(data), 8):
            a = (a + int.from_bytes(data[at:at + 4], order) + b) & 0xffffffff
            b = (b + int.from_bytes(data[at + 4:at + 8], order) + a) & 0xffffffff
        return a, b
    pair = checksum(raw[:24], (0, 0))
    if pair != struct.unpack('>II', raw[24:32]):
        raise ValueError('WAL header checksum mismatch')
    views, records, marked, reasons = [], [], [(0, 32)], []
    image = bytearray(main)
    frames = []
    previous_pages, historical_pointers = {}, []
    for at in range(32, len(raw), size + 24):
        header, body = raw[at:at + 24], raw[at + 24:at + 24 + size]
        number, commit = struct.unpack('>II', header[:8])
        if number < 1 or number > MAX_DECODED // size or header[8:16] != raw[16:24]:
            raise ValueError('invalid/stale WAL frame page or salt')
        pair = checksum(header[:8] + body, pair)
        if pair != struct.unpack('>II', header[16:24]):
            raise ValueError('WAL frame checksum mismatch')
        if len(image) < number * size:
            image.extend(bytes(number * size - len(image)))
        image[(number - 1) * size:number * size] = body
        frames.append((at, number))
        marked.append((at, at + 24))
        if commit:
            if commit > MAX_DECODED // size:
                raise ValueError('WAL commit size exceeds decode budget')
            snapshot = bytes(image[:commit * size])
            found_blobs, found_rows, coverage = sqlite_database(snapshot)
            views.extend(found_blobs); records.extend(found_rows)
            for offset, page_number in frames:
                low, high = (page_number - 1) * size, page_number * size
                current = snapshot[low:high]
                prior = previous_pages.get(page_number)
                origin = 100 if page_number == 1 else 0
                # [EXP-ER01-S-R2] Why: DELETE can leave a prior pointer in the now-unused array.
                # Rejected: exempting arbitrary nonzero free bytes without a decoded historical witness.
                if prior is not None and len(current) == size and current[origin] == prior[origin] and current[origin] in (2, 5, 10, 13):
                    header_size = 12 if current[origin] in (2, 5) else 8
                    old_count = int.from_bytes(prior[origin + 3:origin + 5], 'big')
                    new_count = int.from_bytes(current[origin + 3:origin + 5], 'big')
                    a, b = origin + header_size + new_count * 2, origin + header_size + old_count * 2
                    content_start = int.from_bytes(current[origin + 5:origin + 7], 'big') or 65536
                    if old_count > new_count and b <= content_start and current[a:b] == prior[a:b]:
                        marked.append((offset + 24 + a, offset + 24 + b))
                        historical_pointers.append([offset + 24 + a, offset + 24 + b])
                for a, b in coverage['parsedRanges']:
                    left, right = max(a, low), min(b, high)
                    if left < right:
                        marked.append((offset + 24 + left - low, offset + 24 + right - low))
            for number in range(1, len(snapshot) // size + 1):
                low, high = (number - 1) * size, number * size
                if any(a <= low and high <= b for a, b in coverage['parsedRanges']):
                    previous_pages[number] = snapshot[low:high]
                else:
                    previous_pages.pop(number, None)
            frames = []
    if frames:
        reasons.append('uncommitted WAL page images lack complete snapshot')
    report = byte_partition(raw, marked, reasons + ['WAL page residuals were not decoded'])
    report.update(format='sqlite-wal/3', pageSize=size, historicalCellPointerRanges=historical_pointers)
    return views, records, report


def pglz_decode(raw, expected):
    out = bytearray(); offset = 0
    while offset < len(raw) and len(out) < expected:
        control = raw[offset]; offset += 1
        for bit in range(8):
            if len(out) == expected:
                break
            if offset >= len(raw):
                raise ValueError('truncated pglz item')
            if control & (1 << bit):
                if offset + 2 > len(raw):
                    raise ValueError('truncated pglz match')
                a, b = raw[offset:offset + 2]; offset += 2
                length = (a & 15) + 3
                distance = ((a & 240) << 4) | b
                if length == 18:
                    if offset == len(raw): raise ValueError('truncated pglz length')
                    length += raw[offset]; offset += 1
                if not distance or distance > len(out):
                    raise ValueError('invalid pglz back reference')
                for _ in range(length): out.append(out[-distance])
            else:
                out.append(raw[offset]); offset += 1
            if len(out) > expected: raise ValueError('pglz output exceeds expected length')
    if len(out) != expected or offset != len(raw): raise ValueError('incomplete pglz stream')
    return bytes(out)


def lz4_decode(raw, expected):
    out = bytearray(); position = 0
    def extended(n):
        nonlocal position
        if n == 15:
            while True:
                if position == len(raw): raise ValueError('truncated LZ4 length')
                value = raw[position]; position += 1; n += value
                if value != 255: break
        return n
    while position < len(raw):
        token = raw[position]; position += 1
        literals = extended(token >> 4)
        if position + literals > len(raw): raise ValueError('truncated LZ4 literals')
        out.extend(raw[position:position + literals]); position += literals
        if position == len(raw): break
        if position + 2 > len(raw): raise ValueError('truncated LZ4 offset')
        distance = int.from_bytes(raw[position:position + 2], 'little'); position += 2
        length = extended(token & 15) + 4
        if not distance or distance > len(out): raise ValueError('invalid LZ4 distance')
        if len(out) + length > expected: raise ValueError('LZ4 output exceeds expected length')
        for _ in range(length): out.append(out[-distance])
    if len(out) != expected: raise ValueError('LZ4 raw size mismatch')
    return bytes(out)


def postgres_toast(raw, declarations):
    # [EXP-ER01-S-R2] Why: TOAST chunks must be reassembled by value id/sequence before search.
    # Rejected: qualifying native storage with renamed byte files or searching each chunk alone.
    if len(raw) % 8192 or not raw:
        raise ValueError('TOAST requires complete 8192-byte little-endian PG16 heap pages')
    groups, marked = {}, []
    for origin in range(0, len(raw), 8192):
        page = raw[origin:origin + 8192]
        lower, upper, special, version = struct.unpack_from('<HHHH', page, 12)
        if version != 8196 or special != 8192 or not 24 <= lower <= upper <= special or (lower - 24) % 4:
            raise ValueError('invalid TOAST heap page header')
        marked.append((origin, origin + lower))
        for at in range(24, lower, 4):
            item = int.from_bytes(page[at:at + 4], 'little')
            start, flags, length = item & 32767, (item >> 15) & 3, item >> 17
            if flags == 0: continue
            if flags != 1 or start < upper or start + length > special or length < 35:
                raise ValueError('unsupported TOAST line-pointer/tuple layout')
            tup = page[start:start + length]
            if int.from_bytes(tup[18:20], 'little') & 2047 != 3 or int.from_bytes(tup[20:22], 'little') & 1 or tup[22] != 24:
                raise ValueError('TOAST tuple must have three non-null columns and 24-byte header')
            oid, sequence = struct.unpack_from('<Ii', tup, 24)
            value = tup[32:]
            if value[0] & 1:
                total, head = value[0] >> 1, 1
            else:
                if int.from_bytes(value[:4], 'little') & 3: raise ValueError('unsupported nested TOAST chunk varlena flags')
                total, head = int.from_bytes(value[:4], 'little') >> 2, 4
            if total != len(value) or total < head or sequence < 0:
                raise ValueError('invalid TOAST varlena size/sequence')
            group = groups.setdefault(oid, {})
            if sequence in group: raise ValueError('duplicate TOAST chunk sequence')
            group[sequence] = value[head:]
            marked.append((origin + start, origin + start + length))
    blobs, issues = [], []
    for parts in groups.values():
        if set(parts) == set(range(len(parts))): blobs.append(b''.join(parts[i] for i in range(len(parts))))
        else: issues.append('missing TOAST chunk')
    if set(groups) != {item['id'] for item in declarations}:
        issues.append('TOAST value inventory incomplete')
    for item in declarations:
        if item['id'] not in groups: continue
        parts = groups[item['id']]
        if set(parts) != set(range(len(parts))): raise ValueError('missing TOAST chunk')
        if any(len(parts[i]) != 1996 for i in range(len(parts) - 1)) or (parts and len(parts[len(parts)-1]) > 1996):
            raise ValueError('non-native TOAST chunk sizing')
        packed = b''.join(parts[i] for i in range(len(parts)))
        if len(packed) != item['externalSize'] or not 0 <= item['rawSize'] <= MAX_DECODED:
            raise ValueError('TOAST external/raw size mismatch')
        method = item['compression']
        if method == 'none': value = packed
        elif method in ('pglz', 'lz4'):
            if len(packed) >= item['rawSize']: raise ValueError('TOAST compressed external datum must be smaller than raw payload')
            if len(packed) < 4: raise ValueError('missing TOAST compression header')
            info = int.from_bytes(packed[:4], 'little')
            if info & 0x3fffffff != item['rawSize'] or info >> 30 != (0 if method == 'pglz' else 1):
                raise ValueError('TOAST compression metadata mismatch')
            value = (pglz_decode if method == 'pglz' else lz4_decode)(packed[4:], item['rawSize'])
        else: raise ValueError('unsupported TOAST compression')
        if len(value) != item['rawSize']: raise ValueError('TOAST reassembly raw size mismatch')
        blobs.append(value)
    marked.extend(zero_ranges(raw, 0, len(raw)))
    report = byte_partition(raw, [] if issues else marked, issues + ['TOAST free/dead tuple residue'])
    report.update(format='postgres-toast/16-le8192')
    return blobs, [], report


def supplemental_views(raw):
    """Only adds searchable bytes/records; never qualifies opaque input as parsed."""
    blobs, values, issues = [], [], []
    decoder = json.JSONDecoder()
    texts = [raw.decode('utf8', errors='ignore')]
    for codec in ('utf-16le', 'utf-16be'):
        for shift in (0, 1):
            texts.append(raw[shift:].decode(codec, errors='ignore'))
    budget = 0
    for text in texts:
        for at, char in enumerate(text):
            if char not in '{[': continue
            budget += 1
            if budget > 20000:
                issues.append('supplemental JSON candidate budget exceeded'); break
            try:
                value, _ = decoder.raw_decode(text[at:])
            except (ValueError, RecursionError): continue
            values.append(value)
            if isinstance(value, list) and len(value) == 60 and all(type(v) is int and 0 <= v <= 255 for v in value):
                blobs.append(bytes(value))
            if isinstance(value, list) and value and all(isinstance(v, str) for v in value):
                try:
                    combined = b''.join(base64.b64decode(v + '=' * (-len(v) % 4), altchars=b'-_', validate=True) for v in value)
                    if len(combined) <= MAX_DECODED: blobs.append(combined)
                except ValueError: pass
    offset = 0
    while True:
        at = raw.find(b'\x1f\x8b\x08', offset)
        if at < 0: break
        offset = at + 3
        try:
            engine = zlib.decompressobj(31)
            data = engine.decompress(raw[at:], MAX_DECODED + 1)
            if len(data) > MAX_DECODED or not engine.eof:
                issues.append('gzip decode incomplete/budget exceeded')
            else:
                blobs.append(data)
        except zlib.error:
            issues.append('invalid embedded gzip stream')
    return blobs, values, issues


def fixture_records(raw):
    magic = b'ER01REC2\x00'
    if not raw.startswith(magic) or len(raw) < len(magic) + 4:
        raise ValueError('missing explicit fixture record header')
    count = int.from_bytes(raw[len(magic):len(magic) + 4], 'little')
    position, blobs = len(magic) + 4, []
    for _ in range(count):
        if position + 5 > len(raw): raise ValueError('truncated fixture record prefix')
        kind = raw[position]
        length = int.from_bytes(raw[position + 1:position + 5], 'little'); position += 5
        value = raw[position:position + length]
        if len(value) != length or kind not in (0, 1): raise ValueError('invalid fixture record')
        if kind == 0: value.decode('utf8')
        elif length != 60: raise ValueError('fixture key box must be 60 bytes')
        blobs.append(value); position += length
    return blobs, [], byte_partition(raw, [(0, position)], ['trailing bytes outside fixture record grammar'])


def analyze_files(files, spec):
    output = {}
    for file_id, item in spec['inventory'].items():
        raw = files[file_id]
        blobs, rows, errors = [raw], [], []
        extra, objects, issues = supplemental_views(raw)
        blobs.extend(extra); rows.extend(objects); errors.extend(issues)
        report = byte_partition(raw, [], ['unsupported codec/layout: ' + item['codec']])
        try:
            codec = item['codec']
            if codec == 'qlever-fsst-squared-le64/0.6':
                group = {entry['part']: files[key] for key, entry in spec['inventory'].items() if entry['location'] == item['location']}
                if spec.get('blindVocabulary'): raise ValueError('FSST decoder intentionally disabled')
                decoded = qlever_vocabulary(group)
                records, report = [], byte_partition(raw, [(0, len(raw))])
            elif raw.startswith(b'SQLite format 3\x00'):
                decoded, records, report = sqlite_database(raw)
            elif raw[:4] in (b'7\x7f\x06\x82', b'7\x7f\x06\x83'):
                companion = next((key for key, entry in spec['inventory'].items() if entry['path'] == item['path'].removesuffix('-wal')), None)
                if companion is None: raise ValueError('WAL main-file companion absent')
                decoded, records, report = sqlite_wal(raw, files[companion])
            elif codec == 'erasure-fixture-records/2':
                decoded, records, report = fixture_records(raw)
            elif codec == 'postgres-toast/16-le8192':
                decoded, records, report = postgres_toast(raw, item.get('toastValues', item.get('toastValuesByPhase', {}).get(spec.get('_phase'), [])))
            elif codec in ('keyset-json/1', 'kms-json/1'):
                obj = json.loads(raw.decode('utf8'))
                if obj['format'] != codec or not isinstance(obj['rows'], list): raise ValueError('invalid key JSON schema')
                decoded, records, report = [], obj['rows'], byte_partition(raw, [(0, len(raw))])
                for row in records:
                    if not isinstance(row, dict): raise ValueError('invalid key JSON row')
                    for value in row.values():
                        if isinstance(value, str): decoded.append(value.encode())
            elif codec == 'root-hex/1':
                if len(bytes.fromhex(raw.decode().strip())) != 32: raise ValueError('root key size')
                decoded, records, report = [], [], byte_partition(raw, [(0, len(raw))])
            elif not raw and item.get('codec') in ('bytes', 'sqlite-keyset/1'):
                decoded, records, report = [], [], byte_partition(raw, [])
            else:
                raise ValueError('unsupported codec/layout: ' + codec)
            blobs.extend(decoded); rows.extend(records)
            for value in decoded:
                additions, objects, failed = supplemental_views(value)
                blobs.extend(additions); rows.extend(objects); errors.extend(failed)
        except (ValueError, KeyError, TypeError, IndexError, UnicodeError, struct.error) as error:
            errors.append(str(error))
            report = byte_partition(raw, [], errors)
        if errors:
            report = byte_partition(raw, [], errors)
        report.update(fileId=file_id, path=item['path'], sourceKind=item['sourceKind'], sha256=hashlib.sha256(raw).hexdigest())
        output[file_id] = {'coverage': report, 'blobs': blobs, 'rows': rows}
    return output
