"""Clone a closed benchmark fixture using Darwin's mandatory CoW operation."""

import ctypes
import errno
import json
import os
import stat
import sys


def clone_fixture(source, destination):
    if sys.platform != "darwin":
        raise OSError(errno.ENOTSUP, "This benchmark requires Darwin clonefile")
    if not stat.S_ISREG(os.lstat(source).st_mode):
        raise OSError(errno.EINVAL, "The source must be a regular file")
    if os.path.lexists(destination):
        raise OSError(errno.EEXIST, "The clone destination must be fresh")
    # clonefile itself requires a nonexistent destination, including on races.
    library = ctypes.CDLL(None, use_errno=True)
    clonefile = library.clonefile
    clonefile.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int]
    clonefile.restype = ctypes.c_int
    if clonefile(os.fsencode(source), os.fsencode(destination), 0) != 0:
        code = ctypes.get_errno()
        raise OSError(code, os.strerror(code))
    return {"mode": "darwin_clonefile", "status": "cloned"}


if __name__ == "__main__":
    try:
        result = clone_fixture(sys.argv[1], sys.argv[2])
    except OSError as error:
        print(json.dumps({"status": "failed", "errno": error.errno,
                          "code": errno.errorcode.get(error.errno, "UNKNOWN"),
                          "message": str(error)}))
        sys.exit(1)
    print(json.dumps(result))
