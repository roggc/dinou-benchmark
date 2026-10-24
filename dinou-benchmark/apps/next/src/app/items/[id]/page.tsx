import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { ItemDetail } from "@/shared/components/item";
import { Shell } from "@/shared/components/ui";
import { getItem, itemIds, stamp } from "@/shared/lib/data";

/**
 * ISR en Next 16 con `cacheComponents`: la entrada se cachea 60 s y se
 * regenera en segundo plano. `export const revalidate` ya no es compatible con
 * cacheComponents, así que la ventana se declara con cacheLife.
 */
async function loadItem(id: string) {
  "use cache";
  cacheLife({ revalidate: 60, expire: 3600 });
  const item = getItem(id);
  if (!item) return null;
  return { item, stamp: stamp() };
}

/** 100 rutas prerenderizadas en build. */
export function generateStaticParams() {
  return itemIds().map((id) => ({ id }));
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadItem(id);

  // Equivalente a `dynamicParams = false`: cualquier id fuera de 1–100 es 404.
  if (!data) notFound();

  return (
    <Shell>
      <ItemDetail item={data.item} stamp={data.stamp} />
    </Shell>
  );
}


