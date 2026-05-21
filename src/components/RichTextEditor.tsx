import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Palette, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const COLORS = [
  { name: "Default", value: "inherit" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
];

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Only set initial / external value when it differs (avoid caret jumps).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1">
        <ToolBtn onClick={() => exec("bold")} title="Bold (Ctrl+B)">
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("italic")} title="Italic (Ctrl+I)">
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("underline")} title="Underline (Ctrl+U)">
          <Underline className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn onClick={() => exec("insertUnorderedList")} title="Bulleted list">
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("insertOrderedList")} title="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="relative group">
          <ToolBtn title="Text color">
            <Palette className="h-4 w-4" />
          </ToolBtn>
          <div className="hidden group-hover:flex group-focus-within:flex absolute z-30 top-full left-0 mt-1 p-1.5 bg-popover border rounded-md shadow-md gap-1 flex-wrap w-40">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onMouseDown={(e) => {
                  e.preventDefault();
                  exec("foreColor", c.value);
                }}
                className="h-6 w-6 rounded border hover:scale-110 transition-transform"
                style={{
                  background:
                    c.value === "inherit"
                      ? "linear-gradient(135deg, transparent 45%, currentColor 45%, currentColor 55%, transparent 55%)"
                      : c.value,
                }}
              />
            ))}
          </div>
        </div>
        <ToolBtn onClick={() => exec("removeFormat")} title="Clear formatting">
          <Eraser className="h-4 w-4" />
        </ToolBtn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder || "Write your notes…"}
        className="min-h-[180px] max-h-[420px] overflow-y-auto px-3 py-2 text-sm focus:outline-none rich-text-editor"
      />
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      className="h-7 w-7 p-0"
    >
      {children}
    </Button>
  );
}
