export type DiffPart = { text: string; changed: boolean };
export type DiffLine = { number: number; parts: DiffPart[] };
export type DiffRow = {
  type: "equal" | "changed" | "removed" | "added";
  before?: DiffLine;
  after?: DiffLine;
};

type Edit = { type: "equal" | "remove" | "add"; text: string };
type Budget = { remaining: number; simplified: boolean };

// Trim shared edges before building an LCS table. A shared budget bounds both
// line and character comparisons, even for large, completely different texts.
function compareTokens(before: string[], after: string[], budget: Budget): Edit[] {
  let start = 0;
  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (start < beforeEnd && start < afterEnd && before[start] === after[start]) start++;
  while (beforeEnd > start && afterEnd > start && before[beforeEnd - 1] === after[afterEnd - 1]) {
    beforeEnd--;
    afterEnd--;
  }

  const edits: Edit[] = before.slice(0, start).map(text => ({ type: "equal", text }));
  const height = beforeEnd - start;
  const width = afterEnd - start;
  const cells = (height + 1) * (width + 1);

  if (!height || !width || cells > budget.remaining) {
    if (height && width) budget.simplified = true;
    for (let i = start; i < beforeEnd; i++) edits.push({ type: "remove", text: before[i] });
    for (let j = start; j < afterEnd; j++) edits.push({ type: "add", text: after[j] });
  } else {
    budget.remaining -= cells;
    const stride = width + 1;
    const table = new Uint32Array(cells);
    for (let i = height - 1; i >= 0; i--) {
      for (let j = width - 1; j >= 0; j--) {
        table[i * stride + j] = before[start + i] === after[start + j]
          ? table[(i + 1) * stride + j + 1] + 1
          : Math.max(table[(i + 1) * stride + j], table[i * stride + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < height || j < width) {
      if (i < height && j < width && before[start + i] === after[start + j]) {
        edits.push({ type: "equal", text: before[start + i] });
        i++;
        j++;
      } else if (i < height && (j === width || table[(i + 1) * stride + j] >= table[i * stride + j + 1])) {
        edits.push({ type: "remove", text: before[start + i++] });
      } else {
        edits.push({ type: "add", text: after[start + j++] });
      }
    }
  }
  for (let i = beforeEnd; i < before.length; i++) edits.push({ type: "equal", text: before[i] });
  return edits;
}

function appendPart(parts: DiffPart[], text: string, changed: boolean) {
  const previous = parts[parts.length - 1];
  if (previous?.changed === changed) previous.text += text;
  else parts.push({ text, changed });
}

/** Compare exact text, preserving whitespace and final empty lines; normalize CRLF/CR. */
export function compareText(before: string, after: string) {
  const splitLines = (text: string) => text === "" ? [] : text.replace(/\r\n?/g, "\n").split("\n");
  const budget: Budget = { remaining: 4_000_000, simplified: false };
  const edits = compareTokens(splitLines(before), splitLines(after), budget);
  const rows: DiffRow[] = [];
  let beforeNumber = 1;
  let afterNumber = 1;
  let removed = 0;
  let added = 0;

  for (let index = 0; index < edits.length;) {
    const edit = edits[index];
    if (edit.type === "equal") {
      rows.push({
        type: "equal",
        before: { number: beforeNumber++, parts: [{ text: edit.text, changed: false }] },
        after: { number: afterNumber++, parts: [{ text: edit.text, changed: false }] },
      });
      index++;
      continue;
    }

    const deleted: string[] = [];
    const inserted: string[] = [];
    while (index < edits.length && edits[index].type !== "equal") {
      const current = edits[index++];
      (current.type === "remove" ? deleted : inserted).push(current.text);
    }
    removed += deleted.length;
    added += inserted.length;

    for (let i = 0; i < Math.max(deleted.length, inserted.length); i++) {
      const oldText = deleted[i];
      const newText = inserted[i];
      const oldParts: DiffPart[] = [];
      const newParts: DiffPart[] = [];
      if (oldText !== undefined && newText !== undefined) {
        // Array.from keeps surrogate pairs (for example emoji) intact.
        for (const part of compareTokens(Array.from(oldText), Array.from(newText), budget)) {
          if (part.type !== "add") appendPart(oldParts, part.text, part.type !== "equal");
          if (part.type !== "remove") appendPart(newParts, part.text, part.type !== "equal");
        }
      } else {
        if (oldText !== undefined) oldParts.push({ text: oldText, changed: true });
        if (newText !== undefined) newParts.push({ text: newText, changed: true });
      }
      rows.push({
        type: oldText === undefined ? "added" : newText === undefined ? "removed" : "changed",
        before: oldText === undefined ? undefined : { number: beforeNumber++, parts: oldParts },
        after: newText === undefined ? undefined : { number: afterNumber++, parts: newParts },
      });
    }
  }
  return { rows, removed, added, simplified: budget.simplified };
}
