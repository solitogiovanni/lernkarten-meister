/**
 * Cleans rich-text HTML for display: removes hidden/invisible junk that pasted
 * content (web pages, Word) drags along, so no raw code shows up on a card.
 * Works both in the browser (DOMParser) and during server rendering (regex).
 */

const BLOCK_TAGS = [
  "style",
  "script",
  "noscript",
  "link",
  "meta",
  "title",
  "xml",
  "iframe",
  "object",
  "embed",
  "head",
];

function regexClean(html: string): string {
  let out = html;
  // HTML comments, including Office conditional comments
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<!\[[\s\S]*?\]>/g, "");
  out = out.replace(/<\?[\s\S]*?\?>/g, "");
  out = out.replace(/<![^>]*>/g, "");
  // Tags whose contents must never be shown
  for (const tag of BLOCK_TAGS) {
    out = out.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"),
      "",
    );
    out = out.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), "");
  }
  // Leftover bare CSS rule blocks that ended up as text
  out = out.replace(
    /(^|>)([^<>{}]{0,200}?\{[^{}<>]*(?:mso-|font-family|margin|padding|line-height|text-align|font-size)[^{}<>]*\}\s*)+/gi,
    "$1",
  );
  out = out.replace(/@(?:media|font-face|page|import|charset|namespace)[^<]{0,500}?\}/gi, "");
  return out;
}

function domClean(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Comment nodes
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) comments.push(n);
  comments.forEach((c) => c.parentNode?.removeChild(c));

  doc.body.querySelectorAll(BLOCK_TAGS.join(",")).forEach((el) => el.remove());

  const isHidden = (el: Element) => {
    const s = (el.getAttribute("style") || "").toLowerCase().replace(/\s+/g, "");
    return (
      el.hasAttribute("hidden") ||
      el.getAttribute("aria-hidden") === "true" ||
      s.includes("display:none") ||
      s.includes("visibility:hidden") ||
      s.includes("font-size:0") ||
      s.includes("mso-hide:all")
    );
  };
  doc.body.querySelectorAll("*").forEach((el) => {
    if (isHidden(el)) el.remove();
    else {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on") || name.startsWith("mso-")) {
          el.removeAttribute(attr.name);
        }
      }
    }
  });

  return regexClean(doc.body.innerHTML);
}

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  try {
    if (typeof DOMParser !== "undefined") return domClean(html);
  } catch {
    // fall through
  }
  return regexClean(html);
}

/** True when the (already sanitized) value should be rendered as HTML. */
export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}
