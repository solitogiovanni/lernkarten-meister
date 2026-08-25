/**
 * Fold text for accent-insensitive search: "König", "Koenig" and "Konig"
 * all fold to "konig".
 */
export function fold(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u")
    .replace(/ss/g, "s");
}

export function normalizeAnswer(s: string): string {

  return s
    .toLowerCase()
    .trim()
    .replace(/^(der|die|das)\s+/i, "")
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ");
}

export function answersMatch(input: string, accepted: string[]): boolean {
  const n = normalizeAnswer(input);
  if (!n) return false;
  return accepted.some((a) => normalizeAnswer(a) === n);
}
