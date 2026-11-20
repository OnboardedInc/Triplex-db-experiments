export function activePerson(block: number, people: number, spread: boolean) {
  const first = block * 50;
  // [DX-THIN1] Why: vary the one person in each fifty so all five task classes reach a real first read. Rejected: a constant offset that always misses the 34-task class.
  const offset = spread && block ? (31 * block + 17 * Math.floor(block / 40) + 29) % 50 : 0;
  return Math.min(first + offset, people - 1);
}
