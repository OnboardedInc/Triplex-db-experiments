export function barCell(bar: any): string;
export function summarizeCpuComparison(root: string, prefix: string, night: any): Promise<any[]>;
export function nightEnvironment(
  base: Record<string, string>,
  root: string,
  windowFile: string,
): Record<string, string>;
export function renderNightSummary(night: any, reference: any, observations: any[]): string;
export function summarizePair(
  root: string,
  prefix: string,
  night: any,
  label: string,
  controllerExit?: number,
): Promise<any>;
