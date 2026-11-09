// [CX-VNSR-5] Why: observe libuv/Node filesystem opens without changing driver bytes or grants. Rejected: a JavaScript fs wrapper that misses the ESM loader.
#include <fcntl.h>
#include <stdarg.h>
#include <stdio.h>
#include <unistd.h>
#include <errno.h>
#include <limits.h>
#include <stdlib.h>
#include <sys/types.h>

static void record(const char *op, const char *requested, int fd, int flags, int saved) {
  char actual[PATH_MAX] = "", line[PATH_MAX * 2 + 200];
  if (fd >= 0) fcntl(fd, F_GETPATH, actual);
  int n = snprintf(line, sizeof(line), "CX_OPEN\t%s\t%d\t%d\t%d\t%s\t%s\n", op, fd, flags, saved, requested, actual);
  if (n > 0 && n < sizeof(line)) write(2, line, n);
  errno = saved;
}
static int observed_open(const char *file, int flags, ...) {
  mode_t mode = 0;
  if (flags & O_CREAT) { va_list args; va_start(args, flags); mode = va_arg(args, int); va_end(args); }
  int fd = open(file, flags, mode), saved = errno;
  record("open", file, fd, flags, saved);
  return fd;
}
static int observed_openat(int dirfd, const char *file, int flags, ...) {
  mode_t mode = 0;
  if (flags & O_CREAT) { va_list args; va_start(args, flags); mode = va_arg(args, int); va_end(args); }
  int fd = openat(dirfd, file, flags, mode), saved = errno;
  record("openat", file, fd, flags, saved);
  return fd;
}
#define INTERPOSE(replacement, original) \
  __attribute__((used)) static struct { const void *new_fn; const void *old_fn; } \
  hook_##original __attribute__((section("__DATA,__interpose"))) = { (const void *)&replacement, (const void *)&original };
INTERPOSE(observed_open, open)
INTERPOSE(observed_openat, openat)
