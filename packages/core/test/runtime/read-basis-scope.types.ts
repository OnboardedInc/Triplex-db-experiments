// Static witnesses only; this file is checked with noEmit and is never run.
import {
  resolveNativeReadBasis,
  type DatabaseScope,
  type NativeReadBasis,
  type ReadBasis,
  type RuntimeDefinition,
} from "../../src/runtime/index.js";

declare const general: ReadBasis;
declare const native: NativeReadBasis;
declare const scope: DatabaseScope;
declare const runtime: RuntimeDefinition<never, never>;

const opaque: string = general.scope;
// @ts-expect-error Legacy low-level scope strings do not acquire the database brand.
const selector: DatabaseScope = general.scope;
const nativeSelector: DatabaseScope = native.scope;
const legacy: ReadBasis = { scope: "default", validAt: 0, recordedPosition: 0 };
const validated: NativeReadBasis = { scope, validAt: 0, recordedPosition: 0 };
// @ts-expect-error Native providers must retain a validated DatabaseScope.
const invalidNative: NativeReadBasis = legacy;
resolveNativeReadBasis({ scope, now: 0, currentPosition: 0 });
// @ts-expect-error The native resolver's branded input is unchanged.
resolveNativeReadBasis({ scope: "default", now: 0, currentPosition: 0 });
runtime.layer({ scope });
// @ts-expect-error The public Runtime.layer boundary still requires the brand.
runtime.layer({ scope: "default" });

void opaque;
void selector;
void nativeSelector;
void validated;
void invalidNative;
