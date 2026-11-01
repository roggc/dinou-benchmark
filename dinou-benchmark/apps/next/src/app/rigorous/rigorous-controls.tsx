"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  rigorousBumpKeys,
  rigorousGetState,
  rigorousMutateState,
  rigorousNextRefreshSlot,
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
      framework: "next",
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
        router.refresh();
      },
      refreshSlot: async (idOrTag, fresh = false) => {
        if (fresh) {
          await rigorousNextRefreshSlot(idOrTag);
        }
        router.refresh();
      },
      navigate: (href, fresh = false) => {
        router.push(href);
        if (fresh) {
          router.refresh();
        }
      },
    };
  }, [router]);

  return (
    <div
      className="card"
      data-testid={`rigorous-controls-${suite}`}
      style={{ marginBottom: "18px", minHeight: "auto", padding: "12px 16px" }}
    >
      <div className="card-kicker">Rigorous Suite Controls · {suite} (Next.js 16.4.3)</div>
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
          onClick={() => router.refresh()}
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
          router.refresh() [layout]
        </button>
        <button
          type="button"
          id="btn-refresh-all-slots"
          data-testid="btn-refresh-all-slots"
          onClick={async () => {
            await rigorousNextRefreshSlot("*");
            router.refresh();
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
          updateTag + router.refresh()
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

