import type { SqlRows } from './owned-duckdb-port.mjs';
export class NativePortError extends Error { readonly code:string; }
export interface NativeQueryControl {
  readonly token:bigint;
  check():void;
  /** reuse is reserved for read SQL compiled by the pinned native engine. */
  run(plan:Readonly<{name:string;sql:string;params:readonly unknown[];reuse?:boolean}>):Promise<SqlRows>;
}
export interface NativeWriterMetric {
  readonly name:string;readonly nativeQueueNs:bigint;readonly sqlCallNs:bigint;readonly copyAndCleanupNs:bigint;
  readonly completionWaitNs:bigint;readonly sequence:bigint;readonly connectionId:bigint;
  readonly bridgeAwaitMs:number;readonly portDecodeMs:number;readonly portFullMs:number;
}
export class NativeDuckDBPort {
  static open(options?:{readonly database?:string;readonly threads?:number;readonly memoryLimit?:string;readonly maxTempDirectorySize?:string}):Promise<NativeDuckDBPort>;
  /** @internal Required companion for the native entity path. */
  static openWithOwner(options?:Parameters<typeof NativeDuckDBPort.open>[0]):Promise<NativeDuckDBPort>;
  /** @internal Audits the instance and enrolls all quiescent native connections. */
  activateOwnership(readers?:readonly NativeDuckDBPort[]):Promise<void>;
  forkReader():Promise<NativeDuckDBPort>;
  checkInstance():void;
  begin():Promise<SqlRows>;
  run(plan:Readonly<{name:string;sql:string;params:readonly unknown[]}>|Readonly<{kind:'append';name:string;schema:string;table:string;rows:readonly (readonly unknown[])[]}>):Promise<SqlRows>;
  /** @internal Only store-generated native commands and queries may use this authority. */
  runNative(plan:Parameters<NativeDuckDBPort['run']>[0]):Promise<SqlRows>;
  /** @internal Dedicated companion USER connection; generated writer operations only. */
  runWriter(plan:Readonly<{name:string;sql:string;params:readonly unknown[]}>):Promise<SqlRows>;
  /** @internal Drain before SDK port/instance close. */
  closeWriter():Promise<void>;
  /** @internal Overlapping diagnostic scopes, not exclusive engine time. */
  writerMetrics():readonly NativeWriterMetric[];
  /** @internal Shared fail-closed classification of post-native receipt delivery. */
  writerDeliveryError(cause:unknown):Error;
  /** @internal Opaque native handle has actually joined/retired, not merely requested close. */
  writerRetired():boolean;
  withQueryControl<T>(options:{readonly timeoutMs?:number;readonly signal?:AbortSignal},work:(control:NativeQueryControl)=>Promise<T>):Promise<T>;
  /** @internal Only store-generated native queries may use this authority. */
  withNativeQueryControl<T>(options:{readonly timeoutMs?:number;readonly signal?:AbortSignal},work:(control:NativeQueryControl)=>Promise<T>):Promise<T>;
  supportsAppend():boolean;
  commit():Promise<SqlRows>;
  rollback():Promise<SqlRows>;
  interrupt():void;
  close():Promise<void>;
  columnsFor(rows:SqlRows):readonly string[];
  status():'starting'|'ready'|'closing'|'closed'|'fenced';
  trace():readonly Readonly<{id:number;op:string;name:string;ok:boolean;rows?:number;error?:string}>[];
  cacheStats():Readonly<{entries:number;sqlBytes:number;hits:number;misses:number}>;
}
