import { getRigorousState } from "@/shared/lib/rigorous-state";

export default function HsSiblingAPage() {
  const s = getRigorousState();
  return (
    <div className="card" id="hs-sibling-a-page" data-testid="hs-sibling-a-page">
      <div className="card-kicker">HS Sibling A (/rigorous/hs/sibling-a)</div>
      <div className="card-value" id="hs-sibling-a-seq" data-testid="hs-sibling-a-seq">
        {s.hsSiblingASeq}
      </div>
    </div>
  );
}

