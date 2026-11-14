# Part 4 checks and evidence

The private evidence root is `$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1`. EVIDENCE-4.sha256 binds the recorded run heads, original compressed raw manifests, reports and gate logs relative to that root. Verify with `shasum -a 256 -c` from that root; each trace/SHA256SUMS then verifies its compressed raw inputs. Run indices locate the private self-contained viewer. No raw traces are committed.

- Normal Datomic package: 215 tests passed, 51 explicit external-service skips, typecheck passed; current-package-check.log. Build/declarations passed at affinity-binding-check.log (subsequent product code unchanged).
- Registered JavaScript: 458 roots, no type/binding diagnostics, 124 inherited inventory coverage gaps; final-registered-check.log. The root check is not claimed passing.
- Native settings, raw-histogram and finite-clock regressions: 15 focused tests; native-band-check.log. Affinity freshness and browser-free trace fixtures are in the 215-test normal suite.
- Fresh 1,000-subject isolation smoke n: existing oracle PASS, 53 reads / 3,305 entity queries, zero mismatches, actual live placement checked through restarted oracle worker.
- Isolated core zero and L256 A/B/A: six DONE runs, existing oracle PASS, runtime configuration and exact frozen writers validated by native ablation. Diagnostic bars remain distinct from a full verdict.
- Packed viewer: actual smoke-m timeline rendered in isolated local Chrome with five initial cards, no script errors/network; real-viewer-browser.json/png/log. Gzip/HTML round-trip hashes and corruption regressions pass in the package suite.
- Original reports from failed/refused/orphaned attempts remain; no recovered orphan or incomplete TLS comparison is relabeled PASS.
- No dependency/image/download was added. No sealed seed, contract, bar, frozen phase or oracle predicate was changed. There was no power-cut test, root pnpm check, public tarball release or push.
