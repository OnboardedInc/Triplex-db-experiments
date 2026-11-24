// [DX-CON1] The Limits tab (DESIGN.md 8.13 and 10.5). Every number here is recorded, not live: each carries where and
// when it was measured. The gap texts are the design's own.
export type Limit = {
  what: string;
  here: string;
  recorded?: string;
  where?: string;
  gap: string;
  blocks: string;
  lift: string;
  kind: string;
};

export const limits: Limit[] = [
  {
    what: "A question with no entity named",
    here: "Refused before it is sent",
    recorded: "422 QueryInputBudgetExceeded",
    where: "small database, 44,428 records, 2026-11-23",
    gap: "G3",
    blocks: "Joins, not, or, rules and aggregates in the store; every whole-database question.",
    lift: "Let /q take a list of roots and build its relation from their reach at the basis (lean_query.clj), with an SDK option. Whole-database questions need an index by attribute and value.",
    kind: "Gateway and SDK",
  },
  {
    what: "Listing entities by type",
    here: "By entity number only",
    recorded: "1,662.96 ms for a by-type read",
    where: "small database, 2026-11-23",
    gap: "G2",
    blocks: "Triples.entityPage, match({ entityType }), the list of a type.",
    lift: "An indexed type value on the Datomic entity, written with its first typed row, and a paged route that entityPage uses.",
    kind: "Gateway, schema, write path, SDK",
  },
  {
    what: "Uniqueness",
    here: "Not enforced",
    gap: "G4",
    blocks: "Atomic constraint enforcement.",
    lift: "Load candidates from the entities a transaction touches for required and cardinality rules. Uniqueness needs the index of G2 extended by attribute and value.",
    kind: "Core, then gateway",
  },
  {
    what: "A read far behind the head",
    here: "Fast with the reader options on",
    recorded: "p50 1.37 ms with the options, 41.73 ms without",
    where: "1 billion database, position 87,002, 2026-11-23",
    gap: "G7",
    blocks: "Fast reads far behind the head.",
    lift: "The demo profile passes DX_PINNED_SHORTCUT=1 and DX_PINNED_CUT_LOOKUP=1 and records them in the ready file.",
    kind: "Launch setting",
  },
  {
    what: "History of a heavily saved entity",
    here: "Slow on a first read",
    recorded: "4,404.67 ms cold, 225.21 ms warm",
    where: "1 billion database, a task saved 1,411 times, 2026-11-23",
    gap: "G8",
    blocks: "A fast History tab on a heavily saved entity.",
    lift: "An attribute filter and a row limit inside the gateway's history read.",
    kind: "Gateway",
  },
  {
    what: "Removal on request",
    here: "Refused on imported subjects",
    recorded: "409 ProtectedScopeNeedsMigration",
    where: "small database",
    gap: "G9",
    blocks: "Removal on request on this database.",
    lift: "A migration that declares protection on a populated scope.",
    kind: "Engine",
  },
  {
    what: "Saves wider than three replacing facts",
    here: "Take the general writer",
    gap: "G10",
    blocks: "Nothing; it sets which writer a save uses.",
    lift: "TX2_SUBJECT_WIDE=1 exists on exp/DX-W2-wide-saves, default off and not merged.",
    kind: "Engine option",
  },
  {
    what: "Changes made by the bulk import",
    here: "Not listed in the Journal; changes since the import are",
    recorded: "28,222,864 saves",
    where: "1 billion database",
    gap: "G11",
    blocks:
      "Listing the import's own changes in the Journal: the import wrote its change records in its own form, and reading them pages through every one.",
    lift: "The bulk import writes its change records in the standard form before it is used again.",
    kind: "Bulk import tool",
  },
  {
    what: "Atomic enforcement (meta.enforce), materialized derivations",
    here: "Not used",
    gap: "G4, G5",
    blocks: "Materialized derivations, evaluation across subjects, validation observations.",
    lift: "A per-attribute latest-position index; no small change.",
    kind: "Engine design",
  },
];
