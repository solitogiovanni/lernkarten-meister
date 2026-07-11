import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Palette,
  Highlighter,
  Eraser,
  IndentIncrease,
  IndentDecrease,
  AArrowUp,
  AArrowDown,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FONT_FAMILIES = [
  { name: "Default", value: "" },
  { name: "Sans", value: "ui-sans-serif, system-ui, sans-serif" },
  { name: "Serif", value: "ui-serif, Georgia, serif" },
  { name: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { name: "Inter", value: "Inter, sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Times", value: "'Times New Roman', Times, serif" },
  { name: "Arial", value: "Arial, Helvetica, sans-serif" },
  { name: "Courier", value: "'Courier New', Courier, monospace" },
  { name: "Verdana", value: "Verdana, Geneva, sans-serif" },
];

// Font size steps in px, mapped to execCommand fontSize 1-7
const FONT_SIZES = [10, 12, 14, 16, 18, 24, 32];

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

const HIGHLIGHTS = [
  { name: "None", value: "transparent" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Lime", value: "#d9f99d" },
  { name: "Cyan", value: "#a5f3fc" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Orange", value: "#fed7aa" },
  { name: "Violet", value: "#ddd6fe" },
  { name: "Gray", value: "#e5e7eb" },
];

// Bullet / dash variants for <ul>
const UL_STYLES = [
  { name: "Disc •", value: "disc" },
  { name: "Circle ◦", value: "circle" },
  { name: "Square ▪", value: "square" },
  { name: "Dash –", value: "'–  '" },
  { name: "Em-dash —", value: "'—  '" },
  { name: "Arrow →", value: "'→  '" },
  { name: "Check ✓", value: "'✓  '" },
  { name: "Star ★", value: "'★  '" },
];

// Number variants for <ol>
const OL_STYLES = [
  { name: "1. 2. 3.", value: "decimal" },
  { name: "01. 02.", value: "decimal-leading-zero" },
  { name: "a. b. c.", value: "lower-alpha" },
  { name: "A. B. C.", value: "upper-alpha" },
  { name: "i. ii. iii.", value: "lower-roman" },
  { name: "I. II. III.", value: "upper-roman" },
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

  const changeFontSize = (delta: 1 | -1) => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    // Determine current size from the start container's parent
    let node: Node | null = range.startContainer;
    let currentPx = 16;
    while (node && node !== ref.current) {
      if (node.nodeType === 1) {
        const cs = window.getComputedStyle(node as Element);
        const p = parseFloat(cs.fontSize);
        if (!isNaN(p)) {
          currentPx = p;
          break;
        }
      }
      node = node.parentNode;
    }
    // Find closest step and move
    let idx = FONT_SIZES.findIndex((s) => s >= currentPx);
    if (idx === -1) idx = FONT_SIZES.length - 1;
    const nextIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta));
    const nextPx = FONT_SIZES[nextIdx];

    const span = document.createElement("span");
    span.style.fontSize = `${nextPx}px`;
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      // Restore selection over the inserted span
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } catch {
      // ignore
    }
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const setListStyle = (listTag: "UL" | "OL", style: string) => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    let list: HTMLElement | null = null;
    while (node && node !== ref.current) {
      if ((node as HTMLElement).tagName === listTag) {
        list = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }
    // If no list at caret, create one first.
    if (!list) {
      document.execCommand(
        listTag === "UL" ? "insertUnorderedList" : "insertOrderedList",
      );
      const sel2 = window.getSelection();
      let n: Node | null = sel2?.getRangeAt(0).startContainer ?? null;
      while (n && n !== ref.current) {
        if ((n as HTMLElement).tagName === listTag) {
          list = n as HTMLElement;
          break;
        }
        n = n.parentNode;
      }
    }
    if (list) list.style.listStyleType = style;
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const insertImage = (dataUrl: string) => {
    ref.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      `<img src="${dataUrl}" style="max-width:100%;height:auto;border-radius:6px;margin:4px 0;" />`,
    );
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file" && it.type.startsWith("image/")) {
        e.preventDefault();
        const file = it.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") insertImage(reader.result);
        };
        reader.readAsDataURL(file);
        return;
      }
    }
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

        <ToolBtn onClick={() => changeFontSize(-1)} title="Decrease font size">
          <AArrowDown className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => changeFontSize(1)} title="Increase font size">
          <AArrowUp className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px h-5 bg-border mx-1" />


        {/* Text color */}
        <Popover title="Text color" icon={<Palette className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-1 w-40">
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
        </Popover>

        {/* Highlight */}
        <Popover title="Highlight" icon={<Highlighter className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-1 w-40">
            {HIGHLIGHTS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onMouseDown={(e) => {
                  e.preventDefault();
                  // hiliteColor works in most browsers; fallback to backColor.
                  if (!document.execCommand("hiliteColor", false, c.value)) {
                    document.execCommand("backColor", false, c.value);
                  }
                  if (ref.current) onChange(ref.current.innerHTML);
                }}
                className="h-6 w-6 rounded border hover:scale-110 transition-transform"
                style={{
                  background:
                    c.value === "transparent"
                      ? "linear-gradient(135deg, transparent 45%, currentColor 45%, currentColor 55%, transparent 55%)"
                      : c.value,
                }}
              />
            ))}
          </div>
        </Popover>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Bullets */}
        <ToolBtn onClick={() => exec("insertUnorderedList")} title="Bulleted list">
          <List className="h-4 w-4" />
        </ToolBtn>
        <Popover title="Bullet style" icon={<span className="text-xs font-semibold">•▾</span>}>
          <div className="flex flex-col gap-0.5 w-36">
            {UL_STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setListStyle("UL", s.value);
                }}
                className="text-left text-xs px-2 py-1 rounded hover:bg-muted"
              >
                {s.name}
              </button>
            ))}
          </div>
        </Popover>

        {/* Numbers */}
        <ToolBtn onClick={() => exec("insertOrderedList")} title="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <Popover title="Number style" icon={<span className="text-xs font-semibold">1▾</span>}>
          <div className="flex flex-col gap-0.5 w-36">
            {OL_STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setListStyle("OL", s.value);
                }}
                className="text-left text-xs px-2 py-1 rounded hover:bg-muted"
              >
                {s.name}
              </button>
            ))}
          </div>
        </Popover>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Indent */}
        <ToolBtn onClick={() => exec("outdent")} title="Decrease indent">
          <IndentDecrease className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("indent")} title="Increase indent">
          <IndentIncrease className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolBtn onClick={() => exec("removeFormat")} title="Clear formatting">
          <Eraser className="h-4 w-4" />
        </ToolBtn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
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

function Popover({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        className="h-7 w-7 p-0"
      >
        {icon}
      </Button>
      <div className="hidden group-hover:flex group-focus-within:flex absolute z-30 top-full left-0 mt-1 p-1.5 bg-popover border rounded-md shadow-md">
        {children}
      </div>
    </div>
  );
}
