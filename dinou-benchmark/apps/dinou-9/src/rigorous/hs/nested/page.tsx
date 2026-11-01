import { getRigorousState } from "../../../shared/lib/rigorous-state";

export default function HsNestedPage1() {
  const s = getRigorousState();
  return (
    <div id="hs-nested-page-1">
      <h2>HS Nested Page 1</h2>
      <p>
        Nested Page 1 Seq: <span id="hs-nested-page1-seq">{s.hsNestedPage1Seq}</span>
      </p>
    </div>
  );
}
