/** Existing Triplex schemas/handles, shared by fixture mapping and native reads. */
import { Attribute, TypeExpr } from "@triplex-build/triplex/config";
export const loadAttributes = {
  name: Attribute.text(":load/name"),
  kind: Attribute.text(":load/kind"),
  peer: Attribute.ref(":load/peer", { entityType: "LoadEntity" }),
  exact: Attribute.int64(":load/exact"),
  ratio: Attribute.number(":load/ratio"),
  active: Attribute.boolean(":load/active"),
  at: Attribute.instant(":load/at"),
  // Attribute currently has no JSON/blob constructor. Existing TypeExpr.any
  // preserves raw carriers without claiming full entity/config validation.
  payload: { key: ":load/payload", type: TypeExpr.any },
  blob: { key: ":load/blob", type: TypeExpr.any },
  group: Attribute.text(":load/group"),
} as const;
export const fixtureSchema = (factsPerEntity: 1 | 10) => {
  const fields = Object.entries(loadAttributes).slice(0, factsPerEntity);
  return {
    format: "triplex-load-schema/1",
    entityType: "LoadEntity",
    type: TypeExpr.struct(
      Object.fromEntries(
        fields.map(([, attribute]) => [attribute.key, TypeExpr.required(attribute.type)]),
      ),
    ),
    attributes: fields.map(([alias, attribute]) => ({
      alias,
      key: attribute.key,
      type: attribute.type,
    })),
    coverage: {
      persistedConfigNodes: false,
      entityPresenceEvents: false,
      typeVersionEvents: false,
      fullEntityValidation: false,
      jsonAndBlob: "Explicit raw Any carriers; no extra domain schema claim",
    },
  };
};
