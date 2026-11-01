import { Suspense } from "react";
import { getContext } from "dinou";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { sleep } from "../../../shared/lib/data";

async function HsPprSidebarDynamicHole() {
  const ctx = getContext();
  void ctx?.req?.headers?.["user-agent"];
  await sleep(20);
  const s = getRigorousState();
  return (
    <span id="hsppr-sidebar-hole">
      Sidebar Hole Seq: <strong id="hsppr-sidebar-hole-seq">{s.hspprSidebarHoleSeq}</strong>
    </span>
  );
}

export default function HsPprSidebarPage() {
  const s = getRigorousState();
  return (
    <div id="hsppr-sidebar-parallel" style={{ border: "1px dashed #8e24aa", padding: 6 }}>
      <span>
        Sidebar Shell Seq: <strong id="hsppr-sidebar-shell-seq">{s.hspprSidebarShellSeq}</strong> |{" "}
      </span>
      <Suspense fallback={<span id="hsppr-fallback-sidebar-hole">Loading sidebar hole...</span>}>
        <HsPprSidebarDynamicHole />
      </Suspense>
    </div>
  );
}
