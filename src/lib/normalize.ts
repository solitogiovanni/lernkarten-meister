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
