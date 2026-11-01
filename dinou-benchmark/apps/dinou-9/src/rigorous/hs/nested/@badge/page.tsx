import { getRigorousState } from "../../../../shared/lib/rigorous-state";

export default function HsBadgeSlotPage() {
  const s = getRigorousState();
  return (
    <span id="hs-badge-slot">
      Badge Slot Seq: <strong id="hs-badge-slot-seq">{s.hsBadgeSlotSeq}</strong>
    </span>
  );
}
