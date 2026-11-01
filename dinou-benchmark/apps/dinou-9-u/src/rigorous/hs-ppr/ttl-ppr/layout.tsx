import type { ReactNode } from "react";
import { Suspense } from "react";
import { getContext } from "dinou";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { sleep } from "../../../shared/lib/data";

async function HsPprTtlLayoutHole() {
  const ctx = getContext();
  void ctx?.req?.headers?.["user-agent"];
  await sleep(15);
  const s = getRigorousState();
  return (
    <div id="hsppr-ttl-layout-hole">
      TTL Layout Hole Seq: <span id="hsppr-ttl-layout-hole-seq">{s.hspprTtlLayoutHoleSeq}</span>
    </div>
  );
}

export default function HsPprTtlLayout({ children }: { children: ReactNode }) {
  const s = getRigorousState();
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
