import type { ReactNode } from "react";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { RigorousControls } from "../../rigorous-controls";

async function getHsResetLayoutState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("layout:/rigorous/hs/reset-branch");
  return getRigorousState();
}

export default async function HsResetBranchLayout({ children }: { children: ReactNode }) {
  const s = await getHsResetLayoutState();
  return (
    <div id="hs-reset-layout" style={{ border: "2px solid #c62828", padding: 12 }}>
      <RigorousControls suite="hs-reset" />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <strong>Reset Branch Root Layout Seq:</strong>
        <span id="hs-reset-layout-seq">{s.hsResetLayoutSeq}</span>
        <RigorousClientProbe id="hs-reset-client" label="Reset Client" />
        <Link id="nav-hs-reset-back" href="/rigorous/hs">
          Back to HS L1
        </Link>
      </div>
      {children}
    </div>
  );
}

