// [DX-CON1] The shell: sidebar, header (breadcrumb, basis control, search) and the screen.
import { useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useParams } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BasisProvider } from "@/lib/basis";
import { shortId } from "@/lib/format";
import { AppSidebar } from "./app-sidebar";
import { BasisControl } from "./basis-control";
import { CommandPalette } from "./command-palette";
import { GlobalSheets } from "./global-sheets";
import { SheetsProvider } from "./sheets-context";

type Crumb = { label: string; to?: string };

function useCrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const p = useParams();
  if (pathname === "/") return [{ label: "Home" }];
  if (pathname.startsWith("/accounts/")) {
    const c: Crumb[] = [{ label: "Data" }, { label: "Accounts" }, { label: p["account"] ?? "", to: `/accounts/${p["account"]}` }];
    if (p["n"] !== undefined) c.push({ label: `Subject ${p["n"]}` });
    return c;
  }
  if (pathname.startsWith("/entities/")) return [{ label: "Data" }, { label: "Entity" }, { label: shortId(decodeURIComponent(p["entityId"] ?? "")) }];
  if (pathname.startsWith("/types")) return [{ label: "Data" }, { label: "Entity types" }, ...(p["name"] ? [{ label: p["name"] }] : [])];
  const screens: Record<string, string> = {
    "/query": "Query",
    "/journal": "Journal",
    "/configuration": "Configuration",
    "/assistant": "Ask your assistant",
    "/about": "About this database",
  };
  return [{ label: screens[pathname] ?? "Not found" }];
}

function Header({ onSearch }: { onSearch: () => void }) {
  const crumbs = useCrumbs();
  const { pathname } = useLocation();
  const current = pathname === "/journal" || pathname === "/configuration";
  const showBasis = !["/assistant", "/about", "/"].includes(pathname);
  return (
    <header className="bg-background sticky top-0 z-10 border-b">
      <div className="flex h-12 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((c, i) => (
              <span key={i} className="contents">
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {i === crumbs.length - 1 ? (
                    <BreadcrumbPage className="font-mono text-xs sm:font-sans sm:text-sm">{c.label}</BreadcrumbPage>
                  ) : c.to ? (
                    <BreadcrumbLink asChild>
                      <Link to={c.to}>{c.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="outline" size="sm" className="text-muted-foreground ml-auto w-44 justify-between" onClick={onSearch} data-testid="search">
          Search <Kbd>⌘K</Kbd>
        </Button>
      </div>
      {showBasis && (
        <div className="flex h-10 items-center border-t px-4">
          <BasisControl current={current} />
        </div>
      )}
    </header>
  );
}

export function Shell() {
  const [palette, setPalette] = useState(false);
  return (
    <BasisProvider>
      <SheetsProvider>
        <TooltipProvider delayDuration={300}>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-w-0">
              <Header onSearch={() => setPalette(true)} />
              <div id="screen" className="min-w-0 flex-1 p-4 md:p-6">
                <Outlet />
              </div>
            </SidebarInset>
            <CommandPalette open={palette} onOpenChange={setPalette} />
            <GlobalSheets />
            <Toaster position="top-center" closeButton />
          </SidebarProvider>
        </TooltipProvider>
      </SheetsProvider>
    </BasisProvider>
  );
}

export function PageTitle({ title, children, actions }: { title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {children && <div className="text-muted-foreground mt-1 text-sm">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
