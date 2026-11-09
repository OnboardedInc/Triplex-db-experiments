import { Context } from "effect";

//#region src/dialects/types.d.ts
interface SqlDialect {
  readonly name: "sqlite" | "postgresql" | "mysql";
  readonly limitOffset: (limit: number | undefined, offset: number | undefined) => string;
  readonly castAsText: (expression: string) => string;
  readonly booleanLiteral: (value: boolean) => string;
  readonly paramPlaceholder: (index: number) => string;
  readonly escapeLikePattern: (value: string) => string;
}
declare const CurrentDialect_base: Context.ServiceClass<CurrentDialect, "CurrentDialect", SqlDialect>;
declare class CurrentDialect extends CurrentDialect_base {}
//#endregion
export { CurrentDialect, SqlDialect };
//# sourceMappingURL=types.d.ts.map