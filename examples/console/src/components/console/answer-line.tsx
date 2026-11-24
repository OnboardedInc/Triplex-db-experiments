// [DX-CON1] The answer line above every result: position, both axes of the basis, the store's own time, the round trip
// and the number of requests, all from the tool's answer (DESIGN.md 7.3). Nothing here is measured by the browser.
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Envelope } from "@/lib/api";
import { ms, n } from "@/lib/format";
import type { ToolCall } from "@/hooks/use-tool";
import { AskAssistant } from "./ask-assistant";

function Part({ children, tip }: { children: ReactNode; tip?: string }) {
  const badge = (
    <Badge variant="outline" className="font-normal tabular-nums">
      {children}
    </Badge>
  );
  if (!tip) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{tip}</TooltipContent>
    </Tooltip>
  );
}

export function AnswerLine({
  answer,
  call,
  recorded,
  valid,
  extra,
  label = "Position",
  sentence,
}: {
  answer: Envelope | undefined;
  call?: ToolCall;
  recorded?: string;
  valid?: string;
  extra?: ReactNode;
  label?: string;
  sentence?: string;
}) {
  if (!answer) return null;
  const t = answer.timing;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs" data-testid="answer-line">
      <Part tip="The exact commit position this answer was read or written at.">
        {label} {n(answer.position)}
      </Part>
      {recorded && <Part>{recorded}</Part>}
      {valid && <Part>{valid}</Part>}
      <Part tip="The gateways' own handling time, summed over the requests this answer needed (x-tx2-gateway-micros).">
        Store {ms(t?.serverMs)}
      </Part>
      {t?.consoleMs !== undefined && (
        <Part tip="Time the console's local functions spent evaluating, separate from the store.">
          Console {ms(t.consoleMs)}
        </Part>
      )}
      <Part tip="Wall time on the machine running the console server, the tunnel to the database included. Diagnostic on the Mac.">
        Round trip {ms(t?.roundTripMs)}
      </Part>
      <Part tip={t?.calls?.map((c) => `${c.route} ${c.status} ${ms(c.serverMs)}`).join("\n")}>
        {t?.requests ?? 0} {t?.requests === 1 ? "request" : "requests"}
      </Part>
      {extra}
      {call && (
        <div className="ml-auto">
          <AskAssistant call={call} sentence={sentence} />
        </div>
      )}
    </div>
  );
}
