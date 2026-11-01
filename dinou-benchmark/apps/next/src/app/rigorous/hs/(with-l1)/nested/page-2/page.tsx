import { getHsNestedPage2State } from "../../../../next-cached-segments";

export default async function HsNestedPage2() {
  const s = await getHsNestedPage2State();
  return (
    <div id="hs-nested-page-2">
      <h2>HS Nested Page 2</h2>
      <p>
        Nested Page 2 Seq: <span id="hs-nested-page2-seq">{s.hsNestedPage2Seq}</span>
      </p>
    </div>
  );
}

