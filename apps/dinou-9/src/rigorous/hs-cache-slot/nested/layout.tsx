import type { ReactNode } from "react";
import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { RigorousClientProbe } from "../../../shared/components/rigorous-ui";

function HscsL2SlotContent() {
  const s = getRigorousState();
  return (
    <div id="hscs-l2-slot-box">
      L2 Slot Seq: <span id="hscs-l2-slot-seq">{s.hscsL2SlotSeq}</span> | Label:{" "}
      <span id="hscs-l2-slot-label">{s.hscsL2SlotLabel}</span>
    </div>
  );
}

export default function HsCacheSlotNestedLayout({ children }: { children: ReactNode }) {
  const s = getRigorousState();
  return (
    <div id="hscs-l2-layout" style={{ border: "1px dashed #6a1b9a", padding: 8, marginTop: 8 }}>
      <div>
        L2 Host Seq: <span id="hscs-l2-host-seq">{s.hscsL2HostSeq}</span>
        <RigorousClientProbe id="hscs-l2-client" label="L2 Client" />
      </div>
      <DinouCacheSlot id="hscs-l2-slot" tags={["hscs-tag-l2-slot"]} revalidate={3600}>
        <HscsL2SlotContent />
      </DinouCacheSlot>
      <div id="hscs-l2-outlet">{children}</div>
    </div>
  );
}
