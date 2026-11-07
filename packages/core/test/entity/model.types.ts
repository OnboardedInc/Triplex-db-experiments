/**
 * Type-level tests for model typing derived from EntityType handles. Checked by
 * `pnpm --filter @triplex-build/triplex typecheck` (test/entity/tsconfig.json). Every
 * `@ts-expect-error` is a negative test: if the line stops being an error, typecheck fails.
 */
import type { Effect } from "effect";

import type { EntityId, IntegerValue } from "../../src/index.js";
import { Attribute, EntityType } from "../../src/config/index.js";
import type { Doc, Expanded, Input, Patch, Where } from "../../src/entity/index.js";
import { Repository } from "../../src/entity/index.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assertType = <T extends true>(): T => true as T;

// ---------------------------------------------------------------------------
// Literal-preserving Attribute.use
// ---------------------------------------------------------------------------
const nameUse = Attribute.use(Attribute.text(":person/name"), { required: true });
const skillsUse = Attribute.use(Attribute.text(":person/skill"), { cardinality: "many" });
const plainUse = Attribute.use(Attribute.integer(":person/age"));
assertType<Equal<typeof nameUse.required, true>>();
assertType<Equal<typeof nameUse.cardinality, "one">>();
assertType<Equal<typeof skillsUse.required, false>>();
assertType<Equal<typeof skillsUse.cardinality, "many">>();
assertType<Equal<typeof plainUse.required, false>>();
assertType<Equal<typeof plainUse.cardinality, "one">>();

// A widened option stays widened: never typed narrower than the runtime value.
declare const computed: Attribute.UseOptions;
const computedUse = Attribute.use(Attribute.text(":person/note"), computed);
assertType<Equal<typeof computedUse.required, boolean>>();
assertType<Equal<typeof computedUse.cardinality, "one" | "many">>();

// Existing annotations without the new parameters still accept literal uses.
const legacy: Attribute.Use<Attribute.AnyDefinition> = nameUse;
void legacy;

// ---------------------------------------------------------------------------
// Models from EntityType.make
// ---------------------------------------------------------------------------
const Company = EntityType.make("Company", {
  attributes: { name: Attribute.use(Attribute.text(":company/name"), { required: true }) },
});
const employerDef = Attribute.ref(":person/employer", Company);
assertType<Equal<typeof employerDef.refTarget, "Company">>();
assertType<Equal<Attribute.RefTargetOf<typeof employerDef>, "Company">>();

const Person = EntityType.make("Person", {
  attributes: {
    name: nameUse,
    age: plainUse,
    skills: skillsUse,
    employer: Attribute.use(employerDef),
    born: Attribute.use(Attribute.instant(":person/born")),
    salary: Attribute.use(Attribute.int64(":person/salary")),
  },
});
assertType<Equal<typeof Person.attributes.name.required, true>>();
assertType<Equal<typeof Person.attributes.skills.cardinality, "many">>();
assertType<Equal<typeof Person.name.required, true>>();

type All = { readonly Person: typeof Person; readonly Company: typeof Company };

declare const person: Doc<typeof Person>;
const id: EntityId = person.$id;
const type: "Person" = person.$type;
const name: string = person.name;
const age: number | undefined = person.age;
const skills: ReadonlyArray<string> = person.skills;
const employer: EntityId | undefined = person.employer;
const born: number | undefined = person.born;
const salary: IntegerValue | undefined = person.salary;
void [id, type, name, age, skills, employer, born, salary];

// @ts-expect-error optional attributes are not guaranteed present (absent = missing, never null)
const ageRequired: number = person.age;
// Absent optional attributes are never null (D5): the property type has no null member.
assertType<Equal<(typeof person)["age"], number | undefined>>();
const nullAge = { ...person, age: null };
// @ts-expect-error a document with a null attribute is not a Doc
const ageNull: Doc<typeof Person> = nullAge;
// @ts-expect-error instants decode to epoch milliseconds, never Date
const bornDate: Date | undefined = person.born;
// @ts-expect-error cardinality-many is always an array
const oneSkill: string = person.skills;
// @ts-expect-error unknown aliases are not part of the document
void person.nickname;
void [ageRequired, ageNull, bornDate, oneSkill];

// Includes expand only ref attributes, to their declared target.
type WithEmployer = Expanded<typeof Person, All, { employer: true }>;
declare const expanded: WithEmployer;
const companyName: string | undefined = expanded.employer?.name;
void companyName;
// @ts-expect-error an included ref is a document, not an id
const employerId: EntityId | undefined = expanded.employer;
void employerId;

// ---------------------------------------------------------------------------
// Repository signatures
// ---------------------------------------------------------------------------
declare const people: Repository.Repository<typeof Person, All>;
const got = people.get("person:maria", { include: { employer: true } });
assertType<
  Equal<typeof got, Effect.Effect<WithEmployer | undefined, Repository.RepositoryReadError>>
>();
// @ts-expect-error `name` is not a ref attribute, so it cannot be included
void people.get("person:maria", { include: { name: true } });
void people.find({ where: { name: { startsWith: "Ma" }, age: { gte: 18 } }, limit: 50 });
// @ts-expect-error startsWith is only offered for string attributes
void people.find({ where: { age: { startsWith: "x" } } });
// @ts-expect-error ranges are only offered for number attributes
void people.find({ where: { name: { gt: "a" } } });
// @ts-expect-error orderBy names an alias or $id
void people.find({ orderBy: "nickname" });
const where: Where<typeof Person> = { skills: "rust", employer: { exists: true } };
// @ts-expect-error entity ids are opaque: no startsWith on ref attributes (VERIFY F7)
void people.find({ where: { employer: { startsWith: "company:" } } });

// A computed (widened) cardinality may be a scalar or an array at runtime (VERIFY F7).
const Noted = EntityType.make("Noted", { attributes: { note: computedUse } });
declare const noted: Doc<typeof Noted>;
assertType<Equal<(typeof noted)["note"], string | ReadonlyArray<string> | undefined>>();
// @ts-expect-error a widened cardinality is not typed as a plain scalar
const noteScalar: string | undefined = noted.note;
void noteScalar;
void where;

// ---------------------------------------------------------------------------
// Writer signatures
// ---------------------------------------------------------------------------
const write = Repository.writer(Person);
const ok: Input<typeof Person> = { name: "Maria", skills: ["rust"] };
void ok;
void write.create;
// @ts-expect-error a required attribute is missing
const missing: Input<typeof Person> = { age: 3 };
// @ts-expect-error a value of the wrong type
const wrongType: Input<typeof Person> = { name: 7 };
// @ts-expect-error cardinality-many input is an array
const scalarMany: Input<typeof Person> = { name: "Maria", skills: "rust" };
void [missing, wrongType, scalarMany];
const clearAge: Patch<typeof Person> = { age: null };
void clearAge;
// @ts-expect-error null is only allowed on optional single-valued attributes
const clearName: Patch<typeof Person> = { name: null };
// @ts-expect-error null does not clear card-many attributes
const clearSkills: Patch<typeof Person> = { skills: null };
void [clearName, clearSkills];
// @ts-expect-error addValue checks the value type of the named attribute
void (() => write.addValue("person:maria", "age", "old"));
