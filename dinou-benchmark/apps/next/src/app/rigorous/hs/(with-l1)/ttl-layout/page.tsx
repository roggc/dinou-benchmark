import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function getHsTtlChildPageState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("page:/rigorous/hs/ttl-layout");
  return getRigorousState();
}

export default async function HsTtlChildPage() {
  const s = await getHsTtlChildPageState();
  return (
    <div id="hs-ttl-child-page">
      <h2>TTL Layout Child Page (3600s)</h2>
      <p>
        Child Page Seq: <span id="hs-ttl-child-page-seq">{s.hsTtlChildPageSeq}</span>
      </p>
    </div>
  );
}

