import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function TsStaticASlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-static-a-slot", "slot:ts-static-a-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="ts-static-a-slot-box">
      Static A Slot Seq: <span id="ts-static-a-slot-seq">{s.tsStaticASlotSeq}</span> | Label:{" "}
      <span id="ts-static-a-slot-label">{s.tsStaticASlotLabel}</span>
    </div>
  );
}

async function getTsStaticAHostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-static-a-tag", "page:/rigorous/triple/static-a", "subtree:/rigorous/triple/static-a");
  return getRigorousState();
}

export default async function TripleStaticPageA() {
  const s = await getTsStaticAHostState();
  return (
    <div id="ts-static-a-page">
      <h2>Triple Static Child Page A (ppr = false)</h2>
      <p>
        Static A Host Seq: <span id="ts-static-a-host-seq">{s.tsStaticAHostSeq}</span> | Label:{" "}
        <span id="ts-static-a-host-label">{s.tsStaticAHostLabel}</span>
      </p>
      <TsStaticASlotContent />
    </div>
  );
}

