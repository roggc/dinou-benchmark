import type { ReactNode } from "react";

export function SiteNav() {
  const links = [
    ["/", "Home"],
    ["/items/42", "ISR Detail"],
    ["/dashboard", "Dashboard"],
    ["/ppr", "PPR"],
    ["/messages", "Server Function"],
  ] as const;

  return (
    <header className="site-header">
      <a className="brand" href="/">
        <span className="brand-dot" />
        bench<span className="brand-thin">/pages</span>
      </a>
      <nav>
        {links.map(([href, label]) => (
          <a key={href} href={href} className="nav-link">
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="page">
      <SiteNav />
      <main className="container">{children}</main>
      <footer className="site-footer">
        Same app, same CSS, same local data. Reproducible benchmark.
      </footer>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="page-header">
      <div className="eyebrow">
        {eyebrow}
        {badge ? <span className="badge">{badge}</span> : null}
      </div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export function Skeleton({ label }: { label: string }) {
  return (
    <div className="card skeleton" data-skeleton={label}>
      <div className="sk-line sk-line-short" />
      <div className="sk-line" />
      <div className="sk-line sk-line-mid" />
      <span className="sk-label">loading {label}…</span>
    </div>
  );
}

export function HoleCard({
  label,
  value,
  stamp,
  detail,
}: {
  label: string;
  value: string;
  stamp: string;
  detail?: string;
}) {
  return (
    <div className="card" data-hole={label}>
      <div className="card-kicker">{label}</div>
      <div className="card-value">{value}</div>
      {detail ? <p className="card-detail">{detail}</p> : null}
      <div className="card-stamp">{stamp}</div>
    </div>
  );
}

