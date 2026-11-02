import { getHsSiblingAState } from "../../../next-cached-segments";

export default async function HsSiblingAPage() {
  const s = await getHsSiblingAState();
  return (
    <div className="card" id="hs-sibling-a-page" data-testid="hs-sibling-a-page">
      <div className="card-kicker">HS Sibling A (/rigorous/hs/sibling-a)</div>
      <div className="card-value" id="hs-sibling-a-seq" data-testid="hs-sibling-a-seq">
        {s.hsSiblingASeq}
      </div>
    </div>
  );
}
