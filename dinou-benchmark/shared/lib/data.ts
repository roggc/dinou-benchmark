import raw from "../data/items.json";

export type Item = {
  id: number;
  title: string;
  category: string;
  score: number;
  summary: string;
};

export const allItems = raw as Item[];

/** First 50 items: feeds the SSG listing at `/`. */
export function listItems(): Item[] {
  return allItems.slice(0, 50);
}

/** 100 IDs prerendered at `/items/[id]`. */
export function itemIds(): string[] {
  return allItems.map((item) => String(item.id));
}

export function getItem(id: string | number): Item | undefined {
  return allItems.find((item) => String(item.id) === String(id));
}

/** Identical artificial delay across frameworks for Suspense holes. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Readable timestamp used to demonstrate what is dynamic and what is cached. */
export function stamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 23) + "Z";
}

