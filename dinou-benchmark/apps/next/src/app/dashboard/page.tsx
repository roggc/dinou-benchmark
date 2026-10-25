import { Suspense } from "react";
import { connection } from "next/server";
import { HoleCard, PageHeader, Shell, Skeleton } from "@/shared/components/ui";
import { sleep, stamp } from "@/shared/lib/data";

const DELAY = 200;

async function Orders() {
  await sleep(DELAY);
  return (
    <HoleCard label="orders · 24h" value="1,284" detail="+8.4% vs previous day" stamp={stamp()} />
  );
}

async function Revenue() {
  await sleep(DELAY);
  return <HoleCard label="revenue · 24h" value="€48,920" detail="average ticket €38.10" stamp={stamp()} />;
}

async function Incidents() {
  await sleep(DELAY);
  return <HoleCard label="open incidents" value="7" detail="2 high severity" stamp={stamp()} />;
}

/** Fully dynamic route: not prerendered, rendered on every request. */
export const instant = false;

export default async function DashboardPage() {
  // Marks the route as request-dependent: nothing here is prerendered.
  await connection();
  return (
    <Shell>
      <PageHeader
        eyebrow="Dynamic SSR · force-dynamic"
        title="Operations dashboard"
        description="Rendered on every request. The three holes wait 200 ms each in parallel, so the full HTML takes ~200 ms and is never cached."
        badge="force-dynamic"
      />
      <div className="shell-note" data-testid="dashboard-stamp">
        <span className="dot" />
        request received: {stamp()}
      </div>
      <div className="holes">
        <Suspense fallback={<Skeleton label="orders" />}>
          <Orders />
        </Suspense>
        <Suspense fallback={<Skeleton label="revenue" />}>
          <Revenue />
        </Suspense>
        <Suspense fallback={<Skeleton label="incidents" />}>
          <Incidents />
        </Suspense>
      </div>
    </Shell>
  );
}

