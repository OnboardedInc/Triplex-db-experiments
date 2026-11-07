# Item4.1 verification primary-source bibliography

This is the bibliography section of the newly authored verification revision001. Operational acquisition records are not part of this curated research collection. The source revision remains unchanged; no empirical check or contract selection is claimed.

## Primary-source bibliography and evidence role

Source acquisition was public-web reading only. The numbered sources are evidence for theory, methodology, data-format behavior or language/library properties; none is empirical evidence that a proposed item 4.1 implementation exists or works. Graph-specific witness sketches, fixtures, counter formulas and metamorphic relations are fresh deductions for the supplied scope, not implementations claimed to appear in these sources.

### S01 — classical signed-dependency condition

Krzysztof R. Apt, Howard A. Blair, Adrian Walker. **Towards a Theory of Declarative Knowledge.** In *Foundations of Deductive Databases and Logic Programming*, pp. 89–148, 1988. Definition 4 and Lemma 1, printed pp. 97–98.

- Primary institutional full text: [CWI chapter PDF](https://ir.cwi.nl/pub/10404/10404D.pdf).
- Institutional bibliographic page: [CWI record](https://ir.cwi.nl/pub/10404).
- Used for the signed-cycle stratification characterization and simultaneous positive/negative pair observation. Aggregate strictness comes from the task, not from an extension attributed to this chapter.
- Version status: published chapter identified by institutional repository; no PDF bytes copied locally.

### S02 — SCC certifiability and non-recursive graph algorithms

Robert E. Tarjan, Uri Zwick. **Finding Strong Components Using Depth-First Search.** arXiv:2201.07197v3, revised 11 April 2022. Particularly §§1, 3.3, 6.

- Versioned primary author paper: [v3 HTML](https://arxiv.org/html/2201.07197v3).
- Used for in/out-tree plus component-order SCC certification, loops/parallel arcs, and non-recursive traversal alternatives. The paper's particular low-level memory-access counts are **not** transplanted to this tool.
- Version status: pinned arXiv v3.

### S03 — linear SCC theory and computation model

Robert Tarjan. **Depth-First Search and Linear Graph Algorithms.** *SIAM Journal on Computing* 1(2), 146–160, June 1972. DOI 10.1137/0201010.

- Primary publisher page: [SIAM](https://epubs.siam.org/doi/10.1137/0201010).
- University-hosted paper copy inspected as extracted public text: [CMU PDF](https://www.cs.cmu.edu/~cdm/resources/Tarjan1972-sccs.pdf).
- Used for the historical linear graph bound/random-access model; not a benchmark or proof of a new implementation.
- Version status: published work; hosted copy is not a cryptographically pinned byte artifact.

### S04 — checker correctness versus witness theorem

Eyad Alkassar, Sascha Böhme, Kurt Mehlhorn, Christine Rizkallah. **A Framework for the Verification of Certifying Computations.** arXiv:1301.7462v1, 30 January 2013; manuscript corresponding to *Journal of Automated Reasoning*.

- Primary author manuscript: [HTML](https://arxiv.org/html/1301.7462), [versioned abstract record](https://arxiv.org/abs/1301.7462v1).
- Used for the separation of the witness property, checker implementation and input preconditions. No formal verification of the proposed graph checker is claimed.
- Version status: fetched HTML declares v1; paper identity pinned by the versioned record.

### S05 — corroborating SCC certificate paper, with cautions

Tadej Borovšak, Jurij Mihelič. **Certifying Algorithm for Strongly Connected Components.** Four-page university-hosted paper; publication year not established from the successfully fetched PDF.

- Primary university copy: [paper PDF](https://ucilnica.fri.uni-lj.si/pluginfile.php/168375/mod_resource/content/1/erk.pdf).
- Used cautiously as corroboration of two-tree certificates and to flag its extracted P5/no-path and adjacency-matrix wording. Those statements are not adopted as mathematical or cost premises.
- Version status: university-hosted unversioned PDF. A separate conference URL appeared in search but failed to open; no date or full-text conclusion is inferred from it.

### S06 — all-source reachability reference

Robert Sedgewick, Kevin Wayne. **TransitiveClosure**, official *Algorithms, 4th Edition* reference documentation.

- [Official API page](https://algs4.cs.princeton.edu/code/javadoc/edu/princeton/cs/algs4/TransitiveClosure.html).
- Used for all-source DFS reachability and its stated time/space family.
- Version status: moving official documentation, retrieved during the acquisition window below; not an installed-library claim.

### S07 — Boolean Warshall reference

Robert Sedgewick, Kevin Wayne. **WarshallTC.java**, official *Algorithms, 4th Edition* source documentation.

- [Official source page](https://algs4.cs.princeton.edu/42digraph/WarshallTC.java.html).
- Search-indexed official-source excerpt supplied the cubic/quadratic bound and diagonal initialization. A direct opening returned 403, so complete source-page retrieval is not claimed.
- Version status: moving official source page; partial indexed-text evidence only.

### S08 — graph representation

Boost Graph Library. **Compressed Sparse Row Graph**, versioned 1.85.0 documentation.

- [Official versioned reference](https://www.boost.org/doc/libs/1_85_0/libs/graph/doc/compressed_sparse_row.html).
- Used only for CSR layout and its representation bound; no Boost dependency is selected.
- Version status: explicitly versioned documentation reference, not a project/toolchain pin.

### S09 — adjacency lookup and degree caution

Boost Graph Library. **Using adjacency_list**, versioned 1.85.0 documentation.

- [Official versioned reference](https://www.boost.org/doc/libs/1_85_0/libs/graph/doc/using_adjacency_list.html).
- Used for the warning that average degree is not a worst-case degree bound and for lookup-container cost distinctions.
- Version status: explicitly versioned documentation reference, not an installation observation.

### S10 — JSON interoperability

Tim Bray, editor. **RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format.** December 2017, Standards Track.

- [RFC Editor text](https://www.rfc-editor.org/rfc/rfc8259.html).
- Used for repeated-member interoperability and implementation-limit considerations. RFC 8259 alone is not a graph schema.
- Version status: fixed RFC identifier.

### S11 — canonical JSON limitations

Anders Rundgren, Bret Jordan, Samuel Erdtman. **RFC 8785: JSON Canonicalization Scheme (JCS).** June 2020, Informational.

- [RFC Editor text](https://www.rfc-editor.org/rfc/rfc8785.html).
- Used for preservation of array order, object-key ordering, Unicode preservation and numeric restrictions. Not misrepresented as graph canonicalization or a standards-track graph protocol.
- Version status: fixed RFC identifier.

### S12 — metamorphic testing

T. Y. Chen, S. C. Cheung, S. M. Yiu. **Metamorphic Testing: A New Approach for Generating Next Test Cases.** Technical Report HKUST-CS98-01, 1998; author-deposited arXiv:2002.12543v1 in 2020.

- [Versioned primary record](https://arxiv.org/abs/2002.12543v1).
- Used for the method's follow-on input/output-relation idea, not as empirical evidence for this graph tool. The full university PDF timed out; the author-deposited abstract/record was available.
- Version status: pinned arXiv v1 record; do not confuse the deposit date with the report's 1998 date.

### S13 — differential testing

William M. McKeeman. **Differential Testing for Software.** *Digital Technical Journal* 10(1), 100–107, 1998.

- Primary paper in university archive: [PDF](https://www.cs.tufts.edu/comp/150FP/archive/bill-mckeeman/DifferentailTesting.pdf).
- Used for discrepancy-based differential testing, not majority-vote truth or any compiler activity in this round.
- Version status: published primary paper, unversioned university-hosted copy.

### S14 — mutation-testing methodology

Yue Jia, Mark Harman. **An Analysis and Survey of the Development of Mutation Testing.** *IEEE Transactions on Software Engineering* 37(5), 649–678, 2011. DOI 10.1109/TSE.2010.62.

- Primary publisher page returned by search: [IEEE page](https://xplorestaging.ieee.org/document/5487526).
- Used narrowly for fault-based mutation-testing terminology and limitations, not to claim a measured mutation result. This is a primary authors' survey publication rather than an implementation source for the graph tool.
- Version status: published article identity; publisher abstract/metadata evidence, not a locally retained full paper.

### S15 — Python JSON behavior

Python Software Foundation. **json — JSON encoder and decoder**, Python 3.11 official documentation.

- [Official documentation](https://docs.python.org/3.11/library/json.html).
- Used for default repeated-name behavior and the untrusted-input resource warning. No Python runtime or version was inspected.
- Version status: minor-version documentation URL; moving patch documentation.

### S16 — recursion-limit caution

Python Software Foundation. **sys.setrecursionlimit**, Python 3.11 official documentation.

- [Official documentation](https://docs.python.org/3.11/library/sys.html#sys.setrecursionlimit).
- Used only for why raising a limit is not a general deep-graph remedy. No runtime limit was queried or changed.
- Version status: minor-version documentation URL; moving patch documentation.

### S17 — ECMAScript numeric identity

Ecma International. **ECMA-262, 17th edition, ECMAScript 2026**, Number.MAX_SAFE_INTEGER.

- [Official edition](https://262.ecma-international.org/17.0/#sec-number.max_safe_integer).
- Used for Number's exact integer identity boundary, not capacity, installation, or selection of a JavaScript runtime.
- Version status: fixed edition URL. A search also returned a later draft; the draft is not the cited premise.

### S18 — Rust fallible vector reservation

Rust Project. **std::vec::Vec::try_reserve**, official standard-library documentation.

- [Official documentation](https://doc.rust-lang.org/std/vec/struct.Vec.html#method.try_reserve).
- Used as a source-language/library design option for allocation-failure reporting. No installed Rust toolchain or allocation was inspected.
- Version status: moving stable documentation; no project pin selected.
