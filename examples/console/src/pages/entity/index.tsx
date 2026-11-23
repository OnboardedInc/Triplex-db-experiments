// [DX-CON1] Entity page (DESIGN.md 8.7): one entity, or one subject, in five views. "Read as subject" pulls the reach.
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnswerLine } from "@/components/console/answer-line";
import { Mono } from "@/components/console/data-table";
import { PageTitle } from "@/components/console/layout";
import { EmptyState, ErrorAlert, NotInCatalogue, Slow, TableSkeleton } from "@/components/console/states";
import { recordedWords, useBasis, validWords } from "@/lib/basis";
import { useTools } from "@/lib/catalogue";
import { n, plural, shortId } from "@/lib/format";
import { ChangeFactSheet } from "./change-fact-sheet";
import { FactsTab } from "./facts-tab";
import { HistoryTab } from "./history-tab";
import { JournalTab } from "./journal-tab";
import { targetOf, useEntityRead } from "./model";
import { TimeTab } from "./time-tab";

export function EntityPage() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const target = targetOf(params);
  const tools = useTools();
  const { basis, reset } = useBasis();
  const asSubject = search.get("subject") === null ? Boolean(target?.isRoot) : search.get("subject") === "1";
  const read = useEntityRead(target, asSubject);
  const tab = search.get("tab") ?? "facts";
  const selected = search.get("e") ?? target?.entity ?? "";
  const attribute = search.get("attribute") ?? undefined;
  const [sheet, setSheet] = useState<{ entity: string; attribute?: string } | null>(null);
  const set = (p: Record<string, string | undefined>) =>
    setSearch(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(p)) v === undefined ? next.delete(k) : next.set(k, v);
        return next;
      },
      { replace: true },
    );

  if (!target) return <EmptyState title="No entity named." />;
  const ns = target.account ? `acct/${target.account}/` : "";
  const entityCount = (read.data as { entities?: unknown } | undefined)?.entities !== undefined && typeof (read.data as { entities?: unknown }).entities === "number" && asSubject ? ((read.data as unknown as { entities: number }).entities) : new Set(read.facts.map((f) => f.entity)).size;
  const sub = target.subject !== undefined ? String(target.subject).padStart(8, "0") : "";
  const editable = (e: string) => tools.accepts("save_facts", "entity") || [`${ns}pl:${sub}`, `${ns}wk:${sub}`, `${ns}i9:${sub}`].includes(e);
  const title =
    target.isRoot && target.subject !== undefined ? (
      <>
        Subject {n(target.subject)} of {target.account}
      </>
    ) : (
      <Mono className="text-lg">{shortId(target.entity)}</Mono>
    );

  if (!read.via && read.ready) return <NotInCatalogue tool="read_entity" what="Reading this entity" />;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageTitle
        title={title}
        actions={
          <>
            <Mono className="text-muted-foreground">{target.entity}</Mono>
            <div className="flex items-center gap-2">
              <Switch id="as-subject" checked={asSubject} onCheckedChange={(v) => set({ subject: v ? "1" : "0" })} />
              <Label htmlFor="as-subject">Read as subject</Label>
            </div>
            <Button size="sm" onClick={() => setSheet({ entity: selected, attribute })} disabled={!editable(selected)} data-testid="change-fact">
              Change a fact
            </Button>
          </>
        }
      >
        {target.subject !== undefined && !target.isRoot && (
          <>
            Part of{" "}
            <Link className="underline underline-offset-4" to={`/accounts/${target.account}/subjects/${target.subject}`}>
              subject {target.subject} of {target.account}
            </Link>
            .{" "}
          </>
        )}
        {read.entityType && read.entityType !== "untyped" ? `Entity type ${read.entityType}.` : "Untyped: loader-built facts carry no entity type; the kind is read from the ID."}
      </PageTitle>
      <Tabs value={tab} onValueChange={(t) => set({ tab: t })}>
        <TabsList>
          <TabsTrigger value="facts">Facts</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="time">Both time axes</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="derivations">Derivations</TabsTrigger>
        </TabsList>
        <TabsContent value="facts" className="mt-4 space-y-3">
          <Slow show={read.slow} elapsed={read.elapsed}>
            Pulling the subject.
          </Slow>
          {read.isError ? (
            <ErrorAlert error={read.error} onRetry={() => read.refetch()} />
          ) : read.isPending ? (
            <TableSkeleton rows={10} columns={5} />
          ) : (
            <>
              <AnswerLine answer={read.data} call={read.call} recorded={read.basisIgnored ? "Recorded latest" : recordedWords(basis)} valid={read.basisIgnored ? "Valid now" : validWords(basis)} />
              {read.basisIgnored && (
                <p className="text-muted-foreground text-xs">
                  The basis in the header is not applied here yet: the server's {read.via} reads at the latest position until it takes a basis.
                </p>
              )}
              <p className="text-sm">
                {plural(read.facts.length, "fact")} in {plural(entityCount, "entity", "entities")}, {plural(read.data?.timing.requests ?? 0, "request")}, one position
              </p>
              {read.facts.length === 0 ? (
                <EmptyState title="This entity has no facts at this basis.">
                  <Button variant="outline" size="sm" onClick={reset}>
                    Back to latest
                  </Button>
                </EmptyState>
              ) : (
                <FactsTab
                  facts={read.facts}
                  root={target.entity}
                  ns={ns}
                  selected={read.facts.some((f) => f.entity === selected) ? selected : target.entity}
                  onSelect={(e) => set({ e })}
                  entityType={read.entityType}
                  canEdit={editable}
                  onEdit={(entity, attr) => setSheet({ entity, attribute: attr })}
                  onHistory={(entity, attr) => set({ tab: "history", e: entity, attribute: attr })}
                />
              )}
            </>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          {read.facts.length ? (
            <HistoryTab target={target} facts={read.facts} entity={selected} attribute={attribute} onChange={(e, a) => set({ e, attribute: a || undefined })} />
          ) : (
            <TableSkeleton />
          )}
        </TabsContent>
        <TabsContent value="time" className="mt-4">
          {read.facts.length ? (
            <TimeTab
              target={target}
              facts={read.facts}
              entity={read.facts.some((f) => f.entity === selected) ? selected : target.entity}
              attribute={attribute}
              at={search.get("at") ?? undefined}
              believed={search.get("believedPosition") ?? search.get("believed") ?? undefined}
              onChange={(p) => set({ ...p, believedPosition: undefined })}
            />
          ) : (
            <TableSkeleton />
          )}
        </TabsContent>
        <TabsContent value="journal" className="mt-4">
          <JournalTab entity={selected} entities={asSubject ? [...new Set(read.facts.map((f) => f.entity))] : [selected]} />
        </TabsContent>
        <TabsContent value="derivations" className="mt-4">
          {tools.has("evaluate_derivation") ? (
            <EmptyState title="Derivations" description="Choose a derivation to evaluate for this subject." />
          ) : (
            <NotInCatalogue tool="evaluate_derivation" what="Derivations" />
          )}
        </TabsContent>
      </Tabs>
      {sheet && (
        <ChangeFactSheet open={Boolean(sheet)} onOpenChange={(v) => !v && setSheet(null)} target={target} entity={sheet.entity} attribute={sheet.attribute} facts={read.facts} />
      )}
    </div>
  );
}
