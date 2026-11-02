import { Suspense } from "react";
import { connection } from "next/server";
import { HoleCard, PageHeader, Shell, Skeleton } from "@/shared/components/ui";
import { sleep, stamp } from "@/shared/lib/data";

/** Evaluated when the shell is generated, i.e., at build time. */
const BUILD_STAMP = stamp();

const DELAY = 200;

async function LiveQuote() {
  // `connection()` marks this subtree as request-dependent: Next excludes it
  // from prerendering and streams it as a hole, which is PPR.
  await connection();
  await sleep(DELAY);
  return (
    <HoleCard
      label="live quote"
      value="142.08 €"
      detail="dynamic hole streamed after the shell"
      stamp={stamp()}
    />
  );
}

export default function PprPage() {
  return (
    <Shell>
      <PageHeader
        eyebrow="PPR · static shell + hole"
        title="Static shell, dynamic hole"
        description="The shell is prerendered at build time and arrives in the first chunk. Within the same HTTP stream, the hole resolves 200 ms later with request-time data."
        badge="partial prerendering"
      />
      <div className="shell-note" data-testid="ppr-shell-stamp">
        <span className="dot" />
        shell generated at build: {BUILD_STAMP}
      </div>
      <div className="holes">
        <Suspense fallback={<Skeleton label="quote" />}>
          <LiveQuote />
        </Suspense>
      </div>
    </Shell>
  );
}

