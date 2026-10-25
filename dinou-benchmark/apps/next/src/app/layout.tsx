import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Next.js 16.4.2 · benchmark",
  description: "Identical benchmark application for Dinou and Next.js",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* React 19 hoists this link to <head>. Same global.css served by Dinou. */}
        <link rel="stylesheet" href="/global.css" />
        {children}
      </body>
    </html>
  );
}

