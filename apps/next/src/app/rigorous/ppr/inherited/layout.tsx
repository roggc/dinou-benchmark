import type { ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousControls } from "../../rigorous-controls";

async function getPprInheritedLayoutState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("layout:/rigorous/ppr/inherited", "subtree:/rigorous/ppr/inherited");
  return getRigorousState();
}

export default async function PprInheritedLayout({ children }: { children: ReactNode }) {
  const s = await getPprInheritedLayoutState();
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

