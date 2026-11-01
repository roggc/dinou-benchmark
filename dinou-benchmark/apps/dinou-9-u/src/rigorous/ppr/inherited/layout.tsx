import type { ReactNode } from "react";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { RigorousControls } from "../../rigorous-controls";

export default function PprInheritedLayout({ children }: { children: ReactNode }) {
  const s = getRigorousState();
  return (
    <div id="ppr-inherited-layout" style={{ border: "1px dashed #ad1457", padding: 10 }}>
      <RigorousControls suite="ppr-inherited" />
      <p>
        Inherited PPR Layout Seq:{" "}
        <span id="ppr-inherited-layout-seq">{s.pprInheritedLayoutSeq}</span>
      </p>
      {children}
    </div>
  );
}
