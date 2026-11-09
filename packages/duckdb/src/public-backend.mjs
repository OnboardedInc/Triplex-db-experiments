// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing; runtime callback/availability guards not inferred. Binding errors remain checked by lab/bin/checkjs.mjs.
import {
  decodeValueColumns,
  assertValueInDomain,
  ValueDomains,
  storedValueDomain,
} from "@triplex-build/triplex/runtime";
import { createHash } from "node:crypto";
import {
  MAX_STATEMENT_PARAMETERS,
  TransactionOwner,
  statementPlan,
  appendPlan,
} from "./transaction-owner.mjs";
const fields = [
  "id",
  "entity_id",
  "attribute",
  "value_type",
  "value_string",
  "value_number",
  "value_boolean",
  "value_datetime",
  "value_json",
  "recorded_at",
  "recorded_position",
  "valid_from",
  "valid_to",
  "created_by",
  "retracted_at",
  "retracted_position",
  "retract_tx_id",
  "entity_type",
  "schema_version",
  "tx_id",
];
const base = "td_triplex_public_v2.";
export class PublicBackendError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PublicBackendError";
    this.code = code;
  }
}
const fail = (code, message) => {
  throw new PublicBackendError(code, message);
};
const ensure = (ok, message = "Malformed public SQL result") => {
  if (!ok) fail("ROW", message);
};
const own = (x, k) => Object.hasOwn(x, k);
const variable = (x) => typeof x === "object" && x !== null && x._tag === "Variable";
const text = (v, nonempty = false) => {
  if (
    typeof v !== "string" ||
    !v.isWellFormed() ||
    v.includes("\0") ||
    v.length > 1048576 ||
    (nonempty && !v.length)
  )
    fail("TEXT", "Unsupported public text");
  return v;
};
const finite = (v) => {
  if (typeof v !== "number" || !Number.isFinite(v)) fail("NUMBER", "Expected finite binary64");
  return v === 0 ? 0 : v;
};
const instant = (v) => {
  v = finite(v);
  if (v < 0) fail("TIME", "Expected nonnegative instant");
  return v;
};
const position = (v) => {
  if (!Number.isSafeInteger(v) || v < 0)
    fail("POSITION", "Expected safe nonnegative commit position");
  return v;
};
const int64 = (value) => {
  assertValueInDomain({ type: "integer", value }, ValueDomains.duckdb);
  return value;
};
function pack(value, domain = ValueDomains.duckdb) {
  assertValueInDomain(value, domain);
  if (!value || typeof value !== "object") fail("VALUE", "Expected typed value");
  const out = {
    value_type: value.type,
    value_string: null,
    value_number: null,
    value_boolean: null,
    value_datetime: null,
    value_json: null,
  };
  switch (value.type) {
    case "string":
    case "ref":
      out.value_string = text(value.value);
      break;
    case "integer":
      out.value_string = int64(value.value);
      break;
    case "number":
      out.value_number = finite(value.value);
      break;
    case "datetime":
      out.value_datetime = finite(value.value);
      break;
    case "boolean":
      if (typeof value.value !== "boolean") fail("VALUE", "Expected boolean");
      out.value_boolean = value.value ? 1 : 0;
      break;
    case "json":
      out.value_json = JSON.stringify(value.value);
      break;
    case "blob": {
      const size = position(value.size);
      out.value_string = text(value.value);
      out.value_json = JSON.stringify({
        mimeType: text(value.mimeType),
        size,
        ...(own(value, "filename") ? { filename: text(value.filename) } : {}),
      });
      break;
    }
    default:
      fail("VALUE", "Unsupported public tag");
  }
  return out;
}
/** @internal Public input ownership and shape only; physical storage conversion is separate. */
export function buildRow(input, txId, timestamp, id, pos) {
  if (!input || typeof input !== "object") fail("INPUT", "Expected TripleInput");
  const value = pack(input.value, storedValueDomain(ValueDomains.duckdb, input.attribute)),
    from = instant(input.validFrom ?? timestamp),
    to = input.validTo == null ? null : instant(input.validTo);
  if (to !== null && to <= from) fail("INTERVAL", "Expected nonempty valid interval");
  return Object.freeze({
    id: text(id, true),
    entity_id: text(input.entityId, true),
    attribute: text(input.attribute),
    ...value,
    recorded_at: instant(timestamp),
    recorded_position: position(pos),
    valid_from: from,
    valid_to: to,
    created_by: input.createdBy == null ? null : text(input.createdBy),
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
    entity_type: input.entityType == null ? null : text(input.entityType),
    schema_version: 1,
    tx_id: txId === null ? null : text(txId, true),
  });
}
const MAX_POSITION = 9223372036854775807n;
const nativeInstant = (v) =>
  v === null ? MAX_POSITION : v >= 9223372036854775808 ? MAX_POSITION : BigInt(Math.ceil(v));
const floatBits = (value) => {
  const bytes = Buffer.allocUnsafe(8);
  bytes.writeDoubleBE(value === 0 ? 0 : value);
  return bytes.toString("hex");
};
function bound(row) {
  const kind = {
    string: "str",
    boolean: "bool",
    integer: "i64",
    number: "f64",
    ref: "ref",
    datetime: "datetime",
    json: "json",
    blob: "blob",
  }[row.value_type];
  const wire =
    row.value_type === "boolean"
      ? row.value_boolean === 1
      : ["number", "datetime"].includes(row.value_type)
        ? floatBits(row.value_type === "number" ? row.value_number : row.value_datetime)
        : row.value_type === "json"
          ? row.value_json
          : row.value_string;
  const payload = JSON.stringify(wire);
  return [
    row.id,
    row.entity_id,
    row.attribute,
    kind,
    payload,
    nativeInstant(row.valid_from),
    nativeInstant(row.valid_to),
    BigInt(row.recorded_position),
    row.retracted_position === null ? MAX_POSITION : BigInt(row.retracted_position),
    null,
    null,
    createHash("sha256").update(payload).digest("hex"),
    { string: 1, boolean: 2, integer: 3, number: 4, ref: 5, datetime: 6, json: 7, blob: 8 }[
      row.value_type
    ],
    ["string", "ref", "json", "blob"].includes(row.value_type) ? wire : null,
    row.value_type === "boolean" ? wire : null,
    row.value_type === "integer" ? BigInt(wire) : null,
    ["number", "datetime"].includes(row.value_type)
      ? row.value_type === "number"
        ? row.value_number
        : row.value_datetime
      : null,
    row.recorded_at,
    row.retracted_at,
    row.valid_from,
    row.valid_to,
    row.created_by,
    row.entity_type,
    row.tx_id,
    row.retract_tx_id,
    row.value_type === "blob" ? row.value_json : null,
    "triplex",
    true,
  ];
}

function temporal(basis, params) {
  if (basis === undefined) return ["retracted_at IS NULL"];
  const parts = [];
  instant(basis.validAt);
  if (basis.recordedPosition !== undefined) {
    parts.push("recorded_position <= ?");
    params.push(BigInt(position(basis.recordedPosition)));
  }
  if (basis.recordedAt !== undefined) {
    parts.push("recorded_at <= ?");
    params.push(instant(basis.recordedAt));
  }
  const retracted = ["retracted_at IS NULL"];
  if (basis.recordedPosition !== undefined) {
    retracted.push("retracted_position > ?");
    params.push(BigInt(position(basis.recordedPosition)));
  }
  if (basis.recordedAt !== undefined) {
    retracted.push("retracted_at > ?");
    params.push(instant(basis.recordedAt));
  }
  parts.push(
    "(" + retracted.join(" OR ") + ")",
    "valid_from <= ?",
    "(valid_to IS NULL OR valid_to > ?)",
  );
  params.push(basis.validAt, basis.validAt);
  return parts;
}
function validateRow(row) {
  ensure(Object.keys(row).length === fields.length && fields.every((k) => own(row, k)));
  text(row.id, true);
  text(row.entity_id, true);
  text(row.attribute);
  instant(row.recorded_at);
  position(row.recorded_position);
  ensure(row.recorded_position >= 1);
  instant(row.valid_from);
  ensure(row.valid_to === null || instant(row.valid_to) > row.valid_from);
  ensure(row.schema_version === 1);
  for (const k of ["created_by", "retract_tx_id", "entity_type", "tx_id"])
    if (row[k] !== null) text(row[k]);
  const inactive = {
    integer: ["value_string"],
    string: ["value_string"],
    ref: ["value_string"],
    number: ["value_number"],
    boolean: ["value_boolean"],
    datetime: ["value_datetime"],
    json: ["value_json"],
    blob: ["value_string", "value_json"],
  }[row.value_type];
  ensure(inactive !== undefined);
  for (const k of ["value_string", "value_number", "value_boolean", "value_datetime", "value_json"])
    ensure(inactive.includes(k) ? row[k] !== null : row[k] === null);
  if (row.value_type === "integer") int64(row.value_string);
  if (row.value_string !== null) text(row.value_string);
  if (row.value_number !== null) finite(row.value_number);
  if (row.value_datetime !== null) finite(row.value_datetime);
  if (row.value_boolean !== null) ensure(row.value_boolean === 0 || row.value_boolean === 1);
  decodeValueColumns(row, storedValueDomain(ValueDomains.duckdb, row.attribute));
  ensure(
    (row.retracted_at === null && row.retracted_position === null && row.retract_tx_id === null) ||
      (row.retracted_at !== null &&
        row.retracted_position !== null &&
        row.retract_tx_id !== null &&
        position(row.retracted_position) >= row.recorded_position),
  );
  if (row.retracted_at !== null) instant(row.retracted_at);
  return Object.freeze(row);
}

/** Granular SQL backend for the pinned public row/transaction contract, no Effect import. */
export class PublicDuckDBBackend {
  #port;
  #owner;
  #scope;
  #tail = Promise.resolve();
  #closed = false;
  #ready = false;
  #initializing = null;
  #closePromise = null;
  constructor(port, scope) {
    this.#port = port;
    this.#owner = new TransactionOwner(port);
    this.#scope = text(scope, true);
    Object.freeze(this);
  }
  #enqueue(work, initializing = false, options = {}) {
    if (this.#closed) return Promise.reject(new PublicBackendError("CLOSED", "Backend closed"));
    if (!initializing && !this.#ready)
      return Promise.reject(new PublicBackendError("INITIALIZE", "Backend not initialized"));
    const { signal, onAdmission } = options;
    if (signal !== undefined && !(signal instanceof AbortSignal))
      return Promise.reject(new TypeError("signal must be an AbortSignal"));
    let resolveOperation,
      rejectOperation,
      phase = "queued";
    const result = new Promise((resolve, reject) => {
      resolveOperation = resolve;
      rejectOperation = reject;
    });
    const removeSignal = () => signal?.removeEventListener("abort", withdraw);
    // Inspiration: public-read-stages-v1's cancelled metadata ticket later ran
    // its owner audit. See wiki/problems/duckdb-owner-audit.md and the frozen
    // DUCKDB-WITHDRAWAL.md contract. A withdrawn FIFO node only skips in JS;
    // every actual physical transaction retains every C++ ownership audit.
    const withdraw = () => {
      if (phase !== "queued") return false;
      phase = "withdrawn";
      removeSignal();
      const error = new PublicBackendError("CANCELED_BEFORE_BEGIN", "Queued read was withdrawn");
      error.phase = "queue";
      error.outcome = "not_started";
      rejectOperation(error);
      return true;
    };
    try {
      onAdmission?.(withdraw);
    } catch (error) {
      phase = "withdrawn";
      rejectOperation(error);
      return result;
    }
    const op = this.#tail.then(async () => {
      if (phase === "withdrawn") return;
      phase = "acquiring";
      removeSignal();
      try {
        const value = await work();
        phase = "settled";
        resolveOperation(value);
      } catch (error) {
        phase = "settled";
        rejectOperation(error);
      }
    });
    this.#tail = op.then(
      () => undefined,
      () => undefined,
    );
    if (signal?.aborted) withdraw();
    else signal?.addEventListener("abort", withdraw, { once: true });
    return result;
  }
  #session(tx) {
    let active = true;
    const run = async (name, sql, params = []) => {
      if (!active) fail("CONTEXT_CLOSED", "Transaction session expired");
      return tx.run(statementPlan({ name, sql, params }));
    };
    const records = async (name, sql, params = [], publicRows = true) => {
      const rows = await run(name, sql, params),
        columns = this.#port.columnsFor(rows);
      ensure(new Set(columns).size === columns.length, "Duplicate result aliases");
      return Object.freeze(
        rows.map((row) =>
          Object.freeze(
            Object.fromEntries(
              columns.map((name, i) => {
                let value = row[i];
                if (publicRows && typeof value === "bigint") {
                  ensure(
                    value >= -9007199254740991n && value <= 9007199254740991n,
                    "Integer cannot be safely exposed to public Number",
                  );
                  value = Number(value);
                }
                return [name, value];
              }),
            ),
          ),
        ),
      );
    };
    const readRows = async (name, sql, params = []) =>
      Object.freeze((await records(name, sql, params)).map((row) => validateRow(row)));
    const query = async (pattern = {}, basis) => {
      const params = [],
        where = temporal(basis, params);
      for (const [key, column] of [
        ["entityId", "entity_id"],
        ["attribute", "attribute"],
        ["entityType", "entity_type"],
      ])
        if (pattern[key] !== undefined && !variable(pattern[key])) {
          where.push(column + "=?");
          params.push(text(pattern[key]));
        }
      if (pattern.value !== undefined && !variable(pattern.value)) {
        const packed = pack(pattern.value);
        where.push("value_type=?");
        params.push(packed.value_type);
        const key = {
          integer: "value_string",
          string: "value_string",
          ref: "value_string",
          number: "value_number",
          boolean: "value_boolean",
          datetime: "value_datetime",
          json: "value_json",
          blob: "value_string",
        }[packed.value_type];
        where.push(key + "=?");
        params.push(packed[key]);
      }
      return readRows(
        "public_query",
        "SELECT * FROM " +
          base +
          "triples WHERE " +
          where.join(" AND ") +
          " ORDER BY recorded_at ASC,id ASC",
        params,
      );
    };
    const insertRows = async (rows) => {
      try {
        const nativeAppend = this.#port.supportsAppend?.() === true,
          chunkSize = nativeAppend ? 2048 : 32;
        for (let i = 0; i < rows.length; ) {
          const chunk = [],
            canonical = [];
          let bytes = 0;
          while (i < rows.length && chunk.length < chunkSize) {
            const next = bound(rows[i]);
            const size = next.reduce(
              (sum, value) => sum + (typeof value === "string" ? Buffer.byteLength(value) : 8),
              0,
            );
            if (chunk.length && bytes + size > 8 * 1024 * 1024) break;
            chunk.push(rows[i++]);
            canonical.push(next);
            bytes += size;
          }
          const added = canonical.reduce(
            (sum, row) =>
              sum +
              Buffer.byteLength(row[1]) +
              Buffer.byteLength(row[2]) +
              Buffer.byteLength(row[4]) +
              (row[25] === null ? 0 : Buffer.byteLength(row[25])),
            0,
          );
          // Reserve before appending on the same caller transaction so a later chunk failure rolls back both.
          const reserved = await run(
            "public_reserve_retained_usage",
            "UPDATE main.storage_usage SET retained_count=retained_count+$1::BIGINT,retained_bytes=retained_bytes+$2::BIGINT " +
              "WHERE singleton AND system.main.td_triplex_reserve_usage_v1(retained_count,retained_bytes,$1::BIGINT,$2::BIGINT) " +
              "RETURNING singleton",
            [BigInt(chunk.length), BigInt(added)],
          );
          ensure(
            reserved.length === 1 && reserved[0].length === 1 && reserved[0][0] === true,
            "Shared retained storage admission exceeded",
          );
          const placeholders = Array.from({ length: 28 }, (_, n) =>
            n === 13 ? "encode(?::VARCHAR)" : "?",
          );
          const result = nativeAppend
            ? await tx.run(
                appendPlan({
                  name: "public_insert_chunk",
                  schema: "main",
                  table: "assertions",
                  rows: canonical,
                }),
              )
            : await run(
                "public_insert_chunk",
                "INSERT INTO main.assertions VALUES " +
                  chunk.map(() => "(" + placeholders.join(",") + ")").join(","),
                canonical.flat(),
              );
          ensure(
            result.length === 1 && result[0].length === 1 && result[0][0] === BigInt(chunk.length),
          );
        }
        return Object.freeze(rows);
      } catch (error) {
        tx.fail(error);
        throw error;
      }
    };

    const session = Object.freeze({
      // Effect cancellation invokes the actual owned DuckDB connection interrupt.
      // TransactionOwner still drains the statement and acknowledges rollback before
      // the Effect adapter returns. No abandoned background read is reported done.
      runRecords: async (sql, params = [], signal) => {
        const stop = () => this.#port.interrupt();
        if (signal?.aborted) fail("CANCELED", "Read canceled before native execution");
        signal?.addEventListener("abort", stop, { once: true });
        try {
          if (signal?.aborted) stop();
          const result = await records("public_runner", sql, params, false);
          if (signal?.aborted) fail("CANCELED", "Read canceled after native execution");
          return result;
        } finally {
          signal?.removeEventListener("abort", stop);
        }
      },
      nextCommitPosition: async () => {
        const rows = await records(
          "next_position",
          "UPDATE main.clock SET position=position+1 WHERE singleton RETURNING position",
        );
        ensure(rows.length === 1);
        return position(rows[0].position);
      },
      currentCommitPosition: async () => {
        const rows = await records(
          "current_position",
          "SELECT position FROM main.clock WHERE singleton",
        );
        ensure(rows.length === 1);
        return position(rows[0].position);
      },
      claimCommand: async (commandId, transactionId, timestamp) => {
        commandId = text(commandId, true);
        transactionId = text(transactionId, true);
        timestamp = instant(timestamp);
        const rows = await records(
          "lookup_public_claim",
          "SELECT transaction_id FROM " + base + "triplex_command_receipts WHERE command_id=?",
          [commandId],
        );
        ensure(rows.length <= 1);
        if (rows.length) return text(rows[0].transaction_id, true);
        await run(
          "claim_public_command",
          "INSERT INTO main.commands(command_id,transaction_id,recorded_at,origin) VALUES (?,?,?,'triplex')",
          [commandId, transactionId, timestamp],
        );
        return null;
      },
      insert: async (input, txId, timestamp, id, pos) =>
        (await insertRows([buildRow(input, txId, timestamp, id, pos)]))[0],
      batchInsert: async (inputs, txId, timestamp, ids, pos) => {
        if (
          !Array.isArray(inputs) ||
          !Array.isArray(ids) ||
          inputs.length !== ids.length ||
          inputs.length > 4096
        )
          fail("BATCH", "Expected matching selected batch inputs/ids");
        return insertRows(inputs.map((input, i) => buildRow(input, txId, timestamp, ids[i], pos)));
      },
      retract: async (id, timestamp, txId, pos) => {
        const rows = await records(
          "public_retract",
          "UPDATE main.assertions SET retracted_at=?,tx_to=?,retract_transaction_id=? WHERE assertion_id=? AND tx_to=9223372036854775807 RETURNING assertion_id id",
          [instant(timestamp), BigInt(position(pos)), text(txId, true), text(id, true)],
        );
        ensure(rows.length <= 1);
        return rows.length === 1;
      },
      getById: async (id) => {
        const rows = await readRows(
          "public_get_id",
          "SELECT * FROM " + base + "triples WHERE id=? AND retracted_at IS NULL",
          [text(id, true)],
        );
        ensure(rows.length <= 1);
        return rows[0] ?? null;
      },
      getByEntity: (entityId, basis) => query({ entityId }, basis),
      getByEntities: async (entityIds, basis) => {
        if (!Array.isArray(entityIds)) fail("INPUT", "Expected entity IDs");
        const unique = [...new Set(entityIds.map((id) => text(id, true)))],
          result = new Map(unique.map((id) => [id, []]));
        if (!unique.length) return result;
        const params = [...unique],
          where = [
            "entity_id IN (" + unique.map(() => "?").join(",") + ")",
            ...temporal(basis, params),
          ];
        for (const row of await readRows(
          "public_entities",
          "SELECT * FROM " +
            base +
            "triples WHERE " +
            where.join(" AND ") +
            " ORDER BY recorded_at ASC,id ASC",
          params,
        ))
          result.get(row.entity_id).push(row);
        for (const [id, rows] of result) result.set(id, Object.freeze(rows));
        return result;
      },
      query,
      history: (entityId) =>
        readRows(
          "public_history",
          "SELECT * FROM " + base + "triples WHERE entity_id=? ORDER BY recorded_at ASC,id ASC",
          [text(entityId, true)],
        ),
      dependencyState: async (attributes, basis) => {
        if (!Array.isArray(attributes)) fail("INPUT", "Expected attributes");
        const unique = [...new Set(attributes.map((attribute) => text(attribute)))];
        const validAt = instant(basis.validAt);
        if (!unique.length) return Object.freeze({ sourcePosition: 0 });
        if (unique.length > MAX_STATEMENT_PARAMETERS)
          fail("INPUT", "Too many distinct dependency attributes");
        const selectors = [
          validAt,
          basis.recordedAt === undefined ? null : instant(basis.recordedAt),
          basis.recordedPosition === undefined ? null : BigInt(position(basis.recordedPosition)),
        ];
        const capacity = MAX_STATEMENT_PARAMETERS - selectors.length;
        let sourcePosition = 0,
          next;
        // Each chunk returns one scalar pair in the same physical transaction.
        for (let offset = 0; offset < unique.length; offset += capacity) {
          const chunk = unique.slice(offset, offset + capacity);
          const rows = await records(
            "public_dependency_state",
            "SELECT coalesce(max(contribution.source_position),0::BIGINT) source_position," +
              "min(contribution.next_boundary) next_boundary FROM (SELECT system.main.td_triplex_dependency_entry_v1(" +
              "recorded_at,recorded_position,retracted_at,retracted_position,valid_from,valid_to," +
              "CAST(? AS DOUBLE),CAST(? AS DOUBLE),CAST(? AS BIGINT)) contribution FROM " +
              base +
              "triples WHERE attribute IN (" +
              chunk.map(() => "?").join(",") +
              "))",
            [...selectors, ...chunk],
          );
          ensure(rows.length === 1);
          const row = rows[0],
            boundary = row.next_boundary;
          sourcePosition = Math.max(sourcePosition, position(row.source_position));
          if (boundary !== null) {
            const value = instant(boundary);
            if (next === undefined || value < next) next = value;
          }
        }
        return Object.freeze({
          sourcePosition,
          ...(next === undefined ? {} : { nextTemporalBoundary: next }),
        });
      },
    });
    return {
      session,
      invalidate: () => {
        active = false;
      },
    };
  }
  initialize(schema) {
    if (this.#initializing) return this.#initializing;
    this.#initializing = this.#enqueue(async () => {
      ensure(
        schema.startsWith("-- temporal-store/public-triplex/2"),
        "Unknown versioned public projection contract",
      );
      await this.#owner.transaction(async (tx) => {
        await tx.run(statementPlan({ name: "public_v2_projection", sql: schema, params: [] }));
        const version = await tx.run(
          statementPlan({
            name: "shared_version",
            sql: "SELECT version FROM main.store_meta",
            params: [],
          }),
        );
        ensure(version.length === 1 && version[0][0] === 5n, "Shared schema version5 required");
        const owners = await tx.run(
          statementPlan({
            name: "native_entity_ownership",
            sql: "SELECT count(*) FROM td_catalog_v1.entity_owners",
            params: [],
          }),
        );
        ensure(
          owners[0]?.[0] === 0n,
          "Native schema-owned entities require an explicit adoption contract; this public bridge owns raw Triplex stores only",
        );
        const unsupported = await tx.run(
          statementPlan({
            name: "shared_interop",
            sql: "SELECT count(*) FROM main.assertions WHERE external_valid_from IS NULL",
            params: [],
          }),
        );
        ensure(
          unsupported.length === 1 && unsupported[0][0] === 0n,
          "Native valid-time bounds cannot be represented by this Triplex public profile",
        );
        const identity = await tx.run(
          statementPlan({
            name: "public_existing_scope",
            sql: "SELECT scope_id,profile FROM " + base + "scope_identity WHERE singleton=1",
            params: [],
          }),
        );
        if (identity.length === 0) {
          await tx.run(
            statementPlan({
              name: "public_scope",
              sql: "INSERT INTO " + base + "scope_identity VALUES (1,?,?)",
              params: [this.#scope, "triplex-public-duckdb/2"],
            }),
          );
        } else
          ensure(
            identity.length === 1 &&
              identity[0][0] === this.#scope &&
              identity[0][1] === "triplex-public-duckdb/2",
            "Persisted database scope/profile mismatch",
          );
        await tx.run(
          statementPlan({
            name: "public_search_path",
            sql: "SET search_path='td_triplex_public_v2,main'",
            params: [],
          }),
        );
      });
      await this.#port.activateOwnership();
      this.#ready = true;
    }, true);
    return this.#initializing;
  }

  withTransaction(work, options = {}) {
    return this.#enqueue(
      async () => {
        await this.#port.assertResourceProfile();
        let result;
        try {
          result = await this.#owner.transaction(async (tx) => {
            const holder = this.#session(tx);
            try {
              return await work(holder.session);
            } finally {
              holder.invalidate();
            }
          });
        } catch (primary) {
          try {
            await this.#port.activateOwnership();
          } catch (cleanup) {
            throw new AggregateError(
              [primary, cleanup],
              "Public transaction and ownership reconciliation failed",
              { cause: primary },
            );
          }
          throw primary;
        }
        await this.#port.activateOwnership();
        return result.value;
      },
      false,
      options,
    );
  }
  read(work) {
    return this.withTransaction(work);
  }
  /** Original-fiber Effect adapter can await started, then settle work once and await completion. */
  startTransaction({ withdrawableRead = false } = {}) {
    let resolveStarted,
      rejectStarted,
      resolveWork,
      rejectWork,
      settled = false,
      withdrawPending = () => false;
    const started = new Promise((r, j) => {
        resolveStarted = r;
        rejectStarted = j;
      }),
      work = new Promise((r, j) => {
        resolveWork = r;
        rejectWork = j;
      });
    work.catch(() => undefined);
    const completion = this.withTransaction(
      async (session) => {
        resolveStarted(session);
        return work;
      },
      withdrawableRead
        ? {
            onAdmission: (withdraw) => {
              withdrawPending = withdraw;
            },
          }
        : {},
    );
    completion.catch((error) => {
      rejectStarted(error);
      if (!settled) {
        settled = true;
        rejectWork(error);
      }
    });
    completion.catch(() => undefined);
    return Object.freeze({
      started,
      completion,
      withdrawPending: () => withdrawableRead && withdrawPending(),
      succeed: (value) => {
        if (settled) fail("SETTLED", "Transaction already settled");
        settled = true;
        resolveWork(value);
      },
      fail: (error) => {
        if (settled) fail("SETTLED", "Transaction already settled");
        settled = true;
        rejectWork(error);
      },
    });
  }
  close() {
    if (this.#closePromise) return this.#closePromise;
    this.#closed = true;
    this.#closePromise = this.#tail.then(async () => {
      const errors = [];
      try {
        await this.#port.closeWriter();
      } catch (error) {
        errors.push(error);
      }
      try {
        await this.#owner.close();
      } catch (error) {
        errors.push(error);
      }
      if (errors.length) throw new AggregateError(errors, "DuckDB writer and owner cleanup failed");
    });
    return this.#closePromise;
  }
  status() {
    return Object.freeze({
      closed: this.#closed,
      initialized: this.#ready,
      owner: this.#owner.status(),
    });
  }
}
