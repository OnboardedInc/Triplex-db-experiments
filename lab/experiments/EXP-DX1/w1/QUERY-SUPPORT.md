# Query support in version 0.1

## Queries that seek

- A query that names every subject or assertion can seek those histories directly. For example, ask for the `:person/status` of `person:42` at a recorded cut. Adding unrelated accounts does not add rows to that lookup. One person with a very long history can still reach the input limit. A page of simple named-subject patterns takes one gateway request with the point option. Rule evaluation and optional pulls use the general path.

## Queries that read histories

- A query with an unbound subject reads stored history. For example, find every `?person` with `:person/status` equal to `"ready"`. Lean admits up to 100,000 visited input datoms and 16 Mi UTF-16 characters, subject to the request deadline. Exceeding this limit returns `QueryInputBudgetExceeded` with “Lean query exceeded the row source budget.”

## Queries that are declined

- A native program that returns a physical fact number, such as `[:find ?f :in $ $rules :where [?f :f/id "fact-42"]]`, gets `LayoutUnsupported` with “Lean query requires an application attribute and a stable Triplex identity, or a classic scope for physical datoms.” Use the assertion ID to refer to the same fact over time.
- In a scope with a removal policy, queries must name public attributes or the journal in every fact pattern. A value query on a protected field gets `ErasureQueryUnsupported` with “Query must name public attributes or use Match for protected values.” A Match read of that field can return its typed removal marker.

## Two ways to index more journal queries

| Option | Extra records per one- or three-field replacement | What a reader gains |
| --- | ---: | --- |
| Index the stored journal rows by attribute and assertion ID | 3 or 7 | Seek a changed assertion or a selected journal attribute. Estimated key value bytes are 134 or 302 before index encoding. An unrestricted count still has to read its matching rows. |
| Store the journal as native fact entities as well | At least 21 or 49 | Use Datomic's fact indexes directly and project the new physical fact numbers. The fixed row values add about 185 or 421 bytes plus the full change JSON before index overhead. Existing lean facts have no original physical fact numbers to restore. |

Keep K's stored queryable journal for version 0.1. Use its named-subject path in the playground and show the input limit on broad examples. If the one-billion run shows a frequent journal query that can use a selective key, add the narrower index first. Reify facts only for a workload that needs physical Datomic fact numbers.
