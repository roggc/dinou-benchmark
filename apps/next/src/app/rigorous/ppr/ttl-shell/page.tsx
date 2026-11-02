import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { sleep } from "@/shared/lib/data";

async function TtlDynamicHole() {
  await connection();
  await sleep(15);
  const s = getRigorousState();
  return (
    <div id="ppr-ttl-hole">
      TTL Dynamic Hole Seq: <span id="ppr-ttl-hole-seq">{s.pprTtlHoleSeq}</span>
    </div>
  );
}

async function getPprTtlShellState() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("page:/rigorous/ppr/ttl-shell");
  return getRigorousState();
}

async function PprTtlShellInner() {
  const s = await getPprTtlShellState();
  return (
    <div id="ppr-ttl-shell-page">
      <h2>PPR TTL Shell Page (revalidate = 1s)</h2>
      <p>
        TTL Shell Seq: <span id="ppr-ttl-shell-seq">{s.pprTtlShellSeq}</span>
      </p>
      <Suspense fallback={<div id="ppr-fallback-ttl">Loading ttl hole...</div>}>
        <TtlDynamicHole />
      </Suspense>
    </div>
  );
}

export default function PprTtlShellPage() {
  return (
    <Suspense fallback={null}>
      <PprTtlShellInner />
    </Suspense>
  );
}

