import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Dinou 8.0.1 · benchmark</title>
        <meta name="description" content="App de benchmark idéntica para Dinou y Next.js" />
        {/* CSS idéntico al de la app de Next.js, servido desde public/. */}
        <link rel="stylesheet" href="/global.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}

