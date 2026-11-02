import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { getHsSiblingBState } from "../../../next-cached-segments";

export default async function HsSiblingBPage() {
  const s = await getHsSiblingBState();
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

