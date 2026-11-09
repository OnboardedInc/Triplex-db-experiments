import { Schema } from "effect";
//#region src/types/Pattern.ts
const Variable = Schema.Struct({
	_tag: Schema.Literal("Variable"),
	name: Schema.String
});
const variable = (name) => ({
	_tag: "Variable",
	name
});
const v = variable;
const isVariable = (x) => typeof x === "object" && x !== null && "_tag" in x && x._tag === "Variable";
//#endregion
export { Variable, isVariable, v, variable };

//# sourceMappingURL=Pattern.js.map