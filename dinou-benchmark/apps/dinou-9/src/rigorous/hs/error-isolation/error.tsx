"use client";

import { Link } from "dinou";

export default function HsErrorBoundary({
  error,
}: {
  error?: Error & { digest?: string };
}) {
  return (
    <div id="hs-page-error-boundary" style={{ border: "2px solid #c62828", padding: 10 }}>
      <strong>Page Error Boundary Caught:</strong>{" "}
      <span id="hs-page-error-msg">{error?.message ?? "Unknown error"}</span>
      <div style={{ marginTop: 8 }}>
        <Link id="nav-hs-error-recover" href="/rigorous/hs/error-isolation/healthy">
          Recover to Healthy Page
        </Link>
      </div>
    </div>
  );
}

