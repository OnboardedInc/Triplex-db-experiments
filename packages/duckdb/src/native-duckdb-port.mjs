// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking; runtime-populated records, option bags, or branch-specific union members; success/failure state guarantees assignment before the success-only access; runtime-guarded iterable values. Binding errors remain checked by lab/bin/checkjs.mjs.
import { createHash } from "node:crypto";
import { readFile, mkdir, mkdtemp, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import {
  DuckDBInstance,
  DuckDBTypeId,
  DuckDBDataChunk,
  DuckDBDecimalValue,
  blobValue,
  BIGINT,
  DOUBLE,
  BOOLEAN,
  VARCHAR,
  version,
} from "@duckdb/node-api";

export class NativePortError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "NativePortError";
    this.code = code;
  }
}
const fail = (code, message) => {
  throw new NativePortError(code, message);
};
function attempt(errors, action) {
  try {
    action();
  } catch (error) {
    errors.push(error);
  }
}
const cleanupFailure = (errors, primary, failed = false) =>
  new AggregateError(
    failed ? [primary, ...errors] : errors,
    "Native cleanup failed; connection fenced",
    failed ? { cause: primary } : undefined,
  );
// Keep the qualified C++ engine and paired owner; this package changes the SDK
// bridge, not the engine language. See SOURCE-ADAPTATION.json and wiki/research.md.
const defaultArtifactDirectory = fileURLToPath(new URL("../../../vendor/duckdb-temporal/runtime/build/", import.meta.url));
const require = createRequire(import.meta.url);
const integerTypes = new Set([
  DuckDBTypeId.TINYINT,
  DuckDBTypeId.SMALLINT,
  DuckDBTypeId.INTEGER,
  DuckDBTypeId.BIGINT,
  DuckDBTypeId.UTINYINT,
  DuckDBTypeId.USMALLINT,
  DuckDBTypeId.UINTEGER,
  DuckDBTypeId.UBIGINT,
]);
function parameter(value) {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value === 0 ? 0 : value;
  if (typeof value === "bigint" && value >= -9223372036854775808n && value <= 9223372036854775807n)
    return value;
  if (
    typeof value === "string" &&
    value.isWellFormed() &&
    !value.includes("\0") &&
    Buffer.byteLength(value) <= 1048576
  )
    return value;
  fail("PARAMETER", "Unsupported native parameter");
}
function memorySetting(value, fallback, allowZero = false) {
  if (value === undefined) value=fallback;
  const match =
    typeof value === "string" && /^(0|[1-9][0-9]*)\s*(B|KB|KiB|MB|MiB|GB|GiB|TB|TiB)$/i.exec(value);
  if (!match)
    throw new TypeError("Memory settings require an integer byte quantity with a supported unit");
  const units = {
    b: 1,
    kb: 1000,
    kib: 1024,
    mb: 1000000,
    mib: 1048576,
    gb: 1000000000,
    gib: 1073741824,
    tb: 1000000000000,
    tib: 1099511627776,
  };
  const bytes = Number(match[1]) * units[match[2].toLowerCase()];
  if (!Number.isSafeInteger(bytes) || bytes > 1099511627776 || bytes < (allowZero ? 0 : 1048576))
    throw new TypeError("Memory settings must be within the supported byte bounds");
  return String(bytes) + "B";
}
const profileSql="SELECT current_setting('threads'),current_setting('memory_limit'),current_setting('max_temp_directory_size'),current_setting('temp_directory')";
function approximateBytes(text){const match=/^([0-9]+(?:\.[0-9]+)?)\s*(bytes|B|KiB|MiB|GiB|TiB)$/i.exec(String(text));if(!match)fail('RESOURCE_PROFILE','Unrecognized resource readback');const unit={bytes:1,b:1,kib:1024,mib:1024**2,gib:1024**3,tib:1024**4}[match[2].toLowerCase()];return{bytes:Number(match[1])*unit,rounding:unit/10};}
function checkConfiguredBytes(actual,requested){const observed=approximateBytes(actual),expected=Number(requested.slice(0,-1));if(Math.abs(observed.bytes-expected)>Math.max(1,observed.rounding))fail('RESOURCE_PROFILE','Native resource readback differs from the requested finite byte budget');}
async function ownerArtifact(core, artifactDirectory) {
  try {
    const path = `${artifactDirectory}/owner_probe/temporal_owner_probe.duckdb_extension`;
    const [artifact, metadata] = await Promise.allSettled([
      readFile(path),
      readFile(`${artifactDirectory}/owner_probe/artifact.json`, "utf8"),
    ]);
    if (artifact.status === "rejected") throw artifact.reason;
    if (metadata.status === "rejected") throw metadata.reason;
    const manifest = JSON.parse(metadata.value);
    const apiRequire = createRequire(require.resolve("@duckdb/node-api"));
    const bindingsRequire = createRequire(apiRequire.resolve("@duckdb/node-bindings"));
    const engine = join(
      dirname(bindingsRequire.resolve("@duckdb/node-bindings-darwin-arm64/duckdb.node")),
      "libduckdb.dylib",
    );
    const engineBytes = await readFile(engine);
    if (
      manifest.engine !== "2.0.0" ||
      manifest.abi !== "CPP" ||
      manifest.core_extension_sha256 !== core.extension_sha256 ||
      createHash("sha256").update(artifact.value).digest("hex") !== manifest.extension_sha256 ||
      createHash("sha256").update(engineBytes).digest("hex") !== manifest.engine_library_sha256
    )
      throw new Error("The owner companion, core extension and selected engine identities differ");
    const writerPath = `${artifactDirectory}/owner_probe/temporal_writer.node`;
    const writerBytes = await readFile(writerPath);
    if (
      manifest.native_writer?.abi !== 1 ||
      manifest.native_writer.node_version !== process.version ||
      createHash("sha256").update(writerBytes).digest("hex") !== manifest.native_writer.addon_sha256
    )
      throw new Error("The native writer addon differs from its paired manifest");
    return { path, writerPath, hash: manifest.extension_sha256 };
  } catch (cause) {
    throw new NativePortError(
      "OWNER_ARTIFACT",
      "Native entity storage requires a matching built native owner companion",
      { cause },
    );
  }
}

/** Owned SDK read transport and paired dedicated native command executor. */
export class NativeDuckDBPort {
  #instance;
  #connection;
  #state = "ready";
  #pending = false;
  #closePromise;
  #columns = new WeakMap();
  #trace = [];
  #operations = 0;
  #statements = new Map();
  #statementBytes = 0;
  #hits = 0;
  #misses = 0;
  #control;
  #scope = null;
  #ownsInstance;
  #health;
  #restartCleanupErrors = [];
  #owned;
  #deferred = new Set();
  #writerSetup;
  #resourceProfile;
  #temporaryDirectory;
  #writer;
  #writerMetrics = [];
  constructor(
    instance,
    connection,
    control,
    ownsInstance = true,
    health = { fatal: null, uncertain: null, ports: new Set() },
    owned = false,
    writerSetup,
  ) {
    this.#instance = instance;
    this.#connection = connection;
    this.#control = control;
    this.#ownsInstance = ownsInstance;
    this.#health = health;
    health.ports.add(this);
    this.#owned = owned;
    this.#writerSetup = writerSetup;
  }
  /** Raw DuckDB transport for Triplex compatibility and compiler-only tooling. */
  static open(options = {}) {
    return NativeDuckDBPort.#open(options, false);
  }
  /** @internal Opens the native entity transport with its required pinned companion. */
  static openWithOwner(options = {}) {
    return NativeDuckDBPort.#open(options, true);
  }
  static async #open(options, withOwner) {
    if ("integrity" in options) throw new TypeError("The integrity option was removed");
    if (withOwner && (process.platform !== "darwin" || process.arch !== "arm64"))
      fail("OWNER_PLATFORM", "Native entity storage requires the pinned macOS arm64 engine");
    const threads = options.threads === undefined ? 1 : options.threads;
    if (!Number.isSafeInteger(threads) || threads < 1 || threads > 64)
      throw new TypeError("threads must be an integer in 1..64");
    const memoryLimit = memorySetting(options.memoryLimit, "128MB");
    const maxTempDirectorySize = memorySetting(options.maxTempDirectorySize, "64MB", true);
    if (version() !== "v2.0.0") fail("VERSION", "The native runtime requires DuckDB 2.0.0");
    if(options.nativeArtifactsDirectory!==undefined&&(typeof options.nativeArtifactsDirectory!=='string'||!options.nativeArtifactsDirectory.length))throw new TypeError('nativeArtifactsDirectory must be a nonempty path');
    const artifactDirectory=resolve(options.nativeArtifactsDirectory??defaultArtifactDirectory);
    const artifact = `${artifactDirectory}/temporal_datalog.duckdb_extension`;
    const controlPath = `${artifactDirectory}/temporal_control.node`;
    const [bytes, manifestText, controlBytes] = await Promise.all([
      readFile(artifact),
      readFile(`${artifactDirectory}/artifact.json`, "utf8"),
      readFile(controlPath),
    ]);
    const manifest = JSON.parse(manifestText);
    if (
      createHash("sha256").update(bytes).digest("hex") !== manifest.extension_sha256 ||
      createHash("sha256").update(controlBytes).digest("hex") !== manifest.control_bridge_sha256
    )
      fail("ARTIFACT", "The native extension differs from the build manifest");
    const writerSetup = withOwner ? await ownerArtifact(manifest,artifactDirectory) : null;
    const companion = writerSetup?.path;
    const control = require(controlPath);
    const temporaryBase=resolve(options.tempDirectory ?? (options.database && options.database!==':memory:'?dirname(resolve(options.database)):tmpdir()));
    await mkdir(temporaryBase,{recursive:true});
    const temporaryDirectory=await mkdtemp(join(temporaryBase,'triplex-duckdb-spill-'));
    const instance = await DuckDBInstance.create(options.database ?? ":memory:", {
      allow_unsigned_extensions: "true",
      threads: String(threads),
      memory_limit: memoryLimit,
      max_temp_directory_size: maxTempDirectorySize,
      temp_directory: temporaryDirectory,
    });
    let connection;
    try {
      connection = await instance.connect();
      if (withOwner) {
        const routines = await connection.runAndReadAll(
          "SELECT function_name FROM system.main.duckdb_functions() WHERE database_name IS DISTINCT FROM 'system' LIMIT 1",
        );
        if (routines.getRows().length)
          fail(
            "OWNER_CATALOG",
            "Native entity storage does not admit persisted functions or macros",
          );
      }
      await connection.run(`LOAD '${artifact.replaceAll("'", "''")}'`);
      control.initialize(artifact, manifest.extension_sha256);
      const tables = (
        await connection.runAndReadAll(
          "SELECT table_name FROM information_schema.tables WHERE table_schema='main' ORDER BY table_name",
        )
      )
        .getRows()
        .map((row) => row[0]);
      if (
        tables.length &&
        JSON.stringify(tables) !==
          JSON.stringify(["assertions", "clock", "commands", "storage_usage", "store_meta"])
      )
        fail("SCHEMA", "The database does not contain the owned native catalog");
      await connection.run("BEGIN");
      try {
        await connection.run("PRAGMA td_initialize");
        const revision = (
          await connection.runAndReadAll(
            "SELECT revision FROM td_catalog_v1.catalog_revision WHERE singleton",
          )
        ).getRows();
        if (!revision.length) await connection.run("PRAGMA td_migrate_native_catalog_v2");
        await connection.run("SELECT ok FROM td_catalog_v1.native_catalog_integrity");
        await connection.run("COMMIT");
      } catch (error) {
        await connection.run("ROLLBACK");
        throw error;
      }
      if (companion) await connection.run(`LOAD '${companion.replaceAll("'", "''")}'`);
      // Reapply finite budgets after the real file/extension context exists,
      // then retain observed native values. Startup config text alone did not
      // establish effective spill containment in the first packet experiment.
      // See wiki/problems/duckdb-recursion.md; functional cap probes are separate.
      await connection.run(`SET temp_directory='${temporaryDirectory.replaceAll("'","''")}'`);
      await connection.run(`SET memory_limit='${memoryLimit}'`);
      await connection.run(`SET max_temp_directory_size='${maxTempDirectorySize}'`);
      const observed=(await connection.runAndReadAll(profileSql)).getRows()[0].map(String);
      if(observed[0]!==String(threads)||observed[3]!==temporaryDirectory)fail('RESOURCE_PROFILE','Native threads/temp directory readback differs');
      checkConfiguredBytes(observed[1],memoryLimit);checkConfiguredBytes(observed[2],maxTempDirectorySize);
      await connection.run("SET enable_external_access=false");
      await connection.run("SET autoload_known_extensions=false");
      await connection.run("SET autoinstall_known_extensions=false");
      if (withOwner) await connection.run("SET lock_configuration=true");
      const port=new NativeDuckDBPort(
        instance,
        connection,
        control,
        true,
        undefined,
        withOwner,
        writerSetup,
      );
      port.#temporaryDirectory=temporaryDirectory;
      port.#resourceProfile=Object.freeze({requested:Object.freeze({threads,memoryBytes:Number(memoryLimit.slice(0,-1)),maximumSpillBytes:Number(maxTempDirectorySize.slice(0,-1)),temporaryDirectory}),observed:Object.freeze(observed)});
      return port;
    } catch (error) {
      const errors = [];
      attempt(errors, () => connection?.closeSync());
      attempt(errors, () => instance.closeSync());
      try{await rmdir(temporaryDirectory);}catch(cleanup){if(!['ENOENT','ENOTEMPTY'].includes(cleanup.code))errors.push(cleanup);}
      if (errors.length) throw cleanupFailure(errors, error, true);
      throw error;
    }
  }
  async assertResourceProfile(){const rows=await this.runNative({name:'resource-profile',sql:profileSql,params:[]});if(rows.length!==1||JSON.stringify(rows[0].map(String))!==JSON.stringify(this.#resourceProfile?.observed))fail('RESOURCE_PROFILE','Live native settings no longer match the finite owned profile');return this.#resourceProfile;}
  resourceProfile(){return this.#resourceProfile;}
  /** @internal Quiescent callers must pass every connection sharing this instance. */
  async activateOwnership(readers = []) {
    if (this.#owned && !this.#writer) await this.#startWriter();
    const ports = [this, ...readers];
    const acknowledge = async (port, sql) => {
      const rows = await port.runNative({ name: "native_ownership", sql, params: [] });
      if (rows.length !== 1 || rows[0]?.length !== 1 || rows[0][0] !== true)
        throw new Error("Malformed native ownership acknowledgement");
    };
    const invalidate = "SELECT system.main.td_owner_probe_invalidate()";
    try {
      await acknowledge(this, invalidate);
      for (const port of ports)
        await acknowledge(port, "SELECT system.main.td_owner_probe_enroll()");
      if (this.#writer) {
        const rows = await this.runWriter({
          name: "native_writer_enroll",
          sql: "SELECT system.main.td_owner_probe_enroll()",
          params: [],
        });
        if (rows.length !== 1 || rows[0]?.[0] !== true)
          throw new Error("Malformed native writer enrollment acknowledgement");
      }
      await acknowledge(this, "SELECT system.main.td_owner_probe_activate(0)");
      await acknowledge(this, "SELECT system.main.td_owner_probe_validated_check() AS owner_valid");
    } catch (primary) {
      const errors = [];
      for (const port of ports) {
        try {
          await acknowledge(port, invalidate);
          break;
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length === ports.length)
        throw new AggregateError(
          [primary, ...errors],
          "Native ownership activation and invalidation failed",
          { cause: primary },
        );
      throw primary;
    }
  }
  async forkReader() {
    this.checkInstance();
    if (this.#state !== "ready" || !this.#ownsInstance || this.#pending || this.#scope !== null)
      fail("BUSY", "Native instance cannot create a reader");
    this.#pending = true;
    try {
      const connection = await this.#instance.connect();
      try {
        this.checkInstance();
        const reader=new NativeDuckDBPort(
          this.#instance,
          connection,
          this.#control,
          false,
          this.#health,
          this.#owned,
        );
        reader.#resourceProfile=this.#resourceProfile;return reader;
      } catch (error) {
        connection.closeSync();
        throw error;
      }
    } catch (error) {
      throw this.#executionError(error);
    } finally {
      this.#pending = false;
    }
  }
  checkInstance() {
    if (this.#health.fatal)
      throw new NativePortError(
        "RESTART_REQUIRED",
        "TD_E_RESTART_REQUIRED: DuckDB instance had a fatal error and must be closed and reopened",
        { cause: this.#health.fatal },
      );
    if (this.#health.uncertain)
      throw new NativePortError(
        "RESTART_REQUIRED",
        "TD_E_RESTART_REQUIRED: native writer acknowledgement is uncertain; close and reopen before reconciling its receipt",
        { cause: this.#health.uncertain },
      );
  }
  #recordFailure(error) {
    // The pinned binding exposes native error text, not duckdb_result_error_type.
    // Recoverable Out of Memory errors have a different native prefix.
    if (this.#health.fatal || this.#health.uncertain || !(error instanceof Error)) return;
    const fatal = error.message.startsWith("FATAL Error:") || error.nativeWriterFatal === true;
    if (!fatal && error.nativeWriterUncertain !== true) return;
    if (fatal) this.#health.fatal = error;
    else this.#health.uncertain = error;
    this.#fenceShared();
  }
  #fenceShared() {
    for (const port of this.#health.ports) {
      if (port.#state === "closed" || port.#state === "closing") continue;
      port.#state = "fenced";
      if (port.#scope !== null)
        attempt(port.#restartCleanupErrors, () => port.#control.cancel(port.#scope));
      if (port.#pending) attempt(port.#restartCleanupErrors, () => port.#connection.interrupt());
    }
  }
  #executionError(error) {
    this.#recordFailure(error);
    if (this.#health.uncertain || (this.#health.fatal && error !== this.#health.fatal)) {
      try {
        this.checkInstance();
      } catch (restart) {
        return restart;
      }
    }
    return error;
  }
  #release(action, errors) {
    try {
      action();
    } catch (error) {
      this.#recordFailure(error);
      errors.push(error);
      this.#deferred.add(action);
    }
  }
  #discard(statement, prepared) {
    if (this.#statements.get(statement) === prepared) {
      this.#statements.delete(statement);
      this.#statementBytes -= Buffer.byteLength(statement);
    }
  }
  async #execute(op, name, statement, values = [], poll, reuse = false) {
    this.checkInstance();
    if (this.#state !== "ready" || this.#pending) fail("BUSY", "Native connection is not ready");
    if (
      typeof statement !== "string" ||
      !statement.length ||
      Buffer.byteLength(statement) > 262144 ||
      statement.includes("\0")
    )
      fail("PLAN", "Invalid SQL statement");
    if (!Array.isArray(values) || values.length > 1024)
      fail("PARAMETER", "Native parameter admission exceeded");
    const parameters = values.map(parameter);
    this.#pending = true;
    let result,
      prepared,
      owned,
      primary,
      failed = false;
    const errors = [];
    try {
      // The binding otherwise infers BigInt as HUGEINT, which changes overload
      // resolution (for example range(?)) and the selected int64 contract.
      const types = parameters.map((value) =>
        value === null
          ? undefined
          : typeof value === "bigint"
            ? BIGINT
            : typeof value === "number"
              ? DOUBLE
              : typeof value === "boolean"
                ? BOOLEAN
                : VARCHAR,
      );
      // SELECTs, native read query pragmas and explicitly engine-compiled read
      // templates are reused. Invocation tokens remain fresh bound values.
      // DuckDB rejects multiple original statements during preparation.
      // A statement owns no result or bound
      // values between calls; DuckDB remains responsible for catalog rebinding.
      if (
        op === "run" &&
        (reuse ||
          /^\s*SELECT\b/i.test(statement) ||
          /^\s*PRAGMA\s+td_query_store(?:_native|_preferred_native|_scalable|_owned|_values_v2|_scalable_v2)?\s*\(/i.test(
            statement,
          ))
      ) {
        prepared = this.#statements.get(statement);
        if (prepared) {
          this.#hits++;
          this.#statements.delete(statement);
          this.#statements.set(statement, prepared);
        } else {
          this.#misses++;
          prepared = await this.#connection.prepare(statement);
          this.#statements.set(statement, prepared);
          this.#statementBytes += Buffer.byteLength(statement);
          while (this.#statements.size > 32 || this.#statementBytes > 262144) {
            const [sql, old] = this.#statements.entries().next().value;
            this.#statements.delete(sql);
            this.#statementBytes -= Buffer.byteLength(sql);
            this.#release(() => old.destroySync(), errors);
            if (errors.length) throw new NativePortError("CLEANUP", "Prepared eviction failed");
          }
        }
        if (poll) poll();
        attempt(errors, () => prepared.clearBindings());
        if (errors.length) throw new NativePortError("CLEANUP", "Initial binding cleanup failed");
        prepared.bind(parameters, types);
        result = await prepared.stream();
      } else
        result = parameters.length
          ? await this.#connection.stream(statement, parameters, types)
          : await this.#connection.stream(statement);
      const columns = result.columnNames();
      const integers = columns.map((_, index) => integerTypes.has(result.columnTypeId(index)));
      const decimals = columns.map(
        (_, index) => result.columnTypeId(index) === DuckDBTypeId.DECIMAL,
      );
      const rows = [];
      let bytes = 0;
      for (;;) {
        const chunk = await result.fetchChunk();
        this.checkInstance();
        if (poll) poll();
        if (!chunk || chunk.rowCount === 0) break;
        for (let index = 0; index < chunk.rowCount; index++) {
          if (poll && (rows.length & 1023) === 0) poll();
          if (rows.length >= 100000 || (rows.length + 1) * columns.length > 800000)
            fail("RESULT_LIMIT", "Native result admission exceeded");
          const owned = chunk.getRowValues(index).map((value, column) => {
            if (value !== null && integers[column]) value = BigInt(value);
            // The shared exact-integer compiler emits DECIMAL(32,0) ordering
            // keys. The pinned node-api returns DuckDBDecimalValue, not a JS
            // number. Retain its exact scale-zero payload and let int64
            // admission reject overflow. The compiler's closed category key
            // 0/0.5/1/2/3 is DECIMAL(scale1); each has an exact binary64 value.
            // All other decimal carriers remain refused, never rounded.
            // Source: @duckdb/node-api2.0.0-r.1/lib/values/DuckDBDecimalValue.
            if (value !== null && decimals[column]) {
              if (!(value instanceof DuckDBDecimalValue))
                fail("RESULT", "Unexpected pinned decimal carrier");
              if (value.scale === 0) value = value.value;
              else if (value.scale === 1 && [0n, 5n, 10n, 20n, 30n].includes(value.value))
                value = Number(value.value) / 10;
              else
                fail(
                  "RESULT",
                  "Only exact integer or compiler category decimal carriers are supported",
                );
            }
            const cell = parameter(value);
            bytes += typeof cell === "string" ? Buffer.byteLength(cell) : 8;
            if (bytes > 16 * 1024 * 1024)
              fail("RESULT_LIMIT", "Native result byte admission exceeded");
            return cell;
          });
          rows.push(Object.freeze(owned));
        }
      }
      owned = Object.freeze(rows);
      this.#columns.set(owned, Object.freeze(columns));
    } catch (error) {
      primary = this.#executionError(error);
      failed = true;
      if (prepared) this.#discard(statement, prepared);
    }
    try {
      if (result) this.#release(() => result.closeSync(), errors);
      if (prepared) {
        attempt(errors, () => prepared.clearBindings());
        if (errors.length || failed) this.#discard(statement, prepared);
        if (this.#statements.get(statement) !== prepared)
          this.#release(() => prepared.destroySync(), errors);
      }
      for (const error of errors) this.#recordFailure(error);
      errors.push(...this.#restartCleanupErrors.splice(0));
      if (errors.length) this.#state = "fenced";
    } finally {
      this.#pending = false;
    }
    this.#operations++;
    this.#trace.push(
      Object.freeze(
        errors.length || failed
          ? {
              id: this.#operations,
              op,
              name,
              ok: false,
              error: errors.length ? "CLEANUP_FAILED" : "SQL_OR_RESULT_REJECTED",
            }
          : { id: this.#operations, op, name, ok: true, rows: owned.length },
      ),
    );
    if (this.#trace.length > 256) this.#trace.shift();
    if (errors.length) throw cleanupFailure(errors, primary, failed);
    if (failed) throw primary;
    return owned;
  }
  #unscoped() {
    this.checkInstance();
    if (this.#scope !== null) fail("BUSY", "Native query control owns this connection");
  }
  async #invalidateOwner(poll) {
    if (this.#owned)
      await this.#execute(
        "run",
        "owner_invalidate",
        "SELECT system.main.td_owner_probe_invalidate()",
        [],
        poll,
      );
  }
  async begin() {
    this.#unscoped();
    if (this.#owned) {
      await this.#invalidateOwner();
      this.#unscoped();
    }
    return this.#execute("begin", "begin", "BEGIN TRANSACTION");
  }
  async run(plan) {
    this.#unscoped();
    if (this.#owned) {
      await this.#invalidateOwner();
      this.#unscoped();
    }
    return plan.kind === "append"
      ? this.#append(plan)
      : this.#execute("run", plan.name, plan.sql, plan.params);
  }
  /** @internal Only the store's generated native commands and reads may use this authority. */
  async runNative(plan) {
    this.#unscoped();
    return plan.kind === "append"
      ? this.#append(plan)
      : this.#execute("run", plan.name, plan.sql, plan.params);
  }
  async #startWriter() {
    this.#unscoped();
    if (!this.#ownsInstance || !this.#writerSetup)
      fail("OWNER_ARTIFACT", "Native writer requires its original owned instance");
    const bridge = require(this.#writerSetup.writerPath);
    bridge.initialize(this.#writerSetup.path, this.#writerSetup.hash);
    const rows = await this.#execute(
      "run",
      "native_writer_bootstrap",
      "SELECT system.main.td_native_writer_bootstrap()",
    );
    if (rows.length !== 1 || typeof rows[0]?.[0] !== "bigint")
      throw new Error("Malformed native writer bootstrap ticket");
    // Opaque GC roots only: addon never reads/casts SDK wrapper internals.
    // Native DB ownership alone would not keep these original JS handles live
    // after a failed factory drops the port before native cleanup completes.
    this.#writer = {
      bridge,
      handle: bridge.claim(rows[0][0], { instance: this.#instance, connection: this.#connection }),
      closePromise: null,
    };
  }
  /** @internal Generated schema/command/resource operations only; same logical SDK writer tail. */
  async runWriter(plan) {
    this.#unscoped();
    if (!this.#writer || this.#writer.closePromise || this.#pending || this.#state !== "ready")
      fail("BUSY", "Native writer is not ready");
    if (
      typeof plan.sql !== "string" ||
      !plan.sql.length ||
      Buffer.byteLength(plan.sql) > 262144 ||
      plan.sql.includes("\0")
    )
      fail("PLAN", "Invalid SQL statement");
    if (!Array.isArray(plan.params) || plan.params.length > 1024)
      fail("PARAMETER", "Native parameter admission exceeded");
    const parameters = plan.params.map(parameter),
      started = performance.now();
    let bridgeReturned = false;
    this.#pending = true;
    try {
      const response = await this.#writer.bridge.run(this.#writer.handle, plan.sql, parameters);
      bridgeReturned = true;
      this.checkInstance();
      const returned = performance.now();
      if (!Array.isArray(response.rows)) throw new Error("Malformed native writer result");
      const rows = Object.freeze(response.rows.map((row) => Object.freeze(row.map(parameter))));
      this.#writerMetrics.push(
        Object.freeze({
          name: plan.name,
          ...response.metrics,
          bridgeAwaitMs: returned - started,
          portDecodeMs: performance.now() - returned,
          portFullMs: performance.now() - started,
        }),
      );
      if (this.#writerMetrics.length > 256) this.#writerMetrics.shift();
      this.#operations++;
      this.#trace.push(
        Object.freeze({
          id: this.#operations,
          op: "writer",
          name: plan.name,
          ok: true,
          rows: rows.length,
        }),
      );
      if (this.#trace.length > 256) this.#trace.shift();
      this.checkInstance();
      return rows;
    } catch (error) {
      if (bridgeReturned) throw this.writerDeliveryError(error);
      if (error?.nativeWriterPortCode) {
        const primary = error;
        error = new NativePortError(primary.nativeWriterPortCode, primary.message, {
          cause: primary,
        });
        if (primary.nativeWriterUncertain) error.nativeWriterUncertain = true;
      }
      throw this.#executionError(error);
    } finally {
      this.#pending = false;
    }
  }
  /** @internal Native queue/SQL/copy/completion spans; overlap full public wall. */
  writerMetrics() {
    return Object.freeze([...this.#writerMetrics]);
  }
  /** @internal Any post-native wire/typed-delivery failure fences the shared instance. */
  writerDeliveryError(cause) {
    const error =
      cause instanceof Error ? cause : new Error("Native writer delivery failed", { cause });
    if (!this.#health.fatal && !this.#health.uncertain) {
      this.#health.uncertain = error;
      this.#fenceShared();
    }
    return this.#executionError(error);
  }
  /** @internal True only after addon confirms worker join and opaque handle release. */
  writerRetired() {
    return this.#writer == null;
  }
  /** @internal Store drains its accepted work before retiring the extra USER context. */
  closeWriter() {
    if (!this.#writer) return Promise.resolve();
    const writer = this.#writer;
    if (!writer.closePromise)
      writer.closePromise = Promise.resolve()
        .then(() => writer.bridge.close(writer.handle))
        .then(() => {
          this.#writer = null;
        })
        .catch((error) => {
          try {
            if (writer.bridge.retired(writer.handle)) this.#writer = null;
          } catch {}
          writer.closePromise = null;
          throw this.writerDeliveryError(error);
        });
    return writer.closePromise;
  }
  withQueryControl(options, work) {
    return this.#queryControl(options, work, false);
  }
  /** @internal The work callback may submit only store-generated native queries. */
  withNativeQueryControl(options, work) {
    return this.#queryControl(options, work, true);
  }
  async #queryControl({ signal, timeoutMs }, work, trusted) {
    if (
      timeoutMs !== undefined &&
      (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000)
    )
      throw new TypeError("timeoutMs must be an integer in 1..60000");
    if (signal !== undefined && !(signal instanceof AbortSignal))
      throw new TypeError("signal must be an AbortSignal");
    if (signal?.aborted) fail("CANCELED", "TD_E_CANCELED: query canceled before execution");
    this.#unscoped();
    if (this.#pending || this.#state !== "ready") fail("BUSY", "Native connection is not ready");
    const token = this.#control.create(timeoutMs);
    this.#scope = token;
    let reason = null,
      cancelError,
      timer,
      running = null;
    const stop = (kind) => {
      if (this.#scope !== token) return;
      reason ??= kind;
      try {
        this.#control.cancel(token);
      } catch (error) {
        cancelError ??= error;
      }
      try {
        if (this.#pending) this.#connection.interrupt();
      } catch (error) {
        cancelError ??= error;
      }
    };
    const check = () => {
      this.checkInstance();
      if (this.#state === "fenced")
        fail("CLEANUP", "Native connection is fenced after uncertain cleanup");
      if (cancelError) throw cancelError;
      const status = this.#control.status(token);
      if (reason === "timeout" || status === 2)
        fail("DEADLINE", "TD_E_DEADLINE: whole-query timeout exceeded");
      if (reason === "signal" || status === 1) fail("CANCELED", "TD_E_CANCELED: query canceled");
      if (status !== 0) fail("CONTROL", "TD_E_CONTROL: invocation is retired");
    };
    const rejected = (error) => {
      if (this.#state === "fenced") throw error;
      try {
        check();
      } catch (controlError) {
        if (controlError instanceof Error && error instanceof Error) controlError.cause = error;
        throw controlError;
      }
      throw error;
    };
    const onAbort = () => stop("signal");
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) stop("signal");
    if (timeoutMs !== undefined) timer = setTimeout(() => stop("timeout"), timeoutMs);
    const scope = Object.freeze({
      token,
      check,
      run: async (plan) => {
        check();
        if (running) fail("BUSY", "Native controlled query already running");
        const pending = (async () => {
          if (!trusted && this.#owned) await this.#invalidateOwner(check);
          return this.#execute("run", plan.name, plan.sql, plan.params, check, plan.reuse === true);
        })().then((value) => {
          check();
          return value;
        }, rejected);
        running = pending;
        pending.catch(() => {});
        return pending.finally(() => {
          if (running === pending) running = null;
        });
      },
    });
    let value,
      primary,
      failed = false;
    try {
      value = await work(scope);
      if (running) fail("CONTROL", "TD_E_CONTROL: query scope returned before its operation");
      check();
    } catch (error) {
      try {
        rejected(error);
      } catch (error) {
        primary = error;
        failed = true;
      }
    }
    if (running) {
      stop("signal");
      await running.catch(() => {});
    }
    const errors = [];
    attempt(errors, () => clearTimeout(timer));
    this.#release(() => signal?.removeEventListener("abort", onAbort), errors);
    this.#release(() => this.#control.release(token), errors);
    this.#scope = null;
    if (errors.length) {
      this.#state = "fenced";
      throw cleanupFailure(errors, primary, failed);
    }
    if (failed) throw primary;
    return value;
  }
  supportsAppend() {
    return true;
  }
  async #append(plan) {
    this.checkInstance();
    if (this.#state !== "ready" || this.#pending) fail("BUSY", "Native connection is not ready");
    if (!Array.isArray(plan.rows) || plan.rows.length < 1 || plan.rows.length > 2048)
      fail("APPEND", "Append row admission exceeded");
    this.#pending = true;
    let appender;
    try {
      appender = await this.#connection.createAppender(plan.table, plan.schema);
      this.checkInstance();
      const width = appender.columnCount;
      if (plan.rows.some((row) => !Array.isArray(row) || row.length !== width))
        fail("APPEND", "Append row/schema width differs");
      const types = Array.from({ length: width }, (_, column) => appender.columnType(column));
      const chunk = DuckDBDataChunk.create(types, plan.rows.length);
      for (let column = 0; column < width; column++) {
        const blob = types[column].typeId === DuckDBTypeId.BLOB;
        chunk.setColumnValues(
          column,
          plan.rows.map((row) =>
            row[column] === null
              ? null
              : blob
                ? blobValue(Buffer.from(row[column], "utf8"))
                : row[column],
          ),
        );
      }
      appender.appendDataChunk(chunk);
      appender.flushSync();
      appender.closeSync();
      appender = undefined;
      this.#operations++;
      this.#trace.push(
        Object.freeze({
          id: this.#operations,
          op: "append",
          name: plan.name,
          ok: true,
          rows: plan.rows.length,
        }),
      );
      if (this.#trace.length > 256) this.#trace.shift();
      return Object.freeze([Object.freeze([BigInt(plan.rows.length)])]);
    } catch (error) {
      const primary = this.#executionError(error);
      // Clear pending appender rows before closing; never replay a failed flush.
      if (appender) {
        try {
          try {
            appender.clear();
          } finally {
            appender.closeSync();
          }
        } catch (cleanup) {
          this.#recordFailure(cleanup);
          this.#state = "fenced";
          throw new AggregateError(
            [primary, cleanup, ...this.#restartCleanupErrors.splice(0)],
            "Appender cleanup failed; connection fenced",
            { cause: primary },
          );
        }
      }
      this.#operations++;
      this.#trace.push(
        Object.freeze({
          id: this.#operations,
          op: "append",
          name: plan.name,
          ok: false,
          error: "APPEND_REJECTED",
        }),
      );
      if (this.#trace.length > 256) this.#trace.shift();
      const errors = this.#restartCleanupErrors.splice(0);
      if (errors.length) throw cleanupFailure(errors, primary, true);
      throw primary;
    } finally {
      this.#pending = false;
    }
  }
  async commit() {
    this.#unscoped();
    if (this.#owned) {
      await this.#invalidateOwner();
      this.#unscoped();
    }
    return this.#execute("commit", "commit", "COMMIT");
  }
  async rollback() {
    this.#unscoped();
    const rows = await this.#execute("rollback", "rollback", "ROLLBACK");
    if (this.#owned) await this.#invalidateOwner();
    return rows;
  }
  interrupt() {
    if (this.#state !== "ready") return;
    if (this.#scope !== null) this.#control.cancel(this.#scope);
    if (this.#pending) this.#connection.interrupt();
  }
  close() {
    if (this.#closePromise) return this.#closePromise;
    if (this.#pending || this.#scope !== null)
      return Promise.reject(new NativePortError("BUSY", "Cannot close an active native operation"));
    this.#state = "closing";
    this.#closePromise = Promise.resolve()
      .then(async () => {
        const errors = this.#restartCleanupErrors.splice(0);
        try {
          await this.closeWriter();
        } catch (error) {
          errors.push(error);
        }
        // Keep original SDK owner strongly retained while native retirement is
        // uncertain. A retry or async environment cleanup owns the same handle.
        if (!this.writerRetired()) throw cleanupFailure(errors, undefined, false);
        const deferred = [...this.#deferred],
          statements = [...this.#statements.values()];
        this.#deferred.clear();
        this.#statements.clear();
        this.#statementBytes = 0;
        for (const action of deferred) this.#release(action, errors);
        for (const prepared of statements) this.#release(() => prepared.destroySync(), errors);
        if (this.#connection)
          attempt(errors, () => {
            this.#connection.closeSync();
            this.#connection = null;
          });
        if (this.#instance && this.#ownsInstance)
          attempt(errors, () => {
            this.#instance.closeSync();
            this.#instance = null;
          });
        if (!this.#ownsInstance) this.#instance = null;
        if(this.#ownsInstance&&this.#temporaryDirectory){try{await rmdir(this.#temporaryDirectory);}catch(error){if(!['ENOENT','ENOTEMPTY'].includes(error.code))errors.push(error);}}
        if (errors.length) throw cleanupFailure(errors);
        this.#state = "closed";
        this.#health.ports.delete(this);
      })
      .catch((error) => {
        this.#state = "fenced";
        this.#closePromise = undefined;
        throw error;
      });
    return this.#closePromise;
  }
  columnsFor(rows) {
    if (!this.#columns.has(rows)) fail("ROW_OWNER", "Rows do not belong to this native port");
    return this.#columns.get(rows);
  }
  status() {
    return this.#state;
  }
  trace() {
    return Object.freeze([...this.#trace]);
  }
  cacheStats() {
    return Object.freeze({
      entries: this.#statements.size,
      sqlBytes: this.#statementBytes,
      hits: this.#hits,
      misses: this.#misses,
    });
  }
}
