"""One-shot cancellation and invocation-local native/SQL termination ownership."""
from __future__ import annotations

import ctypes
import threading
import time


class QueryCanceled(RuntimeError):
    pass


class QueryDeadline(RuntimeError):
    pass


class Cancellation:
    def __init__(self):
        self._lock = threading.Lock()
        self._canceled = False
        self._listeners = set()

    def cancel(self):
        with self._lock:
            self._canceled = True
            for callback in tuple(self._listeners):
                callback()

    @property
    def canceled(self):
        with self._lock:
            return self._canceled


class Invocation:
    def __init__(self, native, connection, timeout_ms, cancellation):
        self._native = native
        self._connection = connection
        self._lock = threading.Lock()
        self._active = True
        self.cancellation = cancellation
        self.deadline = time.monotonic() + timeout_ms / 1000
        create = native.td_control_create
        create.argtypes = [ctypes.c_uint64]
        create.restype = ctypes.c_int64
        native.td_control_cancel.argtypes = [ctypes.c_int64]
        native.td_control_cancel.restype = ctypes.c_int
        native.td_control_release.argtypes = [ctypes.c_int64]
        native.td_control_release.restype = None
        self.token = create(timeout_ms)
        if not self.token:
            raise RuntimeError('native control admission exceeded')
        self._timer = threading.Timer(timeout_ms / 1000, self._expire)
        self._timer.daemon = True
        with cancellation._lock:
            cancellation._listeners.add(self._stop)
            if cancellation._canceled:
                self._stop()
        self._timer.start()

    def _stop(self):
        with self._lock:
            if self._active:
                self._native.td_control_cancel(self.token)
                self._connection.interrupt()

    def _expire(self):
        with self._lock:
            if self._active:
                # Native loops own the same monotonic deadline. SQL delivery
                # uses DuckDB's supported interrupt, without reclassifying a
                # deadline as an explicit user cancellation.
                self._connection.interrupt()

    def guard(self):
        if self.cancellation.canceled:
            raise QueryCanceled('query canceled; no partial result returned')
        if time.monotonic() >= self.deadline:
            raise QueryDeadline('query deadline exceeded; no partial result returned')

    def close(self):
        with self.cancellation._lock:
            self.cancellation._listeners.discard(self._stop)
        with self._lock:
            self._active = False
            self._timer.cancel()
            self._native.td_control_release(self.token)
        self._timer.join()
