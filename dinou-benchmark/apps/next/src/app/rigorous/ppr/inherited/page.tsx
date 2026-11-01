import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { sleep } from "@/shared/lib/data";

async function InheritedHole() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ppr-inherited-hole">
      Inherited Hole Seq: <span id="ppr-inherited-hole-seq">{s.pprInheritedHoleSeq}</span>
    </div>
  );
}

async function getPprInheritedShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("page:/rigorous/ppr/inherited", "subtree:/rigorous/ppr/inherited");
  return getRigorousState();
}

export default async function PprInheritedPage() {
  const s = await getPprInheritedShellState();
  return (
    <div id="ppr-inherited-page">
      <h2>Inherited PPR Page</h2>
      <p>
        Inherited Shell Seq: <span id="ppr-inherited-shell-seq">{s.pprInheritedShellSeq}</span>
      </p>
      <Suspense fallback={<div id="ppr-fallback-inherited">Loading inherited hole...</div>}>
        <InheritedHole />
      </Suspense>
    </div>
  );
}

