// [DX-CON1] The command palette (Cmd K, DESIGN.md 8.2): go to a subject ("account-003 5"), an entity ID, a type or a
// saved question; open New entity type; set the basis to a preset; copy the command that registers the MCP server.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useTool } from "@/hooks/use-tool";
import { LATEST, useBasis } from "@/lib/basis";
import { REGISTER_COMMAND, useConnection, useTools } from "@/lib/catalogue";
import { n } from "@/lib/format";
import { beforeLastChange, loadLocal } from "@/lib/session";
import type { ListTypes } from "@/lib/types";
import { useSheets } from "./sheets-context";

export const SAVED_KEY = "triplex-console:saved-questions";
export type SavedQuestion = { name: string; query: string; source: unknown; note?: string };

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const connection = useConnection().data;
  const tools = useTools();
  const types = useTool<ListTypes>("list_entity_types", {}, { enabled: tools.has("list_entity_types") && open });
  const { basis, setBasis } = useBasis();
  const sheets = useSheets();
  const saved = open ? loadLocal<SavedQuestion[]>(SAVED_KEY, []) : [];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    setSearch("");
    navigate(to);
  };
  const roster = connection?.roster ?? [];
  // "account-003 5", "3 5", "account-003/5"
  const m = /^\s*(?:account-)?(\d{1,3})[\s/:]+(\d+)\s*$/.exec(search);
  const subjectTarget = m ? roster.find((r) => r.account === `account-${m[1]!.padStart(3, "0")}`) : undefined;
  const entityTarget = /^acct\/|^_triplex\/|^[a-z][\w-]*\/[\w:./-]+$/.test(search.trim()) ? search.trim() : undefined;
  const sealed = connection?.sealed?.head;
  const seed = (connection?.["clocks"] as { seedHead?: number } | undefined)?.seedHead;
  const before = beforeLastChange();
  const setRecorded = (p: number) => {
    setBasis({ ...basis, recorded: { mode: "position", position: p } });
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Go to a subject, an entity, a type or a screen">
      <Command>
      <CommandInput placeholder='Type "account-003 5", an entity ID, a type or a screen' value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>Nothing matches. Try "account-003 5" or an entity ID.</CommandEmpty>
        {subjectTarget && m && (
          <CommandGroup heading="Subject">
            <CommandItem value={`subject ${search}`} onSelect={() => go(`/accounts/${subjectTarget.account}/subjects/${Number(m[2])}`)}>
              Subject {Number(m[2])} of {subjectTarget.account}
            </CommandItem>
          </CommandGroup>
        )}
        {entityTarget && (
          <CommandGroup heading="Entity">
            <CommandItem value={`entity ${entityTarget}`} onSelect={() => go(`/entities/${encodeURIComponent(entityTarget)}`)}>
              <span className="font-mono text-xs">{entityTarget}</span>
            </CommandItem>
          </CommandGroup>
        )}
        <CommandGroup heading="Screens">
          {[
            ["Home", "/"],
            ["Query", "/query"],
            ["Journal", "/journal"],
            ["Configuration", "/configuration"],
            ["Ask your assistant", "/assistant"],
            ["About this database", "/about"],
          ].map(([label, to]) => (
            <CommandItem key={to} value={`screen ${label}`} onSelect={() => go(to!)}>
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        {!!types.data?.types.length && (
          <CommandGroup heading="Entity types">
            {types.data.types.map((t) => (
              <CommandItem key={t.name} value={`type ${t.name}`} onSelect={() => go(`/types/${encodeURIComponent(t.name)}`)}>
                {t.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Accounts">
          {roster.map((r) => (
            <CommandItem key={r.account} value={`account ${r.account}`} onSelect={() => go(`/accounts/${r.account}`)}>
              {r.account}
              <CommandShortcut>{n(r.people)} subjects</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        {!!saved.length && (
          <CommandGroup heading="Saved questions">
            {saved.map((q, i) => (
              <CommandItem key={i} value={`saved ${q.name}`} onSelect={() => go(`/query?saved=${i}`)}>
                {q.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="new entity type"
            onSelect={() => {
              onOpenChange(false);
              sheets.openNewType();
            }}
          >
            New entity type
          </CommandItem>
          <CommandItem value="basis latest" onSelect={() => (setBasis(LATEST), onOpenChange(false))}>
            Basis: back to latest
          </CommandItem>
          {sealed !== undefined && (
            <CommandItem value="basis sealed head" onSelect={() => setRecorded(sealed)}>
              Basis: sealed head {n(sealed)}
            </CommandItem>
          )}
          {before !== null && (
            <CommandItem value="basis before my last change" onSelect={() => setRecorded(before)}>
              Basis: before my last change {n(before)}
            </CommandItem>
          )}
          {seed !== undefined && (
            <CommandItem value="basis seed" onSelect={() => setRecorded(seed)}>
              Basis: seed {n(seed)}
            </CommandItem>
          )}
          <CommandItem
            value="copy register mcp command"
            onSelect={() => {
              void navigator.clipboard?.writeText(REGISTER_COMMAND).catch(() => {});
              onOpenChange(false);
            }}
          >
            Copy the command that registers the MCP server
          </CommandItem>
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
