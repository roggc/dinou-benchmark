import type { ReactNode } from "react";
import { getRigorousState } from "../../../../shared/lib/rigorous-state";
import { RigorousClientProbe } from "../../../../shared/components/rigorous-ui";

export default function HsDeptLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { deptId: string };
}) {
  const s = getRigorousState();
  return (
    <div id="hs-dept-layout" style={{ border: "1px dashed #6a1b9a", padding: 8, marginTop: 8 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <strong>Dept Layout:</strong>
        <span id="hs-dept-param">{params.deptId}</span>
        <span>
          Seq: <span id="hs-dept-seq">{s.hsDeptSeq}</span>
        </span>
        <RigorousClientProbe id="hs-dept-client" label="Dept Client" />
      </div>
      <div id="hs-dept-outlet">{children}</div>
    </div>
  );
}
