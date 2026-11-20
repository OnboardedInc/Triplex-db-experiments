# DX-V01 evidence

The [checksum index](SHA256SUMS) is relative to the lab vault's `evidence/DX-V01/` directory. Native timings are diagnostic. The vault keeps the raw campaign evidence, including the first failures.

| Evidence in the vault | What it records |
| --- | --- |
| `packages-51.log`, `package-build-51.json` | Latest clean source and eight package tasks with 711 hashed files. |
| `packages-31.log`, `package-build-31.json` | Fresh checkout and eight clean package tasks with 711 hashed files at the split-read fix. |
| `image-build-14.json`, `image-build-14.log` | Exact engine build receipt for the image reused after comparison of its pinned inputs. |
| `read-regressions-31.log` | Split fallback regression and four reader error tests. |
| `fixture-02.log`, `fixture-03.log`, `native-10/` | Original syntax, Mac output mount and start barrier failures. |
| `fixture-12.log`, `native-12/` | First verified zero-reader arm and the loaded arm's first typed read error. |
| `fixture-13.log`, `native-13/`, `diagnostic-card-13-44wRLK/SCORECARD-v0.1.md` | Loaded fixture without local samples and its partial diagnostic report. |
| `fixture-17.log`, `native-17/`, `diagnostic-card-17-nhwkIt/SCORECARD-v0.1.md` | Stable catalog witness, 50 exact local samples, 91 independent samples and two split read errors. The card prints all 13 rows and the verified zero-reader receipt count. |
| `packages-38.log`, `package-build-38.json`, `image-build-39.json` | Clean joined INT1 package and image build. |
| `fixture-39.log`, `native-39/scorecard/SCORECARD-v0.1.md`, `native-39/campaign/` | Verified frozen pair, field offer expirations, and the native partial diagnostic scorecard. |
| `field-regression-45.log`, `fixture-45.log`, `native-45/` | Matched short field geometry check and a repeated local-sample shortfall. |
| `reader-retry-51.log` | Bounded exact-cut retry and protection refusal checks. |
| `fixture-51.log`, `native-51/scorecard/SCORECARD-v0.1.md`, `native-51/campaign/` | Final 13-row diagnostic card, two verified frozen arms, one missing field publication, and cleanup. |
