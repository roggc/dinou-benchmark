import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { RigorousClientProbe } from "../../../shared/components/rigorous-ui";

export default function HsSiblingBPage() {
  const s = getRigorousState();
  return (
    <div id="hs-sibling-b-page">
      <h2>HS Sibling B Page</h2>
      <p>
        Sibling B Seq: <span id="hs-sibling-b-seq">{s.hsSiblingBSeq}</span>
      </p>
      <RigorousClientProbe id="hs-sibling-b-client" label="Sibling B Client" />
    </div>
  );
}
