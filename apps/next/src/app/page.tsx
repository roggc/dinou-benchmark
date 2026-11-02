import { ItemGrid } from "@/shared/components/item";
import { PageHeader, Shell } from "@/shared/components/ui";
import { listItems, stamp } from "@/shared/lib/data";

/** Evaluated when the module is loaded, i.e., once at build time. */
const BUILD_STAMP = stamp();

export default function HomePage() {
  const items = listItems();

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
        build stamp: {BUILD_STAMP} · marker: HMR_MARKER_NEXT
      </div>
      <ItemGrid items={items} />
    </Shell>
  );
}


