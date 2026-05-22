import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";

export type NounFormValue = {
  article: "der" | "die" | "das" | null;
  noun: string;
  plural: string;
  meanings: string[];
  examples: string[];
  themes: string[];
  comments: string;
};

export const emptyNoun: NounFormValue = {
  article: null,
  noun: "",
  plural: "",
  meanings: [],
  examples: [],
  themes: [],
  comments: "",
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

export function NounForm({
  value,
  onChange,
  themeSuggestions,
}: {
  value: NounFormValue;
  onChange: (v: NounFormValue) => void;
  themeSuggestions?: string[];
}) {
  const set = <K extends keyof NounFormValue>(k: K, v: NounFormValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Article</Label>
        <div className="flex gap-2">
          {(["der", "die", "das"] as const).map((a) => (
            <Button
              key={a}
              type="button"
              variant={value.article === a ? "default" : "outline"}
              onClick={() => set("article", value.article === a ? null : a)}
              className="capitalize flex-1"
            >
              {a}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="noun" className="mb-2 block">Noun</Label>
          <Input
            id="noun"
            value={value.noun}
            onChange={(e) => set("noun", e.target.value)}
            placeholder="Haus"
          />
        </div>
        <div>
          <Label htmlFor="plural" className="mb-2 block">Plural</Label>
          <Input
            id="plural"
            value={value.plural}
            onChange={(e) => set("plural", e.target.value)}
            placeholder="Häuser"
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Meanings (Italian)</Label>
        <ChipInput
          values={value.meanings}
          onChange={(v) => set("meanings", v)}
          placeholder="casa, abitazione…"
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
        <Label htmlFor="noun-comments" className="mb-2 block">Comments</Label>
        <Textarea
          id="noun-comments"
          value={value.comments}
          onChange={(e) => set("comments", e.target.value)}
          placeholder="Notes from your teacher…"
          rows={2}
        />
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
