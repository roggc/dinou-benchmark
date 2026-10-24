import { ItemGrid } from "@/shared/components/item";
import { PageHeader, Shell } from "@/shared/components/ui";
import type { Item } from "@/shared/lib/data";

export default function HomePage({ items, stamp }: { items: Item[]; stamp: string }) {
  return (
    <Shell>
      <PageHeader
        eyebrow="SSG · generado en build"
        title="Listado de recursos"
        description="Cincuenta registros leídos de un JSON local. La página se genera una sola vez durante el build y se sirve idéntica hasta el siguiente build."
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

