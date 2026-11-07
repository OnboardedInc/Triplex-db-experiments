/** Future unmarked negative witness: incomplete borrowed client must be refused.
 * No diagnostic suppression/filter, compiler/config change or execution.
 */
import type { QleverRuntimeOptions } from "@triplex-build/triplex-qlever";
export const invalid: QleverRuntimeOptions = {
  url: "http://127.0.0.1:17019",
  client: { query: async () => [] },
};
