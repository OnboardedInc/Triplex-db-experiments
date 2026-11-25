// [DX-CON1] The one error type the console's functions throw: a stable code and a sentence for the visitor.
// Why: its own module, so guard.ts and store.ts can both use it without an import cycle.
export class DemoError extends Error {
  readonly code: string;
  /** [DX-XQ8] Extra fields for the error object (a store refusal's plain explanation and the store's own message). */
  readonly detail: Record<string, unknown> | undefined;
  constructor(code: string, message: string, detail?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}
