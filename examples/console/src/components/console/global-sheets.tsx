// [DX-CON1] Renders the sheets every screen can open.
import { EntityFormSheet } from "@/pages/types/entity-form-sheet";
import { NewTypeSheet } from "@/pages/types/new-type-sheet";
import { useSheets } from "./sheets-context";

export function GlobalSheets() {
  const s = useSheets();
  return (
    <>
      <NewTypeSheet init={s.newType} onClose={s.close} />
      <EntityFormSheet init={s.entityForm} onClose={s.close} />
    </>
  );
}
