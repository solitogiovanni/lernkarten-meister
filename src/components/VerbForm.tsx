import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";

export type VerbPrep = {
  preposition: string;
  case: "akk" | "dat" | "gen" | null;
  meaning: string;
};

export type VerbFormValue = {
  present: string;
  praeteritum: string;
  perfect: string;
  conjugation: string;
  praeteritumConjugation: string;
  prepositions: VerbPrep[];
  meanings: string[];
  examples: string[];
  themes: string[];
  comments: string;
};

export const emptyVerb: VerbFormValue = {
  present: "",
  praeteritum: "",
  perfect: "",
  conjugation: "",
  praeteritumConjugation: "",
  prepositions: [],
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

const CASES: Array<{ value: "akk" | "dat" | "gen"; label: string }> = [
  { value: "akk", label: "Akk" },
  { value: "dat", label: "Dat" },
  { value: "gen", label: "Gen" },
];

export function VerbForm({
  value,
  onChange,
  themeSuggestions,
}: {
  value: VerbFormValue;
  onChange: (v: VerbFormValue) => void;
  themeSuggestions?: string[];
}) {
  const set = <K extends keyof VerbFormValue>(k: K, v: VerbFormValue[K]) =>
    onChange({ ...value, [k]: v });

  const updatePrep = (i: number, patch: Partial<VerbPrep>) =>
    set("prepositions", value.prepositions.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="present" className="mb-2 block">Present (Infinitiv)</Label>
          <Input
            id="present"
            value={value.present}
            onChange={(e) => set("present", e.target.value)}
            placeholder="gehen"
          />
        </div>
        <div>
          <Label htmlFor="praeteritum" className="mb-2 block">Präteritum</Label>
          <Input
            id="praeteritum"
            value={value.praeteritum}
            onChange={(e) => set("praeteritum", e.target.value)}
            placeholder="ging"
          />
        </div>
        <div>
          <Label htmlFor="perfect" className="mb-2 block">Perfekt (with sein/haben)</Label>
          <Input
            id="perfect"
            value={value.perfect}
            onChange={(e) => set("perfect", e.target.value)}
            placeholder="ist gegangen"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="conjugation" className="mb-2 block">Konjugation (Präsens, no pronouns)</Label>
        <Input
          id="conjugation"
          value={value.conjugation}
          onChange={(e) => set("conjugation", e.target.value)}
          placeholder="komme / kommst / kommt / kommen / kommt / kommen"
        />
      </div>

      <div>
        <Label htmlFor="praeteritumConjugation" className="mb-2 block">Konjugation Präteritum (no pronouns)</Label>
        <Input
          id="praeteritumConjugation"
          value={value.praeteritumConjugation}
          onChange={(e) => set("praeteritumConjugation", e.target.value)}
          placeholder="kam / kamst / kam / kamen / kamt / kamen"
        />
      </div>

      <div>
        <Label className="mb-2 block">Prepositions</Label>
        <div className="space-y-2">
          {value.prepositions.map((p, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <Input
                className="w-28"
                value={p.preposition}
                onChange={(e) => updatePrep(i, { preposition: e.target.value })}
                placeholder="auf"
              />
              <div className="flex gap-1">
                {CASES.map((c) => (
                  <Button
                    key={c.value}
                    type="button"
                    size="sm"
                    variant={p.case === c.value ? "default" : "outline"}
                    onClick={() => updatePrep(i, { case: p.case === c.value ? null : c.value })}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
              <Input
                className="flex-1 min-w-[150px]"
                value={p.meaning}
                onChange={(e) => updatePrep(i, { meaning: e.target.value })}
                placeholder="aspettare"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => set("prepositions", value.prepositions.filter((_, j) => j !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("prepositions", [...value.prepositions, { preposition: "", case: null, meaning: "" }])}
          >
            <Plus className="h-4 w-4 mr-1" /> Add preposition
          </Button>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Meanings (Italian)</Label>
        <ChipInput
          values={value.meanings}
          onChange={(v) => set("meanings", v)}
          placeholder="andare, recarsi…"
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
        <Label htmlFor="verb-comments" className="mb-2 block">Comments</Label>
        <RichTextEditor
          value={value.comments}
          onChange={(html) => set("comments", html)}
          placeholder="Notes from your teacher…"
        />
      </div>

      <div>
        <Label className="mb-2 block">Themes</Label>
        <ChipInput
          values={value.themes}
          onChange={(v) => set("themes", v)}
          placeholder="movimento, lavoro…"
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
