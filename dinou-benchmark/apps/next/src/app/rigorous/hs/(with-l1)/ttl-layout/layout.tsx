import { Suspense, type ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function getHsTtlLayoutState() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("layout:/rigorous/hs/ttl-layout");
  return getRigorousState();
}

async function HsTtlLayoutInner({ children }: { children: ReactNode }) {
  const s = await getHsTtlLayoutState();
  return (
    <div id="hs-ttl-layout" style={{ border: "1px dashed #ef6c00", padding: 8, marginTop: 8 }}>
      <p>
        TTL Layout (1s) Seq: <span id="hs-ttl-layout-seq">{s.hsTtlLayoutSeq}</span>
      </p>
      {children}
    </div>
  );
}

export default function HsTtlLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <HsTtlLayoutInner>{children}</HsTtlLayoutInner>
    </Suspense>
  );
}

