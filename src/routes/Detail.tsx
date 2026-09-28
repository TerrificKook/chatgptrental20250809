import { useState } from "react";
import { money } from "../domain/calculations";
import { useApp, go } from "../ui/context";
import { AssetImage, Cards, Empty, Steps } from "../ui/components";
import { Icon } from "../ui/Icon";
export function Detail({ slug }: { slug: string }) {
  const { state, actor, service, run } = useApp();
  const item = state.listings.find(
    (l) => l.slug === slug && l.status === "published",
  );
  const [photo, setPhoto] = useState(0);
  const [qty, setQty] = useState(1);
  if (!item) return <NotFound />;
  const seller = state.sellers.find((s) => s.userId === item.ownerId);
  const category = state.categories.find((c) => c.id === item.categoryId);
  const own = actor === item.ownerId;
  async function add(request = false) {
    const result = await run(
      () => service.setSelectionItem(actor, item!.id, qty),
      "Вещь добавлена в подборку",
    );
    if (result && request) go("/selection");
  }
  const functional = {
    working: "Рабочая вещь (демо)",
    prop: "Неработающая вещь для кадра",
    replica: "Муляж",
    "not-applicable": "Предмет интерьера",
  };
  return (
    <div className="page">
      <nav className="breadcrumb">
        <a href="#/">Каталог</a>
        <span>/</span>
        <a href={`#/?category=${item.categoryId}`}>{category?.name}</a>
        <span>/</span>
        <span>{item.title}</span>
      </nav>
      <div className="detail-layout">
        <div>
          <AssetImage
            id={item.imageIds[photo] || item.imageIds[0]}
            eager
            className="detail-photo"
          />
          {item.imageIds.length > 1 && (
            <div className="gallery-thumbs">
              {item.imageIds.map((id, i) => (
                <button
                  aria-label={`Фото ${i + 1}`}
                  className={photo === i ? "active" : ""}
                  onClick={() => setPhoto(i)}
                  key={id}
                >
                  <AssetImage id={id} thumb />
                </button>
              ))}
            </div>
          )}
          <p className="photo-credit">
            Изображение демонстрационное ·{" "}
            {state.images.find((a) => a.id === item.imageIds[0])?.source}
          </p>
          <section className="section">
            <h2>О предмете</h2>
            <p>{item.description}</p>
            <dl className="specs">
              {[
                ["Материал", item.material],
                ["Цвет", item.color],
                ["Размеры", item.dimensions],
                ["Эпоха / стиль", item.era],
                ["Состояние", item.condition],
                ["Использование", functional[item.functionality]],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <h3>Выдача и упаковка</h3>
            <p className="muted">
              {item.pickupTerms} {item.packaging}
            </p>
          </section>
        </div>
        <div className="detail-info">
          <div className="eyebrow">ДЕМО-ПРЕДМЕТ · {category?.name}</div>
          <h1 style={{ marginTop: 12 }}>{item.title}</h1>
          <div className="row muted small">
            <Icon name="pin" size={16} />
            {item.district} · Москва и МО
          </div>
          <div className="price-box">
            <div className="price-big">
              {money(item.priceKopecks)} <small>/ календарный день</small>
            </div>
            <p className="muted small">
              {item.depositKopecks
                ? `Залог ${money(item.depositKopecks)} за ${item.unit}`
                : "Без залога"}
            </p>
            <label>
              Количество, {item.unit}
              <input
                aria-label="Количество предметов"
                type="number"
                min="1"
                max={item.quantity}
                step="1"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
              <small>
                Доступное количество в демо: {item.quantity} {item.unit}
              </small>
            </label>
            <div className="stack">
              <button
                className="btn primary full"
                disabled={own}
                onClick={() => add(true)}
              >
                Запросить на даты <Icon name="arrow" size={18} />
              </button>
              <button className="btn full" disabled={own} onClick={() => add()}>
                Добавить в подборку
              </button>
            </div>
            <p className="small muted mt no-margin">
              {own
                ? "Это ваша вещь. Для запроса выберите другого демо-участника."
                : "Наличие и условия подтверждает владелец. Запрос не является оплаченной бронью."}
            </p>
          </div>
          <div className="notice">
            Самовывоз ·{" "}
            {item.delivery ? "Доставка по согласованию" : "Без доставки"}
            <br />
            Стоимость аренды и залог считаются отдельно.
          </div>
          <a className="seller-link" href={`#/owners/${item.ownerId}`}>
            <span className="avatar large">{seller?.name.slice(0, 1)}</span>
            <div>
              <strong>{seller?.name}</strong>
              <span className="small muted">
                Демонстрационный владелец · Смотреть вещи
              </span>
            </div>
            <Icon name="arrow" size={18} />
          </a>
        </div>
      </div>
      <section>
        <h2>Ещё в этой истории</h2>
        <Cards
          items={state.listings
            .filter(
              (l) =>
                l.categoryId === item.categoryId &&
                l.status === "published" &&
                l.id !== item.id,
            )
            .slice(0, 4)}
        />
      </section>
    </div>
  );
}
export function Owner({ id }: { id: string }) {
  const { state } = useApp();
  const owner = state.sellers.find((s) => s.userId === id);
  if (!owner) return <NotFound />;
  return (
    <div className="page">
      <nav className="breadcrumb">
        <a href="#/">Каталог</a>
        <span>/</span>
        <span>Владелец</span>
      </nav>
      <div className="owner-hero">
        <span className="avatar large">{owner.name.slice(0, 1)}</span>
        <div>
          <span className="eyebrow">Демонстрационный владелец</span>
          <h1 style={{ marginTop: 10 }}>{owner.name}</h1>
          <p>{owner.description}</p>
          <p className="small muted mt">
            {owner.district} · {owner.pickupTerms}
          </p>
        </div>
      </div>
      <h2>Вещи владельца</h2>
      <Cards
        items={state.listings.filter(
          (l) => l.ownerId === id && l.status === "published",
        )}
      />
    </div>
  );
}
export function CollectionPage({ slug }: { slug: string }) {
  const { state } = useApp();
  const collection = state.collections.find(
    (c) => c.slug === slug || c.id === slug,
  );
  if (!collection) return <NotFound />;
  return (
    <div className="page">
      <div className="eyebrow">Готовая история</div>
      <h1 style={{ marginTop: 12 }}>{collection.title}</h1>
      <p className="muted">{collection.description}</p>
      <Cards
        items={state.listings.filter(
          (l) =>
            collection.listingIds.includes(l.id) && l.status === "published",
        )}
      />
    </div>
  );
}
export function Favorites() {
  const { state, actor } = useApp();
  const ids = state.favorites
    .filter((f) => f.actorId === actor)
    .map((f) => f.listingId);
  const items = state.listings.filter(
    (l) => ids.includes(l.id) && l.status === "published",
  );
  return (
    <div className="page">
      <h1>Избранное</h1>
      <p className="muted">
        Вещи, к которым хочется вернуться. Даты и количество выберете в
        подборке.
      </p>
      {items.length ? (
        <Cards items={items} />
      ) : (
        <Empty
          title="Сохраните свой первый предмет"
          text="Нажмите на сердце у фотографии. Избранное сохраняется отдельно для каждого тестового профиля."
          href="#/"
          action="Выбрать реквизит"
        />
      )}
      {ids.length > items.length && (
        <p className="notice mt">
          Некоторые сохранённые объявления сняты с показа.
        </p>
      )}
    </div>
  );
}
export function NotFound() {
  return (
    <div className="page">
      <Empty
        title="Этот кадр не найден"
        text="Такого адреса нет, либо объявление пока не опубликовано. Локальная карточка доступна только в браузере, где её создали."
        href="#/"
        action="Открыть каталог"
      />
    </div>
  );
}
export function Help() {
  return (
    <div className="page help-content">
      <div className="eyebrow">Коротко о главном</div>
      <h1 className="mt">Как это работает</h1>
      <Steps />
      <h2>Одна подборка, несколько владельцев</h2>
      <p>
        Добавляйте вещи, выбирайте количество и даты. Оба календарных дня входят
        в расчёт: 1–1 октября = 1 день, 1–3 октября = 3 дня. Залог считается за
        каждую вещь, без умножения на дни. Доставка согласуется отдельно.
      </p>
      <h2>Проверьте обе стороны запроса</h2>
      <p>
        Выберите «Динар · демо-участник» в панели «Режим демонстрации».
        Отправьте подборку. Затем переключитесь на владельца выбранного предмета
        и откройте «Кабинет → Входящие запросы». Дайте ответ и вернитесь к
        участнику.
      </p>
      <h2>Разместите свою вещь</h2>
      <p>
        Создайте тестовый псевдоним или выберите готовый профиль. Нажмите «Сдать
        реквизит», заполните три шага, загрузите фото и отправьте на модерацию.
        В панели выберите «Администратор демо» и откройте модерацию в кабинете.
      </p>
      <h2>Что сохраняется</h2>
      <p>
        Объявления, фото, избранное и запросы находятся в IndexedDB этого
        браузера. Они остаются после обновления страницы, но не передаются на
        другой телефон. Очистка данных браузера удаляет их. В админке можно
        экспортировать публичный каталог с фото.
      </p>
      <div className="notice warning">
        Это не настоящая регистрация и не защищённая административная система.
        Вещи, ставки и участники вымышлены. Сообщения никому не отправляются,
        оплаты и гарантированного резерва нет.
      </div>
    </div>
  );
}
