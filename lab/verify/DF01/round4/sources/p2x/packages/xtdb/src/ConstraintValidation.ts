import { Constraint, type TransactOp } from "@triplex-build/triplex";
import { createHash } from "node:crypto";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { assertionValue, canonicalJson, packValue } from "./codecs.js";
import type { XtdbClient } from "./XtdbClient.js";

const columns = [
  "id",
  "entity_id",
  "attribute",
  "entity_type",
  "valid_from",
  "valid_to",
  "value_type",
  "value_string",
  "value_number",
  "value_boolean",
  "value_datetime",
  "value_json",
  "value_identity",
];
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

interface SourceState {
  readonly sourceK: number;
  readonly rows: ReadonlyMap<string, TripleRow>;
}

/** Compile the same current-recorded pre/post graphs as the portable oracle. */
const source = (
  scopeKey: string,
  state: SourceState,
  operations: readonly TransactOp[],
  rules: readonly Constraint.Rule[],
  instant: number,
) => {
  const params: unknown[] = [];
  const bind = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const overwritten = [...state.rows.keys()];
  const raw = `SELECT ${columns.join(", ")} FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ${bind(scopeKey)} AND recorded_position <= ${bind(state.sourceK)} AND (retracted_position IS NULL OR retracted_position > ${bind(state.sourceK)})${overwritten.length ? ` AND id NOT IN (${overwritten.map(bind).join(", ")})` : ""}`;
  const overlay = [...state.rows.values()].filter((row) => row.retracted_at === null);
  const record = (row: Record<string, unknown>) =>
    `SELECT ${columns.map((column) => `${bind(row[column] ?? null)} AS ${column}`).join(", ")}`;
  const definitions = [
    `raw AS (${[raw, ...overlay.map((row) => record({ ...row, value_identity: canonicalJson(assertionValue(row)) }))].join(" UNION ALL ")})`,
  ];
  const sourceTypes = [...new Set(rules.map((rule) => rule.entityType))];
  const targetTypes = [
    ...new Set(
      rules.flatMap((rule) => (rule._tag === "ReferenceTarget" ? [rule.targetEntityType] : [])),
    ),
  ];
  const assertedSubjects = operations.flatMap((operation) =>
    operation.op === "assert" &&
    operation.entityType !== undefined &&
    sourceTypes.includes(operation.entityType)
      ? [operation.entityId]
      : [],
  );
  definitions.push(
    `source_subjects AS (SELECT DISTINCT entity_id FROM raw WHERE entity_type IN (${sourceTypes.map(bind).join(", ")})${assertedSubjects.length ? ` UNION ${[...new Set(assertedSubjects)].map((entityId) => `SELECT ${bind(entityId)} AS entity_id`).join(" UNION ")}` : ""})`,
  );
  definitions.push(
    `before_graph AS (SELECT r.* FROM raw r WHERE EXISTS (SELECT 1 FROM source_subjects s WHERE s.entity_id = r.entity_id)${targetTypes.length ? ` OR r.entity_type IN (${targetTypes.map(bind).join(", ")})` : ""})`,
  );
  const deleted = operations.flatMap((operation) =>
    operation.op === "retract" ? [operation.id] : [],
  );
  const removePatterns = operations.flatMap((operation) =>
    operation.op === "retract-pattern" ? [operation.pattern] : [],
  );
  const retained = deleted.length ? [`id NOT IN (${deleted.map(bind).join(", ")})`] : [];
  for (const pattern of removePatterns) {
    const conditions: string[] = [];
    if (pattern.entityId !== undefined) conditions.push(`entity_id = ${bind(pattern.entityId)}`);
    if (pattern.attribute !== undefined) conditions.push(`attribute = ${bind(pattern.attribute)}`);
    if (pattern.entityType !== undefined)
      conditions.push(`entity_type = ${bind(pattern.entityType)}`);
    if (pattern.value !== undefined) {
      for (const [column, value] of Object.entries(packValue(pattern.value))) {
        if (value !== null) conditions.push(`${column} = ${bind(value)}`);
      }
    }
    retained.push(
      `NOT COALESCE((${conditions.length ? conditions.join(" AND ") : "TRUE"}), FALSE)`,
    );
  }
  const pending: string[] = [];
  operations.forEach((operation, index) => {
    if (operation.op !== "assert") return;
    const id = `constraint-pending-${index}`;
    const removed = operations.slice(index + 1).some((later) => {
      if (later.op === "retract") return later.id === id;
      if (later.op !== "retract-pattern") return false;
      const pattern = later.pattern;
      return (
        (pattern.entityId === undefined || pattern.entityId === operation.entityId) &&
        (pattern.attribute === undefined || pattern.attribute === operation.attribute) &&
        (pattern.entityType === undefined || pattern.entityType === operation.entityType) &&
        (pattern.value === undefined ||
          Constraint.sameMutationValue(pattern.value, operation.value))
      );
    });
    if (!removed)
      pending.push(
        record({
          id,
          entity_id: operation.entityId,
          attribute: operation.attribute,
          entity_type: operation.entityType ?? null,
          valid_from: operation.validFrom ?? instant,
          valid_to: operation.validTo ?? null,
          ...packValue(operation.value),
          value_identity: canonicalJson(operation.value),
        }),
      );
  });
  // Normalize only the submitted command. Keeping a CTE per operation causes
  // repeated expansion when XTDB inlines the pre/post graphs into rule joins.
  definitions.push(
    `after_graph AS (${[`SELECT * FROM before_graph${retained.length ? ` WHERE ${retained.join(" AND ")}` : ""}`, ...pending].join(" UNION ALL ")})`,
  );
  definitions.push(
    `boundaries AS (SELECT valid_from AS boundary FROM before_graph UNION SELECT valid_to AS boundary FROM before_graph WHERE valid_to IS NOT NULL UNION SELECT valid_from AS boundary FROM after_graph UNION SELECT valid_to AS boundary FROM after_graph WHERE valid_to IS NOT NULL)`,
  );
  for (const side of ["before", "after"])
    definitions.push(
      `visible_${side} AS (SELECT b.boundary, g.* FROM boundaries b JOIN ${side}_graph g ON g.valid_from <= b.boundary AND (g.valid_to IS NULL OR g.valid_to > b.boundary))`,
    );
  return { definitions, params, bind };
};

const ruleRelations = (rule: Constraint.Rule, prefix: "before" | "after"): string[] => {
  const visible = `visible_${prefix}`;
  const subjects = `subjects_${prefix}`;
  const claims = `claims_${prefix}`;
  const counts = `counts_${prefix}`;
  const violations = `violations_${prefix}`;
  const definitions = [
    `${subjects} AS (SELECT DISTINCT boundary, entity_id FROM ${visible} WHERE entity_type = ${literal(rule.entityType)})`,
  ];
  if (rule._tag === "Required" || rule._tag === "Cardinality") {
    definitions.push(
      `${counts} AS (SELECT s.boundary, s.entity_id, COUNT(v.id) AS actual FROM ${subjects} s LEFT JOIN ${visible} v ON v.boundary = s.boundary AND v.entity_id = s.entity_id AND v.attribute = ${literal(rule.attribute)} GROUP BY s.boundary, s.entity_id)`,
    );
    definitions.push(
      `${violations} AS (SELECT boundary, entity_id, actual, CAST(NULL AS TEXT) AS value_identity, CAST(NULL AS TEXT) AS value_type, CAST(NULL AS TEXT) AS value_string, CAST(NULL AS TEXT) AS claimants FROM ${counts} WHERE actual ${rule._tag === "Required" ? "= 0" : `> ${rule.max}`})`,
    );
  } else {
    definitions.push(
      `${claims} AS (SELECT v.* FROM ${visible} v JOIN ${subjects} s ON s.boundary = v.boundary AND s.entity_id = v.entity_id WHERE v.attribute = ${literal(rule.attribute)})`,
    );
    if (rule._tag === "Unique") {
      definitions.push(
        `distinct_${claims} AS (SELECT DISTINCT boundary, entity_id, value_identity FROM ${claims})`,
      );
      definitions.push(
        `${counts} AS (SELECT boundary, value_identity, COUNT(*) AS actual, ARRAY_AGG(entity_id ORDER BY entity_id) AS claimants FROM distinct_${claims} GROUP BY boundary, value_identity)`,
      );
      definitions.push(
        `${violations} AS (SELECT c.boundary, c.entity_id, n.actual, c.value_identity, CAST(NULL AS TEXT) AS value_type, CAST(NULL AS TEXT) AS value_string, n.claimants FROM distinct_${claims} c JOIN ${counts} n ON n.boundary = c.boundary AND n.value_identity = c.value_identity WHERE n.actual > 1)`,
      );
    } else {
      definitions.push(
        `${violations} AS (SELECT c.boundary, c.entity_id, 1 AS actual, c.value_identity, c.value_type, c.value_string, CAST(NULL AS TEXT) AS claimants FROM ${claims} c WHERE c.value_type <> 'ref' OR NOT EXISTS (SELECT 1 FROM ${visible} target WHERE target.boundary = c.boundary AND target.entity_id = c.value_string AND target.entity_type = ${literal(rule.targetEntityType)}))`,
      );
    }
  }
  return definitions;
};

export const validateXtdbConstraints = async (
  client: XtdbClient,
  scopeKey: string,
  state: SourceState,
  input: {
    readonly operations: readonly TransactOp[];
    readonly constraints: readonly Constraint.Rule[];
    readonly instant: number;
  },
  options: {
    readonly strategy?: "inline" | "projection";
    readonly timeoutMs?: number;
    readonly signal?: AbortSignal;
  } = {},
): Promise<readonly Constraint.ViolationAt[] | undefined> => {
  if (!input.constraints.length) return [];
  const plan = source(scopeKey, state, input.operations, input.constraints, input.instant);
  // Existing pre-key scopes remain correct through the portable oracle. Do not
  // silently equate differently spelled JSON or rewrite their user payloads.
  const deadline = {
    timeoutMs: options.timeoutMs ?? 30_000,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  };
  const oldRows = await client.query(
    "SELECT id FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND recorded_position <= ? AND (retracted_position IS NULL OR retracted_position > ?) AND value_identity IS NULL LIMIT 1",
    [scopeKey, state.sourceK, state.sourceK],
    undefined,
    deadline,
  );
  if (oldRows.length) return undefined;
  let definitions = plan.definitions;
  let params = plan.params;
  if (options.strategy === "projection") {
    const runId = createHash("sha256")
      .update(
        canonicalJson({
          v: 1,
          scopeKey,
          sourceK: state.sourceK,
          overlay: [...state.rows.values()],
          operations: input.operations,
          constraints: input.constraints,
          instant: input.instant,
        }),
      )
      .digest("hex");
    const graphDefinitions = plan.definitions.filter(
      (definition) => !/^(boundaries|visible_before|visible_after) AS/.test(definition),
    );
    const cached = await client.query(
      "SELECT run_id FROM tx_constraint_generations FOR ALL VALID_TIME WHERE scope_key = ? AND run_id = ?",
      [scopeKey, runId],
      undefined,
      deadline,
    );
    const statements = ["before", "after"].map((side) => ({
      sql: `INSERT INTO tx_constraint_graphs (_id, _valid_from, scope_key, run_id, phase, ${columns.join(", ")}) SELECT ${literal(`${runId}:${side}:`)} || g.id, TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', ${literal(scopeKey)}, ${literal(runId)}, '${side}', ${columns.map((column) => `g.${column}`).join(", ")} FROM (WITH ${graphDefinitions.join(", ")} SELECT * FROM ${side}_graph) g`,
      params: plan.params,
    }));
    if (!cached.length)
      await client.submit([
        ...statements,
        {
          sql: "INSERT INTO tx_constraint_generations (_id, _valid_from, scope_key, run_id, source_k) VALUES (?, TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', ?, ?, ?)",
          params: [`${scopeKey}/${runId}`, scopeKey, runId, state.sourceK],
        },
      ]);
    definitions = [
      ...["before", "after"].map(
        (side) =>
          `${side}_graph AS (SELECT ${columns.join(", ")} FROM tx_constraint_graphs FOR ALL VALID_TIME WHERE scope_key = ${literal(scopeKey)} AND run_id = ${literal(runId)} AND phase = '${side}')`,
      ),
      ...plan.definitions.filter((definition) =>
        /^(boundaries|visible_before|visible_after) AS/.test(definition),
      ),
    ];
    params = [];
  }
  const legacy = await client.query(
    `WITH ${definitions.join(", ")} SELECT id FROM before_graph WHERE value_identity IS NULL LIMIT 1`,
    params,
    undefined,
    deadline,
  );
  if (legacy.length) return undefined;
  const result: Constraint.ViolationAt[] = [];
  for (const rule of [...input.constraints].sort((a, b) =>
    Constraint.keyOf(a).localeCompare(Constraint.keyOf(b)),
  )) {
    const relations = [
      ...definitions,
      ...ruleRelations(rule, "before"),
      ...ruleRelations(rule, "after"),
    ];
    const rows = await client.query(
      `WITH ${relations.join(", ")} SELECT a.* FROM violations_after a LEFT JOIN violations_before b ON a.boundary = b.boundary AND a.entity_id = b.entity_id AND a.value_identity IS NOT DISTINCT FROM b.value_identity WHERE b.entity_id IS NULL OR a.actual > b.actual`,
      params,
      undefined,
      deadline,
    );
    for (const row of rows) {
      const subject = String(row["entity_id"]);
      const actual = Number(row["actual"]);
      const common = {
        constraintKey: Constraint.keyOf(rule),
        subject,
        entityType: rule.entityType,
        attribute: rule.attribute,
        path: `$[${JSON.stringify(rule.attribute)}]`,
        actual,
        validAt: Number(row["boundary"]),
      };
      if (rule._tag === "Required")
        result.push({
          ...common,
          code: "required",
          message: `${rule.entityType} requires ${rule.attribute}`,
        });
      else if (rule._tag === "Cardinality")
        result.push({
          ...common,
          code: "cardinality",
          message: `${rule.entityType}.${rule.attribute} has ${actual} live values; maximum cardinality is ${rule.max}`,
        });
      else if (rule._tag === "Unique") {
        const names: string[] =
          typeof row["claimants"] === "string"
            ? JSON.parse(row["claimants"])
            : (row["claimants"] as string[]);
        result.push({
          ...common,
          code: "unique",
          valueIdentity: String(row["value_identity"]),
          message: `${rule.entityType}.${rule.attribute} must be unique; the value is also used by ${names
            .filter((name) => name !== subject)
            .sort()
            .join(", ")}`,
        });
      } else
        result.push({
          ...common,
          code: "reference-target",
          valueIdentity: String(row["value_identity"]),
          message:
            row["value_type"] === "ref"
              ? `${rule.entityType}.${rule.attribute} references ${String(row["value_string"])}, which is not a live ${rule.targetEntityType}`
              : `${rule.entityType}.${rule.attribute} must contain a reference to a ${rule.targetEntityType}`,
        });
    }
  }
  return result.sort(
    (a, b) =>
      a.validAt - b.validAt ||
      a.entityType.localeCompare(b.entityType) ||
      a.subject.localeCompare(b.subject) ||
      a.path.localeCompare(b.path) ||
      a.code.localeCompare(b.code) ||
      (a.valueIdentity ?? "").localeCompare(b.valueIdentity ?? "") ||
      a.constraintKey.localeCompare(b.constraintKey),
  );
};
