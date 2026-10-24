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
        <span className="item-cta">ver detalle →</span>
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
          <dt>renderizado</dt>
          <dd data-testid="item-stamp">{stamp}</dd>
        </div>
      </dl>
      <p className="note">
        Esta página se regenera como máximo una vez cada 60 segundos. La marca de
        tiempo solo cambia cuando el caché se invalida.
      </p>
      <a className="back" href="/">
        ← volver al listado
      </a>
    </article>
  );
}

