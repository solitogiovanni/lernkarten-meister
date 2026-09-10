/** Client-side helpers to keep card pictures small enough to store inline. */

const MAX_SIDE = 384;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image"));
    img.src = src;
  });
}

function drawToDataUrl(img: HTMLImageElement): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Shrinks any source (file, data url, remote url) into a compact JPEG data url. */
export async function shrinkToDataUrl(source: File | Blob | string): Promise<string> {
  const src =
    typeof source === "string"
      ? source
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read the file"));
          reader.readAsDataURL(source);
        });
  const img = await loadImage(src);
  return drawToDataUrl(img);
}

export function b64PngToDataUrl(b64: string): string {
  return `data:image/png;base64,${b64}`;
}
