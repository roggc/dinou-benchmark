import { Suspense } from "react";
import { getContext } from "dinou";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { sleep } from "../../../shared/lib/data";

async function TtlDynamicHole() {
  const ctx = getContext();
  void ctx?.req?.headers?.["user-agent"];
  await sleep(15);
  const s = getRigorousState();
  return (
    <div id="ppr-ttl-hole">
      TTL Dynamic Hole Seq: <span id="ppr-ttl-hole-seq">{s.pprTtlHoleSeq}</span>
    </div>
  );
}

export default function PprTtlShellPage() {
  const s = getRigorousState();
  return (
    <div id="ppr-ttl-shell-page">
      <h2>PPR TTL Shell Page (revalidate = 1s)</h2>
      <p>
        TTL Shell Seq: <span id="ppr-ttl-shell-seq">{s.pprTtlShellSeq}</span>
      </p>
      <Suspense fallback={<div id="ppr-fallback-ttl">Loading ttl hole...</div>}>
        <TtlDynamicHole />
      </Suspense>
    </div>
  );
}
