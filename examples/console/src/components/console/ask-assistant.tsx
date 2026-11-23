// [DX-CON1] "Ask your assistant": the sentence and the exact tool call for what is on screen, ready to copy.
import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ToolCall } from "@/hooks/use-tool";
import { formatDatalog } from "@/lib/datalog-format";
import { sentenceFor } from "@/lib/sentences";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(text).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? <CheckIcon /> : <CopyIcon />}
      {done ? "Copied" : label}
    </Button>
  );
}

export function AskAssistant({ call, sentence }: { call: ToolCall; sentence?: string }) {
  const said = sentence ?? sentenceFor(call);
  const text = formatDatalog({ tool: call.name, arguments: call.input });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Ask your assistant
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[28rem] max-w-[90vw]">
        <div className="space-y-3">
          <div>
            <div className="text-muted-foreground mb-1 text-xs font-medium">Say this</div>
            <p className="text-sm">"{said}"</p>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-xs font-medium">It calls</div>
            <div className="bg-muted max-h-56 overflow-auto rounded-md">
              <pre className="p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {text}
              </pre>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <CopyButton text={said} label="Copy sentence" />
            <CopyButton text={text} label="Copy call" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
