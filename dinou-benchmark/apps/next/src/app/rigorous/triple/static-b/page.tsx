import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function TsStaticBSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-static-b-slot", "slot:ts-static-b-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="ts-static-b-slot-box">
      Static B Slot Seq: <span id="ts-static-b-slot-seq">{s.tsStaticBSlotSeq}</span>
    </div>
  );
}

async function getTsStaticBHostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-static-b-tag", "page:/rigorous/triple/static-b", "subtree:/rigorous/triple/static-b");
  return getRigorousState();
}

export default async function TripleStaticPageB() {
  const s = await getTsStaticBHostState();
  return (
    <div id="ts-static-b-page">
      <h2>Triple Static Child Page B (ppr = false)</h2>
      <p>
        Static B Host Seq: <span id="ts-static-b-host-seq">{s.tsStaticBHostSeq}</span>
      </p>
      <TsStaticBSlotContent />
    </div>
  );
}

