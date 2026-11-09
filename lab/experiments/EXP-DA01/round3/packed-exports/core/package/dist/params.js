//#region src/params.ts
const createParamCollector = (dialect) => {
	const params = [];
	return {
		dialect,
		get params() {
			return params;
		},
		add(value) {
			const converted = typeof value === "boolean" ? value ? 1 : 0 : value;
			params.push(converted);
			return dialect.paramPlaceholder(params.length - 1);
		},
		result() {
			return { params: [...params] };
		}
	};
};
//#endregion
export { createParamCollector };

//# sourceMappingURL=params.js.map