export function evaluateHostGate(samples: readonly any[], context: any): any;
export function collectHostGate(count?: number): Promise<any>;

export function parseProcessTimes(text: string): Map<number, any>;
export function processCpuInterval(
  previous: Map<number, any>,
  current: Map<number, any>,
  elapsedMs: number,
): number;
