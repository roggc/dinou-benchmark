import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { RigorousControls } from "../rigorous-controls";
import { getCsBannerSlotState } from "../next-cached-segments";

async function CsBannerSlotContent() {
  const s = await getCsBannerSlotState();
  return (
    <div id="cs-banner-slot">
      Banner Seq: <span id="cs-banner-seq">{s.csBannerSeq}</span> | Label:{" "}
      <span id="cs-banner-label">{s.csBannerLabel}</span>
    </div>
  );
}

async function CsLayoutHostSeq() {
  await connection();
  const s = getRigorousState();
  return <span id="cs-layout-host-seq">{s.csLayoutHostSeq}</span>;
}

export default function CacheSlotLayout({ children }: { children: ReactNode }) {
  return (
    <div id="cs-layout" style={{ border: "2px solid #00695c", padding: 12 }}>
      <RigorousControls suite="cache-slot" />
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <strong>CS Layout Host Seq:</strong>
        <Suspense fallback={<span id="cs-layout-host-seq-loading">...</span>}>
          <CsLayoutHostSeq />
        </Suspense>
        <RigorousClientProbe id="cs-layout-client" label="CS Layout Client" />
        <CsBannerSlotContent />
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

