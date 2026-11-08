# Acceptance contract 0.3.11 — CX-A01-0311

North star: correctness floor for P1 pinned reads and P3 resumable continuation, and the same five priorities and ten goals on lane D. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure: `lab/PROTOCOL.md`.

## Source and result

Tested implementation head: `5ba1e7585b8e5bd6134ac9f4a301565889caf3d0` on `contract/0.3.11`. Oracle merge and pin move landed atomically in `c836549548c440a796d5748f88884dc655be4a01`, with parents `fcbad6ed4a96c31210dcd0d6f86b8fbed6b6cef4` and `f195f30af618d3f9b0525a864e913824a315cc8c`. The following cleanup commit removes a transient mutation runner accidentally staged while the harness was active; it changes no contract bytes. This report and final receipts are committed afterward.

Result: contract generated and byte-identical verification passes. This is builder validation, not independent contract acceptance or engine qualification. All production claims still require the executing evaluator gates, manifests, build spec, frozen trace, A0 and independent verification.

## Obligation counts

| Version / surface | Total | Closable at contract level | Blocked |
| --- | ---: | ---: | ---: |
| 0.3.10 distinct | 157 | 65 | 92 |
| 0.3.10 xtdb-xtql | 154 | 64 | 90 |
| 0.3.10 xtdb-sql | 154 | 64 | 90 |
| 0.3.10 qlever-sparql | 155 | 64 | 91 |
| 0.3.11 distinct | 157 | 40 | 117 |
| 0.3.11 xtdb-xtql | 154 | 39 | 115 |
| 0.3.11 xtdb-sql | 154 | 39 | 115 |
| 0.3.11 qlever-sparql | 155 | 39 | 116 |
| 0.3.11 datomic-datalog | 153 | 0 | 153 |

The distinct obligation denominator remains 157. Closable decreases by 25 (65 to 40), and blocked increases by 25 (92 to 117), because Q75c closes the COMPILED-without-runner-hashes exemption. These are pin-level counts, not achieved closure; the three policy-pending obligations remain policy-pending. Surface rows additionally include the image blocker. Datomic Datalog query and pull share one surface (`datomic-datalog`), as R29 specifies; all 153 obligations on it carry `image-unpinned:datomic`. Four existing backend-specific obligations do not apply to Datomic: the XTDB wire encoding, QLever wire shadow, QLever broker fencing, and QLever maintenance-boundary implementation. Correlated raw absence applies to Datomic; QLever keeps its existing per-cell raw exception.

O-REPLAY scope: 124 uses / 119 may close on the O-REPLAY side / 5 blocked. The Q52-shapes refusal is removed because 0.4.9 models those shapes. Scale evolution, TDK1 keys and envelope facts remain refused; ambiguous issuers are now an explicit dynamic refusal site, with no blanket block of otherwise supported pagination. Every actual exit-2 or X-NOT-MODELED result still fails closed.

## Compiled and pending rulings

Compiled 50 rows: Q70a-o; Q74a-g; Q75a-j; Q76a-f; Q77a-c; Q78a-d; Q79a-d; Q81a. `RULINGS.md` holds their full text; generated `continuationRules`, `seedRules`, `qualificationRun.integrity`, `recursionRules`, `datomicRules` and `exactQueryRules` give their consumers. Each compiled row has an individual mutation regression checked against its authoritative ruling. Continuation, recursion and query rules also add selected named contract cases; their case manifests remain unpinned rather than pretending that an executing gate exists.

Implemented reference semantics: complete runner-file SHA-256 maps are mandatory in both `contract_blockers` and `admit_claim`; O-REPLAY row comparators operate inside every query result and in-flight acceptable result while command outcomes and state remain exact; CMP-ERROR cause is optional and structured when present; promotion admission remains DIAGNOSTIC. The evaluator integrity requirements are compiled contract requirements, not a claim that the separate evaluator implementation has landed.

Pending with authority `none`:

| Rows | Reason |
| --- | --- |
| Q51b | Existing experiment direction with no contract effect |
| Q72a-e, Q72g | Broker round under review; Q72f was already compiled in 0.3.10 |
| Q73a-b | W0-1.1.3 has not landed; W0 remains 1.1.2 |
| Q78e | Tenant isolation and final dev-storage acceptability require Sam’s calls |
| Q80a-c | O-OBS round 2 is not accepted/pinned |

## Pins and hashes

The complete pin inventory, including all 29 O-REPLAY files, 7 O-DOMAIN files, W0 files, TDK1 files, generated output pins, source inputs, case sources, golden files, verifier brief hashes, and required null pins, is retained in [`evidence-0.3.11/pin-inventory.json`](evidence-0.3.11/pin-inventory.json). The current file hashes also appear below, with the complete oracle and world maps in the appendix.

Transitive contract hash: `52a5ce525172ea1a786fe3da3490d94dbff408fd81dfe929b7e239d49d7d0c0b`.

| Artifact | SHA-256 |
| --- | --- |
| `build_contract.py` | `512ef4c1da9e185771bcb94d6fc4680c349a52da37168048fe706a28b5a5cf7e` |
| `RULINGS.md` | `b34fd401df7692023efa6a4ceeba5d7212aceaf32b7c77143c933557b6b75891` |
| `RULINGS-PENDING.md` | `9ef264b3f3ac449c97e107546e15e919df94cdfe81559594210c83e766182664` |
| `obligations.json` | `9d1c015d9fc49698cf54dd5748ebd839c0388cac0627ac5c0ea12566c4554ec4` |
| `ACCEPTANCE.md` | `ebbda64aaacfb7963f60b1841c2b43f02bdb4021cb400064f7a319723b56b32d` |
| `load-contract.json` | `00169eedc83df0d7541f12c188aaec72f94c11f8ba70992e0411a4999d2adced` |
| `budgets.json` | `91a85c688b876f767c25afa73d4a3080eb2831bc21ed1daaf48e7b5a701bda00` |
| `capability-matrix.md` | `488db5df92e1974cd4fafc6f16cc349101504d4352777e568f298df78891d0cd` |
| `oracle-contract.json` | `9e4b3541c1078a510f258edc4a9eb3331a97ebb9a65bf1c0b4ce75bcec99007c` |

O-REPLAY 0.4.9: commit `f195f30af618d3f9b0525a864e913824a315cc8c`, verifier entry `V-O04i`, verifier branch `verify/O02`, verifier commit `5f348ca` (full commit in the registry). Original hash table retained at `lab/acceptance/pins/O-REPLAY-0.4.9-SHA256SUMS`; all 29 hashes match the merged tree. The independent acceptance record is `lab/verify/O02/VERIFY.md`, section V-O04i; its full review is copied from the verifier commit to `lab/verify/O02/V-O04i/VERIFY.md`.

O-CONTRACT now runs from the generator plus `oracle-contract.json`, a generated projection of only its composition inputs. Both have explicit SHA-256 values in `oracleRunners.O-CONTRACT.sha256`. This avoids a circular hash of obligations.json inside itself. A caller must materialize the new projection alongside the generator. Other COMPILED oracles without complete runner pins, including O-ERR, stay blocked.

| Engine | Image digest |
| --- | --- |
| datomic | `None` |
| xtdb | `sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77` |
| qlever | `sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec` |

## Validation and limitations

Final source-bound mutation suite: **338/338 runnable mutations caught, zero misses**, including **50/50 newly compiled ruling mutations**. Catalog: 419 retained mutations, 81 retired because their source anchors are gone; one additional legacy status-only mutant is explicitly superseded by Q75c's stronger runner-hash refusal. No retired or superseded mutation is counted as a passing executable test. Generator SHA-256 `512ef4c1da9e185771bcb94d6fc4680c349a52da37168048fe706a28b5a5cf7e` in the final log matches the tested source at `5ba1e7585b8e5bd6134ac9f4a301565889caf3d0`.

Q47d external probe: **PASS**. A synthetic pending row neither invalidates generation/--verify nor gains authority; reinstating the old pending-row prohibition and reading pending rows as compiled are both detected; restoring the pending file reproduces all six generated outputs byte-for-byte. Final generator `--verify`: **PASS**, byte-identical. `git diff --check`: **PASS**.

Commands:

```sh
python3 -I -B lab/acceptance/build_contract.py
python3 -I -B lab/acceptance/build_contract.py --verify
node lab/bin/heavy.mjs --label CX-A01-0311-final-5ba1e75 -- python3 -u -I -B lab/experiments/EXP-A01-acceptance-contract/regressions/negtest0311.py
python3 -I -B lab/experiments/EXP-A01-acceptance-contract/regressions/q47d_test0311.py
git diff --check
```

Evidence: [`negtest-final.txt`](evidence-0.3.11/negtest-final.txt), [`q47d-final.txt`](evidence-0.3.11/q47d-final.txt), [`verify.txt`](evidence-0.3.11/verify.txt), [`validation-summary.json`](evidence-0.3.11/validation-summary.json), [`artifact-hashes.json`](evidence-0.3.11/artifact-hashes.json). Interrupted attempts 1 and 2 are retained. Attempt 3 caught 337/338 with the missing-runner exception documented above; the focused check confirmed the guard fixes it, and the final complete run catches all 338. No prior failure was overwritten.

No engines, containers, installs, benchmarks, publishing, pushes, or main-branch merges were performed. No package code changed; root pnpm checks and package tarball checks were not run. O-REPLAY’s independent V-O04i acceptance is reused as instructed; the oracle’s full 385-test suite was not independently re-certified by this builder. A separate reviewer must adjudicate contract acceptance.

## Inconsistencies found and resolved

1. COMPILED oracle labels previously bypassed runner-file pins; Q75c now blocks them unless every runner file has a SHA-256 map.
2. Hashing the whole obligations.json as an O-CONTRACT input creates a self-reference; the generated composition projection resolves it without weakening the complete-file pin requirement.
3. Datomic was in SCOPE/PROTOCOL but absent from contract surfaces and matrix columns. It is now registered, including native query/pull, language counting, the load contract, A0 placeholder, integer range and image blockers.
4. The old Q52 blanket refusal was stale after the oracle merge. It is removed; the dynamic ambiguous-continuation refusal remains explicit.
5. V-O04i had no committed BRIEF.md. Its actual saved dispatch prompt is copied byte-for-byte from the agent launch record as `lab/verify/O02/V-O04i/BRIEF.md`, hashed in the registry and inputs. No new instructions or retroactive proof were invented. The independent review itself is copied unchanged from verifier commit 5f348ca.
6. The generic obsolete-language scan rejected reference labels such as “R26 open question 2”. Compiled basis labels use “R26 design item 2”; the ruling’s substance is unchanged, and pending rows retain their original text.
7. Heavy-slot holders changed between queue observations. Interrupted attempts are retained; retries use the same heavy.mjs semaphore with host process visibility and unbuffered output. No occupied token or unrelated process was removed. This observation does not establish a semaphore defect.
8. Older mutation checks needed two robustness guards: direct missing-runner checking before oracle invocation, and structured rejection rather than a Python exception when a compiled runner is missing. The status-only Q59e mutant is explicitly superseded because Q75c independently blocks the same unpinned fixture.
9. A transient mutation file was briefly tracked while staging the acceptance directory; the following cleanup commit removes it. Final source and generated output hashes exclude it.

## Full oracle and world file-pin appendix

### O-REPLAY

| Path | SHA-256 |
| --- | --- |
| `lab/oracles/replay/RULES.md` | `5e9de540e26e0c370c10a904a625a96ba67f279172aa5000aea043b73cfa4241` |
| `lab/oracles/replay/SCHEMA.md` | `baf2c949c6c59538914340dd0b2da5d3556b150f6908be68b2a6741138f459d3` |
| `lab/oracles/replay/__init__.py` | `1c8a05550047bf892f96ca71eb3b203efc7359dfc3acc1d4fd9b0420386c76e0` |
| `lab/oracles/replay/__main__.py` | `486ab6ff5cfd46ec8b633b00885efb814f6b9f61b7b2d9193ff5f6ee5868d04d` |
| `lab/oracles/replay/cli.py` | `1492793e203e2b09d4be28f32c3800e1efadbb9098be8c6699d88a3d6b6d63f5` |
| `lab/oracles/replay/constraints.py` | `9e1e9d7b1ca8046ca67520bbc4905b03ad3bd663c260a4ed0d2b6ca024a91a1d` |
| `lab/oracles/replay/entities.py` | `e92308b6df7a0996a26fe129b9df07e058d8b0c84cff54f2690cd7c76fc871b3` |
| `lab/oracles/replay/errors.py` | `c2260e1e06af38b2ce97246d5f9ff5626484dd0dfaf4afe409ddfcd6eee634df` |
| `lab/oracles/replay/exact.py` | `4cfcf2c9af4b4ddf36f2218308685aff99d91416ac7f0d1dec053fb7a6e74d2a` |
| `lab/oracles/replay/examples/entity-mini.case.json` | `7549f07299668500a311e9a5fc3eb80904731d0b5a7d626090a7657f53a8d667` |
| `lab/oracles/replay/examples/entity-mini.expected.json` | `d4e7aff8188ffaa902f1014d9527e63c92d6e0dd6925fef446cceb820c6d8b0f` |
| `lab/oracles/replay/replay.py` | `3dd06dd0c30930e00ce1665ae7e9f40afcf7e06fa8a37759a8c5e65345fe9016` |
| `lab/oracles/replay/run.py` | `c967ad2d6d811f006da6f5766a0ca7aa7ef0c4c220ad239f7a55b7b994a4f856` |
| `lab/oracles/replay/scale.py` | `5917ade3c099a5062c76e9814b5019439bbbcad843f0e2790213fea8c9c98abe` |
| `lab/oracles/replay/selfcheck.py` | `5a298c577b50204dddf5dce6577207d0dd1e90b339b3ee3d9c3bbf2b431ed8fd` |
| `lab/oracles/replay/selfcheck_fixtures/freeze-ham-reference.mjs` | `c533122597c940d69c8a101a1a175ba5e9d6ab62f1efdb2d5526c9f65a86a206` |
| `lab/oracles/replay/selfcheck_fixtures/ham-v2-reference.json` | `d69c14f1abb236c3e1532ff95f1aba81b088fc5937ba82f9647e2e6a4e0407f2` |
| `lab/oracles/replay/tests/__init__.py` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `lab/oracles/replay/tests/helpers.py` | `005be879fb88580f578f8befc73d22218006cd38504a88226fedb91b3ede3703` |
| `lab/oracles/replay/tests/test_contract_section4.py` | `99273adb536a3835b62f49c7be7fddf690e871e5f7dccce5b73d9e1f3a44982e` |
| `lab/oracles/replay/tests/test_entities.py` | `562feac4b58c11e8fabb8e30fff85c41cd9562cbd05a94df3d8c3d8f19caffe6` |
| `lab/oracles/replay/tests/test_exact.py` | `35aaf8384af0178e1fc929b94fe0e11a43aa64dbbe567bf50067658821b619b1` |
| `lab/oracles/replay/tests/test_replay.py` | `6900d4fc9710e3248c476c036aba84565c53b4265b231867778d776668feb7b9` |
| `lab/oracles/replay/tests/test_rulings.py` | `3997f66b01be8f697977911ec1fdf5209223d5310206657f7ed65c7ea106aea4` |
| `lab/oracles/replay/tests/test_scale_and_selfcheck.py` | `3b78a5adc8e665730c2b53799de7fbfbc04b99cae343404f630fc856f4b255f4` |
| `lab/oracles/replay/tests/test_values.py` | `1070395875907bca8a46ab9b88fee0758a1b73aafe94b5b610b2117e2740d375` |
| `lab/oracles/replay/tests/test_views.py` | `d79f5bab47c842aa443ffe814df88ff65bf153777c95ff39a32e5501e16c1584` |
| `lab/oracles/replay/values.py` | `67a42954b3988ff248b8ff34b2b166ed04a793665cb688b7ea768b9f37049982` |
| `lab/oracles/replay/views.py` | `bbfb8989e054ba7ed4998f466478bdef92ede643e9554c313672f7db2a865901` |

### O-DOMAIN

| Path | SHA-256 |
| --- | --- |
| `lab/oracles/domain/README.md` | `6e1e970ea9eb80ac25742a5f0f6651fc84e4c0d34cec9ce6f0ec274420f04587` |
| `lab/oracles/domain/cli.py` | `fb14ef13bffe12c963a01b76b37f52fbde921476d4482f9616022a3cdbdbb6d8` |
| `lab/oracles/domain/jsontok.py` | `c428c5b889bea9f6397eaf1515fc94af2eace3c3ff9a6268dd7f7a069ed903c0` |
| `lab/oracles/domain/population.py` | `7c33da567e3530b40210c7fcae3ad850026cf1dd037b5edc0808f78be1d7eb3d` |
| `lab/oracles/domain/receipts/population-100k.json` | `9a48033f8482f55be7af6aa00affab33f69b0015ac70f9de61fae5748d147557` |
| `lab/oracles/domain/test_domain.py` | `9103d227207999538ddba6e19bb8c6e64397ddfcf6a585bf42890538416b5f08` |
| `lab/oracles/domain/w0.py` | `841f7d9d2e175e09474fdf23969bfddda77851995335828ed1c97b34d9167f00` |

### O-TDK1

| Path | SHA-256 |
| --- | --- |
| `lab/oracles/decimal/tdk1_reference.py` | `73467589480deb93fb700cdaf856cccb8f67b9a24d1963e26744a0ac4754bf33` |
| `lab/oracles/decimal/gen_vectors.py` | `b30b430acbfc7476cf47e676d38abaa247d3545b20aac5d481bea67a11cf11e1` |

### W0

| Path | SHA-256 |
| --- | --- |
| `lab/world/W0/README.md` | `d5d6d17759f2866f867432f63470243108b5ad8851dd6d18425dcef623f1aa9e` |
| `lab/world/W0/SPEC.md` | `23ca6eb157e07f352495bdfd9d86ce4dedc490d5795264c8662681722c352807` |
| `lab/world/W0/cases/C01-base-r1.json` | `3ccb749c222ee47848f3904629fa9a8c07f668f20fb664c7dcde1cc12867e8ee` |
| `lab/world/W0/cases/C02-base-r2.json` | `c5350dc56365feec4eba7bb4c5df2d5f92849a900d414e287a7a0f9e68f00117` |
| `lab/world/W0/cases/C03-new-hire-pre-start-r1.json` | `22bb577dbdc60eb04d4214d15f2d9cdea0f3dc187accc40a5f8f317a0c7a2e60` |
| `lab/world/W0/cases/C04-start-date-moved-r1.json` | `37b706ba926295eca770a62032afe25ae0fe7ab3359cc073d28c84c46fa9c97d` |
| `lab/world/W0/cases/C05-start-unknown-r1.json` | `24f0f50af9d9be9b7208b5768b6c24df555249f482152a51ce0607c783c30e88` |
| `lab/world/W0/cases/C06-i9s1-due-exact-boundary-r1.json` | `feb873bb99b59412c3a2bdf983bf4859c9858cf01638a4a21802d459a5a21236` |
| `lab/world/W0/cases/C07-ssn-erased-r1.json` | `d63a60eaf4fb69af25d4de49bec6d9343ab54ed97e449f21ef3fc2d5a9a085ec` |
| `lab/world/W0/cases/C08-ssn-bad-format-r1.json` | `7c2b281829c42ebdc947d15a19eb89ae1d2845fc378b38c6cfcdb6ed3fa495c6` |
| `lab/world/W0/cases/C09-everify-submit-r1.json` | `f50e25678a6e313131541dd087a74cad379cfada036f2202b8c337c069bff4ad` |
| `lab/world/W0/cases/C10-everify-tnc-r1.json` | `dbc03fc0dc77a04fdfb699156f2a7fdb0328f15b7f6b85df2df8d77b6061d373` |
| `lab/world/W0/cases/C100-publish-opaque-payload-tokens.json` | `5cf4cec9fe492c27a1e150afe8a9e4fef0e6dcf2f9eb7c160c41d0f2eba21392` |
| `lab/world/W0/cases/C101-publish-state-out-of-order-repeats.json` | `23abef3b181511a795e903f13d24a038d4bb9f74c3e3af31cc3b2e9ff5681471` |
| `lab/world/W0/cases/C102-publish-duplicate-id-in-record.json` | `e7a5f2ebd428d7e901ca1edb59c451b1f64ff8636b2608c870a9168e2d96d705` |
| `lab/world/W0/cases/C103-reconcile-equal-from-tx-beats-release.json` | `fa38812225878053a5f4e13a602bf65a0975b56311d47a64a388a86b017bcf31` |
| `lab/world/W0/cases/C104-reconcile-equal-tx-release-string.json` | `3f43f6ceae22da7ceb2ca53c787f3ec8581ac844483861d8d34f9483a73d7113` |
| `lab/world/W0/cases/C105-reconcile-from-equals-valid-time.json` | `f81ec6dd76400b6f903caf30a706f6e4991610f44f077a8034f3bd6b8dd17900` |
| `lab/world/W0/cases/C106-reconcile-activation-at-basis-tx.json` | `616b458458f2161dc8abc165a4af8747554db6d0b19590336aba21bb7b9c8669` |
| `lab/world/W0/cases/C107-fact-at-basis-tx.json` | `3fe3ac5ca2d9534d6d2a81f6b98f5a00f2b38e39971a9797217a61241dc36538` |
| `lab/world/W0/cases/C108-basis-tx-zero.json` | `4a61a2f54827b457f0ccbf4a6144653f968c8e86403cf7dc70cc48fdd687d1d9` |
| `lab/world/W0/cases/C109-basis-tx-max-safe.json` | `95b45fce1b1ce1810cf27e245208dbfb44d976f7a62802da3e186f1cda81397c` |
| `lab/world/W0/cases/C11-flags-authorized-overtime-r1.json` | `b28d2d6146b43e978d7a67235a727831ef6d44c81733f7a05474b6246cc0e10e` |
| `lab/world/W0/cases/C110-err-basis-tx-2pow53.json` | `8cca4cc990182fe8d94193e748ab828f38160f67b4094ac229f15efdb840b7e7` |
| `lab/world/W0/cases/C111-err-fact-tx-2pow53-plus-1.json` | `5c18c596932792a803f2df27bec712a92b4e97c2fec6b4d930f6a5e4cb9c4aff` |
| `lab/world/W0/cases/C112-err-value-before-basis-in-one-fact.json` | `a41e9c69a1e8e38cc22911b737789c6b7163c34ada7038982ff0065392f2c231` |
| `lab/world/W0/cases/C113-minwage-local-floor-below-state-r2.json` | `6b71689d53ebd41e946bb3fa33a755f901c0e03aaa20a5f628128debbf3c5180` |
| `lab/world/W0/cases/C114-paychg-position-from-decisions-fact.json` | `dfa6a9911bf3b513e069c4f3e9d69f3716cd1f99d1c62858a923e4c0d314c199` |
| `lab/world/W0/cases/C115-i9s2-incomplete-record.json` | `ce0bff04d6ee3c4830fc63edcd28d64e506786f11b6f97c283b563803626b6e3` |
| `lab/world/W0/cases/C116-prop-latest-proposal-counts.json` | `c5ba9b468c608a401eff38e1a9c41be8e78db30c3acf28e99e04a87e3fe2408c` |
| `lab/world/W0/cases/C117-docexp-reverified-false.json` | `128b44634c535004717e2aff2639873eb1b9e926efd1e1f44d98e5cc683731d4` |
| `lab/world/W0/cases/C118-r3-scope-listed-jurisdiction-without-facts.json` | `61f6037d71d49bdf46367b60a663d207947a9a5fd9f3088840bc6859ae7f22a6` |
| `lab/world/W0/cases/C119-life-at-start-instant.json` | `a45a2063f17a53834870ed6cd0492d8c7096b5dd0dec86a048336ed1f68dc865` |
| `lab/world/W0/cases/C12-everify-fnc-bgc-consider-r1.json` | `8417a6e9b89ab9d6fa17e257e7bc077d21d1386c3b3a719102c35d73a106abc1` |
| `lab/world/W0/cases/C120-evsub-dashed-ssn-with-accepted-result.json` | `ce0e489e72308f37b2cfac68ace68a999f7909bac10dab47f27c9ff635138af9` |
| `lab/world/W0/cases/C121-affected-worlds-unsorted.json` | `bfe81b783ef9d452aab621b219f83004c221d0e6df965251230189b4ba141cd0` |
| `lab/world/W0/cases/C122-publish-equal-tx-earlier-valid-time-skipped.json` | `4201e3b30695a51ab6e8a70eb99eed7c3383a19b3aa107019c4a01fe19875aac` |
| `lab/world/W0/cases/C123-publish-equal-basis-applied.json` | `2d3c90c3f8c37435d9e6ba602cf1d160680893e0340589205de4713daac020bc` |
| `lab/world/W0/cases/C124-publish-retirement-per-subject.json` | `8ef07f58a578487f777b7a0f1164ee0ac4a6445c890c29ceb02758a203fd8acd` |
| `lab/world/W0/cases/C125-receive-two-waiting-released.json` | `b6f47e1bcc673a3d661d1539d91b3c65a04ba19db079a18d215121c82ccbf9aa` |
| `lab/world/W0/cases/C126-i9s2-saturday-start.json` | `e0a86b7d99ad64c390aa2004281caef3dcb2956a04877e28c2633e6eb84843ed` |
| `lab/world/W0/cases/C127-facts-reversed-two-documents.json` | `849290281711cc2d49988fff6ef5e270f7fa24f6b09798af830e4c523ab51526` |
| `lab/world/W0/cases/C128-err-cents-nan.json` | `667deaad612f8345770824a6b994251d14ca16e13b583514f3eb07cfdf078300` |
| `lab/world/W0/cases/C129-err-basis-tx-5000-digits.json` | `db4817cf4e0c382d4a0838483764d06892983d6728431d2b4425b19e774334df` |
| `lab/world/W0/cases/C13-bgc-reject-r1.json` | `9cd764476b44bfdfe177a1f05d8d2c5cedf9860a2b0dcbe103a2cf9665f83fb2` |
| `lab/world/W0/cases/C130-publish-5000-digit-seq.json` | `5f56b41e91f5a8a4ebabcdd71f1f074a6e4cece6a0e2e444f518797dd84fd274` |
| `lab/world/W0/cases/C131-receive-5000-digit-seq.json` | `ec1ad299aafd98f67dc46803c0911a87e9e48b936d650e4fb81ee73d296e487a` |
| `lab/world/W0/cases/C132-err-cents-2000-nested-arrays.json` | `4a360fa4ac261b5933b27656088b769babf1d9be7b3218a9f45f25dd035b575a` |
| `lab/world/W0/cases/C133-publish-code-point-order.json` | `3bebccd6c4e2d55a69869a761709eee7fb88d89f46292771a23942161b5869cc` |
| `lab/world/W0/cases/C134-receive-code-point-order.json` | `b577e917d102fb33fa8970e7090bd9903fcf0fde800e8c7057ac2cb664a222fe` |
| `lab/world/W0/cases/C135-receive-inconsistent-snapshot.json` | `f3d576348a4ce856218aa16f0dcc69e475932e261b249ee7a12494316efd6887` |
| `lab/world/W0/cases/C136-publish-opaque-string-and-number-writer.json` | `d4e01c42661f71194602d0d8ffa1b11c8cc19ad6eb1a20d58a9261a5b2398c03` |
| `lab/world/W0/cases/C14-proposal-only-r1.json` | `981a5add96447160474160c5fdbcc6c4f97444f9392f9a5412b99e7f50492a5d` |
| `lab/world/W0/cases/C15-proposal-then-decision-r1.json` | `61206e550163dd8cbd6a6e7df589bddb8112fb3ffb383f0c93cdc6d58fd90ae0` |
| `lab/world/W0/cases/C16-agent-decision-record-r1.json` | `9c08447c19f28f9d2640d8f038d578bd7719157ee0e24932828a092ca24a09b3` |
| `lab/world/W0/cases/C17-decisions-last-wins-r1.json` | `2c9eade2d25af6283513bd622d3206254a8cbae0d89161c52f0417599882cec1` |
| `lab/world/W0/cases/C18-decisions-same-tx-tie-r1.json` | `1767beb767651d9c219e0e1ccea1f819b914e9b7ad69148b18dffe1df7bcbd5f` |
| `lab/world/W0/cases/C19-docs-before-expiry-r1.json` | `919f8937a6ae4d806db1c4ca485ff6e0b63a6c8ed08512abe1a7d58b8d9136bc` |
| `lab/world/W0/cases/C20-docs-before-expiry-r2.json` | `3858027be2fe9c079e92ec38f5b79ba11a7257e7983393f2d8ea1acf4b90296e` |
| `lab/world/W0/cases/C21-docs-ead-at-expiry-r1.json` | `423def4d67694b977cf2977b35db8b781c2f220c8c30a277577bd630403c2c85` |
| `lab/world/W0/cases/C22-docs-other-rows-r1.json` | `25dc757a6bd255a0052ab44bcba1c0473de0fd9be118496cbc47b18d87549821` |
| `lab/world/W0/cases/C23-minwage-below-after-raise-r1.json` | `b96a18f379d505cf286d53684c174424e0575e606125f49f72b28dd5f370e0a9` |
| `lab/world/W0/cases/C24-minwage-floor-unknown-r1.json` | `a5d02f108ef1e96591a9e13f7ae7cf43d960bf589837fc021d77f77228adda91` |
| `lab/world/W0/cases/C25-minwage-local-floor-r2.json` | `1319f9456cefb164415cc167daa04f2b2d19b4657eb327de47a7bbca25502ea6` |
| `lab/world/W0/cases/C26-section2-window-r2.json` | `cee564a9ce38ad17daeb5a9e6c720577313771f143a20f37bbf9d4d3cf2f62a1` |
| `lab/world/W0/cases/C27-numeric-max-values-r1.json` | `4683dbaeb070028aee184e38feb02afae8abc8cacc4b2d5a9c951dba68dcb6af` |
| `lab/world/W0/cases/C28-paychg-501-stale-approval-r1.json` | `3790f271331212501b34b3763047d2fa68d7947d6b235459443ac277e046fee7` |
| `lab/world/W0/cases/C29-paychg-500-r1.json` | `1fa81a661be4f468076ba5af3b306793dce568a6389a0c28a0d95236535e37af` |
| `lab/world/W0/cases/C30-paychg-approval-same-tx-r1.json` | `5329dac407e3caa80b2b8abe55b185903bd9e8e63cdb400170f7599fb2f00ec5` |
| `lab/world/W0/cases/C31-reconcile-after-activation.json` | `bb087a95afac4b7a4bd7a5c40883517b021f397aeaf4e2466bd6d07218596951` |
| `lab/world/W0/cases/C32-reconcile-before-activation.json` | `ef23082d88efbd218d9c81b7d871de731b675f73e567b1a52753df28c140c478` |
| `lab/world/W0/cases/C33-reconcile-no-release.json` | `ae26c941d67b0caf2ae99c43bd396c1e6bce09be3a4913b6283f86a0f9b03da5` |
| `lab/world/W0/cases/C34-affected-state-wage-r1.json` | `b4687a0e75cdeb263e5c4e9460900b335a92a07ba69c01fa57064121d9455b89` |
| `lab/world/W0/cases/C35-affected-local-wage-r1.json` | `bf96c2e2a3e8d516b20081b92e0911b7f8ec73d0ff3da5684dd743026763e371` |
| `lab/world/W0/cases/C36-affected-local-wage-r2.json` | `6df8be1450ba75d08b1c936d25606bd54f55ade3a3cbf17b4e590a65e12e8a17` |
| `lab/world/W0/cases/C37-err-minutes-10081.json` | `4d1838c75f24766da351ccdee515cd64625ca8c023762cbe7c3efbf369d3afd8` |
| `lab/world/W0/cases/C38-err-cents-integral-float.json` | `19076dfd0a0145927c47868cd13fd9628591d7a7560e33f73bc6c479de38fba3` |
| `lab/world/W0/cases/C39-err-cents-2pow53.json` | `4bc13ca5a15cfddde2ac733d0e4bde8db81996f78254bc12053f4118eab73271` |
| `lab/world/W0/cases/C40-err-cardinality.json` | `0d36d9ab3346bd333a64747e629afbddac1b5b709e4e74e9a94da474469df34b` |
| `lab/world/W0/cases/C41-err-fact-after-basis.json` | `19fcfde7b898fe945ad754303c68c555b355e3ab72a2efb70bafa43f311b9a57` |
| `lab/world/W0/cases/C42-five-work-items-r1.json` | `6483f46c44fd42188279b8f0c8e6f5b23fb197067646e2e12f0ed53e9c4a59ef` |
| `lab/world/W0/cases/C43-err-first-failing-fact.json` | `28b8c34e68e2e6b22b35589a8bc5d81596459bfa99a525fdaee70a46e58ff955` |
| `lab/world/W0/cases/C44-err-unreachable-fact-validated.json` | `44c5954cfc9992d70b9a86d0838e7122ac8331ed155bfc9762488a860f986d76` |
| `lab/world/W0/cases/C45-err-tx-float-token.json` | `138f32476814c5400c329768ce60f54c1b0549bc625b618d6a5dcb23aeb0358b` |
| `lab/world/W0/cases/C46-prop-older-and-equal-decisions-r1.json` | `fe72db73ab4e07d59eefc8c9f32a362fc0e233390d850b09fa3d82e1ace02372` |
| `lab/world/W0/cases/C47-paychg-reject-after-change-r1.json` | `6418b607f6102d86d0f0dabf04b66a4f3ad29d36bf93b4f779d469f0e9aa5d44` |
| `lab/world/W0/cases/C48-minwage-no-location-r1.json` | `8b8af098733e671ab1e165f10d76ea984487cf222573970011421c17fc423eee` |
| `lab/world/W0/cases/C49-evstat-tnc-without-status-at-r1.json` | `35c836b391aab2fe7237e810a4f1d7d1de910ba6d778bea2bd882e9842bf463a` |
| `lab/world/W0/cases/C50-evsub-submit-without-start-r1.json` | `2e8713f05aff95c6d6519ec1384b98f2c0a1a3eafa50ca85deac7d4c7df93d58` |
| `lab/world/W0/cases/C51-docs-ead-at-window-r2.json` | `93bf45f9b9e49211b7534f01ae0f4f112366782ba9e1fc4ab46e4b7be7ebdac6` |
| `lab/world/W0/cases/C52-evsub-result-accepted-r1.json` | `f289904288b1abe5d8437e17c71605362efa7bb9928098fbfbf4173da68db5fb` |
| `lab/world/W0/cases/C53-evsub-result-rejected-r1.json` | `03a4740aaecdbbbf802dfafe50554e2e52fc099bf3fb4ee607db66bc21c01902` |
| `lab/world/W0/cases/C54-ot-r3-at-threshold.json` | `194c65730a60cb8f446466b08a0b9f732f50af74069727fffa31c46b9290eae2` |
| `lab/world/W0/cases/C55-ot-r3-above-threshold.json` | `2ede0132eae69126683ad44d81605a22442de68fbc78b2afeaf9b450d4140176` |
| `lab/world/W0/cases/C56-ballast-world-r1.json` | `3d196002f1d1080d7d9abd8e78c78ab33a94d3d4a7c67ec339baf994bd3c4228` |
| `lab/world/W0/cases/C57-affected-ballast-write-r1.json` | `9d873cc434df2345b4e35cdd144a1231ad2fd6038c1f1a4cee4a09a7faed280b` |
| `lab/world/W0/cases/C58-affected-jurisdiction-write-r1.json` | `fb82eedb87ed2da85e810be9cc16aad24f6c8ca3be7154f8bcf59a745a19425f` |
| `lab/world/W0/cases/C59-affected-jurisdiction-write-r2.json` | `6b15e68e3a079dad147e527f5127c17766b36aa576d213c735b1b6d483eadc89` |
| `lab/world/W0/cases/C60-affected-location-repoint-r1.json` | `16d71dc2f403dc904fd3274cc72e3ffb26fc24ea0adefcdd3018636fd3c2aeba` |
| `lab/world/W0/cases/C61-reconcile-equal-from-tie.json` | `fdb193c360b8483ab826652f9b6ff480c851d531ea359f7c7d4033a80c7b85ca` |
| `lab/world/W0/cases/C62-err-unknown-other-placement-entity.json` | `606531670e91d931ef50a65c8685da6f96e0f2cd4f51ed6fcb67223603721fa9` |
| `lab/world/W0/cases/C63-err-unknown-attribute.json` | `79bf45ba1f80aef85f1ee3ecd4f538068427b54c30d8a32e07b67da99953dbeb` |
| `lab/world/W0/cases/C64-err-erased-non-pii.json` | `b918cc794ef7a9a5bfd6e3d952a1b977ad48a53aa7dc34a2477f19b6aa65e6f3` |
| `lab/world/W0/cases/C65-err-activation-bad-hash.json` | `a3be66c261085e67543dc22914b0ba0955b2b1ad0274d8086525c684e2294bee` |
| `lab/world/W0/cases/C66-err-duplicate-key-in-v.json` | `6ef9ac78cf95bcfc5569213f382abce18ab064eea87ff6efd53e4e7aa9f58904` |
| `lab/world/W0/cases/C67-err-affected-duplicate-subjects.json` | `72e044b49b5c668a688592ce21eae681ea97895c4a0ced42e212f9bbbf49ddd8` |
| `lab/world/W0/cases/C68-err-cents-exponent.json` | `8dcb739eb4870d2a4d9739624ecf7ed7f5e14968a5b642283327efb5238b581b` |
| `lab/world/W0/cases/C69-err-cents-negative.json` | `ea7a721fb328945ce0f438aa2c5283d8a3d319806c40fe6cff014b4b7e0d00b5` |
| `lab/world/W0/cases/C70-err-cents-string.json` | `a5c5daec312400da7e3e1bd2c8937f16a5c8e3d219c437c64f7bc2cf54304f05` |
| `lab/world/W0/cases/C71-err-basis-tx-float.json` | `e4eb699ba206b26c051607bf8a4c022ba2a737634080c3f75a282ce5588b1bcd` |
| `lab/world/W0/cases/C72-err-activation-tx-float.json` | `728d2e4b83b05ba2bd1c47369a9b927e692306e08bc900d8e8a089291b0e8497` |
| `lab/world/W0/cases/C73-publish-rollback-r1-r2-r1.json` | `1a95b75d69f5cab67da986e722c500a25d6e73adc09e27bac769c869c1dba9d1` |
| `lab/world/W0/cases/C74-publish-correction-revert.json` | `a374d0e4f745fcd996327c5cfb8dc094afde10cecf27231e1d8c9789a003523e` |
| `lab/world/W0/cases/C75-publish-crash-before-delivery.json` | `124d3420cfbcd6250658648f84175d0143bcbe8dc76ab222e0b6fa7bfda52f0c` |
| `lab/world/W0/cases/C76-publish-unchanged-activation-recovery.json` | `385c72184dc9fcaa4a999ac0250723777967169354b703fa499a8ee9a2ec85fe` |
| `lab/world/W0/cases/C77-publish-older-basis-skipped.json` | `209624aee8c34fc8210658d65b41d24135ed8312c0db291943e94172eaf8e195` |
| `lab/world/W0/cases/C78-publish-retirement-reappear.json` | `7ecabfb5399b605803097db180a4e66ef64f9f56394e0afb55f37576780cb5dd` |
| `lab/world/W0/cases/C79-receive-reversed-arrival.json` | `074a40b0142ddfa279834c168425a87649bac3efd33ba067ba058585779dc078` |
| `lab/world/W0/cases/C80-receive-gap.json` | `c8c6d9d844440d794b19dcb4b62ae90d66e0ab024de87d54c4f41fb89c7997dd` |
| `lab/world/W0/cases/C81-receive-restart-mid-sequence.json` | `03e62d3d28469348ffc31d88e123191f7407e44624533919365b2d3294f59cd1` |
| `lab/world/W0/cases/C82-publish-guard-advances-on-unchanged.json` | `a9f7550c44b79499ca6b80d69decf9a34bc25a2ece075d573fe97e8ea6553377` |
| `lab/world/W0/cases/C83-receive-duplicates-and-gap.json` | `6898782d51e376bfb083d1e8f84627e24d7e773ea945ccaabe20a7fa2d4ae2a6` |
| `lab/world/W0/cases/C84-err-publish-state-without-pending.json` | `a4067364cab65000435c4ac82f5d245930bc8c07d16a4271899a9ecd88b62507` |
| `lab/world/W0/cases/C85-err-receive-seq-zero.json` | `b6e6df8dfdb169fc4940d70641b60236d5f0ab95227e34ce2507552be92b2af7` |
| `lab/world/W0/cases/C86-ot-r3-outside-scope.json` | `e37c0c1781f873d8230308f10cb4b30cf847b43b07605b78ca1d730649381ef9` |
| `lab/world/W0/cases/C87-affected-r3-scope-reach.json` | `78aeafcc5b6018ddaa948b174b76db9988e773c319d3148761f903a5ec10ccec` |
| `lab/world/W0/cases/C88-err-erased-marker-on-instant.json` | `fcbca4158aca12ae9e9fe3dd7f74b35e8ad1af0b27b259ed01537550e1c0ca2c` |
| `lab/world/W0/cases/C89-err-array-on-date.json` | `c3e75b74afd7ea2164cdd4d14d99174654bf06cd2942ad1f579c2be1c73aa25e` |
| `lab/world/W0/cases/C90-err-cents-5000-digit-token.json` | `ced553d48da4b429332de5434962c786292be96fb3985781f66cac0a1b4bb13d` |
| `lab/world/W0/cases/C91-err-bytes-bom.json` | `8704c265bf7668e25643bdccae59cdf6d1ebfb159045e13c49e79d3642ac926b` |
| `lab/world/W0/cases/C92-err-bytes-not-utf8.json` | `d86f25d7578313b56908251505190c95ebb8568fbe0ce8c8fcc87267ce83568d` |
| `lab/world/W0/cases/C93-cents-negative-zero.json` | `7b2514c558f1ff3aa77454f8f3b265523c3d6d4977a896a57e6246132f056aef` |
| `lab/world/W0/cases/C94-err-fact-tx-negative-zero.json` | `80f3304ab74fb7e04c077c2452785d1c696822f64bfb5fe267996edab73a26b7` |
| `lab/world/W0/cases/C95-err-cardinality-after-unknown.json` | `5cd04325db349edeb119824726d022c5fd74a11a6516019c05dbc12ff0dffa30` |
| `lab/world/W0/cases/C96-err-affected-world-by-world.json` | `ac19b12d04731c834ed6be33bf0368ae23830b0793ec745be1426acb47a420cf` |
| `lab/world/W0/cases/C97-err-activation-value-before-basis.json` | `9b6ebd057e5f2f1253c0ef51d9c176fed9c307aa89f80d0bab0207f594a33ac8` |
| `lab/world/W0/cases/C98-err-world-before-activations.json` | `2b5f9b7b02796f0bbeb3839c7d3396356e27a04b6a9eae85e0e5ba828f899708` |
| `lab/world/W0/cases/C99-err-no-release-no-fallback.json` | `13c72dd4dce45325d3c1b420b18462eb24615fba532d36ab8ae6d2f6c4121f07` |
| `lab/world/W0/expected-sha256.json` | `dfe90c7d33603c89c9f027b990e430f2a355950db2b559d700281c2b6cc1c988` |
| `lab/world/W0/input-sha256.json` | `e5125990bfd85009c38b2d9c3c6c6d17fb089f89a2cc7812b288a41687fe61ce` |
| `lab/world/W0/releases/R1.json` | `c8c6de6df5068396eef8648a9c984376b56bbeddbd4af88677b5212239f210b7` |
| `lab/world/W0/releases/R2.json` | `be914f7a9ed8e7799c0fd445fc5564e0a61361c1f58d14263f68e7f95c83a051` |
| `lab/world/W0/releases/R3.json` | `8f7962e89c1150b6b56bff180e67042ad82c18491f011c406d7ca417d08264fd` |
| `lab/world/W0/releases/index.json` | `f5e3f8c16a8dd2c64f0de27762368febd2e08aa5b3f5a622a2a57e9b61dc0dfc` |
| `lab/world/W0/schema.json` | `4f9cd22fe6c95e19af6983a4ec622eb20b137789cfe25ab82c9d0a826a5a79b5` |
| `lab/world/W0/validate.py` | `ae44e94dcf6e60f98cd7a7208a6f34a3e1e2a43d744a6d503111887fd1b261eb` |

### O-CONTRACT runner

| Path | SHA-256 |
| --- | --- |
| `lab/acceptance/build_contract.py` | `512ef4c1da9e185771bcb94d6fc4680c349a52da37168048fe706a28b5a5cf7e` |
| `lab/acceptance/oracle-contract.json` | `9e4b3541c1078a510f258edc4a9eb3331a97ebb9a65bf1c0b4ce75bcec99007c` |



## Round 2 — CX-A01-0311 fixes for independent review ae3f091

North star: correctness floor for P1 exact pinned answers and P3 continuation, with the same composition identity requirements on lane D. This section describes the current contract; earlier sections and their hashes remain the round-1 historical record.

Source head: `da79107aa3be440ff38012962b0ea161198411df`. Fix commit: `a6b3028`. Merged main `8f1722612b05ceeabbd36041e8bed2ad6459bf0a` in `da79107`, as requested. Reviewer findings were read from immutable verifier commit `ae3f09137e6216dfa2580ec1f00d7d6c06133c73` (`lab/verify/A01/VERIFY-0.3.11.md` and regressions). The reviewer's regression script is copied unchanged to `lab/verify/A01/regressions_review0311.py`; SHA-256 `9f258188b525cd512dc2a515e8acf5745593c4de97b1ff23ea2ca14b48c370aa`.

### Fixes

| Finding | Change | Controls |
| --- | --- | --- |
| F1 — real O-REPLAY result objects | Row comparators project `rows` from aggregate `{cut, rows}` results and both `raw`/`snapshot` arrays from match/entityTriples results. Bare row arrays remain supported. The same projection applies to each in-flight acceptable result. All other wrapper/query/prefix metadata, including cut, count and contract, remains exact. Unknown row-object shapes fail closed and are explicitly described as uncomparable. | Unchanged real aggregate CLI regression; new real CLI aggregate and match payloads with two rows; BAG reorder succeeds, ORDERED reorder fails, changed cut/count/contract fails; direct and in-flight placements; unknown/partial wrappers fail. |
| F2 — Unicode recursive serialization | Recursive canonical row keys use UTF-8 (`ensure_ascii=False`), matching `_canon`. Strings retain code points without normalization. | All three formerly failing reviewer Unicode tests pass; SET/BAG/ORDERED with Japanese, emoji and accented strings, direct and in-flight; composed and decomposed accents compare unequal. |
| F3 — Datomic composition/receipt schemas | `composition.engines` and `receiptSchema.fields.composition` include Datomic. Structured `composition.engineIds` enumerates xtdb/qlever/datomic and is enforced by `composition_ok` and O-CONTRACT identity. Datomic image/imageId and A0 stay null. | Reviewer schema check; Datomic identity is bound while `imagesPinned` is false; unknown engine identity refuses; all D obligations retain their image blocker. |
| F4 — Q76c matrix record | Matrix row 35 references `KL-CORE-TAIL`; the generated known-limit table identifies core `compileRecursiveCTE` ignoring tail constraints. It requires a fix before a lane uses that compiler, or typed refusal if the constraint cannot be preserved. It does not claim existing XTDB/QLever C8 frontier paths use that compiler and adds no universal engine failure. | Reviewer matrix check; generator check binds row note to scoped known limit; all 51 prior matrix cell maps remain unchanged. |

Six additional mutation controls cover disabling real payload projection, ignoring cut metadata, escaping Unicode at the recursive boundary, removing Datomic from each schema, and removing the compiler defect record. They extend the existing negtest0311 catalog.

### Main merge and pending authority

Only generated-file conflicts and the pending-file conflict required resolution. Generated files were rebuilt from the fixed generator. Main's pending rows were retained after subtracting the same 50 already-compiled 0.3.11 rows; no new ruling was compiled. A source comparison confirms the resulting pending ID set is exactly the merged main parent's pending set minus those 50 rows.

There are now **29 pending rows, authority none**: Q51b, Q72a, Q72b, Q72c, Q72d, Q72e, Q72g, Q73a, Q73b, Q78e, Q80a, Q80b, Q80c, Q81b, Q81c, Q82a, Q82b, Q82c, Q82d, Q82e, Q83a, Q83b, Q83c, Q84a, Q84b, Q84c, Q84d, Q84e, Q83d. In particular Q81b/c, Q82a-e, Q83a-d and Q84a-e remain pending, as do the prior Q51b/Q72/Q73/Q78e/Q80 rows. Q83b's newer freeze definition is not silently substituted for compiled Q74b.

Main also contains the E01 evaluator implementation, research and operational records; the authorized merge preserves them. This round makes no new execution or qualification claim for that imported implementation. `git diff --cached --check` during the merge reported pre-existing trailing whitespace in imported E01 source/raw transcripts; those imported files were preserved. Round-2 authored source/report checks are recorded separately.

### Counts and current pins

Counts are unchanged from round 1: **157 distinct / 40 pin-level closable / 117 blocked**. Per surface: XTQL 154/39/115; SQL 154/39/115; SPARQL 155/39/116; Datomic Datalog/pull 153/0/153 (total/closable/blocked). These are not achieved closure counts. Every Datomic obligation remains blocked by `image-unpinned:datomic`.

O-REPLAY remains 0.4.9 at f195f30, all 29 file hashes unchanged, accepted by V-O04i. No world/oracle/image/A0 pin was promoted. The generated O-CONTRACT projection and generator hashes change with the schema/comparator fixes; both remain explicitly pinned.

Current transitive contract hash: `68304280363e5c602a2b343f405448c0d3e218dc4ff5de24af7cd8b219aebca7`.

| Current artifact | SHA-256 |
| --- | --- |
| `build_contract.py` | `60055e9f236733365c4e558412368b0a2934df8cb1d5e9479d45758971940ccf` |
| `RULINGS-PENDING.md` | `53cf5267cf8e6f32f3ec139a79861ecf8de03da6f7d227ded95d0ebe03291c11` |
| `ACCEPTANCE.md` | `a62e022e0547f442c21ac2cd8e346ca0e64f2e1141041dfcfb59f5a87dddd124` |
| `obligations.json` | `14469dc55956828e5b31e688747769d3808d7f2cbfdd4782ed3adad5e2bc934e` |
| `oracle-contract.json` | `a7ec2fe98f8bb066fe6ea55e89344905f5e9c760b076152f5377c414d18adbd0` |
| `capability-matrix.md` | `544acb56083db7c37ecfdcbe5f8e140b9999d368ee84632acd103b3b5069ac40` |
| `load-contract.json` | `00169eedc83df0d7541f12c188aaec72f94c11f8ba70992e0411a4999d2adced` |
| `budgets.json` | `91a85c688b876f767c25afa73d4a3080eb2831bc21ed1daaf48e7b5a701bda00` |

Full source/pin/pending identities: [source-and-hashes.json](evidence-0.3.11-round2/source-and-hashes.json), [pins-and-pending.json](evidence-0.3.11-round2/pins-and-pending.json). Round-1 receipts remain unchanged.

### Round-2 validation

- Extended `negtest0311.py`: **344/344 runnable mutations caught, zero misses**, including all six round-2 defect controls and all 50 previously compiled ruling controls. Catalog 425; 81 retired anchors and one separately superseded status-only legacy mutation are not counted as runnable passes. The recorded source hash matches the committed merged generator.
- Reviewer's unchanged `regressions_review0311.py`: **35/35 PASS**, including all six previously failing regressions. This is a builder rerun of independent test code, not independent delta acceptance.
- Additional `regressions_round2.py`: **5/5 PASS**, exercising real public-CLI aggregate/match payloads, direct and in-flight placement, reordering, exact metadata, Unicode and Datomic identity.
- `q47d_test0311.py`: **PASS**; synthetic pending rows stay non-authoritative, both prohibited regression mutants are detected, and all six generated files restore byte-for-byte.
- Generator `--verify`: **PASS**, byte-identical. Authored source/report whitespace check: **PASS**; imported main whitespace is separately noted above.

Receipts: [negtest.txt](evidence-0.3.11-round2/negtest.txt), [reviewer-regressions.txt](evidence-0.3.11-round2/reviewer-regressions.txt), [real-payloads.txt](evidence-0.3.11-round2/real-payloads.txt), [q47d.txt](evidence-0.3.11-round2/q47d.txt), [verify.txt](evidence-0.3.11-round2/verify.txt), [validation-summary.json](evidence-0.3.11-round2/validation-summary.json). Actual CLI inputs/answers are retained under `lab/verify/A01/replay-aggregate-*` and `lab/verify/A01/round2-real-*`. The raw Q47d transcript retains one emitted trailing space; it is preserved verbatim and excluded from the authored source/report whitespace claim.

No engine/container lifecycle, package installation, benchmark, package build or full root pnpm check was performed. The core compiler defect is recorded, not fixed in production code. This is builder validation of the contract fix; an independent delta review remains required before contract acceptance. Nothing was pushed or merged into main, and the main checkout was not edited.

## Round 3 — evaluator compatibility and merged-main gate

North star: correctness floor for P1/P3; contract and evaluator must agree before a contract merge. Source head `b5af03398573080e178475952f03e57b8686bf17`; fix `54ba9ebedc025f78b71ead9812c0a71aadc605c6`; merged current main `982350e24c93fd91682f0d083f207a251a79a680` in `ab3eafc`. Main was read/merged into this worktree only; nothing was pushed or merged into main.

### Reproduction and decisions

The unchanged round-2 branch reproduced exactly **8 failures / 108 tests** (100 passes), recorded in [evaluator-baseline.tap](evidence-0.3.11-round3/evaluator-baseline.tap). Both evaluator test assertion files remain byte-for-byte identical to round 2. No assertion was loosened, removed, skipped, relabelled as an expected failure, or replaced by a weaker denominator.

| Failing tests | Decision | Correction |
| --- | --- | --- |
| 5 — fresh HOME/TMPDIR; 15/16 — final input deletion/rewrite; 101 — build-helper cleanup; 106 — offline qualification; 107 — CLI exit codes | Q75c is correct. Fixtures pin one-file O-REPLAY bytes while inheriting the real oracle's 29-file runner list, causing an unrelated ORACLE-RUNNER-UNPINNED error. HOME/TMPDIR, cleanup, input-integrity and exit-code assertions stay intact. | Declare each fixture runner from its own pinned files/argv, including its distinct O-CONTRACT stub. Comments explain why production identities cannot be borrowed. Observer/domain/hand stubs remain document-only test stubs, without any production oracle-qualification claim. |
| 17 — admitCore/reference call replay | Q75c and the partial-runner-pin negative control are correct. JavaScript lacked the reference's complete-file predicate, returning QUALIFIED after the same 313 calls where the reference returned DIAGNOSTIC. This is an evaluator implementation gap, not a reason to discard a reference fixture. | Share the complete-runner-pin predicate through contractBlockers, admitCore and common preflight; check all declared runner and repository argv files, including contract-output hashes for COMPILED runners. Remove the duplicate pin-only preflight implementation. When COMPILED runner hashes are declared, check copied trusted bytes against them. |
| 31 — GEN-REFUSED-SET must cite ORACLE-REFUSES | O-REPLAY 0.4.9 correctly models Q52 erasure shapes; the fixture's old refusal assumption is stale. Unresolved selections do not prove oracle refusal. | Select decimal schema evolution, which is still explicitly refused through scale-evolution. Preserve both DIAGNOSTIC and the mandatory ORACLE-REFUSES cause assertion; record the reason and rejected weaker alternative in the fixture comment. |

The first corrected merged attempt passed 107/108 and is retained as `evaluator-attempt1.tap`. It exposed the document-only GS positive fixture's additional dependency on O-ERR: that fixture now has its own explicit error-oracle stub pin and runner in `b5af033`; its positive assertion remains unchanged. Production O-ERR is still unpinned/blocked.

No contract rule was rolled back. Counts remain **157 total / 40 pin-level closable / 117 blocked**; per-surface counts are unchanged. Datomic stays **153/0/153**, blocked by its null image pin. No oracle/world/image/A0 pin was promoted.

### Main merge and pending authority

Q79f and Q87 are retained with all other newer pending rows. Q87's evaluator merge gate is executed under this dispatch while its row remains pending with authority none. No new row is compiled. Generated conflicts were resolved by regeneration. The pending ID set exactly equals the immutable merged main parent's pending set minus the same 50 already compiled rows.

All **43 pending rows** remain non-authoritative: Q51b, Q72a, Q72b, Q72c, Q72d, Q72e, Q72g, Q73a, Q73b, Q78e, Q80a, Q80b, Q80c, Q81b, Q81c, Q82a, Q82b, Q82c, Q82d, Q82e, Q83a, Q83b, Q83c, Q84a, Q84b, Q84c, Q84d, Q84e, Q83d, Q79e, Q85a, Q85b, Q85c, Q85d, Q86a, Q86b, Q86c, Q86d, Q86e, Q86f, Q86g, Q79f, Q87.

### Round-3 validation

- Required evaluator merge gate: **108/108 PASS**, zero failures, skips, cancellations or todo tests, using `node --test lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs` through `lab/bin/heavy.mjs` at final source `b5af033`. Every original assertion file is byte-for-byte unchanged from `3b46c8a`.
- Contract negative suite: **344/344 runnable mutations caught, zero misses** (425 catalog entries, 81 retired anchors, one separately superseded legacy entry), run through heavy.mjs on merged contract source `ab3eafc`. The only subsequent source change was the fixture-only O-ERR pin in `b5af033`; every generator, ruling input and generated contract artifact remains byte-for-byte identical to that successful mutation run.
- `q47d_test0311.py`: **PASS**, including both prohibited pending-authority mutants and restoration of all six generated outputs byte-for-byte.
- `build_contract.py --verify`: **PASS**, byte-identical.
- Prior independent regression code: **35/35 PASS**; additional real-payload controls: **5/5 PASS**.
- Working source/report whitespace check: **PASS**. Raw TAP/Q47d transcripts remain verbatim; any emitted trailing space is evidence, not normalized source.

Receipts: [evaluator-final.tap](evidence-0.3.11-round3/evaluator-final.tap), [negtest.txt](evidence-0.3.11-round3/negtest.txt), [q47d.txt](evidence-0.3.11-round3/q47d.txt), [verify.txt](evidence-0.3.11-round3/verify.txt), [reviewer-regressions.txt](evidence-0.3.11-round3/reviewer-regressions.txt), [real-payloads.txt](evidence-0.3.11-round3/real-payloads.txt), [validation-summary.json](evidence-0.3.11-round3/validation-summary.json). The 100/108 baseline and 107/108 first corrected attempt are retained under their separate filenames; neither is counted as passing evidence.

Source/pin identities: [source-and-hashes.json](evidence-0.3.11-round3/source-and-hashes.json). Current transitive contract hash: `cdd267d3b28fb5a121788731dc0ccaf54488324e3d2296dd97ffee8affca0405`. The receipt records matching round-2 assertion-file hashes plus generator, evaluator, fixture and generated-output hashes. Round-1/2 receipts and the failing round-3 baseline remain unchanged.

No engine/container lifecycle, package installation, benchmark, root pnpm check, production gate execution or independent delta acceptance was performed. The 108-test merge gate is a local evaluator suite, not qualification of a database lane. A separate reviewer still adjudicates the final contract/evaluator delta.
