import {
  getHscsSidebarHostState,
  getHscsSidebarSlotState,
} from "../../next-cached-segments";

async function HscsSidebarSlotContent() {
  const s = await getHscsSidebarSlotState();
  return (
    <span id="hscs-sidebar-slot-box">
      Sidebar Slot Seq: <strong id="hscs-sidebar-slot-seq">{s.hscsSidebarSlotSeq}</strong> | Label:{" "}
      <span id="hscs-sidebar-slot-label">{s.hscsSidebarSlotLabel}</span>
    </span>
  );
}

export default async function HsCacheSlotSidebarPage() {
  const s = await getHscsSidebarHostState();
  return (
    <div id="hscs-sidebar-parallel" style={{ border: "1px dashed #558b2f", padding: 6 }}>
      <span>
        Sidebar Host Seq: <strong id="hscs-sidebar-host-seq">{s.hscsSidebarHostSeq}</strong> |{" "}
      </span>
      <HscsSidebarSlotContent />
    </div>
  );
}
