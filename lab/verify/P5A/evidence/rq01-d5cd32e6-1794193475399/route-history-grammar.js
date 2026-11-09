// [EXP-RQ01] Why: R-RCP-5 requires consecutive integer members of a complete physical group.
// Rejected: trusting ordinal labels or a nonzero position remainder (accepted the old 1025 gap).
export const validateRouteHistory = (history, requireReceipts = false) => {
    const fail = (message) => {
        throw new Error(`Invalid route history: ${message}`);
    };
    if (!Number.isSafeInteger(history.seed) ||
        !Number.isFinite(history.now) ||
        !history.commits.length)
        fail("seed/clock/commits");
    requireReceipts ||= history.attempts !== undefined;
    const assertion = (r) => {
        if (!r.id ||
            !r.entity_id ||
            !r.attribute ||
            !r.value_type ||
            !Number.isFinite(r.recorded_at) ||
            !Number.isSafeInteger(r.recorded_position) ||
            !Number.isFinite(r.valid_from) ||
            (r.valid_to !== null && (!Number.isFinite(r.valid_to) || r.valid_to <= r.valid_from)) ||
            [r.value_number, r.value_datetime].some((v) => v !== null && !Number.isFinite(v)) ||
            [r.value_string, r.value_json, r.created_by, r.entity_type, r.tx_id].some((v) => v !== null && typeof v !== "string") ||
            (r.value_boolean !== null && r.value_boolean !== 0 && r.value_boolean !== 1) ||
            r.retracted_at !== null ||
            r.retracted_position !== null ||
            r.retract_tx_id !== null)
            fail("assertion fields/lifetime");
    };
    const rows = new Map();
    const positions = new Set(), receiptIds = new Set();
    const groups = new Map();
    for (const [index, commit] of history.commits.entries()) {
        if (!Number.isSafeInteger(commit.position) ||
            commit.position <= 0 ||
            (index > 0 && commit.position <= history.commits[index - 1].position) ||
            !Number.isFinite(commit.instant))
            fail("commit order/position/instant");
        positions.add(commit.position);
        if (requireReceipts && !commit.receipt)
            fail("missing generated receipt");
        if (commit.receipt) {
            const r = commit.receipt;
            if (!r.attemptId ||
                receiptIds.has(r.attemptId) ||
                r.position !== commit.position ||
                r.instant !== commit.instant)
                fail("receipt binding");
            receiptIds.add(r.attemptId);
            const a = history.attempts?.find((a) => a.id === r.attemptId);
            if (!a || a.status !== "committed" || a.position !== r.position || a.stagedAt !== r.instant)
                fail("attempt/receipt binding");
        }
        if (commit.nested) {
            if (!commit.receipt ||
                !commit.nested.callback ||
                !Number.isSafeInteger(commit.nested.ordinal) ||
                !Number.isSafeInteger(commit.nested.size) ||
                commit.nested.size < 2)
                fail("nested group declaration/receipt");
            const members = groups.get(commit.nested.callback) ?? [];
            members.push({ commit, index });
            groups.set(commit.nested.callback, members);
        }
        if (commit.claims &&
            (new Set(commit.claims).size !== commit.claims.length || commit.claims.some((c) => !c)))
            fail("claim identities");
        for (const write of commit.writes) {
            if (write.op === "assert") {
                const r = write.row;
                assertion(r);
                if (rows.has(r.id))
                    fail("duplicate assertion identity");
                rows.set(r.id, { retired: false });
            }
            else if (write.op === "retract") {
                const row = rows.get(write.id);
                if (!row || row.retired)
                    fail(`retract target ${write.id}`);
                row.retired = true;
            }
            else
                fail("unknown write operation");
        }
    }
    for (const [callback, members] of groups) {
        const size = members[0].commit.nested.size;
        if (members.length !== size)
            fail(`incomplete nested group ${callback}`);
        for (const [i, { commit, index }] of members.entries()) {
            if (commit.nested.size !== size ||
                commit.nested.ordinal !== i + 1 ||
                (i > 0 &&
                    (commit.position !== members[i - 1].commit.position + 1 ||
                        index !== members[i - 1].index + 1)))
                fail(`nonconsecutive nested group ${callback}`);
        }
    }
    const attempts = history.attempts ?? [];
    if (new Set(attempts.map((a) => a.id)).size !== attempts.length ||
        new Set(attempts.map((a) => a.position)).size !== attempts.length ||
        new Set(attempts.map((a) => a.stagedOrder)).size !== attempts.length ||
        new Set(attempts.map((a) => a.decidedOrder)).size !== attempts.length)
        fail("duplicate attempt identities/orders");
    for (const a of attempts) {
        if (!a.id ||
            !Number.isSafeInteger(a.position) ||
            a.position <= 0 ||
            ![a.stagedAt, a.stagedOrder, a.decidedOrder].every(Number.isFinite))
            fail("attempt fields");
        if (a.status === "committed") {
            if (!history.commits.some((c) => c.receipt?.attemptId === a.id && c.position === a.position))
                fail("orphan committed attempt");
        }
        else if (a.status === "aborted") {
            if (positions.has(a.position) ||
                a.reason !== "CAS-conflict" ||
                !a.writes?.length ||
                !a.conflict ||
                a.conflict.expected !== "live" ||
                a.conflict.observed !== "retracted" ||
                !history.commits.some((c) => c.position < a.position &&
                    c.writes.some((w) => w.op === "retract" && w.id === a.conflict.id)) ||
                a.writes.some((w) => w.op === "assert" && rows.has(w.row.id)))
                fail("abort outcome/conflict binding");
            for (const write of a.writes) {
                if (write.op === "assert")
                    assertion(write.row);
                else if (write.op !== "retract" || !rows.has(write.id))
                    fail("aborted write grammar");
            }
        }
        else
            fail("unknown attempt outcome");
    }
    const decisions = [...attempts].sort((a, b) => a.decidedOrder - b.decidedOrder);
    if (decisions.some((a, i) => i > 0 && a.position <= decisions[i - 1].position))
        fail("attempt decision order");
};
