# Triplex playground for local agents

Run `pnpm playground start` from the repository root using Node 22.18+, pnpm 10.11 and a running Docker daemon. Use the loopback address printed after seeding. The process stays in the foreground. Run `pnpm playground stop` from another terminal to remove its database and service. Downloaded dependency caches can be reused.

Start a prepared snapshot with `pnpm playground start --tier NAME --data SOURCE`. `SOURCE` is the directory or HTTPS base containing its `manifest.json`. `PLAYGROUND_DATA_URL` can supply the source instead. Startup verifies the archive and compares generated records at two historical cuts and the current cut before enabling the actions. Use `pnpm playground start --tier full --replay --data SOURCE` for the compact history bundle.

## HTTP and MCP

- Fetch `/openapi.json` for action names and input schemas. Send JSON objects to `POST /api/{action}` with `Content-Type: application/json`.
- For MCP Streamable HTTP, configure the printed address plus `/mcp`. For MCP stdio, set command `node`, arguments `["examples/playground/cli.ts", "mcp"]` and the repository as the working directory. The stdio server forwards calls to the already-running local service.
- Every action reply has `ok`, `records`, `position`, `receipt` and `timings`. An error adds `error.code` and `error.message`. Positions are Triplex commit cuts. Feed cursor strings are physical Datomic ticks. Timing columns show observed spans where available and may overlap. Null timing fields indicate unavailable measurements. [MCP transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

## Common workflows

1. Call `accounts` with `{}`, then `people` with `accountId`. Use the returned `personId` from the row's `id`. Call `current` and `earlier` with both IDs. Earlier uses the fixture's first exact cut by default. Pass `position` and epoch-millisecond `validAt` to choose another.
2. Call `save` with both IDs, the observed `expectedPosition`, a unique `commandId`, and `changes` such as `{":person/status":"Review",":person/note":"Trial"}`. Retry with identical input. The original receipt is returned again. A stale person state returns `StaleSave` at HTTP 409. `duplicate` submits the same input twice in one request.
3. Call `history` with both IDs. Pass the reply's `position` as `snapshotPosition` with `nextBeforePosition` as `beforePosition` to continue. For the change feed, call `feed` with `{}` to start at the live end. Pass `nextT` back as `fromT` to resume. To review from the beginning, pass `"0"`.
4. Call `publish` with both IDs, `label` and `reviewStatus` (`Active` or `Review`). The receipt comes with the first answer at the release position. Poll `release` with both IDs and the returned `releaseId` for durable answers and background progress.
5. Call `native` with a query from `accounts.examples` or provide your own EDN in the [documented grammar](packages/datomic/README.md). Results preserve Datomic's tagged scalars. The `load` action uses an isolated synthetic write subject and reports laptop diagnostics. `erase` reports `ErasureUnavailable` because the base's native query route refuses protected scopes.

The browser uses these same JSON actions. It can display each request and reply. The fixture and agent API are for local synthetic data.
