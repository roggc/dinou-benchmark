import type { ReactNode } from "react";
import { notFound } from "next/navigation";

const VALID_CODES = new Set(["alpha", "beta"]);

export function generateStaticParams() {
  return [{ code: "alpha" }, { code: "beta" }];
}

export default async function HsLockedLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!VALID_CODES.has(code)) {
    notFound();
  }
  return (
    <div id="hs-locked-layout" data-code={code}>
      {children}
    </div>
  );
}

