import type { Item } from "../lib/data";

export function ItemCard({ item }: { item: Item }) {
  return (
    <a className="item" href={`/items/${item.id}`} data-item-id={item.id}>
      <div className="item-top">
        <span className="item-id">#{String(item.id).padStart(3, "0")}</span>
        <span className={`tag tag-${item.category}`}>{item.category}</span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      <div className="item-meter" aria-hidden="true">
        <span style={{ width: `${item.score}%` }} />
      </div>
      <div className="item-foot">
        <span>score {item.score}</span>
        <span className="item-cta">view details →</span>
      </div>
    </a>
  );
}

export function ItemGrid({ items }: { items: Item[] }) {
  return (
    <div className="grid" data-testid="item-grid">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export function ItemDetail({ item, stamp }: { item: Item; stamp: string }) {
  return (
    <article className="detail" data-testid="item-detail">
      <div className="eyebrow">
        <span className={`tag tag-${item.category}`}>{item.category}</span>
        <span className="badge">ISR 60 s</span>
      </div>
      <h1>{item.title}</h1>
      <p className="lede">{item.summary}</p>
      <dl className="kv">
        <div>
          <dt>id</dt>
          <dd>{item.id}</dd>
        </div>
        <div>
          <dt>score</dt>
          <dd>{item.score}</dd>
        </div>
        <div>
          <dt>rendered</dt>
          <dd data-testid="item-stamp">{stamp}</dd>
        </div>
      </dl>
      <p className="note">
        This page regenerates at most once every 60 seconds. The timestamp only
        changes when the cache is invalidated.
      </p>
      <a className="back" href="/">
        ← back to listing
      </a>
    </article>
  );
}

