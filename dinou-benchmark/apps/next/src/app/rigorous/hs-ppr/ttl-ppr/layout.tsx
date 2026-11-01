import type { ReactNode } from "react";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { sleep } from "@/shared/lib/data";

async function HsPprTtlLayoutHole() {
  await connection();
  await sleep(15);
  const s = getRigorousState();
  return (
    <div id="hsppr-ttl-layout-hole">
      TTL Layout Hole Seq: <span id="hsppr-ttl-layout-hole-seq">{s.hspprTtlLayoutHoleSeq}</span>
    </div>
  );
}

async function getHsPprTtlLayoutShellState() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("layout:/rigorous/hs-ppr/ttl-ppr");
  return getRigorousState();
}

async function HsPprTtlLayoutInner({ children }: { children: ReactNode }) {
  const s = await getHsPprTtlLayoutShellState();
  return (
    <div id="hsppr-ttl-layout" style={{ border: "1px dashed #d84315", padding: 8 }}>
      <div>
        TTL Layout (1s) Shell Seq:{" "}
        <span id="hsppr-ttl-layout-shell-seq">{s.hspprTtlLayoutShellSeq}</span>
      </div>
      <Suspense fallback={<div id="hsppr-fallback-ttl-layout">Loading ttl layout hole...</div>}>
        <HsPprTtlLayoutHole />
      </Suspense>
      {children}
    </div>
  );
}

export default function HsPprTtlLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <HsPprTtlLayoutInner>{children}</HsPprTtlLayoutInner>
    </Suspense>
  );
}

