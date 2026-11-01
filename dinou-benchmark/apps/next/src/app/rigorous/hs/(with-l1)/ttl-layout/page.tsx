import { getHsTtlChildPageState } from "../../../next-cached-segments";

export default async function HsTtlChildPage() {
  const s = await getHsTtlChildPageState();
  return (
    <div id="hs-ttl-child-page">
      <h2>TTL Layout Child Page (3600s)</h2>
      <p>
        Child Page Seq: <span id="hs-ttl-child-page-seq">{s.hsTtlChildPageSeq}</span>
      </p>
    </div>
  );
}
