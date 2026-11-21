export const freshQueueMs = 20;
export const overdueGrantInterval = 8;

// [DX-PREP1] Why: let fresh work for other people pass overdue work without changing a person's predecessor.
// Rejected: LIFO across a person's own offers or dropping a save that already missed the latency target.
export class DeadlineOrder<Offer, Person> {
  private readonly heads = new Map<Person, Offer[]>();

  constructor(private readonly person: (offer: Offer) => Person) {}

  add(offer: Offer) {
    const key = this.person(offer);
    const chain = this.heads.get(key);
    if (chain) chain.push(offer);
    else this.heads.set(key, [offer]);
  }

  remove(offer: Offer) {
    const key = this.person(offer), chain = this.heads.get(key);
    if (!chain || chain[0] !== offer) throw Error("Deadline selection skipped a subject predecessor");
    chain.shift();
    if (!chain.length) this.heads.delete(key);
  }

  ready(queue: readonly Offer[], time: number, due: (offer: Offer) => number,
    allowed: (offer: Offer) => boolean) {
    let low = 0, high = queue.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (due(queue[mid]!) < time - freshQueueMs) low = mid + 1;
      else high = mid;
    }
    const find = (start: number, end: number) => {
      for (let index = start; index < end; index++) {
        const offer = queue[index]!;
        if (this.heads.get(this.person(offer))?.[0] === offer && allowed(offer)) return index;
      }
      return -1;
    };
    const overdue = find(0, low), fresh = find(low, queue.length);
    return [
      ...(fresh < 0 ? [] : [{ index: fresh, overdue: false }]),
      ...(overdue < 0 ? [] : [{ index: overdue, overdue: true }]),
    ];
  }
}
