"use client";

import { useEffect } from "react";
import { Link, refreshSlot, useRouter } from "dinou";
import {
  rigorousBumpKeys,
  rigorousGetState,
  rigorousMutateState,
  rigorousResetState,
  rigorousRevalidateLayout,
  rigorousRevalidatePage,
  rigorousRevalidatePath,
  rigorousRevalidateTag,
} from "./rigorous-actions";
import type { RigorousState } from "@/shared/lib/rigorous-state";

export type BenchRigorousApi = {
  framework: "dinou" | "next";
  getState: () => Promise<RigorousState>;
  mutateState: (patch: Partial<RigorousState>) => Promise<RigorousState>;
  bumpKeys: (keys: (keyof RigorousState)[], delta?: number) => Promise<RigorousState>;
  resetState: () => Promise<RigorousState>;
  revalidateTag: (tag: string) => Promise<{ ok: true; tag: string }>;
  revalidatePage: (path: string) => Promise<{ ok: true; path: string }>;
  revalidateLayout: (path: string) => Promise<{ ok: true; path: string }>;
  revalidatePath: (path: string) => Promise<{ ok: true; path: string }>;
  refreshPage: () => void;
  refreshLayout: () => void;
  refreshSlot: (idOrTag: string, fresh?: boolean) => Promise<void> | void;
  navigate: (href: string, fresh?: boolean) => void;
};

declare global {
  interface Window {
    __BENCH_RIGOROUS__?: BenchRigorousApi;
  }
}

export function RigorousControls({
  suite,
  links = [],
}: {
  suite: string;
  links?: readonly (readonly [string, string, boolean?])[];
}) {
  const router = useRouter();

  useEffect(() => {
    window.__BENCH_RIGOROUS__ = {
      framework: "dinou",
      getState: () => rigorousGetState(),
      mutateState: (patch) => rigorousMutateState(patch),
      bumpKeys: (keys, delta = 1) => rigorousBumpKeys(keys, delta),
      resetState: () => rigorousResetState(),
      revalidateTag: (tag) => rigorousRevalidateTag(tag),
      revalidatePage: (path) => rigorousRevalidatePage(path),
      revalidateLayout: (path) => rigorousRevalidateLayout(path),
      revalidatePath: (path) => rigorousRevalidatePath(path),
      refreshPage: () => {
        router.refresh();
      },
      refreshLayout: () => {
        router.refresh({ layout: true });
      },
      refreshSlot: (idOrTag, fresh = false) => {
        refreshSlot(idOrTag, { fresh });
      },
      navigate: (href, fresh = false) => {
        router.push(href, { fresh });
      },
    };
  }, [router]);

  return (
    <div
      className="card"
      data-testid={`rigorous-controls-${suite}`}
      style={{ marginBottom: "18px", minHeight: "auto", padding: "12px 16px" }}
    >
      <div className="card-kicker">Rigorous Suite Controls · {suite} (Dinou 9.0.3)</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
        <button
          type="button"
          id="btn-refresh-page"
          data-testid="btn-refresh-page"
          onClick={() => router.refresh()}
          style={{
            background: "var(--panel-2)",
            color: "var(--text)",
            border: "1px solid var(--line)",
            borderRadius: "6px",
            padding: "4px 10px",
            cursor: "pointer",
            fontFamily: "var(--mono)",
            fontSize: "11px",
          }}
        >
          router.refresh()
        </button>
        <button
          type="button"
          id="btn-refresh-layout"
          data-testid="btn-refresh-layout"
          onClick={() => router.refresh({ layout: true })}
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
          router.refresh(&#123; layout: true &#125;)
        </button>
        <button
          type="button"
          id="btn-refresh-all-slots"
          data-testid="btn-refresh-all-slots"
          onClick={() => refreshSlot("*", { fresh: true })}
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
          refreshSlot(&quot;*&quot;, &#123; fresh: true &#125;)
        </button>
      </div>
      {links.length > 0 ? (
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "10px",
            paddingTop: "8px",
            borderTop: "1px solid var(--line)",
          }}
        >
          {links.map(([href, label, isFresh]) => (
            <Link
              key={`${href}-${label}-${isFresh ? "fresh" : "cached"}`}
              href={href}
              fresh={Boolean(isFresh)}
              className="nav-link"
              data-testid={`nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              {label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

