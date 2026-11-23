// [DX-CON1] The basis control in the header (DESIGN.md 8.2, 7.1): Recorded (latest, at position, at record time) and
// Valid (now, on date), set independently, with three presets and the LATEST / HISTORICAL badge Triplex's dashboard uses.
import { useEffect, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  isLatest,
  LATEST,
  recordedWords,
  useBasis,
  validWords,
  type BasisState,
} from "@/lib/basis";
import { useConnection } from "@/lib/catalogue";
import { n, time } from "@/lib/format";
import { beforeLastChange } from "@/lib/session";

export function BasisBadge({ basis }: { basis: BasisState }) {
  return isLatest(basis) ? (
    <Badge variant="secondary" data-testid="basis-badge">
      LATEST
    </Badge>
  ) : (
    <Badge variant="default" data-testid="basis-badge">
      HISTORICAL
    </Badge>
  );
}

export function BasisControl({ current = false }: { current?: boolean }) {
  const { basis, setBasis } = useBasis();
  const connection = useConnection().data;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BasisState>(basis);
  const [position, setPosition] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const [validOn, setValidOn] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(basis);
    setPosition(basis.recorded.mode === "position" ? String(basis.recorded.position) : "");
    setRecordedAt(basis.recorded.mode === "recordedAt" ? basis.recorded.at.slice(0, 16) : "");
    setValidOn(basis.valid.mode === "date" ? basis.valid.date.slice(0, 10) : "");
  }, [open, basis]);

  if (current)
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Badge variant="secondary">LATEST</Badge> This screen always reads the current journal and
        configuration.
      </div>
    );

  const sealed = connection?.sealed?.head;
  const seed = (connection?.["clocks"] as { seedHead?: number } | undefined)?.seedHead;
  const before = beforeLastChange();
  const range = connection?.recordTimeRange;
  const pick = (p: number) => {
    setPosition(String(p));
    setDraft((d) => ({ ...d, recorded: { mode: "position", position: p } }));
  };
  const apply = () => {
    const next: BasisState = {
      recorded:
        draft.recorded.mode === "position" && /^\d+$/.test(position)
          ? { mode: "position", position: Number(position) }
          : draft.recorded.mode === "recordedAt" && recordedAt
            ? { mode: "recordedAt", at: new Date(recordedAt + "Z").toISOString() }
            : { mode: "latest" },
      valid:
        draft.valid.mode === "date" && validOn ? { mode: "date", date: validOn } : { mode: "now" },
    };
    setBasis(next);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs">Basis</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5" data-testid="basis-control">
            <span className="border-input hover:bg-accent inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs tabular-nums">
              {recordedWords(basis)} <ChevronDownIcon className="size-3" />
            </span>
            <span className="border-input hover:bg-accent inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs tabular-nums">
              {validWords(basis)} <ChevronDownIcon className="size-3" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[26rem] max-w-[95vw]">
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium">Recorded: what the store knew</div>
              <RadioGroup
                value={draft.recorded.mode}
                onValueChange={(m) =>
                  setDraft((d) => ({
                    ...d,
                    recorded:
                      m === "position"
                        ? { mode: "position", position: Number(position || sealed || 0) }
                        : m === "recordedAt"
                          ? { mode: "recordedAt", at: recordedAt || "" }
                          : { mode: "latest" },
                  }))
                }
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="latest" id="r-latest" />
                  <Label htmlFor="r-latest">Latest</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="position" id="r-position" />
                  <Label htmlFor="r-position" className="w-28">
                    At position
                  </Label>
                  <Input
                    className="h-7 w-36 tabular-nums"
                    data-testid="basis-position"
                    inputMode="numeric"
                    value={position}
                    placeholder={sealed ? String(sealed) : "position"}
                    onChange={(e) => {
                      setPosition(e.target.value.replace(/[^\d]/g, ""));
                      setDraft((d) => ({
                        ...d,
                        recorded: {
                          mode: "position",
                          position: Number(e.target.value.replace(/[^\d]/g, "")),
                        },
                      }));
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {sealed !== undefined && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-6 text-xs"
                      onClick={() => pick(sealed)}
                    >
                      Sealed head {n(sealed)}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-6 text-xs"
                    disabled={before === null}
                    onClick={() => before !== null && pick(before)}
                  >
                    Before my last change{before !== null ? ` ${n(before)}` : ""}
                  </Button>
                  {seed !== undefined && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-6 text-xs"
                      onClick={() => pick(seed)}
                    >
                      Seed {n(seed)}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="recordedAt" id="r-at" />
                  <Label htmlFor="r-at" className="w-28">
                    At record time
                  </Label>
                  <Input
                    type="datetime-local"
                    className="h-7 w-52"
                    value={recordedAt}
                    onChange={(e) => {
                      setRecordedAt(e.target.value);
                      setDraft((d) => ({
                        ...d,
                        recorded: { mode: "recordedAt", at: e.target.value },
                      }));
                    }}
                  />
                </div>
                {range?.first && (
                  <p className="text-muted-foreground pl-6 text-xs">
                    Record time (UTC) runs from {time(range.first, false)} to{" "}
                    {time(range.lastAtBringUp, false)} and later saves. This database's record time
                    runs about a year ahead of wall time.
                  </p>
                )}
              </RadioGroup>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="font-medium">Valid: what was true</div>
              <RadioGroup
                value={draft.valid.mode}
                onValueChange={(m) =>
                  setDraft((d) => ({
                    ...d,
                    valid: m === "date" ? { mode: "date", date: validOn } : { mode: "now" },
                  }))
                }
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="now" id="v-now" />
                  <Label htmlFor="v-now">Now</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="date" id="v-date" />
                  <Label htmlFor="v-date" className="w-28">
                    On date
                  </Label>
                  <Input
                    type="date"
                    className="h-7 w-40"
                    value={validOn}
                    onChange={(e) => {
                      setValidOn(e.target.value);
                      setDraft((d) => ({ ...d, valid: { mode: "date", date: e.target.value } }));
                    }}
                  />
                </div>
              </RadioGroup>
            </div>
            {connection?.pinnedReads && (
              <p className="text-muted-foreground text-xs">
                Pinned-read options on the server:{" "}
                {connection.pinnedReads.shortcut && connection.pinnedReads.cutLookup ? "on" : "off"}
              </p>
            )}
            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBasis(LATEST);
                  setOpen(false);
                }}
              >
                Back to latest
              </Button>
              <Button size="sm" onClick={apply}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <BasisBadge basis={basis} />
    </div>
  );
}
