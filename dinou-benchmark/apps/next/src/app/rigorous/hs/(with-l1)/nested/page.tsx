import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function getHsNestedPage1State() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hs-nested-page1-tag", "page:/rigorous/hs/nested", "subtree:/rigorous/hs/nested");
  return getRigorousState();
}

export default async function HsNestedPage1() {
  const s = await getHsNestedPage1State();
  return (
    <div id="hs-nested-page-1">
      <h2>HS Nested Page 1</h2>
      <p>
        Nested Page 1 Seq: <span id="hs-nested-page1-seq">{s.hsNestedPage1Seq}</span>
      </p>
    </div>
  );
}

