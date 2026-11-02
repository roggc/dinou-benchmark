import type { ReactNode } from "react";
import { getRigorousState } from "../../../shared/lib/rigorous-state";

export default function HsTtlLayout({ children }: { children: ReactNode }) {
  const s = getRigorousState();
  return (
    <div id="hs-ttl-layout" style={{ border: "1px dashed #ef6c00", padding: 8, marginTop: 8 }}>
      <p>
        TTL Layout (1s) Seq: <span id="hs-ttl-layout-seq">{s.hsTtlLayoutSeq}</span>
      </p>
      {children}
    </div>
  );
}
