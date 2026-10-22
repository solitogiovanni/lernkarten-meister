import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { speakGerman } from "@/lib/pronunciation";

export { speakGerman } from "@/lib/pronunciation";

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
      asChild
      size={size}
      variant={variant}
      aria-label={label}
      title={label}
      className={cn(size === "icon" ? "h-7 w-7" : "", className)}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        speakGerman(text, (message) => toast.error(message));
      }}
    >
      <span
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          speakGerman(text, (message) => toast.error(message));
        }}
      >
        <Volume2 className="h-4 w-4" />
      </span>
    </Button>
  );
}
