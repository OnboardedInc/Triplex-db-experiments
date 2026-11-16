export function verifiedRawManifest(directory: string): Promise<string>;
export function packOracle(directory: string, options?: { minBytes?: number }): Promise<{ files: number; reason?: string; journal?: string }>;
