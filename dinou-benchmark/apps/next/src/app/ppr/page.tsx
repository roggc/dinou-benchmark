import { Suspense } from "react";
import { connection } from "next/server";
import { HoleCard, PageHeader, Shell, Skeleton } from "@/shared/components/ui";
import { sleep, stamp } from "@/shared/lib/data";

/** Se evalúa cuando se genera el shell, es decir, en build. */
const BUILD_STAMP = stamp();

const DELAY = 200;

async function Cotizacion() {
  // `connection()` marca este subárbol como dependiente de la petición: Next lo
  // excluye del prerender y lo streamea como hueco, que es justo PPR.
  await connection();
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

export default function PprPage() {
  return (
    <Shell>
      <PageHeader
        eyebrow="PPR · shell estático + hueco"
        title="Shell estático, hueco dinámico"
        description="El cascarón se prerenderiza en build y llega en el primer chunk. Dentro del mismo HTTP, el hueco resuelve 200 ms después con datos de esta petición."
        badge="partial prerendering"
      />
      <div className="shell-note" data-testid="ppr-shell-stamp">
        <span className="dot" />
        shell generado en build: {BUILD_STAMP}
      </div>
      <div className="holes">
        <Suspense fallback={<Skeleton label="cotización" />}>
          <Cotizacion />
        </Suspense>
      </div>
    </Shell>
  );
}

