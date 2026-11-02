import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function getPprOptOutState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("page:/rigorous/ppr/inherited/opt-out", "subtree:/rigorous/ppr/inherited/opt-out");
  return getRigorousState();
}

export default async function PprOptOutPage() {
  const s = await getPprOptOutState();
  return (
    <div id="ppr-optout-page">
      <h2>Opt-Out Child Page (ppr = false)</h2>
      <p>
        Opt-Out Static Seq: <span id="ppr-optout-seq">{s.pprOptOutSeq}</span>
      </p>
    </div>
  );
}

