import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { ItemDetail } from "@/shared/components/item";
import { Shell } from "@/shared/components/ui";
import { getItem, itemIds, stamp } from "@/shared/lib/data";

/**
 * ISR in Next 16 with `cacheComponents`: cached for 60s and
 * regenerated in background. `export const revalidate` is not supported with
 * cacheComponents, so the lifetime is defined via cacheLife.
 */
async function loadItem(id: string) {
  "use cache";
  cacheLife({ revalidate: 60, expire: 3600 });
  const item = getItem(id);
  if (!item) return null;
  return { item, stamp: stamp() };
}

/** 100 routes prerendered at build time. */
export function generateStaticParams() {
  return itemIds().map((id) => ({ id }));
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadItem(id);

  // Equivalent to `dynamicParams = false`: any id outside 1–100 returns 404.
  if (!data) notFound();

  return (
    <Shell>
      <ItemDetail item={data.item} stamp={data.stamp} />
    </Shell>
  );
}


