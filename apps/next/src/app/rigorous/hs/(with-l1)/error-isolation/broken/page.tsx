import { Suspense } from "react";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function HsErrorBrokenInner() {
  await connection();
  const s = getRigorousState();
  if (s.hsTriggerBrokenPage) {
    throw new Error("Simulated page crash inside DinouPageSlot");
  }
  return (
    <div id="hs-error-broken-page">
      <h2>Broken Sub-Route (Armed when hsTriggerBrokenPage=true)</h2>
    </div>
  );
}

export default function HsErrorBrokenPage() {
  return (
    <Suspense fallback={null}>
      <HsErrorBrokenInner />
    </Suspense>
  );
}

