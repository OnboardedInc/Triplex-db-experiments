export type SqlScalar = null | boolean | string | number | bigint;
export type SqlRows = readonly (readonly SqlScalar[])[];
export interface WorkerOptions {
  readonly python: string;
  readonly worker: string;
  readonly actionHash: string;
  readonly database?: string;
  readonly cwd: string;
}
export class DuckDBPortError extends Error {
  readonly code: string;
  constructor(code: string, message: string);
}
export class DuckDBSqlError extends DuckDBPortError {
  readonly sqlType: string;
}
export class OwnedDuckDBPort {
  private constructor(options: WorkerOptions);
  static open(options: WorkerOptions): Promise<OwnedDuckDBPort>;
  begin(): Promise<SqlRows>;
  run(plan: Readonly<{ name: string; sql: string; params: readonly unknown[] }>): Promise<SqlRows>;
  commit(): Promise<SqlRows>;
  rollback(): Promise<SqlRows>;
  close(): Promise<void>;
  columnsFor(rows: SqlRows): readonly string[];
  status(): "starting" | "ready" | "closing" | "closed" | "fenced";
  trace(): readonly Readonly<{
    id: number;
    op: string;
    name: string;
    ok: boolean;
    rows?: number;
    error?: string;
  }>[];
}
export const parameterWire: Readonly<{
  encode(value: SqlScalar): readonly unknown[];
  decode(cell: unknown): SqlScalar;
}>;
