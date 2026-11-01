import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "@/shared/components/rigorous-ui";
import { RigorousControls } from "../rigorous-controls";
import { rigorousSlotServerPing } from "../rigorous-actions";
import { sleep } from "@/shared/lib/data";
import {
  getTsL1ShellState,
  getTsLayoutShellSlotState,
} from "../next-cached-segments";

async function TsLayoutShellSlotContent() {
  const s = await getTsLayoutShellSlotState();
  return (
    <div id="ts-layout-shell-slot-box">
      <span>
        Layout Shell Slot Seq:{" "}
        <strong id="ts-layout-shell-slot-seq">{s.tsLayoutShellSlotSeq}</strong> | Label:{" "}
        <span id="ts-layout-shell-slot-label">{s.tsLayoutShellSlotLabel}</span>
      </span>
      <RigorousSlotWidget
        id="ts-layout-shell-widget"
        serverToken={`ts-l1-slot-${s.tsLayoutShellSlotSeq}`}
        onServerPing={rigorousSlotServerPing}
      />
    </div>
  );
}

async function TsL1DynamicHole() {
  const cookieStore = await cookies();
  const rawUser = cookieStore.get("ts_user")?.value;
  const user = rawUser && rawUser.length > 0 ? rawUser : "ts-guest";
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ts-l1-hole">
      L1 Hole Seq: <strong id="ts-l1-hole-seq">{s.tsL1HoleSeq}</strong> | User:{" "}
      <span id="ts-l1-hole-user">{user}</span>
    </div>
  );
}

export default async function TripleSynergyLayout({ children }: { children: ReactNode }) {
  const s = await getTsL1ShellState();
  return (
    <div id="ts-l1-layout" style={{ border: "2px solid #b71c1c", padding: 12 }}>
      <RigorousControls suite="triple" />
      <div style={{ display: "grid", gap: 6 }}>
        <div>
          <strong>Triple L1 Shell Seq:</strong>{" "}
          <span id="ts-l1-shell-seq">{s.tsL1ShellSeq}</span> | Label:{" "}
          <span id="ts-l1-shell-label">{s.tsL1ShellLabel}</span>
          <RigorousClientProbe id="ts-l1-client" label="Triple L1 Client" />
        </div>
        <TsLayoutShellSlotContent />
        <Suspense fallback={<div id="ts-fallback-l1-hole">Loading triple L1 hole...</div>}>
          <TsL1DynamicHole />
        </Suspense>
      </div>

      <nav style={{ display: "flex", gap: 10, margin: "8px 0", flexWrap: "wrap" }}>
        <Link id="nav-ts-ppr-a" href="/rigorous/triple">
          PPR Page A
        </Link>
        <Link id="nav-ts-ppr-b" href="/rigorous/triple/ppr-b">
          PPR Page B
        </Link>
        <Link id="nav-ts-static-a" href="/rigorous/triple/static-a">
          Static Child A
        </Link>
        <Link id="nav-ts-static-b" href="/rigorous/triple/static-b">
          Static Child B
        </Link>
        <Link id="nav-ts-nested" href="/rigorous/triple/nested">
          Nested L2 PPR
        </Link>
        <Link id="nav-ts-nested-static" href="/rigorous/triple/nested/static-child">
          Nested Static Child
        </Link>
      </nav>

      <div id="ts-l1-outlet">{children}</div>
    </div>
  );
}

