import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Listing } from "../domain/models";
import { money } from "../domain/calculations";
import { base, statusLabels, useApp } from "./context";
import { Icon } from "./Icon";
export function AssetImage({
  id,
  thumb = false,
  eager = false,
  className = "",
}: {
  id: string;
  thumb?: boolean;
  eager?: boolean;
  className?: string;
}) {
  const { state } = useApp();
  const asset = state.images.find((a) => a.id === id);
  const [blobUrl, setBlobUrl] = useState("");
  useEffect(() => {
    if (!asset?.blob) {
      setBlobUrl("");
      return;
    }
    const url = URL.createObjectURL(asset.blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [asset?.blob]);
  if (!asset)
    return (
      <span role="img" aria-label="Изображение недоступно">
        Изображение недоступно
      </span>
    );
  return (
    <img
      src={
        asset.blob
          ? blobUrl || undefined
          : base(thumb ? asset.thumbnailPath || asset.path : asset.path)
      }
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}
export function Card({ item, index = 10 }: { item: Listing; index?: number }) {
  const { state, actor, service, run } = useApp();
  const seller = state.sellers.find((s) => s.userId === item.ownerId);
  const favorite = state.favorites.some(
    (f) => f.actorId === actor && f.listingId === item.id,
  );
  return (
    <article className="card" data-testid="listing-card" data-id={item.id}>
      <div className="card-photo">
        <a href={`#/items/${item.slug}`} aria-label={`Открыть: ${item.title}`}>
          <AssetImage id={item.imageIds[0]} thumb eager={index < 4} />
        </a>
        <button
          className="favorite"
          aria-label={`В избранное: ${item.title}`}
          aria-pressed={favorite}
          onClick={() => run(() => service.toggleFavorite(actor, item.id))}
        >
          <Icon name="heart" />
        </button>
      </div>
      <div className="card-body">
        <div className="card-price">
          {money(item.priceKopecks)} <small>/ день</small>
        </div>
        <a className="card-title" href={`#/items/${item.slug}`}>
          {item.title}
        </a>
        <div className="card-meta">
          {item.district}
          <br />
          {item.material} · {item.era}
        </div>
        <a href={`#/owners/${item.ownerId}`} className="card-owner">
          <span className="avatar">{seller?.name.slice(0, 1) || "К"}</span>
          {seller?.name || "Демо-владелец"}
        </a>
      </div>
    </article>
  );
}
export function Cards({ items }: { items: Listing[] }) {
  return items.length ? (
    <div className="grid">
      {items.map((item, i) => (
        <Card key={item.id} item={item} index={i} />
      ))}
    </div>
  ) : (
    <Empty
      title="Вещи не найдены"
      text="Попробуйте изменить условия поиска или сбросить фильтры."
      href="#/"
      action="Открыть весь каталог"
    />
  );
}
export function Empty({
  title,
  text,
  href,
  action,
}: {
  title: string;
  text: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty">
      <Icon name="film" size={36} />
      <h2>{title}</h2>
      <p>{text}</p>
      {href && (
        <a className="btn primary" href={href}>
          {action || "В каталог"}
          <Icon name="arrow" size={18} />
        </a>
      )}
    </div>
  );
}
export function Badge({
  status,
  listing = false,
}: {
  status: string;
  listing?: boolean;
}) {
  return (
    <span className={`badge ${status}`}>
      {listing && status === "pending"
        ? "На модерации"
        : statusLabels[status] || status}
    </span>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button,a[href],input,select,textarea,[tabindex="0"]',
        ) || [],
      ).filter((e) => !e.hasAttribute("disabled"));
    focusables()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const list = focusables(),
          first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={ref}
      >
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Steps() {
  return (
    <div className="steps">
      {[
        ["01", "Найти", "Выберите вещи по стилю, цвету и задаче кадра."],
        ["02", "Собрать", "Укажите даты и количество в одной подборке."],
        ["03", "Запросить", "Проверьте ответы каждого владельца в кабинете."],
      ].map(([n, t, d]) => (
        <div className="step" key={n}>
          <span className="step-number">{n}</span>
          <div>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
