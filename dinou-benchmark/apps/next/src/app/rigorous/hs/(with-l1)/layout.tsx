import type { ReactNode } from "react";
import { PageHeader, Shell } from "@/shared/components/ui";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { RigorousControls } from "../../rigorous-controls";
import { getHsL1LayoutState } from "../../next-cached-segments";

const HS_LINKS = [
  ["/rigorous/hs", "Index"],
  ["/rigorous/hs/sibling-a", "Sibling A"],
  ["/rigorous/hs/sibling-a", "Sibling A Fresh", true],
  ["/rigorous/hs/sibling-b", "Sibling B"],
  ["/rigorous/hs/nested", "Nested P1"],
  ["/rigorous/hs/nested/page-2", "Nested P2"],
  ["/rigorous/hs/dept/eng", "Dept Eng"],
  ["/rigorous/hs/dept/eng/members", "Dept Eng Members"],
  ["/rigorous/hs/dept/sales", "Dept Sales"],
  ["/rigorous/hs/locked/alpha", "Locked Alpha"],
  ["/rigorous/hs/ttl-layout", "TTL Layout"],
  ["/rigorous/hs/ttl-page", "TTL Page"],
  ["/rigorous/hs/refresh-lab?filter=active&buildId=custom_b1&v=custom_v1", "Refresh Lab"],
  ["/rigorous/hs/error-isolation/healthy", "Error Healthy"],
  ["/rigorous/hs/error-isolation/broken", "Error Broken"],
  ["/rigorous/hs/reset-branch", "Reset Layout"],
  ["/rigorous/hs/no-layout-page", "No Layout"],
] as const;

export default async function HsLayout({ children }: { children: ReactNode }) {
  const s = await getHsL1LayoutState();
  return (
    <Shell>
      <div id="hs-l1-layout" data-testid="hs-l1-layout">
        <PageHeader
          eyebrow="Suite 1 · Horizontal Segmentation (HS)"
          title="Layout & Page Isolation"
          description="Independent layout and page lifecycles, sibling soft navigation, surgical revalidation, and TTL expiration."
          badge="HS"
        />
        <RigorousControls suite="hs" links={HS_LINKS} />
        <div className="kv">
          <div>
            <dt>L1 Layout Seq</dt>
            <dd id="hs-l1-seq" data-testid="hs-l1-seq">
              {s.hsL1LayoutSeq}
            </dd>
          </div>
          <div>
            <dt>L1 Layout Props Seq</dt>
            <dd id="hs-l1-props-seq" data-testid="hs-l1-props-seq">
              {s.hsL1PropsSeq}
            </dd>
          </div>
        </div>
        <RigorousClientProbe id="hs-l1-client" label="HS L1 Layout Client" />
        <div id="hs-l1-outlet" style={{ marginTop: "20px" }}>
          {children}
        </div>
      </div>
    </Shell>
  );
}

