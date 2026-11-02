export default function HsLockedPage({ params }: { params: { code: string } }) {
  return (
    <div id="hs-locked-page">
      <h2>Locked Code Route</h2>
      <p>
        Code: <span id="hs-locked-code">{params.code}</span>
      </p>
    </div>
  );
}

