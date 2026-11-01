import { Link } from "dinou";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { RigorousControls } from "../../rigorous-controls";

export default function HsNoLayoutPage() {
  const s = getRigorousState();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>HS No Layout Page</title>
      </head>
      <body>
        <div id="hs-no-layout-page" style={{ border: "2px solid #0277bd", padding: 12 }}>
          <RigorousControls suite="hs-nolayout" />
          <h2>No Layout Standalone Page</h2>
          <p>
            No-Layout Seq: <span id="hs-no-layout-seq">{s.hsNoLayoutSeq}</span>
          </p>
          <Link id="nav-hs-nolayout-back" href="/rigorous/hs">
            Back to HS L1
          </Link>
        </div>
      </body>
    </html>
  );
}
