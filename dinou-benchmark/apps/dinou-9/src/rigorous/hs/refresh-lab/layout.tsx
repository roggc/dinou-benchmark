import type { ReactNode } from "react";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { RigorousClientProbe } from "../../../shared/components/rigorous-ui";

export default function HsRefreshLabLayout({ children }: { children: ReactNode }) {
  const s = getRigorousState();
  return (
    <div id="hs-refresh-lab-layout" style={{ border: "1px dashed #00897b", padding: 8, marginTop: 8 }}>
      <div>
        Refresh Lab Layout Seq:{" "}
        <span id="hs-refresh-layout-seq">{s.hsRefreshLabLayoutSeq}</span>
        <RigorousClientProbe id="hs-refresh-lab-client" label="Refresh Lab Client" />
      </div>
      {children}
    </div>
  );
}

