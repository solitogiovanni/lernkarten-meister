import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function pickGermanVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("de") && /google|microsoft|natural|premium/i.test(v.name)) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("de")) ||
    null
  );
}

export function speakGerman(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 0.95;
    const v = pickGermanVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export function SpeakButton({
  text,
  className,
  size = "icon",
  variant = "ghost",
  label = "Hear pronunciation",
}: {
  text: string;
  className?: string;
  size?: "icon" | "sm" | "default";
  variant?: "ghost" | "outline" | "secondary" | "default";
  label?: string;
}) {
  if (!text?.trim()) return null;
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      aria-label={label}
      title={label}
      className={cn(size === "icon" ? "h-7 w-7" : "", className)}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        speakGerman(text);
      }}
    >
      <Volume2 className="h-4 w-4" />
    </Button>
  );
}
