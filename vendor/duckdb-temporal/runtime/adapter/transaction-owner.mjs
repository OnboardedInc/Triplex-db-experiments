// Abstract acknowledged-driver protocol only. No external runtime/SQL imports.
export class TransactionOwnerError extends Error {
  constructor(code, message, details = {}) {
    super(message, "cause" in details ? { cause: details.cause } : undefined);
    this.name = "TransactionOwnerError";
    this.code = code;
    this.phase = details.phase ?? null;
    this.outcome = details.outcome ?? null;
  }
}
const fail = (code, message) => { throw new TransactionOwnerError(code, message); };
const plans = new WeakSet();
export const MAX_STATEMENT_PARAMETERS = 1024;

/** Native typed append command. The owner treats it exactly like SQL work. */
export function appendPlan({name,schema,table,rows}) {
  if(typeof name!=='string'||!name.length||name.length>128||name.includes('\0')||
     typeof schema!=='string'||typeof table!=='string'||
     !/^[a-z_][a-z0-9_]{0,127}$/.test(schema)||!/^[a-z_][a-z0-9_]{0,127}$/.test(table))
    fail('PLAN','Invalid append target');
  if(!Array.isArray(rows)||rows.length<1||rows.length>2048)fail('PLAN','Append row admission exceeded');
  let width,bytes=0;
  const copied=Array.from(rows,row=>{
    if(!Array.isArray(row)||row.length<1||row.length>64||(width!==undefined&&width!==row.length))
      fail('PLAN','Invalid append row width');
    width=row.length;
    return Object.freeze(Array.from(row,value=>{
      if(value===null||typeof value==='boolean')bytes+=1;
      else if(typeof value==='bigint'&&value>=-9223372036854775808n&&value<=9223372036854775807n)bytes+=8;
      else if(typeof value==='number'&&Number.isFinite(value))bytes+=8;
      else if(typeof value==='string'&&value.isWellFormed()&&!value.includes('\0')&&Buffer.byteLength(value)<=1048576)
        bytes+=Buffer.byteLength(value);
      else fail('PLAN','Unsupported append value');
      if(bytes>16*1024*1024)fail('PLAN','Append byte admission exceeded');
      return typeof value==='number'&&value===0?0:value;
    }));
  });
  const plan=Object.freeze({kind:'append',name,schema,table,rows:Object.freeze(copied)});
  plans.add(plan);return plan;
}

/** Owned immutable parameterized plan, for trusted backend SQL only. */
export function statementPlan(input) {
  if (!input || typeof input !== "object" || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) fail("PLAN", "Expected a statement plan record");
  const ds = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(ds);
  if (keys.length !== 3 || keys.some(k => typeof k !== "string" || !["name", "sql", "params"].includes(k) || !ds[k].enumerable || !Object.hasOwn(ds[k], "value"))) fail("PLAN", "Invalid statement plan fields");
  const name = ds.name.value, sql = ds.sql.value, params = ds.params.value;
  if (typeof name !== "string" || !name.trim() || name.length > 128 || name.includes("\0")) fail("PLAN", "Invalid statement name");
  if (typeof sql !== "string" || !sql.trim() || sql.length > 65536 || sql.includes("\0")) fail("PLAN", "Invalid SQL text");
  if (!Array.isArray(params) || Object.getPrototypeOf(params) !== Array.prototype) fail("PLAN", "Expected ordinary bound parameters");
  const ps = Object.getOwnPropertyDescriptors(params), length = ps.length.value;
  if (length > MAX_STATEMENT_PARAMETERS || Reflect.ownKeys(ps).length !== length + 1) fail("PLAN", "Invalid parameter array");
  const copied = [];
  for (let i = 0; i < length; i++) {
    const d = ps[i];
    if (!d || !Object.hasOwn(d, "value") || !d.enumerable) fail("PLAN", "Expected own data parameters");
    const v = d.value;
    if (v === null || typeof v === "boolean") copied.push(v);
    else if (typeof v === "number" && Number.isFinite(v)) copied.push(v === 0 ? 0 : v);
    else if (typeof v === "bigint" && v >= -9223372036854775808n && v <= 9223372036854775807n) copied.push(v);
    else if (typeof v === "string" && v.length <= 1048576) copied.push(v);
    else fail("PLAN", "Unsupported bound parameter");
  }
  const plan = Object.freeze({ name, sql, params: Object.freeze(copied) });
  plans.add(plan);
  return plan;
}

export class TransactionOwner {
  #port;
  #state = "ready";
  #last = null;
  #closeState = "unattempted";
  #closePromise = null;
  constructor(port) {
    if (!port || ["begin", "run", "commit", "rollback", "close"].some(k => typeof port[k] !== "function")) {
      fail("PORT", "Port must implement begin/run/commit/rollback/close");
    }
    // Capture method identities; this does not authenticate the actual driver.
    this.#port = Object.freeze(Object.fromEntries(["begin", "run", "commit", "rollback", "close"].map(k => [k, port[k].bind(port)])));
    Object.freeze(this);
  }
  status() { return Object.freeze({ state: this.#state, lastTransaction: this.#last, close: this.#closeState }); }
  #outcome(phase, outcome) { this.#last = Object.freeze({ phase, outcome }); }

  async transaction(work) {
    if (this.#state !== "ready") fail(this.#state === "active" ? "BUSY" : "FENCED", "Owner is not ready for a transaction");
    if (typeof work !== "function") fail("WORK", "Expected a trusted backend callback");
    this.#state = "active";
    try { await this.#port.begin(); } catch (cause) {
      this.#state = "fenced"; this.#outcome("begin", "unknown");
      throw new TransactionOwnerError("BEGIN_UNKNOWN", "BEGIN was not acknowledged; owner fenced", { phase: "begin", outcome: "unknown", cause });
    }
    let accepting = true, tail = Promise.resolve(), statementFailure = null, result, workFailure = null;
    const context = Object.freeze({
      fail: cause => {
        if (!accepting) fail('CONTEXT_CLOSED','Transaction context no longer accepts failures');
        statementFailure ??= cause instanceof Error ? cause : new Error('Backend operation failed',{cause});
      },
      run: plan => {
        if (!accepting) fail("CONTEXT_CLOSED", "Transaction context no longer accepts statements");
        if (!plans.has(plan)) {
          statementFailure ??= new TransactionOwnerError("PLAN", "Expected an owned statement plan");
          throw statementFailure;
        }
        const operation = tail.then(async () => {
          if (statementFailure !== null) throw statementFailure;
          if (workFailure !== null) throw workFailure;
          try { return await this.#port.run(plan); } catch (cause) {
            statementFailure = cause instanceof Error ? cause : new Error("Statement failed", { cause });
            throw statementFailure;
          }
        });
        // Always consume the tracked rejection; callers still receive operation.
        tail = operation.then(() => undefined, () => undefined);
        return operation;
      },
    });
    try { result = await work(context); } catch (cause) {
      workFailure = cause instanceof Error ? cause : new Error("Backend callback failed", { cause });
    } finally { accepting = false; }
    await tail;
    if (workFailure !== null || statementFailure !== null) {
      const phase = statementFailure !== null ? "statement" : "work";
      const cause = statementFailure ?? workFailure;
      try { await this.#port.rollback(); } catch (rollbackCause) {
        this.#state = "fenced"; this.#outcome("rollback", "unknown");
        throw new TransactionOwnerError("ROLLBACK_UNKNOWN", "ROLLBACK was not acknowledged; owner fenced", { phase: "rollback", outcome: "unknown", cause: new AggregateError([cause, rollbackCause], "Work and rollback failed") });
      }
      this.#state = "ready"; this.#outcome(phase, "rollback_ack");
      throw new TransactionOwnerError("ROLLED_BACK", "Failed work was rolled back by the port", { phase, outcome: "rollback_ack", cause });
    }
    try { await this.#port.commit(); } catch (cause) {
      this.#state = "fenced"; this.#outcome("commit", "unknown");
      throw new TransactionOwnerError("COMMIT_UNKNOWN", "COMMIT was not acknowledged; owner fenced", { phase: "commit", outcome: "unknown", cause });
    }
    this.#state = "ready"; this.#outcome("commit", "commit_ack");
    return Object.freeze({ outcome: "commit_ack", value: result });
  }

  close() {
    if (this.#state === "active") return Promise.reject(new TransactionOwnerError("BUSY", "Cannot close an active transaction owner"));
    if (this.#closePromise !== null) return this.#closePromise;
    this.#state = "closed";
    this.#closeState = "pending";
    // Schedule port call after closePromise is stored, including synchronous throws.
    this.#closePromise = Promise.resolve().then(() => this.#port.close()).then(
      () => { this.#closeState = "close_ack"; },
      cause => {
        this.#closeState = "unknown";
        throw new TransactionOwnerError("CLOSE_UNKNOWN", "Close was not acknowledged; object remains closed", { phase: "close", outcome: "unknown", cause });
      },
    );
    return this.#closePromise;
  }
}
