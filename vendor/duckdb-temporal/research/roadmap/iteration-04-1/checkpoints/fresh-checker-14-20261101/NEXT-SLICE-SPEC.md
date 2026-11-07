# S41-CHECKER-14 — proposed independent robustness specification

2026-11-01 UTC · **SPECIFICATION TEXT ONLY; NOT SELECTED, MATERIALIZED OR EXECUTABLE**

This is a small next source-only slice, not an execution plan or permission. No fixture files, generator, campaign, launcher, commands or project API invocation were produced. Every proposed case is **UNRUN**. Expected answers below follow the selected contract and independent hand mathematics, not a product helper/output.

## 1. Exact data notation

All graph objects have exactly `schema=item4.1-graph-v1`, `direction=producer_to_consumer`, `n`, and `edges`. A graph edge table below specifies the raw list order; each record is an exact three-element built-in list. Kind P means the exact string `positive`, N means `negative`; these are specification abbreviations, not a new input encoding. Every admitted integer/str/list/dict is exact built-in type; Boolean is not an integer field. All omitted mutations leave the other fields unchanged.

Each certificate has exact schema `item4.1-certificate-v1` and exactly the selected verdict family's keys. Parent/depth/member/schedule/distance/path arrays are exact built-in lists. `None` below denotes only null root-parent slots. Each prospective call receives fresh graph/certificate values; no product output, shared mutable template or previous call supplies a reference.

### Graph A — positive, with shortcuts

n=4, with eight raw/canonical edges:

| Canonical ID | Triple |
|---:|---|
|0|0→1 P|
|1|0→2 P|
|2|0→3 P|
|3|1→0 P|
|4|1→2 P|
|5|2→0 P|
|6|2→3 P|
|7|3→0 P|

### Graph R — same positive graph plus strict parallel edge

n=4, with nine raw/canonical edges; the added kind changes subsequent IDs:

| Canonical ID | Triple |
|---:|---|
|0|0→1 P|
|1|0→1 N|
|2|0→2 P|
|3|0→3 P|
|4|1→0 P|
|5|1→2 P|
|6|2→0 P|
|7|2→3 P|
|8|3→0 P|

IDs are independently obtained by lexicographic (tail,head,kind-code0/1) order, not by copying source occurrence positions or asking a normalizer.

## 2. Two complete hand-derived legal certificates

Both use `components=[[0,1,2,3]]`, `schedule=[0]`, `out_depth=[0,1,2,3]`, `in_depth=[0,3,2,1]`. Root is 0. Their other fields are:

| Field | Certificate A | Certificate R |
|---|---|---|
|verdict|STRATIFIABLE|UNSTRATIFIABLE|
|out_parent|[None,0,4,6]|[None,0,5,7]|
|in_parent|[None,4,6,7]|[None,5,7,8]|
|levels|[0]|absent|
|strict_edge|absent|1|
|return_path|absent|[4]|
|target_distances|absent|[0,1,1,1]|

Together with the schema, each A dictionary has exactly 9 fields and each R dictionary exactly 11.

**Independent proof.** The out-tree is 0→1→2→3. The in-tree is 1→2→3→0. All six non-null parent equations hold and depths are≤3. Direct 0→2/0→3 and 1→0/2→0 shortcuts show these are deliberately non-BFS trees in both directions. Root-mediated paths prove one SCC; one component has the only schedule [0]. A has only positive edges and least level 0. R's only strict edge is ID 1 and its one-edge shortest return is 1→0, ID 4. Every non-target has a direct edge to 0, so distances are exactly [0,1,1,1], including vertices 2/3 not used by that return. The longer auxiliary in-tree route is **not** substituted for the canonical rejection path.

## 3. Exact proposed call ledger

T01–T10 each name one checker call only. No producer or reference/oracle call is hidden in their construction. G Boolean below has n=True and an empty edge list, with correct graph schema/direction. G suffix has n=4, all nine R records in the displayed order, then `[2,2,"mystery"]` as its tenth record. The two malformed-graph checker cases receive an exact empty list as the certificate argument; graph error must win over that malformed certificate.

| ID | Public API / arguments | Exact expected ordinary return and reason |
|---|---|---|
|T01 CHECK_A_NON_BFS|checker, graph A/certificate A|VALID_STRATIFIABLE. Legal auxiliary freedom, not producer-byte equality.|
|T02 CHECK_R_NON_BFS|checker, graph R/certificate R|VALID_UNSTRATIFIABLE. Legal long SCC trees coexist with canonical short return.|
|T03 CHECK_A_LATE_BAD_DEPTH|checker, A/A except `in_depth[2]=[]`|INVALID_CERTIFICATE. Every scalar must be validated before vertex 1's parent relation could read vertex 2's depth. No escaping arithmetic exception is a passing result.|
|T04 CHECK_A_DEPTH_EQUATION|checker, A/A except `out_depth[2]=1`|INVALID_CERTIFICATE. Parent 1 has depth 1, so child 2 needs depth 2.|
|T05 CHECK_A_EDGE_DIRECTION|checker, A/A except `out_parent[2]=5`|INVALID_CERTIFICATE. ID 5 is 2→0, not a parent edge ending at2; range alone is insufficient.|
|T06 CHECK_A_BOOL_DEPTH|checker, A/A except `out_depth[2]=True`|INVALID_CERTIFICATE. Exact-int rule rejects Boolean before any equation.|
|T07 CHECK_R_OFFPATH_DISTANCE|checker, R/R except `target_distances[2]=2`|INVALID_CERTIFICATE. Unused vertex 2 has edge2→0, so 2≤1+0 fails. Supplied return [4] itself is unchanged and legal.|
|T08 CHECK_R_LONG_RETURN|checker, R/R except `return_path=[5,6]`, `target_distances=[0,2,1,1]`|INVALID_CERTIFICATE. The real 1→2→0 path realizes the claimed 2, but direct 1→0 forces a shorter distance. This is not the permissible auxiliary-tree freedom.|
|T09 CHECK_R_NONSTRICT_ID|checker, R/R except `strict_edge=0`|INVALID_CERTIFICATE. ID 0 is positive; selected strict internal minimum is 1. A graph's true rejection does not rescue invalid evidence.|
|T10 CHECK_R_FALSE_ACCEPT|checker, R with accepted-family certificate using R's common fields/auxiliary arrays, verdict STRATIFIABLE and `levels=[0]`; omit all 3 rejection fields|INVALID_CERTIFICATE. The valid common SCC evidence does not erase the strict internal edge. Do not return the opposite valid verdict.|
|T11 ANALYZE_BOOL_N|analyze, G Boolean|INVALID_INPUT. Exact-int graph rule.|
|T12 CHECK_BOOL_N|checker, G Boolean/empty-list certificate|INVALID_INPUT, not INVALID_CERTIFICATE. Graph admission precedence.|
|T13 ANALYZE_BAD_SUFFIX|analyze, G suffix|INVALID_INPUT. Complete graph validation precedes an early strict-cycle verdict.|
|T14 CHECK_BAD_SUFFIX|checker, G suffix/empty-list certificate|INVALID_INPUT. Full graph error outranks malformed evidence.|

**Conditional full-completion ledger:** exactly 14 attempts, 14 ordinary returns and 14 expected-classification comparisons: 12 checker calls and 2 analyze calls; 2 valid results, 8 INVALID_CERTIFICATE and 4 INVALID_INPUT. Additional harness-level public API/reference/oracle calls=0; the harness invokes no product-private helper. Ordinary internal implementation calls are not suppressed or counted as extra public invocations. These numbers are a future source contract, not observations.

Append a fixed-ID attempt entry before each invocation and retain its outcome before assessing it. In-flight, exception/interruption, unassessed, mismatch, input mutation and source/record failure are nonpassing/incomplete, never fabricated returns or successful zero-call cases. No retries, fallback campaign, silently skipped control or complete-green partial ledger. Later exact source/output review is required; this prose supplies no controller or action scope.

## 4. Input nonmutation and expected-answer independence

The later source must preserve independent pre-call value snapshots, not aliases to the same caller objects, and compare the complete bounded values afterward. No hash-only comparison, repr/serialization or product-derived expected answer is sufficient. This yields 26 separately labeled argument-value checks if fully completed: 2 analyze graph checks plus 12·2 checker argument checks. Keep these distinct from 14 return-classification checks and from 14 API calls; they are not 40 calls.

The snapshot relation is finite and literal for this slice; it does not recurse through arbitrary hostile objects. If an argument no longer has its exact predeclared container/scalar shape, classify mutation without traversing arbitrary replacement content or invoking a generic deepcopy/formatter. No custom classes/hooks, subclasses, recursive objects, large integers/strings, graph caps or mutation campaign are part of these 14 cases. Those saved broad-suite obligations remain separate and UNRUN. This narrow slice does not prove that user-defined methods are never consulted on all malformed objects.

## 5. Analytic admission and work bounds

- All admitted graphs have n=4 and one true SCC, d=m=8 or 9. The malformed suffix has 10 raw occurrences; Boolean-n is rejected before graph sizing. No valid raw endpoint exceeds 3; no valid canonical ID exceeds 8. Certificate array shapes fit n=4, and listed path length is at most 2. A has 22 scalar/null certificate array slots; R has 27, or 28 for the invalid longer-path variant. These are logical slot counts, not bytes or physical capacity.
- Five certificate cases use A and five use R, so successful graph admission in the ten checker calls examines at most 5·8+5·9=85 records. Two suffix calls contribute at most 20 more; the two Boolean-n calls contribute 0. Hence **≤105 raw-record examinations,≤210 endpoint checks,≤105 kind checks** across the proposed slice, before any exceptional failure. These are analytic upper bounds, not exposed product counters or execution measurements.
- Only the ten valid-graph checker calls can normalize:≤85 sortable triples,≤75 adjacent duplicate comparisons and≤85 canonical emissions across them. Sorting comparisons remain a separate comparison-sort term; they are not silently included in those 75. Malformed graph admission precedes sorting.
- Per certificate call, partition/auxiliary checks have at most 4 member slots, 16 parent/depth slots and 6 non-null parent references/equations. Across ten calls the corresponding safe upper bounds are 40/160/60. Invalid cases may stop sooner; no complete-pass counter is asserted for them.
- General helper/certificate work remains O(n+m log(m+1)+k log(k+1)) under the selected indexed/comparison model. Here k=1 on all admitted graphs; at most one ready entry is initially heapified, with no later admission from a cross edge. Do not call this one literal heappush: the saved checker uses heapify. All-raw rank/distance passes and canonical-edge scans remain distinct; selected-component triangle checks do not erase the full raw examination pass.
- No closure/permutation/simple-path oracle work is performed or budgeted in this slice. Independent hand proof replaces invoking an oracle, not the product's graph validation. Expected work is finite and input-derived; no wall time, allocator, stack, resident memory or resource-capacity guarantee follows.

## 6. Unclosed source/action prerequisites

This recommendation still needs independent spec selection, then separately authorized new source/ledger/output-grammar authoring and actual-source review. The saved `run_certificate_cases` calls 57 cases and `run_malformed_graph_cases` calls 62 APIs; neither can be invoked and relabeled this 14-call scope. A new bounded selector/entrypoint would need exact reviewed source; this document does not select or implement it. No private case factory or broad reference construction may silently materialize extra cases/calls.

No empirical stage, dependency probe, installation, import/parser, command, external save, deletion or old held action is opened. Any later action would require its own current exact-content and permission review. All current empirical claims remain limited to the two coordinator-reported earlier scopes, not this new specification.
