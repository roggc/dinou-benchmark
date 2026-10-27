import { ItemGrid } from "@/shared/components/item";
import { PageHeader, Shell } from "@/shared/components/ui";
import type { Item } from "@/shared/lib/data";

export default function HomePage({ items, stamp }: { items: Item[]; stamp: string }) {
  return (
    <Shell>
      <PageHeader
        eyebrow="SSG · generated at build"
        title="Resource catalog"
        description="Fifty records read from a local JSON. The page is generated once during build and served statically until the next build."
        badge={`${items.length} items`}
      />
      <div className="shell-note" data-testid="home-stamp">
        <span className="dot" />
        build stamp: {stamp} · marker: HMR_MARKER_DINOU
      </div>
      <ItemGrid items={items} />
    </Shell>
  );
}

