import type { ReactNode } from "react";
import { Link } from "dinou";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { RigorousClientProbe } from "../../../shared/components/rigorous-ui";
import { RigorousControls } from "../../rigorous-controls";

export default function HsResetBranchLayout({ children }: { children: ReactNode }) {
  const s = getRigorousState();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>HS Reset Layout Branch</title>
      </head>
      <body>
        <div id="hs-reset-layout" style={{ border: "2px solid #c62828", padding: 12 }}>
          <RigorousControls suite="hs-reset" />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <strong>Reset Branch Root Layout Seq:</strong>
            <span id="hs-reset-layout-seq">{s.hsResetLayoutSeq}</span>
            <RigorousClientProbe id="hs-reset-client" label="Reset Client" />
            <Link id="nav-hs-reset-back" href="/rigorous/hs">
              Back to HS L1
            </Link>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
