# Item 4 independent QA/contract review

Prepared 2026-10-31 UTC. Research/specification only; **all proposed runtime/compiler/oracle/database/test/benchmark cases are UNRUN**. No code, store, protected artifact, Git or Page mutation; no Codex or user-computer task started.

- [Proposed acceptance review](REVIEW/PROPOSED-ACCEPTANCE.md): independent finite predicate-level/full-set oracle, source-order diagnostic proposal, exact hand-derived work/round/fact examples, temporal/legacy/failure envelope, and owned compiler-only IR2 review.
- [Source manifest](SOURCE-MANIFEST.tsv): exact paths, byte lengths and SHA256 of targeted local source/research reads. The published-source entries are the coordinator-approved immutable candidate-002 mirror of expected published head `52b1e81f1d71590bdefb376e62924c9f717d4344`; no remote Git verification was performed in this task. The existing item4 research checkpoint was supplied as private main `ecc8e134b8c130e80b7368ad3e98a2ea89a2cd83`.
- [Append-only operational log](progress.jsonl): meaningful observations and exposed shell chunk correlation IDs, not app/runtime evidence or a private reasoning transcript.

## Source scope and verification limits

The initial six requested item4 research files and eight permitted engine files were read as text. Source identities were first recorded in shell chunk `7ece93` and rechecked unchanged before handoff. New IR2-CONTRACT.md was additionally read only after coordinator direction, first in chunk `6bdfed`; manifest records its contemporaneous content identity. This proposal file can change independently and is not an immutable published code artifact. No sibling goal3 staging/integration or stopped/later item3 backup was inspected.

IR2 readback history: initial17:27 UTC proposal was8,402 bytes / SHA256 `50dd51429b5fb3a008e5f9edbf326b230efcd40827b9555349c3ed00ba469236`; the clarified proposal was reread at17:32 UTC in chunk `a484d1`,8,773 bytes / SHA256 `71bfee9b4fcfb96d3ccec98625c443385c43af936b3dbddcad5c46d4551c627b`. Manifest records the latter. Changes explicitly clarify future-only consumers and logical bytes versus allocator capacities; no new blocking issue was found. This is not a claim that the proposal cannot subsequently change.

IR1 strict-consumer behavior and store transaction/guard observations are carried from the provided research/contract material; this task did not directly inspect `storage/planner_v1.py` or execute any store. No source-only finding repairs the unresolved item3 catalog/attachment gate.

Workspace AGENTS.md's cloud-local reference paths were absent (chunk `7d99f2`); the equivalent current catalog durable-work and cloud-QA skill text was read instead. This did not trigger installation, permission expansion or a harness/Codex task. The initial orchestration expression had a strict-JavaScript keyword syntax error before any nested tool was called; it was corrected. Neither issue involved the application or an approval request.

## Fresh primary references

Retrieved through the read-only web tool on 2026-10-31, approximately 17:18–17:30 UTC. No full external source corpus was saved; these web views therefore have no local byte-identity claim. Citations in the review use direct source URLs.

| Source | Relevant inspected material | Use |
|---|---|---|
| [AHV, Foundations of Databases, chapter 15](https://webdam.di.ens.fr/Alice/pdfs/Chapter-15.pdf) | definition 15.2.4, proposition 15.2.7, theorem 15.2.10, signed graph orientation and ordered semipositive evaluation | Primary relational crosscheck; finite enumeration bound is separately derived |
| [Official Souffle rules](https://souffle-lang.github.io/rules) | positive grounding, negation does not bind, stratifiability restriction | Crosscheck only, not import of its wider language |
| [Official Souffle arguments](https://souffle-lang.github.io/arguments) | wider functor/constructor forms | Read to avoid importing unsupported syntax; no design authority for new values |
| [Official Python numeric types](https://docs.python.org/3/library/stdtypes.html#numeric-types-int-float-complex) | Boolean subtype, unlimited ints, mixed numeric comparisons | Independent oracle hazards; no claim about the app's actual Python runtime |
| [Official Python arithmetic expressions](https://docs.python.org/3/reference/expressions.html#binary-arithmetic-operations) | integer floor division versus project truncation | Independent oracle arithmetic hazard |

## Current boundary

IR2 source-only review found no blocking semantic/ownership/schema issue in the explicit compiler-output proposal. The new query result shape/full budget contract and final coordinator selection are separate gates. Material findings were sent to the coordinator as they arose. Selection, any later implementation/execution and durable publication remain with the coordinator; local files alone are not a remote checkpoint or acceptance evidence.
