# Fresh item4.1 — certification soundness, witness freedom and next boundary

2026-11-01 UTC · **PRIMARY RESEARCH / SAVED-SOURCE REVIEW ONLY**

## Result

Recommend the small **S41-CHECKER-14 source-only specification** in NEXT-SLICE-SPEC.md: two valid deliberately non-BFS SCC witnesses, eight invalid-certificate cases, and two malformed graphs submitted separately to both public APIs. This is 14 proposed API calls, not 14 observed tests. No fixture implementation, generator, campaign, launcher or execution plan was authored.

No definite blocking product defect was found in the inspected saved bodies. That is a bounded static review finding, not syntax/import/runtime/formal-verification acceptance. Important open coverage remains: the current observed semantic units do not establish malformed-certificate rejection, valid auxiliary freedom, or caller-input nonmutation. The proposed slice addresses a small explicit part, not all those obligations.

All project source was fetched literally from the exact remote saves named by the coordinator; no local product or stopped payload was an input. Python 3.11 remains a declared source requirement, not an installation observation. The failed WG21 read, stopped error/carrier publication and old held work were not continued, retried, repackaged or used as dependencies. No deletion/cleanup occurred.

## 1. Primary research and what transfers

The five primary sources below were read successfully on 2026-11-01 in the stated excerpts. The implications for this project are identified separately; none transfers another implementation's correctness, proof artifact, measurements or performance result.

| Primary source / read scope | Factual finding and project consequence |
|---|---|
| McConnell, Mehlhorn, Näher, Schweitzer, *Certifying Algorithms*, author preprint dated 2010-08-30; §§2.4,6.2–7 | Certification binds evidence to the original input. Rejected evidence need not identify a false output rather than a bad witness. Its shortest-distance example needs both inequalities and realizing justification; zero-cost cycles need stronger well-founded justification. **Inference here:** preserve the original graph; malformed evidence is INVALID_CERTIFICATE, not the opposite semantic verdict; do not confuse arbitrary SCC tree depths with shortest-distance labels. [Author preprint](https://people.mpi-inf.mpg.de/~mehlhorn/ftp/master-final.pdf). |
| Alkassar, Böhme, Mehlhorn, Rizkallah, *A Framework for the Verification of Certifying Computations*, arXiv 1301.7462v1; §2 and §§4.1–4.2 | The paper separates implementation/representation correctness from the mathematical witness implication. Its checker specification accepts every witness satisfying the predicate, and rejects witnesses failing it, under stated input preconditions. **Inference here:** testing only producer-generated certificates checks neither completeness for other legal witnesses nor robustness of this project's stricter malformed-input grammar. Formal results for the paper's C/Isabelle artifacts do not verify this Python source. [Primary paper](https://arxiv.org/pdf/1301.7462v1). |
| AFP *ShortestPath* theory, current displayed theory read 2026-11-01; `basic_sp`, `basic_just_sp`, `dist_le_cost`, witness-path sections | The formal text explicitly combines edge triangle inequalities with realizing, decreasing justification. **Inference here:** after reversing orientation and using unit edge count, the selected target-distance proof must check every relevant edge and every non-target, including vertices absent from the returned path. This is a mathematical analogy, not an executed proof or automatic transfer to the project. [Primary formal theory](https://isa-afp.org/browser_info/current/AFP/ShortestPath/ShortestPath.html). |
| Tarjan and Zwick, *Finding Strong Components Using Depth-First Search*, arXiv 2201.07197v3; representation assumptions, §5.2 and §6 | The bidirectional algorithm uses forward finishing order followed by reverse-graph exploration; the second search need not itself be DFS. The paper's O(m) shorthand explicitly assumes n=O(m); its representation/access model is qualified. **Inference here:** retain n for isolated declared vertices, count transpose storage/passes honestly, and do not import a model-specific constant or winner claim. [Primary paper](https://arxiv.org/pdf/2201.07197v3). |
| Mehlhorn, Näher, Sanders, *Engineering DFS-Based Graph Algorithms*, arXiv 1703.10023v1; §§2–3, not experimental tables | The paper analyzes representation, retained traversal state and additional graph passes as distinct engineering factors. **Inference here:** a linear graph kernel is not the complete Python admission/normalization/certification boundary; a simpler two-pass producer can be a conscious correctness choice without a speed claim. No timings, computer configuration or measured comparison is copied into this project. [Primary paper](https://arxiv.org/pdf/1703.10023v1). |

No public read failed in this distinct research round. No paper/PDF payload was locally materialized or hashed; URLs, titles, versions/dates and inspected sections are the reference identities. Public author manuscripts/official formal theory were used, not secondary explanations as technical authority.

## 2. Independent certificate mathematics

### Arbitrary legal SCC trees are complete evidence

For each supplied block, let its least member be root r. A valid out-parent equation decreases bounded nonnegative depth when followed backward; it must reach r and yields r→x. A valid in-parent equation similarly yields x→r. Thus all vertices of a block are mutually reachable. No shortest-tree property is needed.

If two supplied blocks belonged to one true SCC, a path would cross between them and eventually return. Every cross-edge must increase the checked schedule rank, so that return is impossible. Complete partition coverage, both internal trees and every raw cross-edge rank therefore prove exact SCCs without rerunning an SCC solver.

**Consequence:** requiring producer BFS depths/parents would be an incomplete checker. A mutation is not automatically invalid. Both STRATIFIABLE and UNSTRATIFIABLE controls must demonstrate this freedom. This is selected contract C07/C12, not a new relaxation.

### Auxiliary freedom does not relax rejection canonicality

For a selected strict edge u→v, the separate target distances D(x) concern shortest x→u paths. The inequalities D(x)≤1+D(y) for all internal x→y bound D below every path length; a tight decreasing successor from every non-target realizes that length. Minimum tight canonical edge IDs then force the lexicographically least shortest return. Checking just the supplied return path misses false distances elsewhere and hidden shortcuts.

Thus long valid SCC trees can coexist with a one-edge canonical return. Replacing that return by the long auxiliary in-tree path is INVALID_CERTIFICATE, even though it is a real cycle proof. The distinction is central to cases T01–T10.

### Input and malformed evidence are different proof boundaries

The complete graph is admitted before certificate interpretation. A strict edge in an early valid prefix does not excuse a malformed later record. An invalid accepted-family certificate is not repaired into VALID_UNSTRATIFIABLE; invalid rejected evidence is not repaired into VALID_STRATIFIABLE. Exceptional runtime failure is neither a graph verdict nor malformed-evidence proof.

## 3. Saved actual-source findings

All line references below are at product/oracle commit 035e2ab51924f93bacd5fa730c44a85a1e8b892a; exact returned blob identities are in SOURCE-IDENTITIES.md.

- **Checker 58–118:** exact built-in graph/key/scalar admission precedes independent sorted canonical-edge construction. Raw occurrence length is checked before deduplication; kinds are retained separately. No producer helper/import is used.
- **Checker 148–249:** partition coverage/ranges precede indexed use; all four parent/depth arrays have scalar/range validation before any cross-slot depth equation. These bodies do not require BFS depth. The malformed late-depth case is therefore a meaningful robustness obligation, not a source-observed failure.
- **Checker 251–332:** own schedule permutation/rank scan and least-ready heap process; accepted internal-strict and exact-level checks are separate from arbitrary tree evidence. Canonical multiplicity is consistent between indegree and removal.
- **Checker 334–415:** least strict internal ID, all selected-component scalar distances, full raw triangle scan and canonical tight-edge scan precede return-path confirmation. The raw triangle guard examines a full raw scan, even though only selected-component edges generate inequalities.
- **Producer 42–108,123–235,238–462:** separate admission; suspended-frame forward finishing order and reverse traversal; deterministic BFS auxiliary production; independent raw-edge strictness/level work; one selected target-distance construction. No source reason was found to revise the public witness relation or substitute another SCC algorithm.
- **Oracle 35–235:** finite-universe membership, reflexive closure, schedule permutations, synchronous levels and simple-path selection differ structurally from product algorithms. This is bounded tiny-reference source, not a production complexity baseline. It is not needed or invoked by the proposed hand-specified 14-call slice.
- **Suite 151–182,248–283:** append-before-invoke attempt accounting retains exceptional/unassessed/source-error states. The proposed next source must retain this honest ledger principle without calling private fixture factories or broad units implicitly.
- **Coverage gap, not product defect:** the saved semantic/certificate status assessments do not themselves compare complete before/after graph and certificate values. Static product reads appear nonmutating, but future test evidence must not claim caller nonmutation solely from correct status strings. The next specification includes bounded independent value checks.

## 4. Exact saved entrypoints and coverage limits

Only `analyze(graph)` and `check_certificate(graph,certificate)` are public product APIs. The package initializer imports/exports only these; reading it is not an import. Saved source-suite functions accept supplied public callbacks and have no automatic runner. The following are hand-counted source cardinalities conditional on complete ordinary execution, not observed calls:

| Saved source-suite entrypoint | Declared scope / possible completed public calls |
|---|---|
| `run_initial_smoke` | 4 graphs; 8 calls. |
| `run_additional_semantic_cases` | 12 graphs; 24 calls. |
| `run_malformed_graph_cases` | 31 cases; 62 calls, one analyze and one checker per case. |
| `run_certificate_cases` | 57 checker calls; includes 2 valid non-BFS controls and 1 valid exact-duplicate reuse control. No tiny public selector exists. |
| `run_metamorphic_cases` | 20 public calls plus 3 separate zero-call reference-relation records. |
| `run_protocol_cap_cases` | 4 public calls; separately constructed cap-size data. |
| `run_optional_exhaustive_n2` | 4105 graphs; at most 8210 public calls. Not a small robustness subset. |

The coordinator reports two separate actual scopes already observed: four n≤1 smoke graphs/8 calls/checks at a01dd9ca611632a246aee7038554e3b609125b1c, and twelve n≤6,m≤6 semantic fixtures/24 calls/checks with 0 failures/exit 0, source checkpoint 58212164875c4c8062ad852eb9a47cedeb0ac49b. This lane did not reopen result payloads or rerun either scope. Historical UNRUN statements in frozen source/READMEs remain historical, not a newly discovered failure. Malformed inputs/certificates, non-BFS controls, metamorphic/cap and 4105 enumeration remain UNRUN.

## 5. Work bounds and prerequisites

For the general saved design, keep n vertices, m raw occurrences, d canonical edges and k components separate. Graph/certificate passes are O(n+m+d) apart from normalization sorting and least-ready heap costs; the conservative whole boundary is O(n+m log(m+1)+k log(k+1)) logical work and O(n+m+d) retained logical storage. Input validation, duplicate work, all-raw scans and isolated vertices are not free. These are analytic models, not physical memory or performance observations.

A checker with r0 initial ready components uses heapify, k−r0 later pushes and k pops; k admissions must not be relabeled k literal heappush calls. Certificate scalar/null slots are 5n+2k accepted or 5n+k+s+p+1 rejected. An invalid prefix may return early; do not invent full-pass counts for it. The small 14-call family's separate analytic bounds are in NEXT-SLICE-SPEC.md.

**Next boundary:** independently review/select the 14-case specification, then separately author/review its bounded source/ledger/output grammar if authorized. Any later empirical scope remains a separate exact-content/action decision. No source authoring, import/parse/compile/run, deletion, publication or external mutation is authorized by this recommendation. No actual-source defect repair is proposed because no definite product defect was identified. This neither completes 4.1 nor accepts 4/database/Datalog/host/completion semantics.
