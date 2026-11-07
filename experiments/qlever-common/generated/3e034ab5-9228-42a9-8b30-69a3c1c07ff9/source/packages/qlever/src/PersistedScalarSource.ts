import { integer } from "@triplex-build/triplex";
import { fieldIri, integerOrderKey, literal, numericOrderKey } from "./rdf.js";
import type { QleverScalarSource, QleverScalarSourceRequest } from "./ScalarSource.js";

/** Persisted canonical channels; the common leaf owns visibility and bag identity. */
export const persistedScalarSource = ({
  prefix,
  subject,
  term,
}: QleverScalarSourceRequest): QleverScalarSource => {
  const type = `?${prefix}_value_type`;
  if (typeof term === "string" && term.startsWith("?")) {
    const family = `?${prefix}_scalar_family`,
      lexical = `?${prefix}_scalar_lexical`,
      order = `?${prefix}_scalar_order`;
    return {
      body: [
        `${subject} ${fieldIri("value_type")} ${type} ; ${fieldIri("scalar_family")} ${family} ; ${fieldIri("scalar_lexical")} ${lexical} ; ${fieldIri("scalar_order")} ${order} .`,
      ],
      family,
      lexical,
      order,
      numericOrderFields: [],
    };
  }
  let family: string, lexical: string, order: string;
  if (typeof term === "number") {
    family = "number";
    lexical = term === 0 ? "0" : String(term);
    order = numericOrderKey(term);
  } else if (typeof term === "boolean") {
    family = "boolean";
    lexical = order = term ? "1" : "0";
  } else if (typeof term === "string") {
    family = "string";
    lexical = order = term;
  } else if (typeof term === "object" && term !== null && "type" in term && "value" in term) {
    if (term.type === "integer") {
      family = "integer";
      lexical = integer(String(term.value)).value;
      order = integerOrderKey(lexical);
    } else if (term.type === "ref" && typeof term.value === "string") {
      family = "string";
      lexical = order = term.value;
    } else throw new TypeError("Unsupported persisted scalar constant");
  } else throw new TypeError("Unsupported persisted scalar constant");
  const quotedFamily = literal(family),
    quotedLexical = literal(lexical),
    quotedOrder = literal(order);
  return {
    body: [
      `${subject} ${fieldIri("value_type")} ${type} ; ${fieldIri("scalar_family")} ${quotedFamily} ; ${fieldIri("scalar_lexical")} ${quotedLexical} ; ${fieldIri("scalar_order")} ${quotedOrder} .`,
    ],
    family: quotedFamily,
    lexical: quotedLexical,
    order: quotedOrder,
    numericOrderFields: [],
  };
};
