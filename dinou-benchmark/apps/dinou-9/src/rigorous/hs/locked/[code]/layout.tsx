import type { ReactNode } from "react";

export default function HsLockedLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { code: string };
}) {
  return (
    <div id="hs-locked-layout" data-code={params.code}>
      {children}
    </div>
  );
}

