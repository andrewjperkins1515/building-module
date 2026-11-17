import type { ProgressItem } from "@/types";

/**
 * Progress roll-up:
 *  - A leaf item is 0% or 100%.
 *  - An item with sub-items is the average of its sub-items' progress.
 *  - The deal's overall progress is the average of its top-level items.
 */
export function itemProgress(item: ProgressItem): number {
  if (item.children?.length) return item.children.reduce((a, c) => a + itemProgress(c), 0) / item.children.length;
  return item.done ? 1 : 0;
}

export function overallProgress(items?: ProgressItem[]): number {
  if (!items?.length) return 0;
  return items.reduce((a, i) => a + itemProgress(i), 0) / items.length;
}

export function countLeaves(items: ProgressItem[] = []): { done: number; total: number } {
  return items.reduce(
    (acc, i) => {
      if (i.children?.length) {
        const c = countLeaves(i.children);
        return { done: acc.done + c.done, total: acc.total + c.total };
      }
      return { done: acc.done + (i.done ? 1 : 0), total: acc.total + 1 };
    },
    { done: 0, total: 0 },
  );
}

/** Returns a new tree with the item `id` toggled (leaf) or all its sub-items set (parent). */
export function toggleProgress(items: ProgressItem[], id: string, value?: boolean, at = new Date().toISOString()): ProgressItem[] {
  return items.map((i) => {
    if (i.id === id) {
      const next = value ?? !(itemProgress(i) === 1);
      if (i.children?.length) return { ...i, children: setAll(i.children, next, at) };
      return { ...i, done: next, completedAt: next ? at : undefined };
    }
    return i.children?.length ? { ...i, children: toggleProgress(i.children, id, value, at) } : i;
  });
}

function setAll(items: ProgressItem[], value: boolean, at: string): ProgressItem[] {
  return items.map((i) => (i.children?.length ? { ...i, children: setAll(i.children, value, at) } : { ...i, done: value, completedAt: value ? (i.completedAt ?? at) : undefined }));
}
