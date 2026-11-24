// [DX-CON1] The toast after every commit: position, record time, command ID, actor, the store's time and the read back.
import { toast } from "sonner";
import { ms, n, time } from "./format";
import { rememberCommit } from "./session";
import type { Answer } from "./api";
import type { Receipt } from "./types";

export function receiptToast(
  answer: Answer<{ receipt?: Receipt; readbackMatches?: boolean; position: number }>,
  what: string,
  open?: () => void,
) {
  const r = answer.receipt;
  const position = r?.position ?? answer.position;
  rememberCommit(position);
  toast.success(`${what} at position ${n(position)}`, {
    description: (
      <div className="space-y-0.5 text-xs">
        {r?.recordedAt && <div>Recorded {time(r.recordedAt)}</div>}
        {r?.commandId && <div className="font-mono break-all">{r.commandId}</div>}
        <div>
          Store {ms(answer.timing?.serverMs)}, round trip {ms(answer.timing?.roundTripMs)}
        </div>
        {answer.readbackMatches !== undefined && (
          <div>
            {answer.readbackMatches
              ? `Read back at position ${n(position)} matches.`
              : `Read back at position ${n(position)} does not match.`}
          </div>
        )}
      </div>
    ),
    action: open ? { label: "Journal", onClick: open } : undefined,
    duration: 8000,
  });
}
