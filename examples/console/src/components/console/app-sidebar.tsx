// [DX-CON1] The one sidebar (DESIGN.md 8.2): which database, Home, Data (entity types, accounts), Query, Journal,
// Configuration, Ask your assistant, and About this database with the head position. Text labels, no icons.
import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import { ChevronRightIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useTool } from "@/hooks/use-tool";
import { useConnection, useTools } from "@/lib/catalogue";
import { n } from "@/lib/format";
import type { ListTypes, Summary } from "@/lib/types";
import { useNewType } from "./sheets-context";

function Item({ to, children, end }: { to: string; children: React.ReactNode; end?: boolean }) {
  const { pathname } = useLocation();
  const active = end ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <NavLink to={to}>{children}</NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function typeCreated(created: number | null | undefined) {
  return typeof created === "number" ? created : undefined;
}

export function AppSidebar() {
  const connection = useConnection();
  const tools = useTools();
  const summary = useTool<Summary>("database_summary", {}, { refetchInterval: 30_000 });
  const types = useTool<ListTypes>(
    "list_entity_types",
    {},
    { enabled: tools.has("list_entity_types") },
  );
  const { pathname } = useLocation();
  const [allAccounts, setAllAccounts] = useState(false);
  const openNewType = useNewType();
  const c = connection.data;
  const roster = c?.roster ?? [];
  const shown = allAccounts ? roster : roster.slice(0, 3);
  const records = summary.data?.recordsAtBringUp ?? c?.recordsAtBringUp;

  return (
    <Sidebar>
      <SidebarHeader className="px-4 pt-4">
        <div className="font-semibold">Triplex Console</div>
        {c ? (
          <div className="text-muted-foreground text-xs leading-relaxed">
            {c.kind === "toy" ? (
              <>Small database on this Mac, {n(records)} records</>
            ) : (
              <>{n(records)} records</>
            )}
            <br />
            {c.workingCopy ? "Working copy" : "Read only"}
          </div>
        ) : connection.isError ? (
          <div className="text-destructive text-xs">Not connected</div>
        ) : (
          <SidebarMenuSkeleton />
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <Item to="/" end>
              Home
            </Item>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen className="group/types">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={pathname === "/types"}>
                      Entity types
                      <ChevronRightIcon className="ml-auto transition-transform group-data-[state=open]/types:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {!tools.has("list_entity_types") ? (
                        <SidebarMenuSubItem>
                          <span className="text-muted-foreground px-2 py-1 text-xs">
                            Types arrive with the configuration tools.
                          </span>
                        </SidebarMenuSubItem>
                      ) : types.isPending ? (
                        <>
                          <SidebarMenuSkeleton />
                          <SidebarMenuSkeleton />
                        </>
                      ) : types.isError ? (
                        <SidebarMenuSubItem>
                          <span className="text-destructive px-2 py-1 text-xs">
                            The configuration could not be read: {(types.error as Error).message}
                          </span>
                        </SidebarMenuSubItem>
                      ) : types.data && !types.data.types.length ? (
                        <SidebarMenuSubItem>
                          <span className="text-muted-foreground px-2 py-1 text-xs">
                            No release yet. Define the first entity type.
                          </span>
                        </SidebarMenuSubItem>
                      ) : (
                        types.data?.types.map((t) => (
                          <SidebarMenuSubItem key={t.name}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === `/types/${t.name}`}
                            >
                              <NavLink to={`/types/${encodeURIComponent(t.name)}`}>
                                <span>{t.name}</span>
                                {typeCreated(t.created) !== undefined && (
                                  <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                                    {n(typeCreated(t.created))}
                                  </span>
                                )}
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))
                      )}
                      {types.slow && (
                        <span className="text-muted-foreground px-2 text-xs">
                          Reading the configuration from the refs.
                        </span>
                      )}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => openNewType()}
                          className="cursor-pointer"
                          aria-disabled={!tools.has("define_entity_type")}
                        >
                          + New entity type
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              <Collapsible defaultOpen className="group/accounts">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      Accounts
                      <ChevronRightIcon className="ml-auto transition-transform group-data-[state=open]/accounts:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {shown.map((r) => (
                        <SidebarMenuSubItem key={r.account}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname.startsWith(`/accounts/${r.account}`)}
                          >
                            <NavLink to={`/accounts/${r.account}`}>
                              <span>{r.account}</span>
                              <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                                {n(r.people)}
                              </span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      {roster.length > 3 && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            className="text-muted-foreground cursor-pointer"
                            onClick={() => setAllAccounts((v) => !v)}
                          >
                            {allAccounts ? "Fewer" : `... ${roster.length - 3} more`}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarMenu>
            <Item to="/query">Query</Item>
            <Item to="/journal">Journal</Item>
            <Item to="/configuration">Configuration</Item>
            <Item to="/assistant">Ask your assistant</Item>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/about"}>
              <NavLink to="/about">About this database</NavLink>
            </SidebarMenuButton>
            {summary.data && (
              <SidebarMenuBadge className="tabular-nums">
                Head {n(summary.data.head)}
              </SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
