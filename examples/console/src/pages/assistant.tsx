// [DX-CON1] Ask your assistant (DESIGN.md 6, 8.12): drawn from the tool catalogue itself, so it cannot list a tool that
// does not exist or miss one that does. Each row opens to its inputs, a Try it here form generated from the tool's input
// schema, and the recorded example when the catalogue carries one.
import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnswerLine } from "@/components/console/answer-line";
import { CopyButton } from "@/components/console/ask-assistant";
import { CodeEditor, JsonView } from "@/components/console/code";
import { PageTitle } from "@/components/console/layout";
import { ErrorAlert, Refused } from "@/components/console/states";
import { callTool, ToolError, type Answer, type CatalogueTool, type JsonSchema } from "@/lib/api";
import { REGISTER_COMMAND, useCatalogue } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

/** The kind of control a schema property gets in Try it here. */
function controlOf(s: JsonSchema): "text" | "number" | "boolean" | "enum" | "list" | "json" {
  if (s.enum) return "enum";
  if (
    s.anyOf?.every((x) => x.type === "string" || x.type === "integer" || x.type === "number") &&
    !s.anyOf.some((x) => x.const !== undefined)
  )
    return "text";
  const t = Array.isArray(s.type) ? s.type : [s.type];
  if (t.includes("boolean")) return "boolean";
  if (t.includes("integer") || t.includes("number"))
    return t.includes("string") ? "text" : "number";
  if (
    t.includes("array") &&
    s.items &&
    (s.items.type === "integer" || s.items.type === "number" || s.items.type === "string")
  )
    return "list";
  if (t.includes("string")) return "text";
  return "json";
}

function typeWords(s: JsonSchema): string {
  if (s.enum) return s.enum.map(String).join(" | ");
  if (s.anyOf)
    return s.anyOf
      .map((x) => (x.const !== undefined ? JSON.stringify(x.const) : typeWords(x)))
      .join(" or ");
  const t = Array.isArray(s.type) ? s.type.join(" or ") : (s.type ?? "value");
  if (t === "array" && s.items) return `${typeWords(s.items)}[]`;
  if (t === "object" && s.properties) return `{ ${Object.keys(s.properties).join(", ")} }`;
  return t;
}

/** Safe starting values for Try it here: changes go to account-010, the console's own account on the toy. */
function initialValue(key: string, s: JsonSchema): unknown {
  if (s.default !== undefined) return s.default;
  if (key === "account") return "account-010";
  if (key === "subject") return 0;
  if (key === "attribute") return ":task/field-0";
  if (key === "at") return new Date().toISOString().slice(0, 10);
  return undefined;
}

function TryIt({
  tool,
  open,
  onOpenChange,
}: {
  tool: CatalogueTool;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const props = tool.inputSchema.properties ?? {};
  const required = new Set(tool.inputSchema.required ?? []);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (!open) return;
    const v: Record<string, unknown> = {};
    const t: Record<string, string> = {};
    for (const [k, s] of Object.entries(props)) {
      const init = initialValue(k, s);
      v[k] = init;
      const c = controlOf(s);
      t[k] =
        init === undefined
          ? ""
          : c === "json"
            ? JSON.stringify(init, null, 2)
            : c === "list"
              ? (init as unknown[]).join(", ")
              : String(init);
    }
    setValues(v);
    setTexts(t);
    setAnswer(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tool.name]);

  const build = () => {
    const out: Record<string, unknown> = {};
    for (const [k, s] of Object.entries(props)) {
      const c = controlOf(s);
      const t = texts[k] ?? "";
      if (c === "boolean") {
        if (values[k] !== undefined) out[k] = values[k];
        continue;
      }
      if (!t.trim()) continue;
      if (c === "number") out[k] = Number(t);
      else if (c === "list") {
        const parts = t
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        out[k] = s.items?.type === "string" ? parts : parts.map(Number);
      } else if (c === "json") out[k] = JSON.parse(t);
      else if (
        c === "text" &&
        s.anyOf?.some((x) => x.type === "integer") &&
        /^\d+$/.test(t) &&
        !s.anyOf?.some((x) => x.type === "string")
      )
        out[k] = Number(t);
      else out[k] = t;
    }
    return out;
  };
  let input: Record<string, unknown> | null = null;
  let parseError: string | null = null;
  try {
    input = build();
  } catch (e) {
    parseError = (e as Error).message;
  }
  const run = async () => {
    if (!input) return;
    setRunning(true);
    setError(null);
    setAnswer(null);
    try {
      setAnswer(await callTool(tool.name, input));
    } catch (e) {
      setError(e);
    } finally {
      setRunning(false);
    }
  };
  const refusal = error instanceof ToolError && error.refused ? error : null;
  const answerRefusal =
    answer && (answer as { done?: boolean; reason?: string }).done === false
      ? (answer as { reason?: string }).reason
      : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Try it here: <span className="font-mono">{tool.name}</span>
          </DialogTitle>
          <DialogDescription>
            {tool.title}. The form is generated from the tool's input schema; it runs through the
            same local functions as the assistant.
          </DialogDescription>
        </DialogHeader>
        {tool.changes && (
          <Refused
            title="This changes data"
            reason="It commits a real change on the working copy, with actor console. It appears in the Journal."
          />
        )}
        <FieldGroup>
          {Object.entries(props).map(([k, s]) => {
            const c = controlOf(s);
            return (
              <Field key={k}>
                <FieldLabel className="font-mono text-xs">
                  {k}
                  {required.has(k) && " *"}
                  <span className="text-muted-foreground ml-2 font-sans font-normal">
                    {typeWords(s)}
                  </span>
                </FieldLabel>
                {c === "boolean" ? (
                  <Switch
                    checked={values[k] === true}
                    onCheckedChange={(v) => setValues((x) => ({ ...x, [k]: v }))}
                  />
                ) : c === "enum" ? (
                  <Select
                    value={texts[k] ?? ""}
                    onValueChange={(v) => setTexts((x) => ({ ...x, [k]: v }))}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      {s.enum!.map((e) => (
                        <SelectItem key={String(e)} value={String(e)}>
                          {String(e)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : c === "json" ? (
                  <CodeEditor
                    value={texts[k] ?? ""}
                    onChange={(v) => setTexts((x) => ({ ...x, [k]: v }))}
                    minHeight="4rem"
                  />
                ) : (
                  <Input
                    value={texts[k] ?? ""}
                    onChange={(e) => setTexts((x) => ({ ...x, [k]: e.target.value }))}
                    className={cn(c === "number" && "w-40 tabular-nums", "font-mono text-xs")}
                    placeholder={c === "list" ? "comma separated" : ""}
                  />
                )}
                {s.description && (
                  <FieldDescription className="text-xs">{s.description}</FieldDescription>
                )}
              </Field>
            );
          })}
          {Object.keys(props).length === 0 && (
            <p className="text-muted-foreground text-sm">This tool takes no input.</p>
          )}
        </FieldGroup>
        {parseError && (
          <p className="text-destructive text-xs">An input is not JSON: {parseError}</p>
        )}
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-muted-foreground font-mono text-xs break-all">
            {input ? JSON.stringify(input) : ""}
          </span>
          <Button onClick={run} disabled={running || !input} data-testid="try-run">
            {running && <Spinner />}
            Run
          </Button>
        </DialogFooter>
        {refusal ? (
          <Refused reason={refusal.message} />
        ) : error ? (
          <ErrorAlert error={error} />
        ) : answer ? (
          <div className="space-y-2" data-testid="try-answer">
            {answerRefusal && <Refused reason={answerRefusal} />}
            <AnswerLine answer={answer} />
            <JsonView value={answer} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ToolRow({
  tool,
  open,
  onToggle,
  onTry,
}: {
  tool: CatalogueTool;
  open: boolean;
  onToggle: () => void;
  onTry: () => void;
}) {
  const props = tool.inputSchema.properties ?? {};
  const required = new Set(tool.inputSchema.required ?? []);
  return (
    <>
      <TableRow
        id={tool.name}
        className="cursor-pointer"
        onClick={onToggle}
        data-state={open ? "selected" : undefined}
      >
        <TableCell className="w-8 align-top">
          {open ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
        </TableCell>
        <TableCell className="align-top whitespace-normal">"{tool.sentences[0]}"</TableCell>
        <TableCell className="align-top font-mono text-xs">{tool.name}</TableCell>
        <TableCell className="align-top">
          {tool.changes ? (
            <Badge>Changes data</Badge>
          ) : (
            <Badge variant="secondary">Reads only</Badge>
          )}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="hover:bg-transparent">
          <TableCell />
          <TableCell colSpan={3} className="bg-muted/30 whitespace-normal">
            <div className="space-y-3 py-2 text-sm">
              {tool.sentences.length > 1 && (
                <div>
                  <div className="text-muted-foreground text-xs">Also say</div>
                  {tool.sentences.slice(1).map((s) => (
                    <div key={s}>"{s}"</div>
                  ))}
                </div>
              )}
              <div>
                <div className="text-muted-foreground text-xs">What it does</div>
                <p>{tool.description}</p>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Inputs</div>
                {Object.keys(props).length ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {Object.entries(props).map(([k, s]) => (
                      <span key={k} className="font-mono text-xs">
                        {k}
                        {required.has(k) ? "" : "?"}:{" "}
                        <span className="text-muted-foreground">{typeWords(s)}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">none</span>
                )}
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Returns</div>
                <p className="text-xs">
                  The answer above, with position, timing (serverMs, roundTripMs, requests, calls),
                  database and consoleUrl.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTry();
                  }}
                  data-testid={`try-${tool.name}`}
                >
                  Try it here
                </Button>
                <CopyButton text={tool.sentences[0] ?? tool.name} label="Copy sentence" />
              </div>
              {tool.example ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">Recorded</Badge>
                    {tool.example.database} {tool.example.date} {tool.example.source}
                  </div>
                  <JsonView value={tool.example.output ?? tool.example} />
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  No recorded example in the catalogue yet; the proving slot records one per tool.
                </p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function AssistantPage() {
  const catalogue = useCatalogue();
  const { hash } = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [trying, setTrying] = useState<CatalogueTool | null>(null);
  useEffect(() => {
    const name = hash.replace(/^#/, "");
    if (name && catalogue.data) {
      setOpen((o) => ({ ...o, [name]: true }));
      setTimeout(() => document.getElementById(name)?.scrollIntoView({ block: "center" }), 50);
    }
  }, [hash, catalogue.data]);
  const groups = useMemo(() => {
    const c = catalogue.data;
    if (!c) return [];
    const order = [
      ...c.groups,
      ...new Set(c.tools.map((t) => t.group).filter((g) => !c.groups.includes(g))),
    ];
    return order
      .map((g) => ({ group: g, tools: c.tools.filter((t) => t.group === g) }))
      .filter((g) => g.tools.length);
  }, [catalogue.data]);
  const total = catalogue.data?.tools.length ?? 0;
  const changing = catalogue.data?.tools.filter((t) => t.changes).length ?? 0;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageTitle
        title="Ask your assistant"
        actions={
          <CopyButton
            text={catalogue.data?.register ?? REGISTER_COMMAND}
            label="Copy the command that registers it"
          />
        }
      >
        The MCP server <span className="font-mono">{catalogue.data?.server ?? "triplex-demo"}</span>{" "}
        gives an assistant the same {total || ""} functions this console uses. Changes are real
        commits on the working copy; they appear in the Journal with actor "assistant".{" "}
        {changing ? `${changing} of ${total} change data.` : ""}
      </PageTitle>
      <p className="text-muted-foreground text-xs">
        Register it from the repository root:{" "}
        <span className="font-mono">{catalogue.data?.register ?? REGISTER_COMMAND}</span>
      </p>
      {catalogue.isError ? (
        <ErrorAlert error={catalogue.error} onRetry={() => catalogue.refetch()} />
      ) : catalogue.isPending ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Say this</TableHead>
                <TableHead>It calls</TableHead>
                <TableHead>Changes data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <Fragment key={g.group}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground py-1.5 text-xs font-semibold tracking-wide uppercase"
                    >
                      {g.group}
                    </TableCell>
                  </TableRow>
                  {g.tools.map((t) => (
                    <ToolRow
                      key={t.name}
                      tool={t}
                      open={Boolean(open[t.name])}
                      onToggle={() => setOpen((o) => ({ ...o, [t.name]: !o[t.name] }))}
                      onTry={() => setTrying(t)}
                    />
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {trying && (
        <TryIt tool={trying} open={Boolean(trying)} onOpenChange={(o) => !o && setTrying(null)} />
      )}
    </div>
  );
}
