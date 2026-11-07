# Instrumented C API v2 binding: runtime setup and evidence

30 October 2026. In addition to the passing standalone core ASan/UBSan campaign, the actual v2 binding and core were built into a separate instrumented extension with GCC14.2, `-O1 -g -fno-omit-frame-pointer -fsanitize=address,undefined`. The production artifact and source files were not modified.

The first Python-host attempt preloaded only libasan. Twenty successful answer cases ran, then the first expected float-overflow exception hit AddressSanitizer's own `real___cxa_throw` interceptor initialization assertion. This is not presented as a completed sanitizer pass or as evidence of a heap/vector fault. The full initial log is retained at `native-capi-sanitized.log`.

Fresh primary-source research found official Python-extension guidance to preload the matching C++ standard library after libasan: a C interpreter does not initially link libstdc++, so the sanitizer can miss its exception target before a later C++ module loads. [NVIDIA Holoscan developer sanitizer guidance](https://github.com/nvidia-holoscan/holoscan-sdk/blob/main/DEVELOP.md), [upstream PyTorch sanitizer issue](https://github.com/pytorch/pytorch/issues/5283).

The narrowly corrected rerun uses the same instrumented artifact and test suite, with `LD_PRELOAD="$(g++ -print-file-name=libasan.so):$(g++ -print-file-name=libstdc++.so)"`. ASan remains first; no sanitizer errors are suppressed, no link-order checks are disabled, and no host ASLR/seccomp/security setting is changed. `ASAN_OPTIONS=detect_leaks=0:halt_on_error=1` and `UBSAN_OPTIONS=halt_on_error=1:print_stacktrace=1` remain explicit. LeakSanitizer is not claimed.

The separate corrected log is `native-capi-sanitized-fixed-runtime.log`; `engine/tests/typed-sanitized-verification.json` records the actual run only if it reaches terminal completion. A pending or failed run must not be inferred PASS from this setup note. DuckDB/Python themselves are prebuilt and not fully sanitizer-instrumented, so a passing extension campaign is not complete engine/process certification.

Terminal result: **PASS, all 57 genuine native tests, zero failures/errors/skips**, including the large-input case, in 24.816 seconds. The instrumented artifact SHA-256 is `999beebe98971d85eb4dea68c3167d9df8c7a6a4ac1476563f23beded18bb288`. Initial setup failure and corrected successful run are separate retained evidence; neither source code nor the production artifact changed to obtain this result.
