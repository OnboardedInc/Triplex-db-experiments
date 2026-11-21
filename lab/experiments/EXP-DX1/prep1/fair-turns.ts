type ReadySave = {
  account: number;
  due: number;
};

// [DX-PREP1] Why: all prepared peers behind this ingress share one bounded writer turn.
// Rejected: granting independent credits per peer (a paused peer could leave several neighbour groups ahead).
export class FairTurns {
  private active = 0;
  private turn = 0;
  private uncertain = false;
  private readonly recent: number[] = [];
  private readonly served: number[];

  private readonly accountCount: number;
  private readonly credits: number;
  constructor(accountCount: number, credits: number) {
    this.accountCount = accountCount;
    this.credits = credits;
    this.served = Array<number>(accountCount).fill(0);
  }

  dispatch<T extends ReadySave>(
    ready: () => readonly T[],
    submit: (save: T, turn: number) => void,
  ) {
    if (this.active || this.uncertain) return;
    for (let i = 0; i < this.credits; i++) {
      let next: T | undefined;
      for (const save of ready()) {
        const priority = this.served[save.account]!;
        if (
          !next ||
          priority < this.served[next.account]! ||
          (priority === this.served[next.account] && save.due < next.due)
        )
          next = save;
      }
      if (!next) return;
      if (i === 0) this.turn++;
      // Equal-share accounting spans one credit per named account. An idle account can reclaim
      // one opportunity immediately. Idle time does not accumulate unlimited priority.
      this.recent.push(next.account);
      this.served[next.account]!++;
      if (this.recent.length > this.accountCount) this.served[this.recent.shift()!]!--;
      this.active++;
      submit(next, this.turn);
    }
  }

  resolved(known: boolean) {
    this.active--;
    if (!known) this.uncertain = true;
  }
}
