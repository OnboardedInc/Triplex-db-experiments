/**
 * EXP-C8 wire-level write counters for the two engine lanes.
 *
 * [EXP-C8] Why: "no read call writes" must be checked where traffic enters the engine, not in
 * the adapter code under test. Each counter is a transparent in-process proxy: bytes pass
 * through unchanged and only the client-to-engine direction is parsed and classified.
 * Rejected: patching XtdbClient/QleverClient (counts what the adapter believes it sends);
 * engine-side audit (neither XTDB 2.2 nor QLever 0.6.0 exposes a per-session write log).
 * Classification fails closed: anything not recognised as a read or session statement counts
 * as a write, and an unparseable stream counts as a write too.
 */
import http from "node:http";
import net from "node:net";

export interface EngineWriteCounts {
  readonly lane: "xtdb" | "qlever";
  /** TCP connections (xtdb) or HTTP requests (qlever) proxied. */
  readonly connections: number;
  /** xtdb: SQL statements in Query ('Q') and Parse ('P') texts; qlever: SPARQL query and update requests. */
  readonly statements: number;
  /** Statements/requests classified as writes; xtdb COMMITs count here too. */
  readonly writes: number;
  /** xtdb: COMMIT statements; qlever: write requests (each QLever write is its own commit). */
  readonly commits: number;
  /** Neither read nor write: xtdb session statements (SET, ROLLBACK, BEGIN READ ONLY, ...);
   * qlever cmd=, runtime-setting and WebSocket cancel requests. */
  readonly commands: number;
  /** Connections whose client stream could not be parsed (TLS, bad framing); each is also a write. */
  readonly unparsed: number;
  /** First 20 write texts, each truncated to 300 chars. */
  readonly samples: readonly string[];
}
export interface EngineWriteCounter {
  /** URL to hand to the client in place of the engine URL. */
  readonly url: string;
  counts(): EngineWriteCounts;
  reset(): void;
  /** Closes the listener and every proxied socket. */
  close(): Promise<void>;
}

type Mutable = { -readonly [K in keyof EngineWriteCounts]: EngineWriteCounts[K] } & {
  samples: string[];
};
const makeTally = (lane: EngineWriteCounts["lane"]) => {
  const fresh = (): Mutable => ({
    lane,
    connections: 0,
    statements: 0,
    writes: 0,
    commits: 0,
    commands: 0,
    unparsed: 0,
    samples: [],
  });
  const state = { counts: fresh() };
  return {
    state,
    write: (text: string, commit: boolean) => {
      state.counts.writes++;
      if (commit) state.counts.commits++;
      if (state.counts.samples.length < 20) state.counts.samples.push(text.slice(0, 300));
    },
    snapshot: (): EngineWriteCounts => ({ ...state.counts, samples: [...state.counts.samples] }),
    reset: () => void (state.counts = fresh()),
  };
};

const listen = (server: net.Server) =>
  new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve((server.address() as net.AddressInfo).port));
  });
const closeServer = (server: net.Server, sockets: Set<net.Socket>) =>
  new Promise<void>((resolve) => {
    for (const socket of sockets) socket.destroy();
    server.close(() => resolve());
  });
const tracker = () => {
  const sockets = new Set<net.Socket>();
  const track = (socket: net.Socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    return socket;
  };
  return { sockets, track };
};

// ---------------------------------------------------------------- XTDB SQL classification

interface Word {
  readonly value: string;
  readonly depth: number;
}
interface Piece {
  readonly text: string;
  readonly words: readonly Word[];
}
const QUERY_START = new Set(["SELECT", "WITH", "FROM", "VALUES", "XTQL"]);
const READ_START = new Set([...QUERY_START, "EXPLAIN", "SHOW", "TABLE"]);
// [EXP-C8] Why: any of these words in a read-shaped statement makes it a write. Covers a
// data-modifying CTE (`WITH x AS (INSERT ...)`), `EXPLAIN ANALYZE INSERT`, and DDL behind a
// SETTING prefix whose own words (`DEFAULT VALID_TIME FROM ...`) look like a query start.
// Native reads already reject these words (packages/xtdb/src/native/ReadOnlySql.ts).
const WRITE_WORDS = new Set(
  "INSERT UPDATE DELETE ERASE PATCH MERGE CREATE ALTER DROP ASSERT COPY TRUNCATE".split(" "),
);
const SESSION_START = new Set(["SET", "ROLLBACK", "DISCARD", "DEALLOCATE"]);

/** Split at `;` and keep upper-cased words outside quotes and comments, with paren depth. */
const lexStatements = (sql: string): Piece[] => {
  const pieces: Piece[] = [];
  let words: Word[] = [];
  let start = 0;
  let depth = 0;
  let i = 0;
  const cut = (end: number) => {
    pieces.push({ text: sql.slice(start, end).trim(), words });
    words = [];
  };
  while (i < sql.length) {
    const ch = sql[i]!;
    const next = sql[i + 1];
    if (ch === "-" && next === "-") {
      // [EXP-C8] XTDB's lexer ends a line comment at CR or LF (SqlLexer.g4; see ReadOnlySql.ts).
      i += 2;
      while (i < sql.length && sql[i] !== "\r" && sql[i] !== "\n") i++;
    } else if (ch === "/" && next === "*") {
      // [EXP-C8] Block comments do not nest in XTDB's lexer; nesting here could hide a statement.
      const close = sql.indexOf("*/", i + 2);
      i = close < 0 ? sql.length : close + 2;
    } else if (ch === "'" || ch === '"') {
      const escapes =
        ch === "'" && /[eE]/.test(sql[i - 1] ?? "") && !/[A-Za-z0-9_]/.test(sql[i - 2] ?? "");
      let j = i + 1;
      for (; j < sql.length; j++) {
        if (escapes && sql[j] === "\\") j++;
        else if (sql[j] === ch) {
          if (sql[j + 1] !== ch) break;
          j++;
        }
      }
      i = j + 1;
    } else if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j]!)) j++;
      words.push({ value: sql.slice(i, j).toUpperCase(), depth });
      i = j;
    } else {
      // [EXP-C8] `$tag$` dollar quotes are deliberately not skipped: words inside them can only
      // add false-positive writes, never hide one.
      if (ch === "(") depth++;
      else if (ch === ")") depth = Math.max(0, depth - 1);
      else if (ch === ";") {
        cut(i);
        start = i + 1;
        depth = 0;
      }
      i++;
    }
  }
  cut(sql.length);
  // A piece without words (empty, comments, stray literals) cannot write anything.
  const real = pieces.filter((piece) => piece.words.length > 0);
  return real.length > 0 ? real : [{ text: sql.trim(), words: [] }];
};

type XtdbStatementKind = "read" | "write" | "commit" | "session";
const classifyPiece = ({ words }: Piece): XtdbStatementKind => {
  if (words.length === 0) return "session";
  let first = 0;
  if (words[0]!.value === "SETTING") {
    // [EXP-C8] XtdbClient prefixes reads with `SETTING SNAPSHOT_TOKEN = '...', CLOCK_TIME =
    // TIMESTAMP WITH TIME ZONE '...' SELECT ...`; that WITH is part of the type, not a CTE.
    first = words.findIndex(
      (word, k) =>
        k > 0 &&
        word.depth === 0 &&
        QUERY_START.has(word.value) &&
        !(word.value === "WITH" && words[k + 1]?.value === "TIME"),
    );
    if (first < 0) return "write";
  }
  const head = words[first]!.value;
  if (READ_START.has(head))
    return words.some((word) => WRITE_WORDS.has(word.value)) ? "write" : "read";
  if (head === "COMMIT") return "commit";
  if (SESSION_START.has(head)) return "session";
  if (head === "BEGIN" || (head === "START" && words[first + 1]?.value === "TRANSACTION")) {
    const pairs = words.slice(first).map((word, k, all) => `${word.value} ${all[k + 1]?.value}`);
    return pairs.includes("READ ONLY") && !pairs.includes("READ WRITE") ? "session" : "write";
  }
  return "write";
};
const severity = { session: 0, read: 1, commit: 2, write: 3 } as const;

/** Classify one SQL text; a multi-statement text takes its most severe statement. */
export const classifyXtdbStatement = (sql: string): XtdbStatementKind =>
  lexStatements(sql)
    .map(classifyPiece)
    .reduce((worst, kind) => (severity[kind] > severity[worst] ? kind : worst));

// ---------------------------------------------------------------- pgwire frontend parsing

const SSL_REQUEST = 80877103;
const GSSENC_REQUEST = 80877104;
const CANCEL_REQUEST = 80877102;
// Frontend message types of protocol 3.0 (PostgreSQL docs, "Message Formats").
const FRONTEND_TYPES = new Set([..."BCdcfDEHFpPQSX"].map((c) => c.charCodeAt(0)));
const MAX_MESSAGE = 1 << 30;

export interface PgwireFrontendHandlers {
  readonly text: (sql: string) => void;
  readonly functionCall: () => void;
  readonly opaque: (reason: string) => void;
}
/** @internal Incremental client-to-server pgwire parser; exported for unit tests only. */
export const createPgwireFrontendParser = (handlers: PgwireFrontendHandlers) => {
  let pending: Buffer[] = [];
  let size = 0;
  let need = 4;
  let startup = true;
  let stopped = false;
  const cstring = (buf: Buffer, from: number): [string, number] => {
    const end = buf.indexOf(0, from);
    const stop = end < 0 ? buf.length : end;
    return [buf.toString("utf8", from, stop), stop + 1];
  };
  const stop = (reason?: string) => {
    stopped = true;
    if (reason !== undefined) handlers.opaque(reason);
  };
  return (chunk: Buffer): void => {
    if (stopped) return;
    pending.push(chunk);
    size += chunk.length;
    if (size < need) return;
    const buf = pending.length === 1 ? pending[0]! : Buffer.concat(pending, size);
    let at = 0;
    while (!stopped) {
      const header = startup ? 4 : 5;
      if (buf.length - at < header) {
        need = header;
        break;
      }
      const length = buf.readInt32BE(startup ? at : at + 1);
      // [EXP-C8] Startup packets are at most 10000 bytes (PostgreSQL's limit). A TLS ClientHello
      // (after 'S' or with direct SSL) fails this check, so an encrypted stream is never
      // silently skipped: it is reported opaque, which counts as a write.
      if (
        startup
          ? length < 8 || length > 10_000
          : !FRONTEND_TYPES.has(buf[at]!) || length < 4 || length > MAX_MESSAGE
      ) {
        stop(startup ? `bad startup length ${length}` : `bad message type ${buf[at]}`);
        break;
      }
      const total = startup ? length : length + 1;
      if (buf.length - at < total) {
        need = total;
        break;
      }
      const message = buf.subarray(at, at + total);
      at += total;
      if (startup) {
        const code = message.readInt32BE(4);
        // After an 'N' answer the client sends its StartupMessage, still untyped.
        if (code === SSL_REQUEST || code === GSSENC_REQUEST) continue;
        // A cancel connection carries nothing else.
        if (code === CANCEL_REQUEST) stop();
        else if (code >>> 16 !== 3) stop(`unknown startup code ${code}`);
        else startup = false;
      } else if (message[0] === 0x51 /* Q */) handlers.text(cstring(message, 5)[0]);
      else if (message[0] === 0x50 /* P: name, query, param oids */)
        handlers.text(cstring(message, cstring(message, 5)[1])[0]);
      else if (message[0] === 0x46 /* F */) handlers.functionCall();
    }
    pending = stopped || at === buf.length ? [] : [buf.subarray(at)];
    size = stopped ? 0 : buf.length - at;
  };
};

/** Proxy a pgwire engine and count the SQL the clients send through it. */
export const startXtdbWriteCounter = async (targetUrl: string): Promise<EngineWriteCounter> => {
  const target = new URL(targetUrl);
  const host = target.hostname.replace(/^\[(.*)\]$/, "$1");
  const port = Number(target.port || 5432);
  const tally = makeTally("xtdb");
  const { sockets, track } = tracker();
  const countSql = (sql: string) => {
    for (const piece of lexStatements(sql)) {
      tally.state.counts.statements++;
      const kind = classifyPiece(piece);
      if (kind === "write" || kind === "commit") tally.write(piece.text, kind === "commit");
      else if (kind === "session") tally.state.counts.commands++;
    }
  };
  const opaque = (reason: string) => {
    tally.state.counts.unparsed++;
    tally.write(`<unparsed pgwire stream: ${reason}>`, false);
  };
  // [EXP-C8] allowHalfOpen + pipe on both sides: each direction ends only when its sender ends,
  // so the proxy never truncates a response or drops a trailing message.
  const server = net.createServer({ allowHalfOpen: true }, (client) => {
    tally.state.counts.connections++;
    track(client);
    const upstream = track(net.connect({ host, port, allowHalfOpen: true }));
    const parse = createPgwireFrontendParser({
      text: countSql,
      functionCall: () => tally.write("<pgwire FunctionCall>", false),
      opaque,
    });
    let broken = false;
    client.on("data", (chunk: Buffer) => {
      if (broken) return;
      try {
        parse(chunk);
      } catch (error) {
        broken = true;
        opaque(`parser error ${String(error)}`);
      }
    });
    client.pipe(upstream);
    upstream.pipe(client);
    client.on("error", () => upstream.destroy());
    upstream.on("error", () => client.destroy());
  });
  const listening = await listen(server);
  const url = new URL(targetUrl);
  url.hostname = "127.0.0.1";
  url.port = String(listening);
  return {
    url: url.href,
    counts: tally.snapshot,
    reset: tally.reset,
    close: () => closeServer(server, sockets),
  };
};

// ---------------------------------------------------------------- QLever HTTP

const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];
/** Flat raw header list without hop-by-hop headers (and those named in Connection) or `drop`. */
const forwardHeaders = (raw: readonly string[], drop: readonly string[]): string[] => {
  const named = new Set([...HOP_BY_HOP, ...drop]);
  for (let k = 0; k < raw.length; k += 2)
    if (raw[k]!.toLowerCase() === "connection")
      for (const token of raw[k + 1]!.split(",")) named.add(token.trim().toLowerCase());
  const out: string[] = [];
  for (let k = 0; k < raw.length; k += 2)
    if (!named.has(raw[k]!.toLowerCase())) out.push(raw[k]!, raw[k + 1]!);
  return out;
};

// [EXP-C8] Command names from QLever 0.6.0 Server::process (experiments/qlever-unicode/
// Server-6c5861a.cpp:476-680). Unknown commands and clear-delta-triples, vacuum-delta-triples,
// rebuild-index, write-/delete-materialized-view count as writes.
const READ_COMMANDS = new Set(
  "stats cache-stats get-settings get-index-id dump-active-queries".split(" "),
);
const SESSION_COMMANDS = new Set(
  "clear-cache clear-cache-complete clear-named-cache load-materialized-view".split(" "),
);
// Any other parameter is a runtime setting (query-planning-budget=...), a description or a
// result pin: server state, not data, so it counts as a command.
const PROTOCOL_PARAMETERS = new Set([
  "query",
  "update",
  "cmd",
  "timeout",
  "access-token",
  "send",
  "action",
  "default-graph-uri",
  "named-graph-uri",
  "using-graph-uri",
  "using-named-graph-uri",
  "graph",
  "default",
  "view-name",
  "msg",
]);
const SPARQL_BODIES = new Set([
  "application/sparql-query",
  "application/sparql-update",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
]);

interface QleverRequestClass {
  readonly write?: string;
  readonly update: boolean;
  readonly query: boolean;
  readonly command: boolean;
}
const classifyQleverRequest = (
  method: string,
  url: URL,
  contentType: string,
  body: Buffer,
): QleverRequestClass => {
  const params = new URLSearchParams(url.search);
  const text = body.toString("utf8");
  if (contentType === "application/x-www-form-urlencoded")
    for (const [key, value] of new URLSearchParams(text)) params.append(key, value);
  const multipart = contentType === "multipart/form-data" ? text : "";
  const updates = [
    ...(contentType === "application/sparql-update" ? [text] : []),
    ...params.getAll("update"),
    ...(/name="update"/i.test(multipart) ? ["<multipart update>"] : []),
  ];
  const writeCommands = params
    .getAll("cmd")
    .filter((cmd) => !READ_COMMANDS.has(cmd) && !SESSION_COMMANDS.has(cmd))
    .map((cmd) => `cmd=${cmd}`);
  // [EXP-C8] Graph Store HTTP Protocol: PUT/DELETE/PATCH, a POST naming a graph, or a POST body
  // that is not a SPARQL operation or form all change a graph in QLever 0.6.0.
  const graphWrite =
    !["GET", "HEAD", "OPTIONS", "POST"].includes(method) ||
    (method === "POST" &&
      (params.has("graph") ||
        params.has("default") ||
        (body.length > 0 && !SPARQL_BODIES.has(contentType))))
      ? [`<${method} ${url.pathname} ${contentType || "no content type"}>`]
      : [];
  const write = [...updates, ...writeCommands, ...graphWrite][0];
  return {
    ...(write === undefined ? {} : { write }),
    update: updates.length > 0,
    query:
      contentType === "application/sparql-query" ||
      params.has("query") ||
      /name="query"/i.test(multipart),
    command: params.has("cmd") || [...params.keys()].some((key) => !PROTOCOL_PARAMETERS.has(key)),
  };
};

/** Proxy a QLever HTTP endpoint and count the SPARQL requests sent through it. */
export const startQleverWriteCounter = async (targetUrl: string): Promise<EngineWriteCounter> => {
  const target = new URL(targetUrl);
  if (target.protocol !== "http:") throw new TypeError("EXP-C8 QLever counter proxies http: only");
  const host = target.hostname.replace(/^\[(.*)\]$/, "$1");
  const port = Number(target.port || 80);
  const tally = makeTally("qlever");
  const { sockets, track } = tracker();
  const agent = new http.Agent({ keepAlive: true });
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("error", () => res.destroy());
    req.on("end", () => {
      const counts = tally.state.counts;
      counts.connections++;
      // [EXP-C8] The request body is buffered (SPARQL text is small) so it can be classified
      // before forwarding; the response streams through unchanged.
      const body = Buffer.concat(chunks);
      const method = req.method ?? "GET";
      const contentType = (req.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
      const kind = classifyQleverRequest(
        method,
        new URL(req.url ?? "/", "http://x"),
        contentType,
        body,
      );
      if (kind.update || (kind.query && kind.write === undefined)) counts.statements++;
      if (kind.write !== undefined) tally.write(kind.write, true);
      else if (kind.command) counts.commands++;
      // An object (not a raw array) so Node sets Host and Connection for the upstream hop.
      const headers: Record<string, string | string[]> = {};
      const flat = forwardHeaders(req.rawHeaders, ["host", "content-length"]);
      for (let k = 0; k < flat.length; k += 2) {
        const name = flat[k]!.toLowerCase();
        const prior = headers[name];
        headers[name] = prior === undefined ? flat[k + 1]! : [prior, flat[k + 1]!].flat();
      }
      if (body.length > 0 || req.headers["content-length"] !== undefined)
        headers["content-length"] = String(body.length);
      const upstream = http.request(
        { host, port, method, path: req.url, headers, agent },
        (reply) => {
          res.writeHead(
            reply.statusCode ?? 502,
            reply.statusMessage,
            forwardHeaders(reply.rawHeaders, []),
          );
          reply.pipe(res);
          reply.on("error", () => res.destroy());
        },
      );
      upstream.on("error", (error) => {
        if (res.headersSent) res.destroy(error);
        else
          res
            .writeHead(502, { "Content-Type": "text/plain" })
            .end(`EXP-C8 proxy: ${error.message}`);
      });
      // A client abort (QleverClient deadline or signal) aborts the upstream request.
      res.on("close", () => {
        if (!res.writableFinished) upstream.destroy();
      });
      upstream.end(body);
    });
  });
  server.on("connection", track);
  // QleverClient.cancel opens a WebSocket to /watch/<query-id>; tunnel it unchanged.
  server.on("upgrade", (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
    tally.state.counts.connections++;
    tally.state.counts.commands++;
    const upstream = track(net.connect({ host, port }));
    const raw = forwardHeaders(req.rawHeaders, ["host"]);
    const lines = [`${req.method} ${req.url} HTTP/1.1`, `Host: ${target.host}`];
    for (let k = 0; k < req.rawHeaders.length; k += 2) {
      const name = req.rawHeaders[k]!.toLowerCase();
      if (name === "connection" || name === "upgrade")
        lines.push(`${req.rawHeaders[k]}: ${req.rawHeaders[k + 1]}`);
    }
    for (let k = 0; k < raw.length; k += 2) lines.push(`${raw[k]}: ${raw[k + 1]}`);
    upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head.length > 0) upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
    socket.on("error", () => upstream.destroy());
    upstream.on("error", () => socket.destroy());
  });
  const listening = await listen(server);
  const prefix = target.pathname === "/" ? "" : target.pathname;
  return {
    url: `http://127.0.0.1:${listening}${prefix}${target.search}`,
    counts: tally.snapshot,
    reset: tally.reset,
    close: async () => {
      agent.destroy();
      server.closeAllConnections();
      await closeServer(server, sockets);
    },
  };
};
