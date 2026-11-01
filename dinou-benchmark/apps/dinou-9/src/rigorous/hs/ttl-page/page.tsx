import { getRigorousState } from "../../../shared/lib/rigorous-state";

export default function HsTtlPageOnly() {
  const s = getRigorousState();
  return (
    <div id="hs-ttl-page-only">
      <h2>TTL Page Only (1s)</h2>
      <p>
        TTL Page Seq: <span id="hs-ttl-page-only-seq">{s.hsTtlPageOnlySeq}</span>
      </p>
    </div>
  );
}
