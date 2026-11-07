# Primary sources and evidence limits

Research consulted public primary papers, author-hosted primary manuscripts, institutional repositories for those papers, publisher abstracts, and official documentation. Search-result summaries were discovery aids, not substitute proof authority. No public repository implementation, private source, stopped payload, old local artifact, or computer inventory was used.

Access date for the sources below: 2026-10-31 UTC. No source PDF, screenshot, external code, or installed tool was imported into this package. All source links are public web references. The report paraphrases limited findings and supplies its own mathematical derivations; it does not reproduce papers or their code.

## S1 Original predicate stratification

Krzysztof R. Apt, Howard A. Blair, and Adrian Walker. 1988. Towards a Theory of Declarative Knowledge. In Foundations of Deductive Databases and Logic Programming, pages 89–148. Morgan Kaufmann.

- [Institutional record](https://ir.cwi.nl/pub/10404)
- [Primary chapter PDF](https://ir.cwi.nl/pub/10404/10404D.pdf)
- Inspected: definitions 3 and 4 and Lemma 1, printed pages 96–98.
- Used for: original positive versus negative stratification ordering, head-to-body direction, and negative-cycle characterization.
- Limit: not a project input format, parser, runtime, or aggregate policy.

## S2 Original DFS graph bound

Robert Tarjan. 1972. Depth-First Search and Linear Graph Algorithms. SIAM Journal on Computing 1(2), pages 146–160. DOI 10.1137/0201010.

- [Publisher page and abstract](https://epubs.siam.org/doi/10.1137/0201010)
- Inspected: publisher search-returned abstract and bibliographic details. A direct page fetch timed out; the full original article was not read in this round.
- Used only for: original stated graph-size linear time and space bounds. Detailed algorithms are supported by S3 instead.
- Limit: an abstract source bound is not measured project performance.

## S3 SCC algorithms and certifying extensions

Robert E. Tarjan and Uri Zwick. 2022. Finding Strong Components Using Depth-First Search. arXiv:2201.07197v3, revised 11 April 2022.

- [Versioned record](https://arxiv.org/abs/2201.07197v3)
- [Full primary text](https://arxiv.org/html/2201.07197v3)
- Inspected: assumptions in section 1; SCC and condensation facts in section 3; in-tree and out-tree certification in section 3.3; nonrecursive discussion in section 6.
- Used for: algorithm families and source assumptions, reverse output order, certifying final graph structure, and iterative-DFS caution.
- Limit: paper algorithms and invariants do not verify any new implementation. Its O(m) abbreviation has an explicit n=O(m) assumption.

## S4 SCC certificate paper with textual defects

Tadej Borovšak and Jurij Mihelič. 2016. Certifying Algorithm for Strongly Connected Components. Proceedings of ERK 2016, volume B, pages 7–10.

- [Primary paper PDF](https://ucilnica.fri.uni-lj.si/pluginfile.php/168375/mod_resource/content/1/erk.pdf)
- Inspected: selected text across all four pages, especially sections 2.2 and 4 and the final maximality argument.
- Used for: historical certificate approach and explicit source audit.
- Not adopted: adjacency-matrix linear-traversal statement; P5 wording that incorrectly excludes one-way paths between different SCCs; pseudocode or checker implementation.
- Correct obligation here is no mutual reachability between distinct certified blocks, proved by all-edge increasing ranks.

## S5 Certifying algorithm framework and distance example

Ross M. McConnell, Kurt Mehlhorn, Stefan Näher, and Pascal Schweitzer. Certifying Algorithms. Computer Science Review 5(2), pages 119–161, 2011. DOI 10.1016/j.cosrev.2010.09.009. Consulted author-hosted preprint dated 30 August 2010.

- [Primary author-hosted preprint](https://www.mpi-inf.mpg.de/~mehlhorn/ftp/CertifyingAlgorithms.pdf)
- Inspected: sections 1, 2.4, 5, and 6.
- Used for: input-output-witness separation, small independently justified checkers, distance inequalities and realizing witnesses, and zero-weight circular-justification warning.
- Limit: no implementation or proof artifact was imported or run. This package independently specializes the graph assertions.

## S6 Proof of witness relation versus checker code

Eyad Alkassar, Sascha Böhme, Kurt Mehlhorn, and Christine Rizkallah. 2013. A Framework for the Verification of Certifying Computations. arXiv:1301.7462v1. Later journal publication: Journal of Automated Reasoning 52(3), pages 241–273, 2014, DOI 10.1007/s10817-013-9289-2.

- [Primary manuscript record](https://arxiv.org/abs/1301.7462)
- [Primary manuscript PDF](https://arxiv.org/pdf/1301.7462)
- Inspected: introduction and framework sections.
- Used for: separating witness soundness, checker correctness, and instance claims.
- Limit: no claim that this revision or a project checker has been formally verified.

## S7 Mechanized Tarjan theory at an abstract level

Ran Chen, Cyril Cohen, Jean-Jacques Lévy, Stephan Merz, and Laurent Théry. 2019. Formal Proofs of Tarjan’s Strongly Connected Components Algorithm in Why3, Coq and Isabelle. LIPIcs 141, article 13, pages 13:1–13:19. DOI 10.4230/LIPIcs.ITP.2019.13.

- [Publisher record](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ITP.2019.13)
- [Primary paper PDF](https://drops.dagstuhl.de/storage/00lipics/lipics-vol141-itp2019/LIPIcs.ITP.2019.13/LIPIcs.ITP.2019.13.pdf)
- Inspected: sections 1–2 and the proof-invariant discussion.
- Used for: formal proof obligations and the limit of transferring abstract correctness to executable code.
- Limit: proof assistants, supplementary proofs, and any code were not run or imported.

## S8 Aggregate semantics are not universal strictness

Kenneth A. Ross and Yehoshua Sagiv. 1997. Monotonic Aggregation in Deductive Databases. Journal of Computer and System Sciences 54(1), pages 79–97. DOI 10.1006/jcss.1997.1453. Preliminary conference version: PODS 1992, pages 114–126.

- [Publisher abstract](https://www.sciencedirect.com/science/article/pii/S0022000097914537)
- [Author publication list confirming versions](https://www.cs.columbia.edu/~kar/pubsk/test.html)
- Inspected: publisher abstract returned in search and author bibliography. Direct publisher full-page access returned HTTP 403; full paper was not read.
- Used only for: existence of conditional monotonic aggregate semantics not requiring blanket aggregate stratification.
- Limit: no particular aggregate operator, lattice, or project policy is proved correct by this abstract-only use.

## S9 Dependency extraction is a separate soundness boundary

Jonathan Lindegaard Starup, Magnus Madsen, and Ondřej Lhoták. 2023. Breaking the Negative Cycle Exploring the Design Space of Stratification for First-Class Datalog Constraints. LIPIcs ECOOP 2023, article 31, pages 31:1–31:28. DOI 10.4230/LIPIcs.ECOOP.2023.31.

- [Primary paper PDF](https://drops.dagstuhl.de/opus/volltexte/2023/18224/pdf/LIPIcs-ECOOP-2023-31.pdf)
- Inspected: background dependency definitions and section 5's sound-overapproximation criterion.
- Used for: distinction between checking a graph and proving a source-to-graph dependency abstraction.
- Limit: no Flix code, type analysis, monomorphization, reachability pruning, or program adapter was adopted. Full declared graph coverage remains mandatory here.

## S10 Official output direction example

Boost C++ Libraries. Official Boost Graph topological_sort documentation, online page consulted on the access date.

- [Official documentation](https://www.boost.org/doc/libs/latest/libs/graph/doc/html/graph/algorithms/topological_sort/topological_sort.html)
- Inspected: description and output-iterator contract.
- Used only for: a concrete official warning that a topological-sort API can emit reverse topological order.
- Limit: this is not an implementation selection, installed-version claim, dependency pin, or project import. The mutable latest URL is evidence only for what was read on the access date.

## Sources discovered but not relied on

- Arthur B. Kahn, Topological Sorting of Large Networks, Communications of the ACM 5(11), pages 558–562, 1962, DOI 10.1145/368996.369025. The primary DOI fetch returned HTTP 403, so no detailed statement from the article is relied on. The report's least-ready scheduling proof is given independently.
- Apt and Pugin, Management of Stratified Databases, CWI report CS-R8760. A public PDF was opened during discovery but its database-management mechanisms were not used. They are outside this graph-certificate task.
- Soufflé official aggregate documentation was opened during discovery. Its language syntax and restrictions were not adopted. No native syntax candidate was created from it.
- A public general-game-playing report mentioning maximum negative-edge path counts was discovered, but its direct fetch was unavailable; it is not proof authority for the independently derived least-level recurrence.

## Evidence coverage matrix

| Question | Published evidence | Independent result in this package |
|---|---|---|
| Positive and negative predicate ordering | S1 | Explicit producer-to-consumer inequality and A1–A3 |
| Exact component certification | S3 and audited S4 | A6–A7 with original-edge ranks and depth-checked trees |
| Least levels | S1 establishes stratification framework; S5 cautions about circular local support | A4–A5 and F12 derive the quotient recurrence and counterexample |
| Valid rejection | S1's cycle characterization | A9 and simple strict-edge return witness |
| Canonical rejection | S5's distance-certificate pattern | A10 plus exact SCCs, complete strict-edge scan, and lexicographic return proof |
| Iterative SCC producer | S3 and S7 | Unselected family and future invariant obligations only |
| Graph extraction and aggregates | S8 and S9 | A15 separates graph semantics from adapters and evaluators |
| Logical versus empirical costs | S2 and S3 assumptions | A16 and report's explicit cost model; no measured result |

No source is cited as evidence that item4 or item4.1 has been implemented, tested, benchmarked, admitted, compiled, or completed.
