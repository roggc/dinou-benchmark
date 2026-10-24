import { Suspense } from "react";
import { HoleCard, PageHeader, Shell, Skeleton } from "@/shared/components/ui";
import { sleep, stamp } from "@/shared/lib/data";

const DELAY = 200;

async function Cotizacion() {
  await sleep(DELAY);
  return (
    <HoleCard
      label="cotización en vivo"
      value="142,08 €"
      detail="hueco dinámico streameado tras el shell"
      stamp={stamp()}
    />
  );
}

export default function PprPage({ shellStamp }: { shellStamp: string }) {
  return (
    <Shell>
      <PageHeader
        eyebrow="PPR · ppr = true"
        title="Shell estático, hueco dinámico"
        description="El cascarón se prerenderiza en build y llega en el primer chunk. Dentro del mismo HTTP, el hueco resuelve 200 ms después con datos de esta petición."
        badge="partial prerendering"
      />
      <div className="shell-note" data-testid="ppr-shell-stamp">
        <span className="dot" />
        shell generado en build: {shellStamp}
      </div>
      <div className="holes">
        <Suspense fallback={<Skeleton label="cotización" />}>
          <Cotizacion />
        </Suspense>
      </div>
    </Shell>
  );
}

