## Add possessive pronouns card

Insert one new row into the `words` table on the pronouns deck:

- **word**: `Possessivpronomen`
- **kind**: `pronoun`
- **meanings**: `["Pronomi possessivi"]`
- **comments**: a plain-text block containing the stem list + ein-word endings table, formatted with monospace alignment so it renders cleanly inside the existing `whitespace-pre-wrap` comment box in `CardReveal.tsx`.

Comment body:

```
Stems (chi possiede):
io        → mein
tu        → dein
lui/esso  → sein
lei       → ihr
noi       → unser
voi       → euer
loro      → ihr
Lei (f.)  → Ihr

Endings (ein-Wörter) — added to the stem:
Case | Mask. | Fem. | Neut. | Plur.
-----+-------+------+-------+------
Nom  |  —    |  -e  |  —    |  -e
Akk  | -en   |  -e  |  —    |  -e
Dat  | -em   |  -er | -em   | -en
Gen  | -es   |  -er | -es   | -er

Es: "il mio cane" → mein Hund (Nom),
    "vedo il mio cane" → meinen Hund (Akk),
    "con la mia amica" → mit meiner Freundin (Dat).

Note: "euer" perde la -e- davanti a desinenza
(eure, euren, eurem, eurer).
```

No schema changes, no code changes — just a single data insert, identical pattern to the Personalpronomen and Reflexivpronomen cards already added.