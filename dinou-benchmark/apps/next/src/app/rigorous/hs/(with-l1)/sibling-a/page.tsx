import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function getHsSiblingAState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hs-sibling-a-tag", "page:/rigorous/hs/sibling-a", "subtree:/rigorous/hs/sibling-a");
  return getRigorousState();
}

export default async function HsSiblingAPage() {
  const s = await getHsSiblingAState();
  return (
    <div className="card" id="hs-sibling-a-page" data-testid="hs-sibling-a-page">
      <div className="card-kicker">HS Sibling A (/rigorous/hs/sibling-a)</div>
      <div className="card-value" id="hs-sibling-a-seq" data-testid="hs-sibling-a-seq">
        {s.hsSiblingASeq}
      </div>
    </div>
  );
}

