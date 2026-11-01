import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../../shared/lib/rigorous-state";

function HscsSidebarSlotContent() {
  const s = getRigorousState();
  return (
    <span id="hscs-sidebar-slot-box">
      Sidebar Slot Seq: <strong id="hscs-sidebar-slot-seq">{s.hscsSidebarSlotSeq}</strong> | Label:{" "}
      <span id="hscs-sidebar-slot-label">{s.hscsSidebarSlotLabel}</span>
    </span>
  );
}

export default function HsCacheSlotSidebarPage() {
  const s = getRigorousState();
  return (
    <div id="hscs-sidebar-parallel" style={{ border: "1px dashed #558b2f", padding: 6 }}>
      <span>
        Sidebar Host Seq: <strong id="hscs-sidebar-host-seq">{s.hscsSidebarHostSeq}</strong> |{" "}
      </span>
      <DinouCacheSlot id="hscs-sidebar-slot" tags={["hscs-tag-sidebar-slot"]} revalidate={3600}>
        <HscsSidebarSlotContent />
      </DinouCacheSlot>
    </div>
  );
}
