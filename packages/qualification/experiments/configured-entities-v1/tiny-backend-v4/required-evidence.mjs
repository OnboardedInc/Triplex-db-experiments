// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Keep a committed invalid-command receipt; never transform a public result. */
export function requiredOutcomeEvidence(outcome, safeError) {
  return { tag:outcome._tag,
    ...(outcome._tag==='Success' ? {publicTransactionResult:outcome.success}
      : {error:safeError(outcome.failure),
        ...(outcome.failure._tag==='ConstraintViolationError'?{violations:outcome.failure.violations}:{})}) };
}
