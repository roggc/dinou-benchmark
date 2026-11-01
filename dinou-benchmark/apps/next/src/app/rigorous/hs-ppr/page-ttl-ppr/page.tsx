import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { sleep } from "@/shared/lib/data";

async function HsPprPageTtlHole() {
  await connection();
  await sleep(15);
  const s = getRigorousState();
  return (
    <div id="hsppr-page-ttl-hole">
      Page TTL Hole Seq: <span id="hsppr-page-ttl-hole-seq">{s.hspprPageTtlHoleSeq}</span>
    </div>
  );
}

async function getHsPprPageTtlShellState() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("page:/rigorous/hs-ppr/page-ttl-ppr");
  return getRigorousState();
}

async function HsPprPageTtlOnlyInner() {
  const s = await getHsPprPageTtlShellState();
  return (
    <div id="hsppr-page-ttl-only">
      <h2>PPR Page TTL Only (1s)</h2>
      <p>
        Page TTL Shell Seq: <span id="hsppr-page-ttl-shell-seq">{s.hspprPageTtlShellSeq}</span>
      </p>
      <Suspense fallback={<div id="hsppr-fallback-page-ttl">Loading page ttl hole...</div>}>
        <HsPprPageTtlHole />
      </Suspense>
    </div>
  );
}

export default function HsPprPageTtlOnly() {
  return (
    <Suspense fallback={null}>
      <HsPprPageTtlOnlyInner />
    </Suspense>
  );
}

