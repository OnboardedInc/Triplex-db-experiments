// [DX-CON1] The sheets that open from anywhere: New entity type (sidebar, Home, palette, Configuration) and the Entity
// form (type page, entity page). One provider renders them so each opens the same way from every place.
import { createContext, useContext, useState, type ReactNode } from "react";
import type { AttributeDef } from "@/lib/types";

export type NewTypeInit = {
  name?: string;
  attributes?: AttributeDef[];
  label?: string;
  edit?: boolean;
};
export type EntityFormInit = {
  type: string;
  account?: string;
  entity?: string;
  values?: Record<string, unknown>;
};

type Ctx = {
  newType: NewTypeInit | null;
  entityForm: EntityFormInit | null;
  openNewType: (init?: NewTypeInit) => void;
  openEntityForm: (init: EntityFormInit) => void;
  close: () => void;
};
const SheetsContext = createContext<Ctx>({
  newType: null,
  entityForm: null,
  openNewType: () => {},
  openEntityForm: () => {},
  close: () => {},
});

export function SheetsProvider({ children }: { children: ReactNode }) {
  const [newType, setNewType] = useState<NewTypeInit | null>(null);
  const [entityForm, setEntityForm] = useState<EntityFormInit | null>(null);
  return (
    <SheetsContext.Provider
      value={{
        newType,
        entityForm,
        openNewType: (init = {}) => setNewType(init),
        openEntityForm: (init) => setEntityForm(init),
        close: () => {
          setNewType(null);
          setEntityForm(null);
        },
      }}
    >
      {children}
    </SheetsContext.Provider>
  );
}
export const useSheets = () => useContext(SheetsContext);
export const useNewType = () => useContext(SheetsContext).openNewType;
