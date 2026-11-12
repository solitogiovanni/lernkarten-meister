/// <reference types="bun" />
import { expect, test } from "bun:test";
import { mergeConfusionGroups, type CardRef, type ConfusionMember, type ConfusedEntry } from "./confusionGroups";

const ref = (id: string): CardRef => ({ table: "words", id });
const entry = (id: string): ConfusedEntry => ({ card_id: id, card_table: "words", word: id, meaning: `Italian ${id}` });
function fixture(groups: Record<string, string[]>) {
  const rows = new Map(Object.entries(groups).map(([id, peers]) => [id, { ...ref(id), word: id, meaning: `Italian ${id}`, entries: peers.map(entry) } as ConfusionMember]));
  return {
    rows,
    read: async ({ id }: CardRef) => rows.get(id) ?? null,
    write: async ({ id }: CardRef, entries: ConfusedEntry[]) => {
      const row = rows.get(id);
      if (row) rows.set(id, { ...row, entries });
    },
  };
}

test("linking D to C connects D to A and B and every group member to D", async () => {
  const f = fixture({ A: ["B", "C"], B: ["A", "C"], C: ["A", "B"], D: [] });
  await mergeConfusionGroups(ref("D"), ref("C"), f.read, f.write, entry("C"));
  for (const id of ["A", "B", "C", "D"]) {
    expect(f.rows.get(id)?.entries.map((e) => e.card_id).sort()).toEqual(["A", "B", "C", "D"].filter((peer) => peer !== id));
  }
});

test("merges both existing groups and discovers indirect peers", async () => {
  const f = fixture({ A: ["B"], B: ["C"], C: [], D: ["E"], E: [] });
  await mergeConfusionGroups(ref("D"), ref("C"), f.read, f.write, entry("C"));
  // A is not reachable from C; start from B to merge its connected peers as well.
  await mergeConfusionGroups(ref("A"), ref("D"), f.read, f.write, entry("D"));
  for (const id of ["A", "B", "C", "D", "E"]) {
    expect(f.rows.get(id)?.entries.map((e) => e.card_id).sort()).toEqual(["A", "B", "C", "D", "E"].filter((peer) => peer !== id));
  }
});

test("preserves manual notes and custom Italian meanings without duplicating links", async () => {
  const f = fixture({ A: ["B"], B: ["A"], D: [] });
  f.rows.get("A")?.entries.push({ word: "manual", meaning: "my note" });
  const existing = f.rows.get("A")?.entries[0];
  if (existing) existing.meaning = "custom distinction";
  await mergeConfusionGroups(ref("D"), ref("A"), f.read, f.write, entry("A"));
  await mergeConfusionGroups(ref("D"), ref("A"), f.read, f.write, entry("A"));
  expect(f.rows.get("A")?.entries).toEqual([{ ...entry("B"), meaning: "custom distinction" }, { word: "manual", meaning: "my note" }, entry("D")]);
});

test("a failed discovery does not write a partially discovered group", async () => {
  const f = fixture({ A: [], B: ["C"] });
  let writes = 0;
  await expect(mergeConfusionGroups(ref("A"), ref("B"), async (r) => {
    if (r.id === "C") throw new Error("Connection failed");
    return f.read(r);
  }, async () => { writes++; }, entry("B"))).rejects.toThrow("Connection failed");
  expect(writes).toBe(0);
});