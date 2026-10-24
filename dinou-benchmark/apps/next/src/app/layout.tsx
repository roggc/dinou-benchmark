import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Next.js 16.4.2 · benchmark",
  description: "App de benchmark idéntica para Dinou y Next.js",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        {/* React 19 eleva este link al <head>. Es el mismo global.css que sirve Dinou. */}
        <link rel="stylesheet" href="/global.css" />
        {children}
      </body>
    </html>
  );
}

