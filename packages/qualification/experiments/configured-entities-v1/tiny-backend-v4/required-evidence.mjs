/** Keep a committed invalid-command receipt; never transform a public result. */
export function requiredOutcomeEvidence(outcome, safeError) {
  return { tag:outcome._tag,
    ...(outcome._tag==='Success' ? {publicTransactionResult:outcome.success}
      : {error:safeError(outcome.failure),
        ...(outcome.failure._tag==='ConstraintViolationError'?{violations:outcome.failure.violations}:{})}) };
}
