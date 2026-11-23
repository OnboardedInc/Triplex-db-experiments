// [DX-CON1] The Entity form (DESIGN.md 5.5, 8.8): generated from the type's description, one control per value type,
// the reference combobox, and a Transaction tab with the exact request before it is sent (create_entity).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert, NotInCatalogue, Refused } from "@/components/console/states";
import type { EntityFormInit } from "@/components/console/sheets-context";
import { useTool, useToolMutation } from "@/hooks/use-tool";
import { ToolError } from "@/lib/api";
import { useConnection, useTools } from "@/lib/catalogue";
import { kebab, useTypes } from "@/lib/config";
import { json, shortId } from "@/lib/format";
import { receiptToast } from "@/lib/receipt";
import type { AttributeDef, DescribeType, ListEntities } from "@/lib/types";

type Value = string | boolean | string[];
const pad8 = (x: number) => String(x).padStart(8, "0");

function RefPicker({ attr, value, onChange, account }: { attr: AttributeDef; value: string; onChange: (v: string) => void; account: string }) {
  const connection = useConnection().data;
  const tools = useTools();
  const [open, setOpen] = useState(false);
  const target = attr.refTarget ?? "";
  const [acct, setAcct] = useState(account);
  const [num, setNum] = useState("");
  const list = useTool<ListEntities>("list_entities", { type: target, account, count: 50 }, { enabled: target !== "Subject" && tools.has("list_entities") && open });
  useEffect(() => setAcct(account), [account]);
  if (target === "Subject") {
    const r = connection?.roster.find((x) => x.account === acct);
    const ok = r && /^\d+$/.test(num) && Number(num) >= r.firstPerson && Number(num) < r.firstPerson + r.people;
    return (
      <div className="space-y-1">
        <div className="flex gap-2">
          <Select
            value={acct}
            onValueChange={(a) => {
              setAcct(a);
              if (/^\d+$/.test(num)) onChange(`acct/${a}/pl:${pad8(Number(num))}`);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {connection?.roster.map((x) => (
                <SelectItem key={x.account} value={x.account}>
                  {x.account}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-28 tabular-nums"
            inputMode="numeric"
            placeholder="subject"
            value={num}
            data-testid={`ref-${attr.key}`}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setNum(v);
              onChange(v ? `acct/${acct}/pl:${pad8(Number(v))}` : "");
            }}
          />
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          {value || "a subject by account and number"}
          {num && !ok && r && <span className="text-destructive ml-2 font-sans">{acct} has subjects {r.firstPerson} to {r.firstPerson + r.people - 1}</span>}
        </div>
      </div>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-mono text-xs">
          {value ? shortId(value) : `Choose a ${target}`}
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command>
          <CommandInput placeholder={`${target} by number`} />
          <CommandList>
            <CommandEmpty>{tools.has("list_entities") ? `No ${target} in ${account} yet.` : "Listing entities is not available yet."}</CommandEmpty>
            <CommandGroup heading={`${target} in ${account}`}>
              {list.data?.entities.map((e) => (
                <CommandItem
                  key={e.entity}
                  value={e.entity}
                  onSelect={() => {
                    onChange(e.entity);
                    setOpen(false);
                  }}
                >
                  <CheckIcon className={value === e.entity ? "opacity-100" : "opacity-0"} />
                  <span className="font-mono text-xs">{shortId(e.entity)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Control({ attr, value, onChange, account }: { attr: AttributeDef; value: Value | undefined; onChange: (v: Value) => void; account: string }) {
  const t = attr.valueType;
  const s = typeof value === "string" ? value : "";
  if (t === "boolean") return <Switch checked={value === true} onCheckedChange={(c) => onChange(c)} />;
  if (t === "enumOf")
    return (
      <Select value={s} onValueChange={onChange}>
        <SelectTrigger className="w-56" data-testid={`field-${attr.key}`}>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          {attr.enumValues?.map((x) => (
            <SelectItem key={x} value={x}>
              {x}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  if (t === "ref") return <RefPicker attr={attr} value={s} onChange={onChange} account={account} />;
  if (t === "date") return <Input type="date" className="w-44" value={s} onChange={(e) => onChange(e.target.value)} data-testid={`field-${attr.key}`} />;
  if (t === "instant") return <Input type="datetime-local" className="w-56" value={s} onChange={(e) => onChange(e.target.value)} />;
  if (t === "number" || t === "integer")
    return <Input type="number" step={t === "integer" ? 1 : "any"} className="w-44 tabular-nums" value={s} onChange={(e) => onChange(e.target.value)} />;
  if (t === "int64") return <Input inputMode="numeric" className="w-56 font-mono" value={s} onChange={(e) => onChange(e.target.value.replace(/[^\d-]/g, ""))} placeholder="digits" />;
  return s.length > 80 ? (
    <Textarea value={s} maxLength={500} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <Input value={s} maxLength={500} onChange={(e) => onChange(e.target.value)} data-testid={`field-${attr.key}`} />
  );
}

function converted(attr: AttributeDef, v: Value | undefined): unknown {
  if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) return undefined;
  const one = (x: string | boolean) => {
    if (attr.valueType === "number") return Number(x);
    if (attr.valueType === "integer") return Number.parseInt(String(x), 10);
    if (attr.valueType === "instant") return new Date(String(x) + (String(x).endsWith("Z") ? "" : "Z")).toISOString();
    return x;
  };
  return Array.isArray(v) ? v.filter((x) => x !== "").map(one) : one(v);
}

export function EntityFormSheet({ init, onClose }: { init: EntityFormInit | null; onClose: () => void }) {
  const navigate = useNavigate();
  const tools = useTools();
  const connection = useConnection().data;
  const types = useTypes();
  const roster = connection?.roster ?? [];
  const [account, setAccount] = useState(init?.account ?? "account-010");
  const [values, setValues] = useState<Record<string, Value>>({});
  const [when, setWhen] = useState<"now" | "past">("now");
  const [validFrom, setValidFrom] = useState("");
  const [tab, setTab] = useState("form");
  const describe = useTool<DescribeType>("describe_entity_type", { name: init?.type }, { enabled: Boolean(init?.type) });
  const create = useToolMutation<{ entity: string; number: number; receipt: { position: number } }>("create_entity");
  useEffect(() => {
    if (init) {
      setAccount(init.account ?? "account-010");
      setValues((init.values as Record<string, Value>) ?? {});
      setWhen("now");
      setValidFrom("");
      setTab("form");
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init]);
  const attrs = describe.data?.type.attributes ?? [];
  const summary = types.data?.types.find((t) => t.name === init?.type);
  const next = summary?.createdByAccount?.[account] ?? 0;
  const typeKebab = init ? kebab(init.type) : "";
  const attributes = Object.fromEntries(attrs.map((a) => [a.key, converted(a, values[a.key])]).filter(([, v]) => v !== undefined));
  const missing = attrs.filter((a) => a.required && attributes[a.key] === undefined).map((a) => a.key);
  const input = {
    type: init?.type,
    account,
    attributes,
    ...(when === "past" && validFrom ? { validFrom: new Date(validFrom + "T00:00:00Z").toISOString() } : {}),
  };
  const err = create.error instanceof ToolError ? create.error : null;
  const release = describe.data?.release ?? types.data?.release;
  const ops = {
    operations: [
      ...attrs.flatMap((a) => {
        const v = attributes[a.key];
        if (v === undefined) return [];
        return (Array.isArray(v) ? v : [v]).map((x) => ({
          op: "assert",
          entityId: `acct/${account}/${typeKebab}:${pad8(next)}`,
          attribute: a.key,
          value: { type: a.valueType, value: x },
          entityType: init?.type,
          validFrom: input.validFrom ?? "now",
        }));
      }),
      { op: "replace", entityId: `acct/${account}/console/type/${init?.type}`, attribute: ":console/next", value: { type: "integer", value: String(next + 1) } },
    ],
    meta: {
      actor: "console",
      commandId: "<generated at commit>",
      configSnapshot: release?.id ?? null,
      preconditions: [{ _tag: "EntityState", entityId: `acct/${account}/console/type/${init?.type}`, note: "the counter as observed" }],
    },
  };

  const submit = () => {
    if (missing.length) return;
    create.mutate(input, {
      onSuccess: (answer) => {
        receiptToast(answer as never, `Created ${shortId(answer.entity)}`, () => navigate("/journal"));
        onClose();
        navigate(`/entities/${encodeURIComponent(answer.entity)}`);
      },
    });
  };

  return (
    <Sheet open={Boolean(init)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            New {init?.type} in {account}
          </SheetTitle>
          <SheetDescription>The form is generated from the type in the live release.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          {!tools.has("create_entity") && <NotInCatalogue tool="create_entity" what="Creating an entity" />}
          {describe.isError && <ErrorAlert error={describe.error} />}
          {connection && !connection.workingCopy && <Refused reason="This connection is not a working copy, so every change is refused (NotAWorkingCopy)." />}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="form">Form</TabsTrigger>
              <TabsTrigger value="transaction">Transaction</TabsTrigger>
            </TabsList>
            <TabsContent value="form" className="mt-4">
              <FieldGroup>
                <Field>
                  <FieldLabel>Account</FieldLabel>
                  <Select value={account} onValueChange={setAccount}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roster.map((r) => (
                        <SelectItem key={r.account} value={r.account}>
                          {r.account}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {attrs.map((a) => (
                  <Field key={a.key} data-invalid={create.isError && missing.includes(a.key)}>
                    <FieldLabel className="font-mono text-xs">
                      {a.key}
                      {a.required && " *"}
                      <Badge variant="outline" className="ml-1 font-sans font-normal">
                        {a.valueType === "enumOf" ? "enum" : a.valueType === "int64" ? "exact integer" : a.valueType}
                        {a.refTarget ? ` to ${a.refTarget}` : ""}
                        {a.cardinality === "many" ? ", many" : ""}
                      </Badge>
                    </FieldLabel>
                    {a.cardinality === "many" ? (
                      <div className="space-y-1.5">
                        {((values[a.key] as string[] | undefined) ?? [""]).map((x, i, list) => (
                          <div key={i} className="flex items-center gap-2">
                            <Control
                              attr={a}
                              value={x}
                              account={account}
                              onChange={(v) => setValues((s) => ({ ...s, [a.key]: list.map((y, j) => (j === i ? String(v) : y)) }))}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => setValues((s) => ({ ...s, [a.key]: list.filter((_, j) => j !== i) }))}
                              aria-label="Remove"
                            >
                              <XIcon />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => setValues((s) => ({ ...s, [a.key]: [...((s[a.key] as string[]) ?? [""]), ""] }))}>
                          <PlusIcon /> Add
                        </Button>
                      </div>
                    ) : (
                      <Control attr={a} value={values[a.key]} account={account} onChange={(v) => setValues((s) => ({ ...s, [a.key]: v }))} />
                    )}
                  </Field>
                ))}
                <Field>
                  <FieldLabel>Valid from</FieldLabel>
                  <RadioGroup value={when} onValueChange={(w) => setWhen(w as "now" | "past")} className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="now" id="vf-now" />
                      <Label htmlFor="vf-now">now</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="past" id="vf-past" />
                      <Label htmlFor="vf-past">a past date</Label>
                      <Input type="date" className="h-8 w-40" value={validFrom} onChange={(e) => (setValidFrom(e.target.value), setWhen("past"))} data-testid="valid-from" />
                    </div>
                  </RadioGroup>
                  <FieldDescription>
                    The entity will be <span className="font-mono">acct/{account}/{typeKebab}:{pad8(next)}</span>
                    {summary?.createdByAccount ? "" : " (the number is assigned at commit)"}. Written under release {release?.label ?? "live"}.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </TabsContent>
            <TabsContent value="transaction" className="mt-4 space-y-3">
              <div>
                <div className="text-muted-foreground mb-1 text-xs font-medium">The tool call the console sends</div>
                <ScrollArea className="bg-muted max-h-56 rounded-md">
                  <pre className="p-3 font-mono text-xs whitespace-pre-wrap">{json({ tool: "create_entity", arguments: input })}</pre>
                </ScrollArea>
              </div>
              <div>
                <div className="text-muted-foreground mb-1 text-xs font-medium">The transaction it commits</div>
                <ScrollArea className="bg-muted max-h-96 rounded-md">
                  <pre className="p-3 font-mono text-xs whitespace-pre-wrap">{json(ops)}</pre>
                </ScrollArea>
                <p className="text-muted-foreground mt-1 text-xs">
                  Computed in the console from the type. The server writes the facts with their entity type and replaces the type's counter in one transaction,
                  pinned to the release live points to; the counter's observed state is the precondition, so two creates at once cannot take one number.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          {missing.length > 0 && create.isIdle === false && <Refused reason={`Required: ${missing.join(", ")}.`} />}
          {create.slow && <p className="text-muted-foreground text-sm">Committing.</p>}
          {err && (err.code === "NotAWorkingCopy" || err.refused || err.code === "InvalidInput") ? (
            <Refused reason={err.message} />
          ) : err && /Conflict|Precondition/.test(err.code) ? (
            <ErrorAlert error={new Error("Another change reached this entity first. Reload and try again.")} />
          ) : create.error ? (
            <ErrorAlert error={create.error} />
          ) : null}
        </div>
        <SheetFooter className="flex-row justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || missing.length > 0 || !tools.has("create_entity")} data-testid="commit-entity">
            {create.isPending && <Spinner />}
            Commit
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
