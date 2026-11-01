import type { ReactNode } from "react";
import { Link } from "dinou";
import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../shared/lib/rigorous-state";
import { RigorousClientProbe } from "../../shared/components/rigorous-ui";
import { RigorousControls } from "../rigorous-controls";

function CsBannerSlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-banner-slot">
      Banner Seq: <span id="cs-banner-seq">{s.csBannerSeq}</span> | Label:{" "}
      <span id="cs-banner-label">{s.csBannerLabel}</span>
    </div>
  );
}

export default function CacheSlotLayout({ children }: { children: ReactNode }) {
  const s = getRigorousState();
  return (
    <div id="cs-layout" style={{ border: "2px solid #00695c", padding: 12 }}>
      <RigorousControls suite="cache-slot" />
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <strong>CS Layout Host Seq:</strong>
        <span id="cs-layout-host-seq">{s.csLayoutHostSeq}</span>
        <RigorousClientProbe id="cs-layout-client" label="CS Layout Client" />
        <DinouCacheSlot id="cs-layout-banner" tags={["cs-tag-banner"]} revalidate={3600}>
          <CsBannerSlotContent />
        </DinouCacheSlot>
      </div>
      <nav style={{ display: "flex", gap: 10, margin: "8px 0" }}>
        <Link id="nav-cs-dynamic" href="/rigorous/cache-slot">
          Dynamic Host
        </Link>
        <Link id="nav-cs-static" href="/rigorous/cache-slot/static-host">
          Static Host
        </Link>
      </nav>
      <div id="cs-outlet">{children}</div>
    </div>
  );
}
