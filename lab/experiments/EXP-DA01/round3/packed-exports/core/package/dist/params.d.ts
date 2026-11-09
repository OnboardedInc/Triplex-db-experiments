import { SqlDialect } from "./dialects/types.js";

//#region src/params.d.ts
interface ParamCollector {
  readonly dialect: SqlDialect;
  readonly params: readonly unknown[];
  add(value: unknown): string;
  result(): {
    params: readonly unknown[];
  };
}
declare const createParamCollector: (dialect: SqlDialect) => ParamCollector;
//#endregion
export { ParamCollector, createParamCollector };
//# sourceMappingURL=params.d.ts.map