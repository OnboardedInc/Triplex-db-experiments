`client-before-j01.ts` is an unmodified immutable differential reference from
`83b384334610043bd29ccc7f2b5f0ba0384361bc:packages/xtdb/src/XtdbClient.ts`
(the merge base used by independent review `verify/J01`). Regenerate only when deliberately
changing the compatibility baseline:

```sh
git show 83b384334610043bd29ccc7f2b5f0ba0384361bc:packages/xtdb/src/XtdbClient.ts > packages/xtdb/test/fixtures/client-before-j01.ts
```

The test mocks the transport driver for both clients, comparing query/submit and both native
provider routes at OID, value, SQL and serialized JSON input level. It does not prove live engine
answers. The reference is test-only and never part of public package builds.
