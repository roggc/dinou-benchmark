import { getRigorousState } from "../../../../shared/lib/rigorous-state";

export default function PprOptOutPage() {
  const s = getRigorousState();
  return (
    <div id="ppr-optout-page">
      <h2>Opt-Out Child Page (ppr = false)</h2>
      <p>
        Opt-Out Static Seq: <span id="ppr-optout-seq">{s.pprOptOutSeq}</span>
      </p>
    </div>
  );
}
