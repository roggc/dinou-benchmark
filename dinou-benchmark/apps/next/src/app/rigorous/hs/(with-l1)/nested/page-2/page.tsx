import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function getHsNestedPage2State() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hs-nested-page2-tag",
    "page:/rigorous/hs/nested/page-2",
    "subtree:/rigorous/hs/nested/page-2"
  );
  return getRigorousState();
}

export default async function HsNestedPage2() {
  const s = await getHsNestedPage2State();
  return (
    <div id="hs-nested-page-2">
      <h2>HS Nested Page 2</h2>
      <p>
        Nested Page 2 Seq: <span id="hs-nested-page2-seq">{s.hsNestedPage2Seq}</span>
      </p>
    </div>
  );
}

