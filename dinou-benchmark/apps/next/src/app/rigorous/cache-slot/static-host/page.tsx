import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function CsStaticHostSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-static-slot", "slot:cs-slot-static-host", "slot:*");
  const s = getRigorousState();
  return (
    <div id="cs-static-host-slot">
      Static Host Slot Seq: <span id="cs-static-slot-seq">{s.csStaticSlotSeq}</span>
    </div>
  );
}

async function CsStaticFastSlotContent() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("cs-tag-static-fast", "slot:cs-slot-static-fast", "slot:*");
  const s = getRigorousState();
  return (
    <div id="cs-static-fast-slot">
      Static Fast (1s) Slot Seq: <span id="cs-static-fast-seq">{s.csStaticFastSeq}</span>
    </div>
  );
}

async function getCsStaticHostPageState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "cs-static-page-tag",
    "page:/rigorous/cache-slot/static-host",
    "subtree:/rigorous/cache-slot/static-host"
  );
  return getRigorousState();
}

export default async function CacheSlotStaticHostPage() {
  const s = await getCsStaticHostPageState();
  return (
    <div id="cs-static-host-page">
      <h2>Cache-Slot Static Host (revalidate=3600)</h2>
      <p>
        Static Host Seq: <span id="cs-static-host-seq">{s.csStaticHostSeq}</span>
      </p>
      <CsStaticHostSlotContent />
      <Suspense fallback={null}>
        <CsStaticFastSlotContent />
      </Suspense>
    </div>
  );
}

