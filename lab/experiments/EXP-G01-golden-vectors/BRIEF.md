# EXP-G01 golden vectors for Triplex's competing contracts (shared)

## Commander's intent
Freeze independently derived expected answers for the cases where Triplex has two contracts that look alike and are not:
the ordinary raw assertion-lifetime contract versus the as-of snapshot-assertion target; write-time cardinality that counts
assertions versus read-time decoding that deduplicates equal values; the documented `_Transaction` journal facts versus
values derived from ledger rows; duplicate supports; card-one conflicts per PLAN v1 C5; and the five failing historical
retirement-metadata checks. Falsifiers F03/F04, the independent oracle (EXP-O01) and the entity suite then compare engines
against these vectors, so no production behavior gets to define its own expected answer.

## Point of view
- Derive by hand from documentation and contract text (docs/, wiki/, handoffs/claude-native/README.md, packages/core public
  type contracts, lab/acceptance/ACCEPTANCE.md once EXP-A01 lands, PLAN v1 C5 and C6), never by running Triplex or reading
  adapter output. Cite the sentence or type that determines each expected value.
- Where documentation is silent or two sources disagree, write the case with `expected: AMBIGUOUS`, both readings, and the
  sources; the orchestrator decides. Do not pick silently.
- Vector format (JSON): id, contract, command stream (explicit command ids, actors, validFrom/validTo, entity types), queries
  (public API call, basis), expected output (exact JSON including metadata fields), expected errors, and source citations.
- A second, independent reviewer agent checks every vector before the orchestrator freezes them (the orchestrator arranges it).

## Deliverables
`lab/acceptance/golden/*.json` plus `lab/acceptance/golden/README.md` (contracts covered, ambiguities, citations). No source
changes, no engines.
