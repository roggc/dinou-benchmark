import { getRigorousState } from "../../../shared/lib/rigorous-state";

export default function HsPprStaticOptOutPage() {
  const s = getRigorousState();
  return (
    <div id="hsppr-static-optout-page">
      <h2>HS + PPR Static Opt-Out Child (ppr = false)</h2>
      <p>
        Static Opt-Out Seq: <span id="hsppr-static-optout-seq">{s.hspprStaticOptOutSeq}</span> | Label:{" "}
        <span id="hsppr-static-optout-label">{s.hspprStaticOptOutLabel}</span>
      </p>
    </div>
  );
}
