import { ItemDetail } from "@/shared/components/item";
import { PageHeader, Shell } from "@/shared/components/ui";
import type { Item } from "@/shared/lib/data";

export default function ItemPage({ item, stamp }: { item?: Item; stamp: string }) {
  if (!item) {
    return (
      <Shell>
        <PageHeader
          eyebrow="ISR 60 s"
          title="Recurso no encontrado"
          description="Los ids disponibles son 1–100."
        />
        <a className="back" href="/">
          ← volver al listado
        </a>
      </Shell>
    );
  }

  return (
    <Shell>
      <ItemDetail item={item} stamp={stamp} />
    </Shell>
  );
}

