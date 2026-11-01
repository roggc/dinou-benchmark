import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { RigorousControls } from "../rigorous-controls";
import { sleep } from "@/shared/lib/data";
import { getHsPprL1ShellState } from "../next-cached-segments";

async function HsPprL1DynamicHole() {
  const cookieStore = await cookies();
  const rawUser = cookieStore.get("hsppr_user")?.value;
  const user = rawUser && rawUser.length > 0 ? rawUser : "l1-guest";
  await sleep(20);
  const s = getRigorousState();
  return (
    <span id="hsppr-l1-hole">
      L1 Hole Seq: <strong id="hsppr-l1-hole-seq">{s.hspprL1HoleSeq}</strong> | User:{" "}
      <span id="hsppr-l1-hole-user">{user}</span>
    </span>
  );
}

export default async function HsPprLayout({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  const s = await getHsPprL1ShellState();
  return (
    <div id="hsppr-l1-layout" style={{ border: "2px solid #6a1b9a", padding: 12 }}>
      <RigorousControls suite="hs-ppr" />
      <div style={{ display: "grid", gap: 6 }}>
        <div>
          <strong>HS+PPR L1 Shell Seq:</strong>{" "}
          <span id="hsppr-l1-shell-seq">{s.hspprL1ShellSeq}</span> | Label:{" "}
          <span id="hsppr-l1-shell-label">{s.hspprL1ShellLabel}</span>
          <RigorousClientProbe id="hsppr-l1-client" label="HS+PPR L1 Client" />
        </div>
        <Suspense fallback={<span id="hsppr-fallback-l1-hole">Loading L1 hole...</span>}>
          <HsPprL1DynamicHole />
        </Suspense>
        <div id="hsppr-sidebar-container">{sidebar}</div>
      </div>

      <nav style={{ display: "flex", gap: 10, margin: "8px 0", flexWrap: "wrap" }}>
        <Link id="nav-hsppr-page-a" href="/rigorous/hs-ppr">
          PPR Page A
        </Link>
        <Link id="nav-hsppr-page-b" href="/rigorous/hs-ppr/ppr-b">
          PPR Page B
        </Link>
        <Link id="nav-hsppr-optout" href="/rigorous/hs-ppr/static-optout">
          Static Opt-Out
        </Link>
        <Link id="nav-hsppr-nested" href="/rigorous/hs-ppr/nested">
          Nested L2 PPR
        </Link>
        <Link id="nav-hsppr-ttl-layout" href="/rigorous/hs-ppr/ttl-ppr">
          TTL Layout (1s)
        </Link>
        <Link id="nav-hsppr-ttl-page" href="/rigorous/hs-ppr/page-ttl-ppr">
          TTL Page (1s)
        </Link>
      </nav>

      <div id="hsppr-l1-outlet">{children}</div>
    </div>
  );
}

