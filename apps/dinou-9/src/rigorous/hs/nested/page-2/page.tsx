import { getRigorousState } from "../../../../shared/lib/rigorous-state";

export default function HsNestedPage2() {
  const s = getRigorousState();
  return (
    <div id="hs-nested-page-2">
      <h2>HS Nested Page 2</h2>
      <p>
        Nested Page 2 Seq: <span id="hs-nested-page2-seq">{s.hsNestedPage2Seq}</span>
      </p>
    </div>
  );
}
