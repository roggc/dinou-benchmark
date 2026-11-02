import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { getHsIndexPageState } from "../../next-cached-segments";

export default async function HsIndexPage() {
  const s = await getHsIndexPageState();

  return (
    <div className="card" id="hs-index-page" data-testid="hs-index-page">
      <div className="card-kicker">HS Index Page (/rigorous/hs)</div>
      <div className="kv">
        <div>
          <dt>Index Page Seq</dt>
          <dd id="hs-index-seq" data-testid="hs-index-seq">
            {s.hsIndexPageSeq}
          </dd>
        </div>
        <div>
          <dt>Index Props Seq</dt>
          <dd id="hs-index-props-seq" data-testid="hs-index-props-seq">
            {s.hsIndexPropsSeq}
          </dd>
        </div>
      </div>
      <RigorousClientProbe id="hs-page-client" label="HS Index Page Client" />
    </div>
  );
}

