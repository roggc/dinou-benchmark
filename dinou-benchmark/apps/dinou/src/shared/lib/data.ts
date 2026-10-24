import raw from "../data/items.json";

export type Item = {
  id: number;
  title: string;
  category: string;
  score: number;
  summary: string;
};

export const allItems = raw as Item[];

/** Los 50 primeros: alimentan el listado SSG de `/`. */
export function listItems(): Item[] {
  return allItems.slice(0, 50);
}

/** Los 100 ids que se prerenderizan en `/items/[id]`. */
export function itemIds(): string[] {
  return allItems.map((item) => String(item.id));
}

export function getItem(id: string | number): Item | undefined {
  return allItems.find((item) => String(item.id) === String(id));
}

/** Retardo artificial idéntico en ambos frameworks, para los huecos Suspense. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Marca de tiempo legible, usada para demostrar qué es dinámico y qué no. */
export function stamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 23) + "Z";
}

