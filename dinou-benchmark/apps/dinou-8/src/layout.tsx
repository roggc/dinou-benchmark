import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Dinou 8.1.2 · benchmark</title>
        <meta name="description" content="Identical benchmark application for Dinou and Next.js" />
        {/* Same global.css as Next.js app, served from public/. */}
        <link rel="stylesheet" href="/global.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}

