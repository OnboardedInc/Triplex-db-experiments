# EXP-K01 round 10 — native width and instant equivalence

Builder CX-K01-R2; parent 245a49664d6e6def36877bdee1b0ec2e0e0cc919 on exp/K01-seed-clone. Scope: offline fixes for reviewer verify/K01 72a2337, VERIFY-round8.md. Authority: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md, Q93a-c. No acceptance files or rules changed.

**Result:** all 397 offline tests pass (212 builder, 30 earlier reviewer, 98 column/schema-reader, 57 copied representation controls), with TypeScript passing. The 331 previously passing tests remain; nine builder regressions and the reviewer's 57 controls are added. No skip/cancellation/TODO. No live XTDB, scale, E1 or P5 acceptance is claimed.

## R8-F1: distinguish native widths, refuse erased row types

Postgres.js raw frames alone cannot recover a row's original type after XTDB unifies a numeric union. The pinned XTDB source c6c19623d90c658c15400fb46dc056f3735ed57b confirms both the loss (`PgType.kt` unifyPgTypes/fromVectorType) and the independent witness: `information_schema.clj:336-359` emits `xt_type` using `serde.types/render-type` on the original vector type. The catalog's ordinary data_type is insufficient because it uses the widened PgType. Exact source hashes are in evidence/round10/upstream-source.json.

`g0-native.ts` validates this native witness at the raw-reader boundary. `openWire.scan` reads and validates the table's column catalog before and after each raw page, within the existing bounded scan deadline. Catalog change, missing/duplicate/malformed entries, unknown types or native/OID disagreement refuses. Each non-NULL raw scalar frame hashes **native type + wire OID + exact received bytes**. Homogeneous I32/I64 and F32/F64 widths differ; I8/I16 differ even with the same OID 21 and text. Nullable declarations reduce to the underlying type for non-NULL values; stored NULL remains NULL. Decimal precision/scale/bit width remain in the type tag. All declared and dynamic columns still participate in D.

A mixed native union is deliberately refused, including when all resulting pgwire bytes/OIDs match a monomorphic source. We cannot infer a row's union leg from widened bytes. This is a conservative refusal, not a claim that per-row native storage was recovered. The table-wide catalog may also refuse a scope because another scope contributes mixed types. Supported monomorphic primitives are bool, integers, floats, UTF-8, binary, UUID and decimal; unknown/structured native transport and payload-losing NaN text continue to refuse. No fallback to the adapter's widened model grants admission.

The source-generator pin includes the new module. Existing D pins/goldens must be regenerated; the shared `lab/bench/lib/g0.ts` call signatures and Pin/W0 interface remain stable for EXP-P5.

## R8-F2: preserve instant equality, order and transaction consistency

Dprime first collects a single verified clock per application transaction position from assertion recorded/retracted clocks and claims. Conflicting clocks refuse. Every `:_tx/instant` value must exactly equal its transaction clock; the existing derived-identity/value relationship must also hold. Thus updating a corrupt instant and its uniqueness identity together cannot conceal disagreement with the assigning clock.

Instants map to dense chronological ranks of the **distinct verified clock values**. Equal instants share a rank; strict ordering and ties remain observable. Transactions still retain distinct commit-order identity ranks. Generated recorded/retracted clocks, journal instants, generated metadata valid_from and the selected generated change-JSON clock tokens all use the same instant-rank function. Business dates/values remain exact. Dprime's domain is bumped to `tx2-e1/2` to distinguish the changed equivalence rule. Assigning-source comments remain adjacent to every normalized column, with the comment guard test retained.

New controls cover equivalent tied clocks, equivalent strict order, tie splitting, tie merging, reversed order and a corrupt journal instant with a matching derived identity. The two copied reviewer controls exercise corrupt instants through both decoded and native-frame readers. Both now refuse. Full D always retains original clocks/types/bytes; Dprime never admits a clone.

## Verification and evidence

Final command:

```sh
node lab/bin/heavy.mjs --label CX-K01-R10-offline -- node lab/verify/K01/run-round10.mjs
```

The final evidence/round10/run.json binds 43 runtime/test/schema source files, commands, exit statuses, Node version, disk reading and log hashes. All five runs exit zero: tests 212/212, reviewer 30/30, columns 98/98, representation 57/57 and tsc. Final source hashes were independently rechecked against the receipt. git diff --check passes. The inline live probe in LIVE-round10.md passes Node syntax checking only; it was not executed.

The executable representation-review.test.mjs is copied from reviewer 72a2337. Its 57 expected verdicts are retained. The fixtures now provide the native-type observation required by the production reader: primitive fixtures name their declared type, and the upstream-widening model supplies a union witness for mixed storage. The original unmodified reviewer file is retained as evidence/round10/representation-review.original.mjs. This adaptation is explicit: earlier mocks had no native catalog because the previous reader did not acquire it. The two widening controls now reach a valid monomorphic source pin and refuse the ambiguous clone; their desired refusal was not replaced with an expected PASS. The decoded and raw inconsistent-instant controls are retained.

The first passing development run is retained under evidence/round10/development-1; the final run follows rationale-comment and runner-output-path updates. Raw reviewer outputs for both runs are durable outside git at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-K01-R2/round10/`. The committed SHA256SUMS and INDEX.md identify their bytes and provenance. No single committed evidence file exceeds 1 MB; raw case directories are not committed.

## PASS / verdict / receipt audit

| Transition | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `readContent` / `readG0` source pin | Complete schema-derived rows, exact typed values, independent counts, expected core counts; required W0 oracle comparison | Deadline-bounded reads; scope/position checked before and after; production raw page has stable native catalogs | Expected scope, application position, counts and world are included in D; production reader uses the requested endpoint |
| `readE1G0` Dprime pin | Same full D plus documented generated-field relations; verified clock equality/order, identity checks and exact remaining business bytes | Two complete bounded reads must reproduce full D | Dprime/2 includes expected inputs, normalization assignments, normalized complete tables and W0; returned full D binds original bytes |
| `admitG0` sole admission PASS / `checkXtdb` wrapper | Fresh full D must equal pre-freeze pin; no Dprime substitute | Always calls readG0 in this invocation, before driver warm-up | Pin format/digest and expected scope/position/count/world checked; receipt names measured endpoint |
| `requireW0Fingerprint` comparison (no standalone PASS) | All required basis/facts/worlds/R2 values equal oracle | Invoked inside current bounded G0 read | Oracle rung, W0-pop-1 seed and source presence checked; observed fingerprint is included in D |
| Golden publication `engine.mjs golden` (unchanged) | Copy/layout refusals plus both ordinary clone starts reproduce full D and layout; diagnostics grant nothing | Each start performs its own bounded content/layout reads before publication | Source manifest/key pins; the held holder's exclusive slot and golden record inputs; exclusive record creation |
| E1 driver equivalence refusal (unchanged consumer) | Requires Dprime equality; each arm still passes its own full D | Own endpoint read before warm-up; freshly generated source pins required after integration | Reference golden Dprime compared with fresh manifest Dprime; cannot admit a modified clone |
| Test runner receipt and future live probe | Suite exit statuses/log hashes; probe asserts actual native declarations, widths and specific mixed-union refusal | Unique attempt output; current source hashes; future probe acquires fresh rows with deadlines | Recorded head/source preimages, exact arguments and output paths; future probe guards s1 owner/holder and endpoint before writes |

Raw frame/catalog helpers and clock collection produce validated values or throw; none emits PASS. Cancellation errors are not success evidence: deadlines/refusals propagate independently of best-effort cancellation. stop lines, gauges and logs grant no content admission. No new process boolean grants PASS.

## Contract boundary, live handoff and remaining work

No lab/acceptance file was edited. A textual scan of the current main acceptance tree finds no references to the changed implementation paths; no explicitly pinned changed path was identified. evidence/round10/changed-paths.json nevertheless lists each changed implementation/test/doc path with parent and new SHA256 (new files have null parent hash), for the contract builder to re-pin as applicable. The final run receipt separately pins all tested runtime sources. The contract remains unchanged.

[LIVE-round10.md](LIVE-round10.md) contains exact admission, native-wire probe, seed, production two-start golden, clone and cleanup commands. The native probe checks real I32/I64/F32/F64 declarations and raw frames, and requires mixed integer/float unions to refuse. It then destroys the scratch slot before the source seed. The document gives both the 500-subject diagnostic and the 10k scale substitution, first-failure retention and cleanup for a golden allocated before record publication. These commands require a future admitted scale window and built/source-pinned packages.

No container, slot or volume was created or inspected by this round. No volumes are kept. Host free-space observation exceeded the 5 GiB floor for both offline runs. The actual image's xt_type availability, SQL native-width storage, catalog/pgwire agreement, two-start golden reproduction, live runtime costs, E1 and EXP-P5 integration remain unverified. A monomorphic catalog that the actual image cannot faithfully expose must refuse; the live wire check must establish that boundary before promotion.
