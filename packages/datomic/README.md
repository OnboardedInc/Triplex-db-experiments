# Experimental Datomic lane skeleton

Private lab package for Datomic Pro 1.0.7745. This provides the HTTP client and exact tagged codec;
EXP-DA01 will add storage integration. It does not yet implement a Triplex storage adapter.

The gateway uses distribution-provided Ring/Jetty and data.json. Their hashes, the independently
checked peer JAR, signing fingerprint and base image identity are in `lab/config/datomic/verification.json`.
No new Maven or npm runtime dependencies are introduced. Build and test tools come from the pinned
workspace root. `engine.mjs build --lane datomic` uses the verified host extraction, binds the complete
input tree into an image label, and records its local image ID in slots.json. Set `TX2_CONFIG_DIR`
to this checkout before running an unmerged engine configuration.

Create/delete accept only a serialized five-string `triplex-scope-v1` tuple with environment `test`.
Database names derive from the full serialized tuple; initialization stores that exact string.
`recordedAt` is null at this skeleton stage because no Triplex commits exist yet.

Wire doubles are JSON numbers. Use `encodeTagged` or `stringifyExact` to preserve negative zero;
plain `JSON.stringify` erases its sign. Long, reference, instant, bigint and bigdec values use strings.
Bigdec text preserves scale, including scientific notation. NaN and infinities fail at both ends.

Run `engine.mjs selftest --lane datomic --holder EXP-DA00` through the heavy wrapper. It reserves
1.5 GiB against the common pool and runs the Clojure tests on real `datomic:mem://` databases with
network disabled. Only the orchestrator parks the resident after builder handoff.
