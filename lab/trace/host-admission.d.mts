export function evaluateHostGate(samples: readonly any[], context: any): any;
export function collectHostGate(count?: number): Promise<any>;
export const HOST_SAMPLE_MS: number;
export const ARM_RETRY_MS: number;
export function topProcessCpu(samples: readonly any[]): { name: string; percent: number }[] | null;
export function waitForArmHost(options: {
  checkTime: (ms: number) => any;
  onSample: (gate: any, sample: number) => void;
  collect?: () => Promise<any>;
  pause?: (ms: number) => Promise<void>;
  wallNow?: () => number;
  monoNow?: () => number;
}): Promise<{ gate: any; attempts: number; reason: string | null }>;
export function hostGateLine(result: any): string;

export function parseProcessTimes(text: string): Map<number, any>;
export function processCpuInterval(
  previous: Map<number, any>,
  current: Map<number, any>,
  elapsedMs: number,
): number;
export function processCpuSample(
  previous: Map<number, any>,
  current: Map<number, any>,
  elapsedMs: number,
  samplerPid?: number,
): { processElapsedMs: number; processCpuMs: [string, number][]; otherCpu: number };
