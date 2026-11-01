import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function getHsPprStaticOptOutState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hsppr-static-optout-tag",
    "page:/rigorous/hs-ppr/static-optout",
    "subtree:/rigorous/hs-ppr/static-optout"
  );
  return getRigorousState();
}

export default async function HsPprStaticOptOutPage() {
  const s = await getHsPprStaticOptOutState();
  return (
    <div id="hsppr-static-optout-page">
      <h2>HS + PPR Static Opt-Out Child (ppr = false)</h2>
      <p>
        Static Opt-Out Seq: <span id="hsppr-static-optout-seq">{s.hspprStaticOptOutSeq}</span> | Label:{" "}
        <span id="hsppr-static-optout-label">{s.hspprStaticOptOutLabel}</span>
      </p>
    </div>
  );
}

