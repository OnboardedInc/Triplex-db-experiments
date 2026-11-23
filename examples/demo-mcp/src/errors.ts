// [DX-CON1] The one error type the console's functions throw: a stable code and a sentence for the visitor.
// Why: its own module, so guard.ts and store.ts can both use it without an import cycle.
export class DemoError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
