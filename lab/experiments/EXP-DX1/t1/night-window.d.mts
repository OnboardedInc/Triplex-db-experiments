export function nightWindow(now?: number, date?: string): any;
export function checkNightWindow(
  window: any,
  now?: number,
  minimumMinutes?: number,
): { allowed: boolean; remainingMs: number };
