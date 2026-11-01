import type { ReactNode } from "react";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { getHsNestedLayoutState } from "../../../next-cached-segments";

export default async function HsNestedLayout({
  children,
  badge,
}: {
  children: ReactNode;
  badge?: ReactNode;
}) {
  const s = await getHsNestedLayoutState();
  return (
    <div id="hs-l2-layout" style={{ border: "1px dashed #2e7d32", padding: 8, marginTop: 8 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <strong>L2 Nested Layout Seq:</strong>
        <span id="hs-l2-seq">{s.hsL2Seq}</span>
        <RigorousClientProbe id="hs-l2-client" label="L2 Client" />
        <div id="hs-l2-badge-slot">{badge}</div>
      </div>
      <div id="hs-l2-outlet">{children}</div>
    </div>
  );
}

