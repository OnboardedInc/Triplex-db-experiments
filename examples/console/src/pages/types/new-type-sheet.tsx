// [DX-CON1] New entity type (DESIGN.md 8.5): define a type and commit a release, seeing what the release will contain
// first. Edit type opens the same sheet filled in. The console never says "Publish".
import { formatDatalog } from "@/lib/datalog-format";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ErrorAlert, NotInCatalogue, Refused } from "@/components/console/states";
import { useToolMutation } from "@/hooks/use-tool";
import { ToolError } from "@/lib/api";
import { useTools } from "@/lib/catalogue";
import { kebab, LOADER_PREFIXES, RESERVED_ATTRIBUTE, useDescribedTypes, useTypes, VALUE_TYPES, valueTypeWords } from "@/lib/config";
import { json } from "@/lib/format";
import { receiptToast } from "@/lib/receipt";
import type { AttributeDef, DefineType } from "@/lib/types";
import type { NewTypeInit } from "@/components/console/sheets-context";

const attr = z.object({
  key: z.string(),
  valueType: z.enum(VALUE_TYPES),
  required: z.boolean(),
  many: z.boolean(),
  unique: z.boolean(),
  refTarget: z.string(),
  enumText: z.string(),
});
const schema = z.object({ name: z.string(), attributes: z.array(attr), label: z.string(), moveLive: z.boolean() });
type Values = z.infer<typeof schema>;
const emptyRow = (): Values["attributes"][number] => ({ key: "", valueType: "text", required: false, many: false, unique: false, refTarget: "", enumText: "" });

function toRows(list?: AttributeDef[]) {
  if (!list?.length) return [emptyRow()];
  return list.map((a) => ({
    key: a.key,
    valueType: a.valueType as Values["attributes"][number]["valueType"],
    required: Boolean(a.required),
    many: a.cardinality === "many",
    unique: Boolean(a.unique),
    refTarget: a.refTarget ?? "",
    enumText: (a.enumValues ?? []).join(", "),
  }));
}

export function NewTypeSheet({ init, onClose }: { init: NewTypeInit | null; onClose: () => void }) {
  const navigate = useNavigate();
  const tools = useTools();
  const types = useTypes();
  const names = (types.data?.types ?? []).map((t) => t.name);
  const described = useDescribedTypes(names, Boolean(init));
  const existing = new Map<string, { valueType: string; type: string }>();
  for (const d of described) for (const a of d.data?.type.attributes ?? []) existing.set(a.key, { valueType: a.valueType, type: d.data!.type.name });
  const define = useToolMutation<DefineType>("define_entity_type");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", attributes: [emptyRow()], label: "", moveLive: true },
  });
  const rows = useFieldArray({ control: form.control, name: "attributes" });
  useEffect(() => {
    if (init) {
      form.reset({ name: init.name ?? "", attributes: toRows(init.attributes), label: init.label ?? "", moveLive: true });
      define.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init]);
  const v = form.watch();

  // Checks shown next to the field before anything is sent (DESIGN.md 8.14: refused states of New entity type).
  const issues = useMemo(() => {
    const out: Record<string, string> = {};
    if (v.name && !/^[A-Z][A-Za-z0-9]*$/.test(v.name)) out["name"] = "A type name is PascalCase, for example Review.";
    else if (v.name && LOADER_PREFIXES.includes(kebab(v.name))) out["name"] = `"${kebab(v.name)}" is one of the loader's entity prefixes; choose another name.`;
    else if (v.name === "Subject") out["name"] = "Subject is the starter type; the console does not change it.";
    const seen = new Set<string>();
    v.attributes.forEach((a, i) => {
      if (!a.key) return;
      if (!/^:[a-z][a-z0-9-]*\/[a-z0-9-]+$/.test(a.key)) out[`a${i}`] = "An attribute is a keyword such as :review/outcome.";
      else if (RESERVED_ATTRIBUTE.test(a.key)) out[`a${i}`] = "This attribute name is reserved.";
      else if (seen.has(a.key)) out[`a${i}`] = "This attribute is listed twice.";
      else {
        const prior = existing.get(a.key);
        if (prior && prior.valueType !== a.valueType)
          out[`a${i}`] = `${a.key} already exists as ${valueTypeWords[prior.valueType] ?? prior.valueType} (in ${prior.type}). In Triplex the attribute owns its type; add a new attribute key.`;
      }
      seen.add(a.key);
      if (a.valueType === "ref" && !a.refTarget) out[`t${i}`] = "Choose the target type.";
      if (a.valueType === "enumOf" && !a.enumText.split(",").map((x) => x.trim()).filter(Boolean).length) out[`e${i}`] = "Give the allowed values.";
    });
    return out;
  }, [v, existing]);

  const attributes = v.attributes
    .filter((a) => a.key)
    .map((a) => ({
      key: a.key,
      valueType: a.valueType,
      ...(a.required ? { required: true } : {}),
      ...(a.many ? { cardinality: "many" as const } : {}),
      ...(a.unique ? { unique: true } : {}),
      ...(a.valueType === "ref" ? { refTarget: a.refTarget } : {}),
      ...(a.valueType === "enumOf" ? { enumValues: a.enumText.split(",").map((x) => x.trim()).filter(Boolean) } : {}),
    }));
  const input = { name: v.name, attributes, ...(v.label ? { label: v.label } : {}), moveLive: v.moveLive };
  const constraints = attributes.reduce((n, a) => n + 1 + (a.required ? 1 : 0) + (a.unique ? 1 : 0) + (a.valueType === "ref" ? 1 : 0), 0);
  const added = attributes.filter((a) => !existing.has(a.key)).map((a) => a.key);
  const kept = attributes.filter((a) => existing.has(a.key)).map((a) => a.key);
  const otherTypes = names.filter((t) => t !== v.name);
  const ready = v.name && attributes.length > 0 && Object.keys(issues).length === 0;
  const err = define.error instanceof ToolError ? define.error : null;

  const submit = form.handleSubmit(() => {
    if (!ready) return;
    define.mutate(input, {
      onSuccess: (answer) => {
        receiptToast(answer as never, `Release ${answer.release.label} committed`, () => navigate("/journal"));
        onClose();
        navigate(`/types/${encodeURIComponent(answer.type)}?tab=definition`);
      },
    });
  });

  return (
    <Sheet open={Boolean(init)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{init?.edit ? `Edit ${init.name}` : "New entity type"}</SheetTitle>
          <SheetDescription>Define a type and commit it as a new immutable configuration release.</SheetDescription>
        </SheetHeader>
        {!tools.has("define_entity_type") ? (
          <div className="px-4">
            <NotInCatalogue tool="define_entity_type" what="Defining a type" />
          </div>
        ) : (
          <form id="new-type" onSubmit={submit} className="space-y-6 px-4">
            <FieldGroup>
              <Controller
                control={form.control}
                name="name"
                render={({ field }) => (
                  <Field data-invalid={Boolean(issues["name"])}>
                    <FieldLabel>Name</FieldLabel>
                    <Input {...field} placeholder="Review" disabled={init?.edit} data-testid="type-name" className="max-w-xs" />
                    <FieldDescription>PascalCase. Entities get IDs such as acct/account-010/{v.name ? kebab(v.name) : "review"}:00000000.</FieldDescription>
                    {issues["name"] && <FieldError>{issues["name"]}</FieldError>}
                  </Field>
                )}
              />
            </FieldGroup>
            <div className="space-y-2">
              <div className="text-sm font-medium">Attributes</div>
              <div className="text-muted-foreground grid grid-cols-[1fr_9rem_3.5rem_3rem_3.5rem_2rem] gap-2 text-xs">
                <span>Key</span>
                <span>Value type</span>
                <span>Required</span>
                <span>Many</span>
                <span>Unique</span>
                <span />
              </div>
              {rows.fields.map((row, i) => (
                <div key={row.id} className="space-y-1.5">
                  <div className="grid grid-cols-[1fr_9rem_3.5rem_3rem_3.5rem_2rem] items-center gap-2">
                    <Input {...form.register(`attributes.${i}.key`)} placeholder=":review/outcome" className="font-mono text-xs" data-testid={`attr-key-${i}`} />
                    <Controller
                      control={form.control}
                      name={`attributes.${i}.valueType`}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full" data-testid={`attr-type-${i}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VALUE_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {valueTypeWords[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {(["required", "many", "unique"] as const).map((k) => (
                      <Controller
                        key={k}
                        control={form.control}
                        name={`attributes.${i}.${k}`}
                        render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} aria-label={k} className="justify-self-center" />}
                      />
                    ))}
                    <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => rows.remove(i)} disabled={rows.fields.length === 1} aria-label="Remove">
                      <XIcon />
                    </Button>
                  </div>
                  {v.attributes[i]?.valueType === "enumOf" && (
                    <div className="flex flex-wrap items-center gap-2 pl-2">
                      <Label className="text-xs">Values</Label>
                      <Input {...form.register(`attributes.${i}.enumText`)} placeholder="approved, rejected, pending" className="h-8 max-w-sm text-xs" data-testid={`attr-enum-${i}`} />
                      {v.attributes[i]!.enumText
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean)
                        .map((x) => (
                          <Badge key={x} variant="secondary">
                            {x}
                          </Badge>
                        ))}
                    </div>
                  )}
                  {v.attributes[i]?.valueType === "ref" && (
                    <div className="flex items-center gap-2 pl-2">
                      <Label className="text-xs">Target</Label>
                      <Controller
                        control={form.control}
                        name={`attributes.${i}.refTarget`}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-8 w-48" data-testid={`attr-target-${i}`}>
                              <SelectValue placeholder="Choose a type" />
                            </SelectTrigger>
                            <SelectContent>
                              {otherTypes.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}
                  {(issues[`a${i}`] || issues[`t${i}`] || issues[`e${i}`]) && (
                    <p className="text-destructive pl-2 text-xs">{issues[`a${i}`] ?? issues[`t${i}`] ?? issues[`e${i}`]}</p>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => rows.append(emptyRow())} disabled={rows.fields.length >= 40}>
                + Add attribute
              </Button>
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel>Release label</FieldLabel>
                <Input {...form.register("label")} placeholder={v.name ? `${kebab(v.name)}-<sequence>` : "reviews-1"} className="max-w-xs" />
              </Field>
              <Controller
                control={form.control}
                name="moveLive"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch id="move-live" checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor="move-live">Also move live to this release</Label>
                  </div>
                )}
              />
            </FieldGroup>
            <div className="bg-muted/40 space-y-1 rounded-md border p-3 text-sm" data-testid="will-commit">
              <div className="font-medium">What will be committed</div>
              {added.length > 0 && (
                <div>
                  <span className="font-mono">+ attribute</span> <span className="font-mono text-xs">{added.join(", ")}</span>
                </div>
              )}
              {kept.length > 0 && (
                <div>
                  <span className="font-mono">= attribute</span> <span className="font-mono text-xs">{kept.join(", ")}</span>, already in the release
                </div>
              )}
              {v.name && (
                <div>
                  <span className="font-mono">{names.includes(v.name) ? "~" : "+"} entity-schema</span> {v.name}, with {constraints} constraints
                </div>
              )}
              {otherTypes.length > 0 && (
                <div>
                  <span className="font-mono">= entity-schema</span> {otherTypes.join(", ")}, unchanged
                </div>
              )}
              <div className="text-muted-foreground text-xs">
                One transaction records the release and moves test{v.moveLive ? "; a second moves live to it" : "; live does not move"}. Computed in the console;
                the server's answer lists the objects exactly.
              </div>
            </div>
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer">The tool call</summary>
              <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-3 font-mono">{formatDatalog({ tool: "define_entity_type", arguments: input })}</pre>
            </details>
            {define.slow && <p className="text-muted-foreground text-sm">Committing on the general writer.</p>}
            {err && /AttributeTypeFixed|Reserved|UnknownType|InvalidInput|Refused/.test(err.code) ? (
              <Refused reason={err.message} />
            ) : define.error ? (
              <ErrorAlert error={define.error} hint={<div className="text-xs">Nothing was written.</div>} />
            ) : null}
          </form>
        )}
        <SheetFooter className="flex-row justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="new-type" disabled={!ready || define.isPending} data-testid="commit-release">
            {define.isPending && <Spinner />}
            Commit release
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
