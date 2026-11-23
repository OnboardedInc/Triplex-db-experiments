// [DX-CON1] The Change a fact sheet (DESIGN.md 5.5, 8.8): change from now, correct from a past date, or retire; the
// Transaction tab shows the exact tool call and the operations it commits before anything is sent.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert, Refused } from "@/components/console/states";
import { useToolMutation } from "@/hooks/use-tool";
import { ToolError } from "@/lib/api";
import { useConnection, useTools } from "@/lib/catalogue";
import { day, json, shortId } from "@/lib/format";
import { receiptToast } from "@/lib/receipt";
import type { Fact } from "@/lib/types";
import type { Target } from "./model";

const schema = z
  .object({
    action: z.enum(["change", "retire"]),
    attribute: z.string().regex(/^:[a-z][a-z0-9-]*\/[a-z0-9-]+$/, "An attribute looks like :task/field-0"),
    value: z.string().max(500, "At most 500 characters"),
    when: z.enum(["now", "past"]),
    validFrom: z.string(),
  })
  .superRefine((v, ctx) => {
    if (/^:(_|subject\/|tenant\/|triplex|f\/|db\/|console\/)/.test(v.attribute))
      ctx.addIssue({ code: "custom", path: ["attribute"], message: "This attribute name is reserved; it cannot be changed here." });
    if (v.action === "change" && !v.value.length) ctx.addIssue({ code: "custom", path: ["value"], message: "Give the new value" });
    if (v.action === "change" && v.when === "past") {
      const t = Date.parse(v.validFrom);
      if (!v.validFrom || Number.isNaN(t)) ctx.addIssue({ code: "custom", path: ["validFrom"], message: "Give the date the value became true" });
      else if (t >= Date.now()) ctx.addIssue({ code: "custom", path: ["validFrom"], message: "A correction starts in the past; choose now for a change from today" });
    }
  });
type Values = z.infer<typeof schema>;

export function ChangeFactSheet({
  open,
  onOpenChange,
  target,
  entity,
  attribute,
  facts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: Target;
  entity: string;
  attribute?: string;
  facts: Fact[];
}) {
  const navigate = useNavigate();
  const tools = useTools();
  const connection = useConnection().data;
  const byEntity = tools.accepts("save_facts", "entity");
  const sub = target.subject !== undefined ? String(target.subject).padStart(8, "0") : "";
  const ns = target.account ? `acct/${target.account}/` : "";
  const kind = entity === `${ns}pl:${sub}` ? "root" : entity === `${ns}wk:${sub}` ? "profile" : entity === `${ns}i9:${sub}` ? "task" : undefined;
  const own = facts.filter((f) => f.entity === entity);
  const textAttributes = [...new Set(own.filter((f) => f.type === "string").map((f) => f.attribute))].sort();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { action: "change", attribute: attribute ?? textAttributes[0] ?? "", value: "", when: "now", validFrom: "" },
  });
  useEffect(() => {
    if (open) form.reset({ action: "change", attribute: attribute ?? textAttributes[0] ?? "", value: "", when: "now", validFrom: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attribute, entity]);
  const v = form.watch();
  const toolName = v.action === "retire" ? "retire_fact" : v.when === "past" ? "correct_past_value" : "save_facts";
  const save = useToolMutation(toolName);
  const [tab, setTab] = useState("form");
  const who = byEntity ? { entity } : { account: target.account, subject: target.subject, kind };
  const input: Record<string, unknown> =
    toolName === "save_facts"
      ? { ...who, changes: { [v.attribute]: v.value } }
      : toolName === "correct_past_value"
        ? { ...who, attribute: v.attribute, value: v.value, validFrom: v.validFrom ? new Date(v.validFrom + "T00:00:00Z").toISOString() : "" }
        : { ...who, attribute: v.attribute };

  // The operations, computed here from the facts on screen; the tool computes them again from the entity's exact
  // current state and commits them in one transaction guarded by that state.
  const ops = useMemo(() => {
    const at = v.when === "past" && v.validFrom ? Date.parse(v.validFrom + "T00:00:00Z") : Date.now();
    const live = own.filter((f) => f.attribute === v.attribute);
    const out: Record<string, unknown>[] = [];
    for (const f of live) {
      out.push({ op: "retract", id: f.id });
      if (f.validFrom && Date.parse(f.validFrom) < at)
        out.push({ op: "assert", entityId: entity, attribute: f.attribute, value: { type: f.type, value: f.value }, validFrom: f.validFrom, validTo: new Date(at).toISOString() });
    }
    if (v.action === "change") out.push({ op: "assert", entityId: entity, attribute: v.attribute, value: { type: "string", value: v.value }, validFrom: new Date(at).toISOString() });
    return {
      operations: out,
      meta: { actor: "console", commandId: `demo:${v.action === "retire" ? "retire" : v.when === "past" ? "correct" : "save"}:<generated at commit>`, preconditions: [{ _tag: "EntityState", entityId: entity, tripleIds: own.map((f) => f.id) }] },
    };
  }, [v.action, v.attribute, v.value, v.when, v.validFrom, own, entity]);

  const supported = byEntity || Boolean(kind);
  const submit = form.handleSubmit((values) => {
    void values;
    save.mutate(input, {
      onSuccess: (answer) => {
        receiptToast(answer as never, v.action === "retire" ? "Retired" : v.when === "past" ? "Corrected" : "Changed", () => navigate("/journal"));
        onOpenChange(false);
      },
    });
  });
  const err = save.error instanceof ToolError ? save.error : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Change a fact</SheetTitle>
          <SheetDescription className="font-mono text-xs">{shortId(entity)}</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          {!supported ? (
            <Refused reason="Until the server's save tools take any entity, the console changes the subject's root, profile and first task only." />
          ) : connection && !connection.workingCopy ? (
            <Refused reason="This connection is not a working copy, so every change is refused (NotAWorkingCopy)." />
          ) : null}
          <Tabs value={tab} onValueChange={setTab} className="mt-2">
            <TabsList>
              <TabsTrigger value="form">Form</TabsTrigger>
              <TabsTrigger value="transaction">Transaction</TabsTrigger>
            </TabsList>
            <TabsContent value="form" className="mt-4">
              <form id="change-fact" onSubmit={submit}>
                <FieldGroup>
                  <Controller
                    control={form.control}
                    name="action"
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Action</FieldLabel>
                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="change" id="a-change" />
                            <Label htmlFor="a-change">Change the value</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="retire" id="a-retire" />
                            <Label htmlFor="a-retire">Retire the fact</Label>
                          </div>
                        </RadioGroup>
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="attribute"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Attribute</FieldLabel>
                        {textAttributes.length ? (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="font-mono text-xs">
                              <SelectValue placeholder="Choose" />
                            </SelectTrigger>
                            <SelectContent>
                              {textAttributes.map((a) => (
                                <SelectItem key={a} value={a} className="font-mono text-xs">
                                  {a}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input {...field} className="font-mono" />
                        )}
                        <FieldDescription>
                          Current: <span className="font-mono">{own.filter((f) => f.attribute === field.value).map((f) => String(f.value)).join(", ") || "no value"}</span>
                        </FieldDescription>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                  {v.action === "change" && (
                    <>
                      <Controller
                        control={form.control}
                        name="value"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>New value (text)</FieldLabel>
                            {field.value.length > 80 ? <Textarea {...field} className="font-mono" /> : <Input {...field} className="font-mono" data-testid="new-value" />}
                            <FieldError errors={[fieldState.error]} />
                          </Field>
                        )}
                      />
                      <Controller
                        control={form.control}
                        name="when"
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Valid from</FieldLabel>
                            <RadioGroup value={field.value} onValueChange={field.onChange}>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="now" id="w-now" />
                                <Label htmlFor="w-now">now</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="past" id="w-past" />
                                <Label htmlFor="w-past">a past date (a correction)</Label>
                                <Controller
                                  control={form.control}
                                  name="validFrom"
                                  render={({ field: f2 }) => (
                                    <Input type="date" className="h-8 w-40" value={f2.value} onChange={(e) => (f2.onChange(e.target.value), form.setValue("when", "past"))} />
                                  )}
                                />
                              </div>
                            </RadioGroup>
                            <FieldError errors={[form.formState.errors.validFrom]} />
                          </Field>
                        )}
                      />
                    </>
                  )}
                  <p className="text-muted-foreground text-sm">
                    {v.action === "retire"
                      ? "The fact stops being current from now. The time it was true stays in history and in earlier reads."
                      : v.when === "past"
                        ? `From ${v.validFrom ? day(v.validFrom) : "that date"} on, the value was different. Both beliefs about that date stay readable.`
                        : "The old value stays true for the time before now; the new value is true from now."}{" "}
                    One transaction, through the tool <span className="font-mono">{toolName}</span>.
                  </p>
                </FieldGroup>
              </form>
            </TabsContent>
            <TabsContent value="transaction" className="mt-4 space-y-3">
              <div>
                <div className="text-muted-foreground mb-1 text-xs font-medium">The tool call the console sends</div>
                <ScrollArea className="bg-muted max-h-48 rounded-md">
                  <pre className="p-3 font-mono text-xs whitespace-pre-wrap">{json({ tool: toolName, arguments: input })}</pre>
                </ScrollArea>
              </div>
              <div>
                <div className="text-muted-foreground mb-1 text-xs font-medium">The operations it commits, in one transact</div>
                <ScrollArea className="bg-muted max-h-80 rounded-md">
                  <pre className="p-3 font-mono text-xs whitespace-pre-wrap">{json(ops)}</pre>
                </ScrollArea>
                <p className="text-muted-foreground mt-1 text-xs">
                  Computed in the console from the facts on screen. The tool computes the same operations from the entity's exact current state and refuses if
                  another change reached the entity first.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          <div className="mt-4 space-y-2">
            {save.slow && <p className="text-muted-foreground text-sm">Committing.</p>}
            {err && err.code === "NotAWorkingCopy" ? (
              <Refused reason={err.message} />
            ) : err && /Conflict|Precondition/.test(err.code) ? (
              <Alert variant="destructive">
                <AlertTitle>{err.code}</AlertTitle>
                <AlertDescription>Another change reached this entity first. Reload and try again.</AlertDescription>
              </Alert>
            ) : save.error ? (
              <ErrorAlert error={save.error} />
            ) : null}
          </div>
        </div>
        <SheetFooter className="flex-row justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="change-fact" disabled={save.isPending || !supported} data-testid="commit-change">
            {save.isPending && <Spinner />}
            Commit
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
