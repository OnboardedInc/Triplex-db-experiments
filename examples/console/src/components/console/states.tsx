// [DX-CON1] The five states every screen has (DESIGN.md 8.14). A refusal and an error look different: a refusal is a
// neutral alert titled "Refused" with the reason; an error is the destructive alert with the code and message unchanged.
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToolError } from "@/lib/api";

export function Refused({
  reason,
  title = "Refused",
  children,
}: {
  reason: ReactNode;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <Alert data-testid="refused">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <div>{typeof reason === "string" ? reason.replace(/^Refused[.:]\s*/, "") : reason}</div>
          {children}
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function ErrorAlert({
  error,
  onRetry,
  hint,
}: {
  error: unknown;
  onRetry?: () => void;
  hint?: ReactNode;
}) {
  const e = error instanceof ToolError ? error : null;
  if (e?.refused)
    return <Refused reason={e.message}>{onRetry && <RetryButton onRetry={onRetry} />}</Refused>;
  return (
    <Alert variant="destructive" data-testid="error">
      <AlertTitle>{e ? e.code : "Error"}</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <div className="break-words">
            {error instanceof Error ? error.message : String(error)}
          </div>
          {e && (
            <div className="text-xs opacity-80">
              from {e.tool}
              {e.status ? `, HTTP ${e.status}` : ""}
            </div>
          )}
          {typeof e?.detail?.["hint"] === "string" && (
            <div className="text-xs">{e.detail["hint"] as string}</div>
          )}
          {hint}
          {onRetry && <RetryButton onRetry={onRetry} />}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onRetry}>
      Retry
    </Button>
  );
}

/** Shown once a call has run over one second, with the reason when one is known. */
export function Slow({
  show,
  elapsed,
  children,
}: {
  show: boolean;
  elapsed?: number;
  children?: ReactNode;
}) {
  if (!show) return null;
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm" data-testid="slow">
      <Spinner />
      <span>
        {children ?? "Still reading."}
        {elapsed !== undefined && (
          <span className="ml-1 tabular-nums">{(elapsed / 1000).toFixed(1)} s</span>
        )}
      </span>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2" data-testid="loading">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Empty className="border" data-testid="empty">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

/** A tool this screen needs is not in the catalogue yet: say so, never fake it. */
export function NotInCatalogue({ tool, what }: { tool: string; what: string }) {
  return (
    <EmptyState
      title={`${what} is not available yet`}
      description={
        <>
          The server's catalogue has no <code className="font-mono">{tool}</code> tool yet. This
          screen calls it as soon as the server offers it.
        </>
      }
    />
  );
}

export function RecordedBadgeText({ date, source }: { date?: string; source?: string }) {
  return (
    <span className="text-muted-foreground text-xs">
      Recorded{date ? ` ${date}` : ""}
      {source ? `, ${source}` : ""}
    </span>
  );
}

/**
 * Record time is the database's own clock, not the Mac's. The bulk import that built this database ran that clock about a
 * year ahead of wall time, and the store never moves it backwards, so new commits are stamped just after its last time.
 */
export function RecordClockNote({ first, last }: { first?: string | null; last?: string | null }) {
  return (
    <p className="text-muted-foreground text-xs" data-testid="record-clock-note">
      Record time is the database's own clock, in UTC, not this computer's. The bulk import that
      built this database ran it about a year ahead of wall time
      {first && last ? ` (${first.slice(0, 10)} to ${last.slice(0, 10)})` : ""}, and the store never
      moves it backwards, so new commits are stamped just after its last time. It is not a fault.
    </p>
  );
}
