import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, Upload, X, Link as LinkIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateCardImage } from "@/lib/cardImage.functions";
import { shrinkToDataUrl, b64PngToDataUrl } from "@/lib/cardImage";

export function ImagePicker({
  value,
  onChange,
  word,
  meaning,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  word: string;
  meaning?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange(await shrinkToDataUrl(file));
      toast.success("Picture added");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not use that file");
    }
  };

  const applyLink = async () => {
    const url = link.trim();
    if (!url) return;
    try {
      onChange(await shrinkToDataUrl(url));
    } catch {
      // Remote image could not be read into a canvas — keep the link itself.
      onChange(url);
    }
    setLink("");
    toast.success("Picture added");
  };

  const generateFn = useServerFn(generateCardImage);

  const generate = async () => {
    const subject = keyword.trim() || [word.trim(), meaning?.trim()].filter(Boolean).join(" — ");
    if (!subject) return toast.error("Type the word or a keyword first");
    setBusy(true);
    try {
      const { b64, error } = await generateFn({ data: { word: word.trim() || subject, hint: subject } });
      if (error || !b64) return toast.error(error ?? "No picture was created");
      onChange(await shrinkToDataUrl(b64PngToDataUrl(b64)));
      toast.success("Picture created");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create the picture");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Label className="mb-2 block">Picture</Label>
      <div className="rounded-md border p-3 space-y-3">
        <div className="flex items-start gap-3">
          {value ? (
            <div className="relative">
              <img src={value} alt={word || "card picture"} className="h-24 w-24 rounded-md object-cover border" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={() => onChange(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="h-24 w-24 rounded-md border border-dashed flex items-center justify-center text-xs text-muted-foreground text-center px-2">
              No picture
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Upload
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {value ? "Create new" : "Create with AI"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                generate();
              }
            }}
            placeholder="Keyword for the picture (optional)…"
            className="h-9"
          />
        </div>

        <div className="flex gap-2">
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
            placeholder="…or paste an image link"
            className="h-9"
          />
          <Button type="button" variant="secondary" size="sm" onClick={applyLink} disabled={!link.trim()}>
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
