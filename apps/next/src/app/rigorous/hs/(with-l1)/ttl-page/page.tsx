import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function getHsTtlPageOnlyState() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("page:/rigorous/hs/ttl-page");
  return getRigorousState();
}

async function HsTtlPageOnlyInner() {
  const s = await getHsTtlPageOnlyState();
  return (
    <div id="hs-ttl-page-only">
      <h2>TTL Page Only (1s)</h2>
      <p>
        TTL Page Seq: <span id="hs-ttl-page-only-seq">{s.hsTtlPageOnlySeq}</span>
      </p>
    </div>
  );
}

export default function HsTtlPageOnly() {
  return (
    <Suspense fallback={null}>
      <HsTtlPageOnlyInner />
    </Suspense>
  );
}

