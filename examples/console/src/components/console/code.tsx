// [DX-CON1] CodeMirror 6 with its JSON language: the query editor and every read-only JSON view (DESIGN.md 8.9). The
// one component that is not shadcn, chosen because colour and bracket matching make a nested where readable.
import { useEffect, useRef } from "react";
import { json as jsonLanguage } from "@codemirror/lang-json";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { cn } from "@/lib/utils";

const theme = EditorView.theme({
  "&": { fontSize: "12.5px", backgroundColor: "transparent", color: "var(--foreground)" },
  ".cm-content": { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)", caretColor: "var(--foreground)" },
  ".cm-gutters": { backgroundColor: "transparent", color: "var(--muted-foreground)", border: "none" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "color-mix(in oklch, var(--muted) 60%, transparent)" },
  "&.cm-focused": { outline: "none" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklch, var(--ring) 35%, transparent) !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--foreground)" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in oklch, var(--ring) 30%, transparent)", outline: "none" },
  ".cm-tooltip": { backgroundColor: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)" },
});
// Token colours that read in light and dark.
const tokens = EditorView.baseTheme({
  ".tok-string": { color: "oklch(0.55 0.14 150)" },
  ".tok-number": { color: "oklch(0.6 0.15 50)" },
  ".tok-propertyName": { color: "oklch(0.55 0.15 255)" },
  ".tok-bool, .tok-null": { color: "oklch(0.55 0.18 320)" },
});

export function CodeEditor({
  value,
  onChange,
  onRun,
  readOnly = false,
  className,
  minHeight = "8rem",
}: {
  value: string;
  onChange?: (v: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
  className?: string;
  minHeight?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const handlers = useRef({ onChange, onRun });
  handlers.current = { onChange, onRun };

  useEffect(() => {
    const extensions: Extension[] = [
      basicSetup,
      jsonLanguage(),
      theme,
      tokens,
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
      EditorView.theme({ ".cm-scroller": { minHeight } }),
      keymap.of([{ key: "Mod-Enter", run: () => (handlers.current.onRun?.(), true) }]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) handlers.current.onChange?.(u.state.doc.toString());
      }),
    ];
    view.current = new EditorView({ parent: host.current!, state: EditorState.create({ doc: value, extensions }) });
    return () => view.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, minHeight]);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={host} className={cn("overflow-hidden rounded-md border", className)} data-testid="code" />;
}

export function JsonView({ value, className }: { value: unknown; className?: string }) {
  const text = JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
  return <CodeEditor value={text} readOnly className={className} minHeight="2rem" />;
}
