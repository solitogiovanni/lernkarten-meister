import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

export type WordFormValue = {
  word: string;
  meanings: string[];
  examples: string[];
  themes: string[];
};

export const emptyWord: WordFormValue = {
  word: "",
  meanings: [],
  examples: [],
  themes: [],
};

function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setInput("");
  };
  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="secondary" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1">
              {v}
              <button
                type="button"
                className="hover:text-destructive"
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function WordForm({
  value,
  onChange,
  themeSuggestions,
  label,
  placeholder,
}: {
  value: WordFormValue;
  onChange: (v: WordFormValue) => void;
  themeSuggestions?: string[];
  label: string;
  placeholder: string;
}) {
  const set = <K extends keyof WordFormValue>(k: K, v: WordFormValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="word" className="mb-2 block">{label}</Label>
        <Input
          id="word"
          value={value.word}
          onChange={(e) => set("word", e.target.value)}
          placeholder={placeholder}
        />
      </div>

      <div>
        <Label className="mb-2 block">Meanings (Italian)</Label>
        <ChipInput
          values={value.meanings}
          onChange={(v) => set("meanings", v)}
          placeholder="bello, grande…"
        />
      </div>

      <div>
        <Label className="mb-2 block">Examples (German sentences)</Label>
        <div className="space-y-2">
          {value.examples.map((ex, i) => (
            <div key={i} className="flex gap-2">
              <Textarea
                value={ex}
                onChange={(e) => {
                  const next = [...value.examples];
                  next[i] = e.target.value;
                  set("examples", next);
                }}
                rows={2}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => set("examples", value.examples.filter((_, j) => j !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("examples", [...value.examples, ""])}
          >
            <Plus className="h-4 w-4 mr-1" /> Add example
          </Button>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Themes</Label>
        <ChipInput
          values={value.themes}
          onChange={(v) => set("themes", v)}
          placeholder="casa, lavoro…"
        />
        {themeSuggestions && themeSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {themeSuggestions
              .filter((t) => !value.themes.includes(t))
              .slice(0, 12)
              .map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("themes", [...value.themes, t])}
                  className="text-xs px-2 py-0.5 rounded-full border border-dashed text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                >
                  + {t}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
