"""Read-only QLever v0.6, little-endian 64-bit, FSST-squared vocabulary decoder."""
import struct


# [EXP-ER01-S] Why: QLever serializes two raw fsst_decoder_t structs per block.
# Rejected: grep or a single FSST pass (the archived known literal stays hidden).
def u64(data, offset=0):
    if offset < 0 or offset + 8 > len(data):
        raise ValueError('truncated uint64')
    return struct.unpack_from('<Q', data, offset)[0]


def fsst_decode(data, decoder):
    if len(decoder) != 2304 or decoder[8] != 0 or u64(decoder) != 0:
        raise ValueError('unsupported FSST decoder ABI/version/zero termination')
    result = bytearray()
    i = 0
    while i < len(data):
        code = data[i]
        i += 1
        if code == 255:
            if i == len(data):
                raise ValueError('truncated FSST escape')
            result.append(data[i])
            i += 1
        else:
            length = decoder[9 + code]
            if not 1 <= length <= 8:
                raise ValueError('invalid FSST symbol length')
            start = 264 + code * 8
            result.extend(decoder[start:start + length])
    return bytes(result)


def mmap_values(data):
    if len(data) < 32:
        raise ValueError('truncated mmap trailer')
    count, capacity, byte_size, magic, version = struct.unpack('<QQQII', data[-32:])
    if magic != 7601577 or version != 0 or count > capacity or byte_size != capacity * 8:
        raise ValueError('unsupported mmap metadata')
    if len(data) != byte_size + 32:
        raise ValueError('mmap size mismatch')
    return [u64(data, i * 8) for i in range(count)]


def qlever_vocabulary(files):
    """Return both copies, retaining word boundaries and global decoder indices."""
    required = {'codebooks', 'internal', 'ids', 'external', 'offsets'}
    if set(files) != required:
        raise ValueError('vocabulary requires codebooks, both word files, ids and offsets')
    books = files['codebooks']
    count = u64(books)
    if len(books) != 8 + count * 4608:
        raise ValueError('unsupported FSST-squared codebook size')
    external = files['external']
    offsets = mmap_values(files['offsets'])
    if not offsets or offsets[0] != 0 or offsets[-1] != len(external):
        raise ValueError('external vocabulary coverage incomplete')
    if any(a > b for a, b in zip(offsets, offsets[1:])):
        raise ValueError('non-monotonic vocabulary offsets')
    internal = files['internal']
    size = u64(internal)
    n = u64(internal, 8 + size)
    if len(internal) != 16 + size + n * 8:
        raise ValueError('internal vocabulary size mismatch')
    starts = [u64(internal, 16 + size + i * 8) for i in range(n)]
    if not starts or starts[0] != 0 or any(a > b for a, b in zip(starts, starts[1:])):
        raise ValueError('invalid internal offsets')
    id_data = files['ids']
    id_count = u64(id_data)
    if len(id_data) != 8 + 8 * id_count:
        raise ValueError('invalid ids vector size')
    ids = [u64(id_data, 8 + i * 8) for i in range(id_count)]
    if starts[-1] != size or len(ids) != n - 1 or ids != sorted(set(ids)) or any(i >= len(offsets) - 1 for i in ids):
        raise ValueError('invalid internal vocabulary ids')

    def decode_word(word, index):
        block = index // (1 << 20)
        if block >= count:
            raise ValueError('missing FSST block decoder')
        start = 8 + block * 4608
        return fsst_decode(fsst_decode(word, books[start + 2304:start + 4608]),
                           books[start:start + 2304])

    words = [decode_word(external[a:b], i) for i, (a, b) in enumerate(zip(offsets, offsets[1:]))]
    copies = []
    for i, (a, b) in enumerate(zip(starts, starts[1:])):
        word = decode_word(internal[8 + a:8 + b], ids[i])
        if word != words[ids[i]]:
            raise ValueError('internal/external vocabulary disagree')
        copies.append(word)
    return words + copies
