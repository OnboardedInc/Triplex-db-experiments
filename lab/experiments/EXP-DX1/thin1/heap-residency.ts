import assert from "node:assert/strict";

type ResidentMapping = readonly [start: string, end: string, rss: number, anonymous: number];

// [DX-THIN1] Why: HotSpot reports committed memory, while Linux knows which heap pages are resident.
// Rejected: assigning the difference between JVM commitments and process RSS to a particular allocator.
export function readResidentMappings(text: string): ResidentMapping[] {
  return text.trim().split(/\n(?=[0-9a-f]+-[0-9a-f]+ )/).map((mapping) => {
    const match = mapping.match(/^([0-9a-f]+)-([0-9a-f]+) /);
    const rss = mapping.match(/^Rss:\s+(\d+) kB$/m);
    const anonymous = mapping.match(/^Anonymous:\s+(\d+) kB$/m);
    assert(match && rss && anonymous, "Incomplete process mapping");
    return [match[1]!, match[2]!, Number(rss[1]) * 1024, Number(anonymous[1]) * 1024];
  });
}

export function heapResidency(heap: string, mappings: readonly ResidentMapping[]) {
  const heapRanges: { first: bigint; end: bigint }[] = [];
  for (const line of heap.split("\n")) {
    if (!/^\s*(garbage-first heap|def new generation|tenured generation)\b/.test(line)) continue;
    const limits = line.match(/\[(0x[0-9a-f]+), (?:0x[0-9a-f]+, )?(0x[0-9a-f]+)\)/i);
    assert(limits, "Unrecognized HotSpot heap range");
    heapRanges.push({ first: BigInt(limits[1]!), end: BigInt(limits[2]!) });
  }
  const [first, second] = heapRanges;
  assert(first && heapRanges.length <= 2 && first.first < first.end);
  if (second) assert(first.end === second.first && second.first < second.end);
  const heapEnd = second?.end ?? first.end;
  let previous = 0n;
  let javaHeap = 0, otherAnonymous = 0, otherNonAnonymous = 0, mixed = 0;
  for (const [start, end, rss, anonymous] of mappings) {
    assert(/^[0-9a-f]+$/.test(start) && /^[0-9a-f]+$/.test(end));
    const low = BigInt("0x" + start), high = BigInt("0x" + end);
    assert(low >= previous && high > low && Number.isSafeInteger(rss) && Number.isSafeInteger(anonymous));
    assert(0 <= anonymous && anonymous <= rss && BigInt(rss) <= high - low);
    previous = high;
    if (low >= first.first && high <= heapEnd) javaHeap += rss;
    else if (low < heapEnd && high > first.first) mixed += rss;
    else {
      otherAnonymous += anonymous;
      otherNonAnonymous += rss - anonymous;
    }
  }
  assert(javaHeap > 0 && Number.isSafeInteger(javaHeap + otherAnonymous + otherNonAnonymous + mixed));
  return { javaHeap, otherAnonymous, otherNonAnonymous, mixed };
}
