import { ItemGrid } from "@/shared/components/item";
import { PageHeader, Shell } from "@/shared/components/ui";
import { listItems, stamp } from "@/shared/lib/data";

/** Se evalúa al cargar el módulo, es decir, una sola vez en build. */
const BUILD_STAMP = stamp();

export default function HomePage() {
  const items = listItems();

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
        build stamp: {BUILD_STAMP} · marker: HMR_MARKER_NEXT
      </div>
      <ItemGrid items={items} />
    </Shell>
  );
}


