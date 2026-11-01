import type { ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";

async function HscsL2SlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-l2-slot", "slot:hscs-l2-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="hscs-l2-slot-box">
      L2 Slot Seq: <span id="hscs-l2-slot-seq">{s.hscsL2SlotSeq}</span> | Label:{" "}
      <span id="hscs-l2-slot-label">{s.hscsL2SlotLabel}</span>
    </div>
  );
}

async function getHscsL2HostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hscs-l2-layout-tag",
    "layout:/rigorous/hs-cache-slot/nested",
    "subtree:/rigorous/hs-cache-slot/nested",
    "subtree:/rigorous/hs-cache-slot"
  );
  return getRigorousState();
}

export default async function HsCacheSlotNestedLayout({ children }: { children: ReactNode }) {
  const s = await getHscsL2HostState();
  return (
    <div id="hscs-l2-layout" style={{ border: "1px dashed #6a1b9a", padding: 8, marginTop: 8 }}>
      <div>
        L2 Host Seq: <span id="hscs-l2-host-seq">{s.hscsL2HostSeq}</span>
        <RigorousClientProbe id="hscs-l2-client" label="L2 Client" />
      </div>
      <HscsL2SlotContent />
      <div id="hscs-l2-outlet">{children}</div>
    </div>
  );
}

