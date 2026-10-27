import { Suspense } from "react";
import { HoleCard, PageHeader, Shell, Skeleton } from "@/shared/components/ui";
import { sleep, stamp } from "@/shared/lib/data";

const DELAY = 200;

async function LiveQuote() {
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

export default function PprPage({ shellStamp }: { shellStamp: string }) {
  return (
    <Shell>
      <PageHeader
        eyebrow="PPR · ppr = true"
        title="Static shell, dynamic hole"
        description="The shell is prerendered at build time and arrives in the first chunk. Within the same HTTP stream, the hole resolves 200 ms later with request-time data."
        badge="partial prerendering"
      />
      <div className="shell-note" data-testid="ppr-shell-stamp">
        <span className="dot" />
        shell generated at build: {shellStamp}
      </div>
      <div className="holes">
        <Suspense fallback={<Skeleton label="quote" />}>
          <LiveQuote />
        </Suspense>
      </div>
    </Shell>
  );
}

