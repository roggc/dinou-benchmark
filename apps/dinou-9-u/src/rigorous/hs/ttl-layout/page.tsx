import { getRigorousState } from "../../../shared/lib/rigorous-state";

export default function HsTtlChildPage() {
  const s = getRigorousState();
  return (
    <div id="hs-ttl-child-page">
      <h2>TTL Layout Child Page (3600s)</h2>
      <p>
        Child Page Seq: <span id="hs-ttl-child-page-seq">{s.hsTtlChildPageSeq}</span>
      </p>
    </div>
  );
}
