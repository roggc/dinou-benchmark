import { Suspense } from "react";
import { connection } from "next/server";
import { HoleCard, PageHeader, Shell, Skeleton } from "@/shared/components/ui";
import { sleep, stamp } from "@/shared/lib/data";

const DELAY = 200;

async function Pedidos() {
  await sleep(DELAY);
  return (
    <HoleCard label="pedidos · 24 h" value="1.284" detail="+8,4 % respecto al día anterior" stamp={stamp()} />
  );
}

async function Ingresos() {
  await sleep(DELAY);
  return <HoleCard label="ingresos · 24 h" value="48.920 €" detail="ticket medio 38,10 €" stamp={stamp()} />;
}

async function Incidencias() {
  await sleep(DELAY);
  return <HoleCard label="incidencias abiertas" value="7" detail="2 de severidad alta" stamp={stamp()} />;
}

/** Ruta totalmente dinámica: no se prerenderiza, se renderiza en cada petición. */
export const instant = false;

export default async function DashboardPage() {
  // Marca la ruta como dependiente de la petición: nada de esto se prerenderiza.
  await connection();
  return (
    <Shell>
      <PageHeader
        eyebrow="SSR dinámico · force-dynamic"
        title="Panel de operaciones"
        description="Se renderiza en cada petición. Los tres huecos esperan 200 ms cada uno en paralelo, así que el HTML completo tarda ~200 ms y nunca se cachea."
        badge="force-dynamic"
      />
      <div className="shell-note" data-testid="dashboard-stamp">
        <span className="dot" />
        petición recibida: {stamp()}
      </div>
      <div className="holes">
        <Suspense fallback={<Skeleton label="pedidos" />}>
          <Pedidos />
        </Suspense>
        <Suspense fallback={<Skeleton label="ingresos" />}>
          <Ingresos />
        </Suspense>
        <Suspense fallback={<Skeleton label="incidencias" />}>
          <Incidencias />
        </Suspense>
      </div>
    </Shell>
  );
}

