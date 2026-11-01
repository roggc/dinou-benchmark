import { notFound } from "next/navigation";

const VALID_CODES = new Set(["alpha", "beta"]);

export default async function HsLockedPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!VALID_CODES.has(code)) {
    notFound();
  }
  return (
    <div id="hs-locked-page">
      <h2>Locked Code Route</h2>
      <p>
        Code: <span id="hs-locked-code">{code}</span>
      </p>
    </div>
  );
}

