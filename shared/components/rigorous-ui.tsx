"use client";

import { useEffect, useState } from "react";

let clientMountCounter = 0;

/**
 * Tracks client component mount identity (`mountId`) and local `useState` (`count`)
 * across soft navigations, `router.refresh()`, `router.refresh({ layout: true })`,
 * and live `refreshSlot()` updates without causing SSR/client hydration mismatches.
 */
export function RigorousClientProbe({ id, label }: { id: string; label: string }) {
  const [mountId, setMountId] = useState<string>("ssr");
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    clientMountCounter += 1;
    setMountId(`m-${clientMountCounter}-${Math.random().toString(36).slice(2, 7)}`);
  }, []);

  return (
    <div className="shell-note" id={id} data-testid={id}>
      <span className="dot" />
      <span>{label}</span>
      <span>
        mount: <strong id={`${id}-mount`} data-testid={`${id}-mount`}>{mountId}</strong>
      </span>
      <span>
        state: <strong id={`${id}-count`} data-testid={`${id}-count`}>{count}</strong>
      </span>
      <button
        type="button"
        id={`${id}-btn`}
        data-testid={`${id}-inc`}
        onClick={() => setCount((c) => c + 1)}
        style={{
          background: "var(--panel-2)",
          color: "var(--accent)",
          border: "1px solid var(--line)",
          borderRadius: "6px",
          padding: "2px 8px",
          cursor: "pointer",
          fontFamily: "var(--mono)",
          fontSize: "11px",
        }}
      >
        +1
      </button>
    </div>
  );
}

/**
 * Interactive Client Component rendered INSIDE a cached `<DinouCacheSlot>` (or Next.js `"use cache"` subtree).
 * Verifies:
 *   1. In-place Fiber reconciliation on `refreshSlot`: `serverToken` updates while `count` and `mountId` stay intact.
 *   2. `"use server"` action prop serialization (`onServerPing`) surviving `slot.json` cache hits.
 */
export function RigorousSlotWidget({
  id,
  label,
  serverToken,
  slotToken,
  onServerPing,
}: {
  id: string;
  label?: string;
  serverToken?: string | number;
  slotToken?: string | number;
  onServerPing?: (slotId: string) => Promise<any>;
}) {
  const [mountId, setMountId] = useState<string>("ssr");
  const [count, setCount] = useState<number>(0);
  const [pingResult, setPingResult] = useState<string>("idle");

  useEffect(() => {
    clientMountCounter += 1;
    setMountId(`sw-${clientMountCounter}-${Math.random().toString(36).slice(2, 7)}`);
  }, []);

  const hasPropAction = typeof onServerPing === "function";
  const displayToken = serverToken ?? slotToken ?? "";

  return (
    <div className="card" id={id} data-testid={id}>
      <div className="card-kicker">{label ?? id}</div>
      <div className="card-value" id={`${id}-token`} data-testid={`${id}-token`}>
        {String(displayToken)}
      </div>
      <p className="card-detail">
        mount: <span id={`${id}-mount`} data-testid={`${id}-mount`}>{mountId}</span> · clicks:{" "}
        <strong id={`${id}-count`} data-testid={`${id}-count`}>{count}</strong> · action-prop:{" "}
        <span id={`${id}-prop-status`} data-testid={`${id}-prop-status`}>
          {hasPropAction ? "fn-present" : "fn-missing"}
        </span>
      </p>
      <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          id={`${id}-btn`}
          data-testid={`${id}-inc`}
          onClick={() => setCount((c) => c + 1)}
          style={{
            background: "var(--panel-2)",
            color: "var(--accent)",
            border: "1px solid var(--line)",
            borderRadius: "6px",
            padding: "4px 10px",
            cursor: "pointer",
            fontFamily: "var(--mono)",
            fontSize: "11px",
          }}
        >
          +1 slot state
        </button>
        {hasPropAction ? (
          <button
            type="button"
            id={`${id}-ping`}
            data-testid={`${id}-ping-btn`}
            onClick={async () => {
              const res = await onServerPing(id);
              const text = typeof res === "string" ? res : (res?.pong ?? JSON.stringify(res));
              setPingResult(text);
            }}
            style={{
              background: "var(--panel-2)",
              color: "var(--accent-2)",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: "11px",
            }}
          >
            Ping Server Prop
          </button>
        ) : null}
      </div>
      <div className="card-stamp" id={`${id}-pong`} data-testid={`${id}-ping-result`}>
        {pingResult}
      </div>
    </div>
  );
}
