import { cacheLife, cacheTag } from "next/cache";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function getHsIndexPageState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hs-index-page-tag", "page:/rigorous/hs", "subtree:/rigorous/hs");
  return getRigorousState();
}

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

