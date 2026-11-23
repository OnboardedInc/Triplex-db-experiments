// [DX-CON1] What the entity page reads, and how a subject's facts become a tree of entities.
import { useTool } from "@/hooks/use-tool";
import { toBasis, useBasis } from "@/lib/basis";
import { useTools } from "@/lib/catalogue";
import { kindOf, parseLoaderId } from "@/lib/format";
import type { Fact, ReadEntity, ReadSubject } from "@/lib/types";

export const pad8 = (x: number) => String(x).padStart(8, "0");
export type Target = { entity: string; account?: string; subject?: number; isRoot: boolean; loaderKind?: "root" | "profile" | "task" };

export function targetOf(params: { account?: string; n?: string; entityId?: string }): Target | null {
  if (params.account && params.n !== undefined && /^\d+$/.test(params.n)) {
    const subject = Number(params.n);
    return { entity: `acct/${params.account}/pl:${pad8(subject)}`, account: params.account, subject, isRoot: true, loaderKind: "root" };
  }
  if (params.entityId) {
    const entity = decodeURIComponent(params.entityId);
    const p = parseLoaderId(entity);
    if (!p) return { entity, isRoot: false };
    const loaderKind = /^pl:\d{8}$/.test(p.local) ? "root" : /^wk:\d{8}$/.test(p.local) ? "profile" : /^i9:\d{8}$/.test(p.local) ? "task" : undefined;
    return { entity, account: p.account, subject: p.subject, isRoot: loaderKind === "root", loaderKind };
  }
  return null;
}

const full = (id: string, ns: string) => (id.startsWith("acct/") || id.startsWith("_") || id.includes("/") ? id : ns + id);

/** Read the entity, or its whole reach as a subject, through read_entity when the server has it, else read_subject. */
export function useEntityRead(target: Target | null, asSubject: boolean) {
  const tools = useTools();
  const { basis } = useBasis();
  const b = toBasis(basis);
  const viaEntity = tools.has("read_entity");
  const viaSubject = !viaEntity && target?.account !== undefined && target.subject !== undefined;
  const subjectBasis = tools.accepts("read_subject", "basis");
  const entityQ = useTool<ReadEntity>("read_entity", { entity: target?.entity, basis: b, asSubject: asSubject || undefined }, { enabled: Boolean(target) && viaEntity, keepPrevious: true });
  const subjectQ = useTool<ReadSubject>(
    "read_subject",
    { account: target?.account, subject: target?.subject, basis: subjectBasis ? b : undefined },
    { enabled: Boolean(target) && viaSubject, keepPrevious: true },
  );
  const q = viaEntity ? entityQ : subjectQ;
  const ns = target?.account ? `acct/${target.account}/` : "";
  let facts: Fact[] = [];
  let entityType: string | undefined;
  if (viaEntity && entityQ.data) {
    const d = entityQ.data;
    facts = asSubject && d.reach?.facts ? d.reach.facts : d.facts;
    entityType = d.entityType;
  } else if (subjectQ.data) {
    facts = subjectQ.data.facts;
  }
  facts = facts.map((f) => ({ ...f, entity: full(f.entity, ns) }));
  if (!asSubject && target) facts = facts.filter((f) => f.entity === target.entity);
  return {
    ...q,
    facts,
    entityType,
    via: viaEntity ? "read_entity" : viaSubject ? "read_subject" : null,
    /** The basis could not be passed to the tool, so the answer is at latest. */
    basisIgnored: Boolean(b) && !viaEntity && !subjectBasis,
    ready: tools.isSuccess,
  };
}

export type Node = { id: string; kind: string; facts: number; children: Node[]; depth: number };

export function buildTree(facts: Fact[], rootId: string): Node[] {
  const byEntity = new Map<string, Fact[]>();
  for (const f of facts) byEntity.set(f.entity, [...(byEntity.get(f.entity) ?? []), f]);
  const seen = new Set<string>();
  const visit = (id: string, depth: number): Node => {
    seen.add(id);
    const own = byEntity.get(id) ?? [];
    const kids = own
      .filter((f) => f.type === "ref" && typeof f.value === "string" && byEntity.has(f.value as string) && !seen.has(f.value as string))
      .map((f) => f.value as string);
    const children: Node[] = [];
    for (const k of [...new Set(kids)]) if (!seen.has(k)) children.push(visit(k, depth + 1));
    return { id, kind: kindOf(id), facts: own.length, children, depth };
  };
  const roots: Node[] = [];
  if (byEntity.has(rootId)) roots.push(visit(rootId, 0));
  for (const id of [...byEntity.keys()].sort()) if (!seen.has(id)) roots.push(visit(id, 0));
  return roots;
}

export function flatten(nodes: Node[]): Node[] {
  return nodes.flatMap((x) => [x, ...flatten(x.children)]);
}
