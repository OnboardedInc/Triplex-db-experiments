#define _GNU_SOURCE
#include <dlfcn.h>
#include <unistd.h>
#include <fcntl.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
// [EXP-G03] Why: hold SQLite's WAL flush before and after the real syscall, before wal-index publication. Rejected: syscall duration alone (does not observe reader visibility).
static void barrier(const char *stage) {
  const char *root = getenv("SYNC_BARRIER");
  char p[512]; snprintf(p, sizeof(p), "%s/%s", root, stage);
  int fd = open(p, O_WRONLY|O_CREAT|O_EXCL, 0600);
  if (fd < 0) _exit(90);
  close(fd);
  snprintf(p, sizeof(p), "%s/%s-release", root, stage);
  struct timespec pause = {0, 1000000};
  int i; for (i=0; i<30000 && access(p, F_OK); i++) nanosleep(&pause, NULL);
  if (i == 30000) _exit(91);
}
int fdatasync(int fd) {
  int (*real)(int) = dlsym(RTLD_NEXT, "fdatasync");
  const char *root = getenv("SYNC_BARRIER");
  char link[64], name[512]; snprintf(link, sizeof(link), "/proc/self/fd/%d", fd);
  ssize_t n = readlink(link, name, sizeof(name)-1);
  if (n >= 0) name[n] = 0;
  int watch = root && n >= 4 && !strcmp(name+n-4, "-wal");
  if (watch) barrier("before-sync");
  int result = real(fd);
  if (watch && result == 0) barrier("after-sync");
  return result;
}
