// [EXP-K01-R9] Why: Q93c normalizes only proven generated cells for E1. Rejected: using normalized Dprime to admit a clone or normalizing arbitrary business values.
import ts from "typescript";
import { scalar, canonical } from "./g0-values.js";
import { createHash } from "node:crypto";
const digest = (v) => createHash("sha256").update(canonical(v)).digest("hex");
// Each entry is a table.column pattern and its assigning engine source, audited by the independent test.
export const normalization = {
    // [EXP-K01-R9] Why: XtdbStorageAdapter.ts persist builds _id from scope/id; other side-table ids cannot be ranked without a persisted commit anchor. Rejected: treating caller business identifiers as generated.
    "tx_assertions._id": "packages/xtdb/src/XtdbStorageAdapter.ts#persist",
    // [EXP-K01-R9] Why: RuntimeServices.ts IdGeneratorLive.nextTripleId assigns this id; XtdbStorageAdapter.ts insert persists it. Rejected: lexical sorting of random ids across fresh seeds.
    "tx_assertions.id": "packages/core/src/store/RuntimeServices.ts#IdGeneratorLive",
    // [EXP-K01-R9] Why: TriplesLive.ts transact uses RuntimeServices.ts nextTxId; XtdbStorageAdapter.ts insert persists tx_id. Rejected: changing entity business identifiers.
    "tx_assertions.tx_id": "packages/core/src/store/TriplesLive.ts#transact",
    // [EXP-K01-R9] Why: XtdbStorageAdapter.ts retract assigns the current engine transaction id. Rejected: normalizing arbitrary strings containing a transaction id.
    "tx_assertions.retract_tx_id": "packages/xtdb/src/XtdbStorageAdapter.ts#retract",
    // [EXP-K01-R9] Why: RuntimeServices.ts RuntimeClockLive.now supplies TriplesLive.ts transaction timestamp, persisted by insert. Rejected: timestamp sorting instead of commit position.
    "tx_assertions.recorded_at": "packages/core/src/store/RuntimeServices.ts#RuntimeClockLive",
    // [EXP-K01-R9] Why: XtdbStorageAdapter.ts retract persists the transaction clock and retracted_position. Rejected: normalizing valid-time business dates.
    "tx_assertions.retracted_at": "packages/xtdb/src/XtdbStorageAdapter.ts#retract",
    // [EXP-K01-R9] Why: transactionMetadata.ts metadataInputs assigns _Transaction entityId=txId; only those rows qualify. Rejected: normalizing business entity_id.
    "tx_assertions.entity_id": "packages/core/src/store/transactionMetadata.ts#metadataInputs",
    // [EXP-K01-R9] Why: metadataInputs omits validFrom; XtdbStorageAdapter.ts insert defaults it to transaction timestamp, only for _Transaction rows. Rejected: changing user valid ranges.
    "tx_assertions.valid_from": "packages/xtdb/src/XtdbStorageAdapter.ts#insert",
    // [EXP-K01-R9] Why: transactionMetadata.ts metadataInputs writes :_tx/instant from transaction clock. Rejected: normalizing other datetime values.
    "tx_assertions.value_datetime": "packages/core/src/store/transactionMetadata.ts#metadataInputs",
    // [EXP-K01-R9] Why: transactionMetadata.ts transactionChangeFromTriple supplies only top-level generated IDs/clocks in :_tx/change; other JSON bytes stay intact. Rejected: recursively replacing lookalike user payload keys.
    "tx_assertions.value_json": "packages/core/src/store/transactionMetadata.ts#transactionChangeFromTriple",
    // [EXP-K01-R9] Why: XtdbStorageAdapter.ts persist canonicalizes assertionValue; only identities derived from the two generated _Transaction metadata values are normalized. Rejected: normalizing business uniqueness identities.
    "tx_assertions.value_identity": "packages/xtdb/src/XtdbStorageAdapter.ts#persist",
    // [EXP-K01-R9] Why: XtdbStorageAdapter.ts persist builds claim _id from scope/command, so it is deterministic and retained. This entry is deliberately absent for _id; tx_id alone is runtime generated.
    "tx_claims.tx_id": "packages/xtdb/src/XtdbStorageAdapter.ts#persist",
    // [EXP-K01-R9] Why: XtdbStorageAdapter.ts claimCommand stores the transaction clock. Rejected: normalizing command_id or position.
    "tx_claims.recorded_at": "packages/xtdb/src/XtdbStorageAdapter.ts#claimCommand",
    // [EXP-K01-R9] Why: XtdbStorageAdapter.ts persist builds attempt _id from the generated operationId. Rejected: ignoring operation identity relationships.
    "tx_attempts._id": "packages/xtdb/src/XtdbStorageAdapter.ts#persist",
    // [EXP-K01-R9] Why: XtdbStorageAdapter.ts withTransaction creates operationId=randomUUID(). Rejected: normalizing caller idempotency command IDs.
    "tx_attempts.operation_id": "packages/xtdb/src/XtdbStorageAdapter.ts#withTransaction",
    // [EXP-K01-R9] Why: XtdbStorageAdapter.ts withTransaction calls persist with randomUUID() for attemptId. Rejected: deriving rank from random lexical order.
    "tx_attempts.attempt_id": "packages/xtdb/src/XtdbStorageAdapter.ts#withTransaction",
};
const isMeta = (r) => scalar(r.entity_type) === "_Transaction";
const at = (r, key = "recorded_position") => {
    const n = scalar(r[key]);
    if (!Number.isSafeInteger(n) || Number(n) < 1)
        throw Error("Dprime missing commit-order rank");
    return Number(n);
};
// Replace only selected JSON tokens; neither business payload numbers nor their spelling are JSON-round-tripped.
function jsonTokens(text, wrapped, replace) {
    JSON.parse(text);
    const source = ts.parseJsonText("metadata.json", text);
    const root = source.statements[0].expression;
    const object = wrapped && ts.isObjectLiteralExpression(root)
        ? root.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(source) === '"value"')
        : null;
    const target = wrapped && object && ts.isPropertyAssignment(object) ? object.initializer : root;
    if (!ts.isObjectLiteralExpression(target))
        throw Error("Dprime malformed engine metadata");
    const edits = [];
    for (const p of target.properties) {
        if (!ts.isPropertyAssignment(p))
            throw Error("Dprime malformed metadata field");
        const key = JSON.parse(p.name.getText(source));
        if (["tripleId", "assertionTxId", "retractionTxId", "recordedAt", "retractedAt"].includes(key))
            edits.push({
                start: p.initializer.getStart(source),
                end: p.initializer.end,
                text: JSON.stringify(replace(key, p.initializer.getText(source))),
            });
    }
    for (const e of edits.sort((a, b) => b.start - a.start))
        text = text.slice(0, e.start) + e.text + text.slice(e.end);
    return text;
}
export function e1Normalizer() {
    const clocks = new Map();
    const clock = (rank, v) => {
        const n = scalar(v);
        if (!Number.isSafeInteger(n) || (clocks.has(rank) && !Object.is(clocks.get(rank), n)))
            throw Error("Dprime inconsistent system clock");
        clocks.set(rank, Number(n));
    };
    const transactionNames = new Map();
    const transactions = new Map(), assertions = new Map();
    const pending = [];
    const add = (m, v, n) => {
        const s = scalar(v);
        if (s === null)
            return;
        if (typeof s !== "string" || (m.has(s) && m.get(s) !== n))
            throw Error("Dprime inconsistent generated identity");
        if (m === transactions) {
            const previous = transactionNames.get(n);
            if (previous !== undefined && previous !== s)
                throw Error("Dprime inconsistent transaction aliases");
            transactionNames.set(n, s);
        }
        m.set(s, n);
    };
    const lookup = (m, v) => {
        const s = scalar(v);
        if (s === null)
            return null;
        if (typeof s !== "string" || !m.has(s))
            throw Error("Dprime unknown generated identity");
        return m.get(s);
    };
    const instantIdentity = (r) => {
        const text = scalar(r.value_identity);
        if (typeof text !== "string")
            throw Error("Dprime invalid instant identity");
        const value = JSON.parse(text);
        if (value.type !== "datetime" || !Object.is(value.value, scalar(r.value_datetime)))
            throw Error("Dprime inconsistent instant identity");
        const source = ts.parseJsonText("instant.json", text), root = source.statements[0].expression;
        if (!ts.isObjectLiteralExpression(root))
            throw Error("Dprime invalid instant identity");
        const property = root.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(source) === '"value"');
        if (!property || !ts.isPropertyAssignment(property))
            throw Error("Dprime missing instant identity value");
        return (text.slice(0, property.initializer.getStart(source)) +
            JSON.stringify(["commit-rank", at(r)]) +
            text.slice(property.initializer.end));
    };
    const metaJson = (r, v, wrapped, signature = false) => {
        const text = scalar(v);
        if (text === null)
            return null;
        if (typeof text !== "string")
            throw Error("Dprime metadata JSON must be stored text");
        const body = wrapped ? JSON.parse(text).value : JSON.parse(text);
        if (!signature) {
            if (Object.hasOwn(body, "recordedAt") &&
                !Object.is(body.recordedAt, clocks.get(Number(lookup(transactions, body.assertionTxId ?? scalar(r.tx_id))))))
                throw Error("Dprime inconsistent change clock");
            if (Object.hasOwn(body, "retractedAt") &&
                !Object.is(body.retractedAt, clocks.get(Number(lookup(transactions, body.retractionTxId ?? scalar(r.retract_tx_id))))))
                throw Error("Dprime inconsistent retraction clock");
        }
        return jsonTokens(text, wrapped, (key, raw) => signature
            ? "engine-assigned"
            : key === "tripleId"
                ? lookup(assertions, JSON.parse(raw))
                : key.endsWith("TxId")
                    ? lookup(transactions, JSON.parse(raw))
                    : key === "recordedAt"
                        ? lookup(transactions, body.assertionTxId ?? scalar(r.tx_id))
                        : lookup(transactions, body.retractionTxId ?? scalar(r.retract_tx_id)));
    };
    return {
        collect(table, r) {
            if (!["tx_assertions", "tx_claims", "tx_attempts", "tx_meta"].includes(table))
                throw Error("Dprime side table lacks a persisted commit-order anchor: " + table);
            if (table === "tx_claims") {
                add(transactions, r.tx_id, at(r, "position"));
                clock(at(r, "position"), r.recorded_at);
            }
            if (table !== "tx_assertions")
                return;
            const position = at(r);
            clock(position, r.recorded_at);
            if (r.retracted_at !== null)
                clock(at(r, "retracted_position"), r.retracted_at);
            add(transactions, r.tx_id, position);
            const row = { ...r };
            for (const c of ["_id", "id", "tx_id", "retract_tx_id", "recorded_at", "retracted_at"])
                delete row[c];
            if (isMeta(r)) {
                row.entity_id = "engine-assigned";
                row.valid_from = "engine-assigned";
                if (scalar(r.attribute) === ":_tx/instant") {
                    row.value_datetime = "engine-assigned";
                    row.value_identity = "engine-assigned";
                }
                if (scalar(r.attribute) === ":_tx/change") {
                    row.value_json = metaJson(r, r.value_json, false, true);
                    row.value_identity = metaJson(r, r.value_identity, true, true);
                }
            }
            const id = scalar(r.id);
            if (typeof id !== "string")
                throw Error("Dprime missing assertion id");
            pending.push({ id, position, signature: digest(row) });
        },
        finish() {
            pending.sort((a, b) => a.position - b.position || a.signature.localeCompare(b.signature));
            pending.forEach((r, i) => {
                if (i &&
                    pending[i - 1].position === r.position &&
                    pending[i - 1].signature === r.signature)
                    throw Error("Dprime ambiguous assertion order");
                add(assertions, r.id, i + 1);
            });
        },
        row(table, r) {
            const out = { ...r };
            if (table === "tx_assertions" &&
                scalar(r._id) !== JSON.stringify([scalar(r.scope_key), scalar(r.id)]))
                throw Error("Dprime assertion storage identity mismatch");
            if (table === "tx_attempts" &&
                scalar(r._id) !== JSON.stringify([scalar(r.scope_key), scalar(r.operation_id)]))
                throw Error("Dprime attempt storage identity mismatch");
            if (table === "tx_assertions" && isMeta(r) && scalar(r.valid_from) !== scalar(r.recorded_at))
                throw Error("Dprime metadata valid time is not engine assigned");
            for (const key of Object.keys(r)) {
                if (!Object.hasOwn(normalization, table + "." + key) || r[key] === null)
                    continue;
                if (table === "tx_attempts") {
                    out[key] = ["commit-rank", at(r, "position"), key];
                    continue;
                }
                if (table === "tx_claims") {
                    out[key] = ["commit-rank", at(r, "position"), key];
                    continue;
                }
                if (key === "id" || key === "_id") {
                    out[key] = ["assertion-rank", lookup(assertions, r.id), key];
                    continue;
                }
                if (key === "tx_id" || key === "retract_tx_id") {
                    out[key] = ["transaction-rank", lookup(transactions, r[key])];
                    continue;
                }
                if (key === "recorded_at" || key === "retracted_at") {
                    out[key] = [
                        "commit-rank",
                        at(r, key === "recorded_at" ? "recorded_position" : "retracted_position"),
                    ];
                    continue;
                }
                if (!isMeta(r))
                    continue;
                if (key === "entity_id")
                    out[key] = ["transaction-rank", lookup(transactions, r.entity_id)];
                else if (key === "valid_from")
                    out[key] = ["commit-rank", at(r)];
                else if (key === "value_datetime" && scalar(r.attribute) === ":_tx/instant")
                    out[key] = ["commit-rank", at(r)];
                else if (key === "value_json" && scalar(r.attribute) === ":_tx/change")
                    out[key] = metaJson(r, r[key], false);
                else if (key === "value_identity" && scalar(r.attribute) === ":_tx/change")
                    out[key] = metaJson(r, r[key], true);
                else if (key === "value_identity" && scalar(r.attribute) === ":_tx/instant")
                    out[key] = instantIdentity(r);
            }
            return out;
        },
    };
}
