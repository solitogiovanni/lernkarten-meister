/** Client-side helpers to keep card pictures small enough to store inline. */

const MAX_SIDE = 384;

function dataUrlToBlob(src: string): Blob | null {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(src);
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: m[1] });
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image"));
    img.src = src;
  });
}

type Source = { width: number; height: number; draw: CanvasImageSource };

/** Decodes a source into something drawable, preferring the low-memory bitmap path. */
async function decode(src: string | Blob): Promise<Source> {
  const blob = typeof src === "string" ? dataUrlToBlob(src) : src;
  if (blob && typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob);
      return { width: bmp.width, height: bmp.height, draw: bmp };
    } catch {
      // fall through to the <img> path
    }
  }
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  try {
    const img = await loadImage(url);
    return { width: img.naturalWidth, height: img.naturalHeight, draw: img };
  } finally {
    if (typeof src !== "string") URL.revokeObjectURL(url);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the picture"));
    reader.readAsDataURL(blob);
  });
}

async function shrink(source: Source): Promise<string> {
  const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source.draw, 0, 0, w, h);

  // toBlob keeps memory far lower than toDataURL on mobile browsers.
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82);
    } catch {
      resolve(null);
    }
  });
  if (blob && blob.size > 0) return await blobToDataUrl(blob);

  const url = canvas.toDataURL("image/jpeg", 0.82);
  if (!url || url.length < 32) throw new Error("Could not resize the picture");
  return url;
}

/** Checks that a data url can actually be displayed by the browser. */
async function isDisplayable(src: string): Promise<boolean> {
  try {
    await loadImage(src);
    return true;
  } catch {
    return false;
  }
}

/** Shrinks any source (file, data url, remote url) into a compact JPEG data url. */
export async function shrinkToDataUrl(source: File | Blob | string): Promise<string> {
  try {
    return await shrink(await decode(source));
  } catch (e) {
    // If we cannot resize it but we already hold usable bytes, keep them as-is
    // rather than losing the picture entirely — but never keep bytes the
    // browser cannot display, which would show up as a broken image.
    if (typeof source === "string" && source.startsWith("data:") && (await isDisplayable(source))) {
      return source;
    }
    throw e instanceof Error ? e : new Error("Could not prepare the picture");
  }
}

export function b64PngToDataUrl(b64: string): string {
  return `data:image/png;base64,${b64}`;
}
