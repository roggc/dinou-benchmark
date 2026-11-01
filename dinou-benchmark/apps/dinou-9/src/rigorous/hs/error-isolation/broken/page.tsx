import { getRigorousState } from "../../../../shared/lib/rigorous-state";

export default function HsErrorBrokenPage() {
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

