import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function getHsBadgeSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hs-l2-layout-tag", "layout:/rigorous/hs/nested", "subtree:/rigorous/hs/nested");
  return getRigorousState();
}

export default async function HsBadgeSlotPage() {
  const s = await getHsBadgeSlotState();
  return (
    <span id="hs-badge-slot">
      Badge Slot Seq: <strong id="hs-badge-slot-seq">{s.hsBadgeSlotSeq}</strong>
    </span>
  );
}

