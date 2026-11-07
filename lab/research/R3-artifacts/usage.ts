import type { EntityId } from "@triplex-build/triplex";
import type { Attribute } from "@triplex-build/triplex/config";
import type { Handle, Model, Repository, Writer, Native, Doc } from "./api-sketch";
import { contract, T } from "./api-sketch";

type Name = Attribute.Definition<":person/name", string>;
type Age = Attribute.Definition<":person/age", number>;
type Skills = Attribute.Definition<":person/skills", string>;
type Employer = Attribute.Definition<":person/employer", EntityId>;
type CompanyName = Attribute.Definition<":company/name", string>;

type Person = Model<"Person", {
  readonly name: Handle<Name, true, "one">;
  readonly age: Handle<Age, false, "one">;
  readonly skills: Handle<Skills, false, "many">;
  readonly employer: Handle<Employer, false, "one", "Company">;
}>;
type Company = Model<"Company", { readonly name: Handle<CompanyName, true, "one"> }>;
type All = { readonly Person: Person; readonly Company: Company };

declare const people: Repository<Person, All>;
declare const writer: Writer<Person>;
declare const native: Native;
declare const maria: EntityId;

// Doc shape: required one -> value, optional one -> optional property, many -> array
declare const d: Doc<Person>;
const s: string = d.name;
const a: number | undefined = d.age;
const sk: ReadonlyArray<string> = d.skills;
// @ts-expect-error optional attribute is not guaranteed present
const bad: number = d.age;
void s; void a; void sk; void bad;

// include expands only ref attributes, and only by their declared target
export const program = async () => {
  const run = null as unknown as <A>(e: import("effect").Effect.Effect<A, unknown>) => Promise<A>;
  const p = await run(people.get(maria, { include: { employer: true } }));
  const companyName: string | undefined = p?.employer?.name;
  void companyName;
  // @ts-expect-error `name` is not a ref attribute, so it cannot be included
  void people.get(maria, { include: { name: true } });
  const page = await run(people.find({ where: { name: { startsWith: "Ma" }, age: { gte: 18 } }, limit: 50 }));
  const first = page.items[0];
  void first?.$id; void page.basis.recordedPosition;
  // @ts-expect-error startsWith is only offered for string attributes
  void people.find({ where: { age: { startsWith: "x" } } });
  void writer.create(maria, { name: "Maria" });
  // @ts-expect-error required attribute missing
  void writer.create(maria, { age: 3 });
  void writer.patch(maria, { age: null });
  // @ts-expect-error null is only allowed on optional single-valued attributes
  void writer.patch(maria, { name: null });
};

// Contract-first native query: row type comes from the handles, not from a caller-asserted generic
const ByName = contract({
  name: "people/by-name@1",
  params: { name: T.text },
  row: { id: T.entityId, name: T.attr(null as unknown as Person["attributes"]["name"]), age: T.optional(T.attr(null as unknown as Person["attributes"]["age"])) },
});
export const q = (n: Native) => n.sql.query(ByName, { name: "Maria" })`
  SELECT p._id AS id, p.${n.sql.col(null as unknown as Handle)} AS name
  FROM ${n.sql.entity(null as unknown as Person)} p
  WHERE p.${n.sql.col(null as unknown as Handle)} = ${"Maria"}`;
void native; void q;
