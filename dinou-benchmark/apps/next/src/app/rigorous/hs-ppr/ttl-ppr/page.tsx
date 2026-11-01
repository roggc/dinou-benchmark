import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { sleep } from "@/shared/lib/data";

async function HsPprTtlChildHole() {
  await connection();
  await sleep(15);
  const s = getRigorousState();
  return (
    <div id="hsppr-ttl-child-hole">
      TTL Child Hole Seq: <span id="hsppr-ttl-child-hole-seq">{s.hspprTtlChildHoleSeq}</span>
    </div>
  );
}

async function getHsPprTtlChildShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("page:/rigorous/hs-ppr/ttl-ppr");
  return getRigorousState();
}

export default async function HsPprTtlChildPage() {
  const s = await getHsPprTtlChildShellState();
  return (
    <div id="hsppr-ttl-child-page">
      <h2>TTL Layout Child PPR Page (3600s)</h2>
      <p>
        Child Shell Seq: <span id="hsppr-ttl-child-shell-seq">{s.hspprTtlChildShellSeq}</span>
      </p>
      <Suspense fallback={<div id="hsppr-fallback-ttl-child">Loading ttl child hole...</div>}>
        <HsPprTtlChildHole />
      </Suspense>
    </div>
  );
}

