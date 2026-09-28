import { useEffect, useState, type FormEvent } from "react";
import type { Listing } from "../domain/models";
import { useApp, go } from "../ui/context";
import { AssetImage, Cards, Modal, Steps } from "../ui/components";
import { Icon } from "../ui/Icon";
const norm = (v: string) =>
  v.toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
const filterNames: Record<string, string> = {
  q: "Поиск",
  category: "Категория",
  min: "Цена от",
  max: "Цена до",
  district: "Район",
  era: "Эпоха",
  color: "Цвет",
  delivery: "Получение",
  owner: "Владелец",
};
export function Catalog({ query }: { query: string }) {
  const { state } = useApp();
  const params = new URLSearchParams(query);
  const [search, setSearch] = useState(params.get("q") || "");
  const [filters, setFilters] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(
    () => setSearch(new URLSearchParams(query).get("q") || ""),
    [query],
  );
  const update = (values: Record<string, string>, replace = false) => {
    const p = replace ? new URLSearchParams() : new URLSearchParams(query);
    Object.entries(values).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    go("/" + (p.size ? "?" + p.toString() : ""));
  };
  const published = state.listings.filter((l) => l.status === "published");
  const matches = (l: Listing) => {
    const q = norm(params.get("q") || "");
    return (
      (!q || norm([l.title, l.description, ...l.tags].join(" ")).includes(q)) &&
      (!params.get("category") || l.categoryId === params.get("category")) &&
      (!params.get("min") ||
        l.priceKopecks >= Number(params.get("min")) * 100) &&
      (!params.get("max") ||
        l.priceKopecks <= Number(params.get("max")) * 100) &&
      (!params.get("district") || l.district === params.get("district")) &&
      (!params.get("era") || l.era === params.get("era")) &&
      (!params.get("color") || l.color === params.get("color")) &&
      (!params.get("owner") || l.ownerId === params.get("owner")) &&
      (!params.get("delivery") ||
        params.get("delivery") === "pickup" ||
        l.delivery)
    );
  };
  const items = published
    .filter(matches)
    .sort((a, b) =>
      params.get("sort") === "price-asc"
        ? a.priceKopecks - b.priceKopecks
        : params.get("sort") === "price-desc"
          ? b.priceKopecks - a.priceKopecks
          : b.updatedAt.localeCompare(a.updatedAt),
    );
  const active = Object.entries(filterNames).filter(([k]) => params.has(k));
  const filterLabel = (k: string, v: string) =>
    k === "category"
      ? state.categories.find((c) => c.id === v)?.name
      : k === "owner"
        ? state.sellers.find((s) => s.userId === v)?.name
        : k === "delivery"
          ? v === "delivery"
            ? "Доставка"
            : "Самовывоз"
          : v;
  const fields = (
    values: Record<string, string>,
    change: (key: string, val: string) => void,
  ) => (
    <>
      <div>
        <h3>Цена за день, ₽</h3>
        <div className="price-inputs mt">
          <label>
            От
            <input
              type="number"
              min="0"
              aria-label="Цена от"
              value={values.min || ""}
              onChange={(e) => change("min", e.target.value)}
            />
          </label>
          <label>
            До
            <input
              type="number"
              min="0"
              aria-label="Цена до"
              value={values.max || ""}
              onChange={(e) => change("max", e.target.value)}
            />
          </label>
        </div>
      </div>
      {(["district", "era", "color", "owner", "delivery"] as const).map(
        (key) => (
          <label key={key}>
            {filterNames[key]}
            <select
              value={values[key] || ""}
              onChange={(e) => change(key, e.target.value)}
            >
              <option value="">Все варианты</option>
              {key === "owner" ? (
                state.sellers.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.name}
                  </option>
                ))
              ) : key === "delivery" ? (
                <>
                  <option value="pickup">Самовывоз</option>
                  <option value="delivery">Доставка по согласованию</option>
                </>
              ) : (
                [...new Set(published.map((l) => l[key]))]
                  .sort()
                  .map((v) => <option key={v}>{v}</option>)
              )}
            </select>
          </label>
        ),
      )}
    </>
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: search });
  };
  return (
    <>
      <div className="intro">
        <div>
          <div className="eyebrow desktop-only" style={{ marginBottom: 10 }}>
            Предметы с характером
          </div>
          <h1>Реквизит для вашего кадра</h1>
          <p>Соберите нужные вещи для съёмки. В одном месте.</p>
        </div>
        <span className="scene-label">КАДР / 001</span>
      </div>
      <form className="searchbar" onSubmit={submit}>
        <Icon name="search" />
        <input
          aria-label="Поиск реквизита"
          placeholder="Кресло, лампа, чемодан…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          list="catalog-suggestions"
        />
        <datalist id="catalog-suggestions">
          {published
            .filter((l) => norm(l.title).includes(norm(search)))
            .slice(0, 8)
            .map((l) => (
              <option key={l.id} value={l.title} />
            ))}
        </datalist>
        <button className="btn primary" type="submit">
          Найти
        </button>
      </form>
      <nav className="categories" aria-label="Категории">
        {[...state.categories]
          .sort((a, b) => a.order - b.order)
          .map((c) => (
            <a
              className={`category ${params.get("category") === c.id ? "active" : ""}`}
              href={`#/?category=${c.id}`}
              key={c.id}
            >
              <Icon name={c.icon} size={29} />
              <span className="category-name">
                {c.name}
                <span className="category-count">
                  {published.filter((l) => l.categoryId === c.id).length}
                </span>
              </span>
            </a>
          ))}
      </nav>
      <div className="catalog-heading">
        <h2>
          {params.get("category")
            ? state.categories.find((c) => c.id === params.get("category"))
                ?.name
            : <><span className="desktop-only">Каталог реквизита</span><span className="mobile-only">Каталог</span></>}{" "}
          <small>{items.length} вещей</small>
        </h2>
        <div className="catalog-controls">
          <button
            aria-label="Фильтры"
            className="btn mobile-only"
            onClick={() => {
              setDraft(Object.fromEntries(params.entries()));
              setFilters(true);
            }}
          >
            <Icon name="filter" size={18} />
            <span className="filter-word">Фильтры</span>
          </button>
          <select
            aria-label="Сортировка"
            value={params.get("sort") || "new"}
            onChange={(e) => update({ sort: e.target.value })}
          >
            <option value="new">Сначала новые</option>
            <option value="price-asc">Дешевле</option>
            <option value="price-desc">Дороже</option>
          </select>
        </div>
      </div>
      {active.length > 0 && (
        <div className="chips">
          {active.map(([k, label]) => (
            <button
              className="chip"
              key={k}
              onClick={() => update({ [k]: "" })}
              aria-label={`Убрать фильтр ${label}`}
            >
              {filterLabel(k, params.get(k)!)}
              <Icon name="close" size={13} />
            </button>
          ))}
          <a className="chip" href="#/">
            Сбросить всё
          </a>
        </div>
      )}
      <div className="catalog-layout">
        <aside className="filter-sidebar" aria-label="Фильтры каталога">
          {fields(Object.fromEntries(params.entries()), (key, val) =>
            update({ [key]: val }),
          )}
          <a className="link small" href="#/">
            Сбросить всё
          </a>
          <p className="small muted no-margin">
            Наличие на ваши даты подтверждает владелец.
          </p>
        </aside>
        <Cards items={items} />
      </div>
      <section className="section">
        <div className="section-top">
          <h2>Готовые истории</h2>
          <span className="small muted">
            Шесть отправных точек для вашего кадра
          </span>
        </div>
        <div className="collection-grid">
          {state.collections.map((c, i) => {
            const first = state.listings.find(
              (l) => c.listingIds.includes(l.id) && l.status === "published",
            );
            return (
              <a
                key={c.id}
                className="collection"
                href={`#/collections/${c.slug}`}
              >
                <div className="collection-content">
                  <span className="eyebrow">СЦЕНА / 0{i + 1}</span>
                  <h3>{c.title}</h3>
                  <span className="small muted">
                    Смотреть подборку <span aria-hidden="true">↗</span>
                  </span>
                </div>
                {first && <AssetImage id={first.imageIds[0]} thumb />}
              </a>
            );
          })}
        </div>
      </section>
      <section>
        <Steps />
      </section>
      {filters && (
        <Modal title="Фильтры каталога" onClose={() => setFilters(false)}>
          <form
            className="filter-modal"
            onSubmit={(e) => {
              e.preventDefault();
              update(draft, true);
              setFilters(false);
            }}
          >
            {fields(draft, (k, v) => setDraft({ ...draft, [k]: v }))}
            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={() => setDraft({})}
              >
                Сбросить
              </button>
              <button className="btn primary" type="submit">
                Применить
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
