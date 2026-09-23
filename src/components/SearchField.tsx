import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

/**
 * Search input that keeps its own local value and only pushes changes
 * to the parent when the user is NOT in the middle of an IME/dead-key
 * composition (e.g. macOS Option+u + vowel for umlauts). Updating the
 * controlled value mid-composition cancels it and leaves a stray "¨".
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  const composing = useRef(false);
  const focused = useRef(false);

  // Keep in sync when the parent value changes externally (Clear, prefill…),
  // but never while the user is typing or composing in the field.
  useEffect(() => {
    if (!focused.current && !composing.current) setLocal(value);
  }, [value]);

  return (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={local}
        onFocus={() => (focused.current = true)}
        onBlur={() => (focused.current = false)}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={(e) => {
          composing.current = false;
          const v = (e.target as HTMLInputElement).value;
          setLocal(v);
          onChange(v);
        }}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          if (!composing.current) onChange(v);
        }}
        placeholder={placeholder}
        className={className ?? "pl-8 h-11 text-base sm:h-9 sm:text-sm"}
      />
    </div>
  );
}
