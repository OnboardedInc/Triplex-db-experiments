---
"@triplex-build/triplex": minor
"@triplex-build/triplex-http": patch
---

Add the `@triplex-build/triplex/entity` subpath: the content-addressed `ProjectionSpec` compiler (XTDB and RDF physical names, one declared type per attribute per engine, exactness rules, collision checks), the release descriptor compiler and entity codec moved from the http package (http behavior unchanged), and the typed repository, writer and projection-plan interfaces (behavior pending). `Attribute.use`, `Attribute.ref` and EntityType handles now keep literal `required`, `cardinality` and ref-target types.
