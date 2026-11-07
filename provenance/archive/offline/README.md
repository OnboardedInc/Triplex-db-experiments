# Verified public artifacts

This directory contains public downloads and source snapshots for the paused
temporal-store work. No package was installed, no lifecycle script was run, and
no database or downloaded runtime was started while preparing it.

- `npm/manifest.json` indexes 871 exact package identities from both preserved
  lockfiles plus `pnpm@10.11.0`. Every raw tarball was checked against its pinned
  lock integrity and official registry integrity, with SHA-256 and byte size
  recorded. All declared platform variants are retained. Existing notices are
  copied under `npm/licenses/`; full tarballs preserve every packaged member.
- `public-source-manifest.json` indexes fourteen public repositories at exact
  commits. `public-source-manifests/` records each copied file's SHA-256, upstream
  Git blob and mode. The trees retain every tracked regular file, including large
  SQL test fixtures and legitimate binary assets. Git metadata, symlinks and
  unacquired submodules are excluded explicitly in each manifest. Upstream
  notices remain in their original source paths.
  Eleven XTDB documentation images are materialized Git LFS objects:
  `public-source-lfs.json` and the retained canonical pointer files bind their
  content hashes and sizes to the committed Git blobs.
- `sources/duckdb-manifest.json` pins the original public DuckDB source archive
  at commit `d54cbbe3df17e8e5ce68312f483b4155836112aa`. Its SHA-256 is
  `93e3d1f9c84b6ec3493237d21565c01c2c19b9862e54e5552d3d7999ccc3bbb4`.
  `sources/duckdb-license-manifest.json` records extracted notices; the complete
  archive retains its original licenses and headers.
- `node/manifest.json` records the official Node `v24.13.0` headers and Linux x64,
  Linux arm64 and Darwin arm64 runtime archives. Each archive matches the official
  HTTPS `SHASUMS256.txt`; release signatures were not separately verified.
  `node/license-manifest.json` records extracted notices.

`verification-final.json` is the independent byte/SRI/Git-blob verification
receipt, and `lock-verification.json` independently reconciles every package
with both source locks. The initial `verification.json` is retained: its first
schema assumed a `package/` archive prefix and direct Git blobs for LFS images.
The final verifier recognizes the actual single-root package layouts and checks
canonical committed LFS pointers; no downloaded artifact was rewritten.

The raw npm tarballs are an artifact repository, not a populated pnpm store.
Store hydration and an actual disconnected installation remain unrun. Browser downloads and operating-system compiler tools are outside this artifact set. Public Docker images (including the bundled XTDB JVM) are indexed separately under `container-images/`. No claim of a fully offline system build follows
from these downloads. The existing DuckDB companion build script targets macOS
ARM64; Linux compilation and qualification remain open.

Manifests use portable relative paths and public provenance URLs. They omit
registry maintainers, publication users, original workstation paths and private
cache contents. Public attribution and licenses are preserved verbatim.

`tools/vendor_public.py` is the preparation utility. Its modes only read locks,
copy pinned public source and download/verify public artifacts. It does not
install or execute packages. It enforces eight registry workers at most and a
12 GiB free-space reserve plus a 256 MiB guard. Failed partials, if any, are
retained and cannot count as verified artifacts.
