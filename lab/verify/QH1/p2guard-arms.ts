// [EXP-P4N] Why: the `off` arm of the P2 guard is round 3 final's retained build, loaded from its built worker source, so the arm is the
// bytes that were measured in QH1 round 3 and not a copy edited here. Rejected: copying the old worker into the repository (a third copy to drift).
export const candidateWorkerSource = async (): Promise<string> =>
  (
    await import(
      process.env.P4N_OFF_WORKER ??
        "/Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R3/arms/final/packages/qlever/dist/broker/sqlite-worker.js"
    )
  ).sqliteWorker as string;
