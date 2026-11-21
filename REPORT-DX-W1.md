# DX-W1 part 11

North star P2 and P4. Count serial SQL reads per save and preserve exact current and pinned views. [Scope](lab/SCOPE.md) · [Targets](lab/TARGETS.md).

The integration base is `d1bb9ea9e`. The first write-side slice uses an authoritative root in an isolated native trial. A first eligible replacement takes the old person's live IDs at the guarded cut and puts them into pages of up to 32 IDs. A new version entity carries the assertions and precise retirement markers, with the ordinary journal still under its existing representation. Subsequent replacements change the root and only the affected pages. The legacy rows and legacy revision remain intact.

The authoring scope is deliberately isolated from the product writer. Existing generic writers, import, deferred Publish, protected removal and the complete reader and feed surface do not yet understand the new physical layout. A switch advertised to those callers would risk an incorrect result. The native writer and projection are staged for exact testing, with no new product launch setting or server command.

## Audit

- The native receipt checks the exact root string, accepted position and clock, the added assertion identities and the owner reference of the new version entity. The same native transaction supplies the retirement marker bytes and immutable page bytes. It also verifies the operation, claim and ordinary journal at the committed cut.
- The isolated gate compares the pre-migration legacy rows, post-migration projection and later roots using exact cuts, and checks the named moving revision, journal and operation receipt. Competing native plans come from one cut. The managed run pins the staged inputs and reports the attempt and source with its test counts.
