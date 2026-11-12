export type CardTable = "nouns" | "verbs" | "words";

export type ConfusedEntry = {
  word: string;
  meaning: string;
  card_id?: string | null;
  card_table?: CardTable | null;
};

export type CardRef = { table: CardTable; id: string };
export type ConfusionMember = CardRef & {
  word: string;
  meaning: string;
  entries: ConfusedEntry[];
};

const key = (ref: CardRef) => `${ref.table}:${ref.id}`;
const entryKey = (entry: ConfusedEntry) => entry.card_id && entry.card_table
  ? key({ table: entry.card_table, id: entry.card_id }) : null;

/** Discover both connected groups before writing; preserve free-text notes and custom meanings. */
export async function mergeConfusionGroups(
  left: CardRef,
  right: CardRef,
  read: (ref: CardRef) => Promise<ConfusionMember | null>,
  write: (ref: CardRef, entries: ConfusedEntry[]) => Promise<void>,
  selectedEntry: ConfusedEntry,
): Promise<ConfusedEntry[]> {
  const members = new Map<string, ConfusionMember>();
  const visited = new Set<string>();
  let pending: CardRef[] = [left, right];
  while (pending.length) {
    const batch = pending.filter((ref) => {
      if (visited.has(key(ref))) return false;
      visited.add(key(ref));
      return true;
    });
    const rows = await Promise.all(batch.map(read));
    pending = [];
    for (const row of rows) {
      if (!row) continue;
      members.set(key(row), row);
      for (const entry of row.entries) {
        if (entry.card_id && entry.card_table) pending.push({ table: entry.card_table, id: entry.card_id });
      }
    }
  }
  if (!members.has(key(left)) || !members.has(key(right))) {
    throw new Error("One of the linked cards no longer exists.");
  }

  let leftEntries: ConfusedEntry[] = [];
  await Promise.all([...members.values()].map(async (member) => {
    const seen = new Set<string>([key(member)]);
    const entries = member.entries.filter((entry) => {
      const identity = entryKey(entry);
      if (!identity) return true;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
    for (const peer of members.values()) {
      if (seen.has(key(peer))) continue;
      seen.add(key(peer));
      entries.push(key(member) === key(left) && key(peer) === key(right)
        ? selectedEntry
        : { word: peer.word, meaning: peer.meaning, card_id: peer.id, card_table: peer.table });
    }
    await write(member, entries);
    if (key(member) === key(left)) leftEntries = entries;
  }));
  return leftEntries;
}