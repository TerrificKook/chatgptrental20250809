import { useState } from "react";
import type { OwnerRequest, RequestGroup, Listing } from "../domain/models";
import { money } from "../domain/calculations";
import { useApp, go, statusLabels } from "../ui/context";
import { AssetImage, Badge, Empty } from "../ui/components";
import { Icon } from "../ui/Icon";
import { Favorites } from "./Detail";
export function LoginRequired() {
  const { login } = useApp();
  return (
    <div className="page">
      <Empty
        title="Ваш единый кабинет"
        text="Арендуйте и сдавайте вещи через один тестовый профиль. Для проверки не нужны email, телефон или пароль."
      />
      <div className="row mt" style={{ justifyContent: "center" }}>
        <button className="btn primary" onClick={login}>
          Войти в тестовый профиль
        </button>
      </div>
    </div>
  );
}
export function RequestPart({
  part,
  group,
  incoming = false,
}: {
  part: OwnerRequest;
  group: RequestGroup;
  incoming?: boolean;
}) {
  const { state, actor, service, run } = useApp();
  const [comments, setComments] = useState<Record<string, string>>({});
  const seller = state.sellers.find((s) => s.userId === part.ownerId);
  return (
    <section
      data-testid="owner-request"
      className="panel"
      style={{ marginTop: 16 }}
    >
      <div className="row spread">
        <h3 className="no-margin">
          {incoming
            ? `Запрос от ${state.users.find((u) => u.id === part.requesterId)?.alias || "Демо-участника"}`
            : seller?.name}
        </h3>
        <Badge status={part.status} />
      </div>
      <p className="small muted mt">
        {group.startDate} - {group.endDate} · {group.days} календ. дн.
      </p>
      {part.lines.map((line) => (
        <div className="request-line" key={line.id}>
          <div className="row spread">
            <div>
              <h3>
                {line.title} × {line.quantity} {line.unit}
              </h3>
              <span className="small muted">
                Аренда: {money(line.priceKopecks * line.quantity * group.days)}{" "}
                · Залог:{" "}
                {line.depositKopecks
                  ? money(line.depositKopecks * line.quantity)
                  : "Без залога"}
              </span>
            </div>
            <Badge status={line.decision} />
          </div>
          <p className="small muted" style={{ margin: "8px 0" }}>
            {line.district} · {line.pickupTerms} {line.packaging}
          </p>
          {line.comment && (
            <p className="notice">Ответ владельца: {line.comment}</p>
          )}
          {incoming &&
            line.decision === "pending" &&
            !["cancelled", "completed"].includes(group.status) && (
              <div className="request-actions">
                <label style={{ width: "100%" }}>
                  Комментарий к {line.title}
                  <input
                    maxLength={1000}
                    value={comments[line.id] || ""}
                    onChange={(e) =>
                      setComments({ ...comments, [line.id]: e.target.value })
                    }
                    placeholder="Например, можно забрать после согласования"
                  />
                </label>
                <button
                  className="btn primary"
                  onClick={() =>
                    run(
                      () =>
                        service.decideLine(
                          actor,
                          part.id,
                          line.id,
                          "confirmed",
                          comments[line.id],
                        ),
                      "Строка запроса подтверждена",
                    )
                  }
                >
                  Подтвердить строку
                </button>
                <button
                  className="btn danger"
                  onClick={() =>
                    run(
                      () =>
                        service.decideLine(
                          actor,
                          part.id,
                          line.id,
                          "rejected",
                          comments[line.id],
                        ),
                      "Строка запроса отклонена",
                    )
                  }
                >
                  Отклонить строку
                </button>
              </div>
            )}
        </div>
      ))}
      <p className="small muted no-margin">
        Подтверждение наличия не является оплаченной бронью. Остаток не
        списывается.
      </p>
    </section>
  );
}
export function Requests({
  incoming = false,
  admin = false,
  ownerFilter = "",
}: {
  incoming?: boolean;
  admin?: boolean;
  ownerFilter?: string;
}) {
  const { state, actor, service, run } = useApp();
  const [filter, setFilter] = useState("");
  const groups = state.requestGroups
    .filter((g) =>
      admin || incoming
        ? state.ownerRequests.some(
            (p) =>
              p.groupId === g.id &&
              (admin
                ? ownerFilter
                  ? p.ownerId === ownerFilter
                  : true
                : p.ownerId === actor),
          )
        : g.requesterId === actor,
    )
    .filter((g) => !filter || g.status === filter);
  async function repeat(group: RequestGroup) {
    const result = await run(
      () => service.repeatRequest(actor, group.id),
      "Подборка собрана с текущими ценами и условиями",
    );
    if (result) go("/selection");
  }
  return (
    <>
      <div className="row spread">
        <h2>
          {admin
            ? "Все запросы"
            : incoming
              ? "Входящие запросы"
              : "Мои запросы"}
        </h2>
        <label>
          <span className="visually-hidden">Статус запросов</span>
          <select
            aria-label="Статус запросов"
            className="inline-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Все статусы</option>
            {[
              "pending",
              "partial",
              "confirmed",
              "rejected",
              "cancelled",
              "completed",
            ].map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {groups.length ? (
        groups
          .slice()
          .reverse()
          .map((group) => (
            <article
              className="panel"
              data-testid="request-group"
              key={group.id}
            >
              <div className="row spread">
                <div>
                  <span className="eyebrow">Запрос · {group.id.slice(-6)}</span>
                  <p className="small muted" style={{ margin: "6px 0 0" }}>
                    {new Date(group.createdAt).toLocaleString("ru-RU")}
                  </p>
                </div>
                <Badge status={group.status} />
              </div>
              {state.ownerRequests
                .filter(
                  (p) =>
                    p.groupId === group.id &&
                    (!incoming || p.ownerId === actor) &&
                    (!ownerFilter || p.ownerId === ownerFilter),
                )
                .map((part) => (
                  <RequestPart
                    key={part.id}
                    part={part}
                    group={group}
                    incoming={incoming}
                  />
                ))}
              {!incoming && !admin && (
                <div className="request-actions">
                  {!["rejected", "cancelled", "completed"].includes(
                    group.status,
                  ) && (
                    <button
                      className="btn danger"
                      onClick={() =>
                        run(
                          () => service.cancelRequest(actor, group.id),
                          "Запрос отменён",
                        )
                      }
                    >
                      Отменить запрос
                    </button>
                  )}
                  {["partial", "confirmed"].includes(group.status) &&
                    !state.ownerRequests
                      .filter((p) => p.groupId === group.id)
                      .some((p) =>
                        p.lines.some((l) => l.decision === "pending"),
                      ) && (
                      <button
                        className="btn primary"
                        onClick={() =>
                          run(
                            () => service.completeRequest(actor, group.id),
                            "Демонстрационный сценарий завершён",
                          )
                        }
                      >
                        Завершить демо-сценарий
                      </button>
                    )}
                  <button className="btn" onClick={() => repeat(group)}>
                    Собрать снова
                  </button>
                </div>
              )}
            </article>
          ))
      ) : (
        <Empty
          title={
            incoming ? "Пока нет входящих запросов" : "Здесь появятся запросы"
          }
          text={
            incoming
              ? "Выберите вещи этого владельца от имени другого участника и отправьте подборку."
              : "Выберите предметы, укажите даты и сохраните демо-запрос."
          }
          href="#/"
          action="Открыть каталог"
        />
      )}
    </>
  );
}
export function ListingManage({
  items,
  admin = false,
}: {
  items: Listing[];
  admin?: boolean;
}) {
  const { actor, service, run } = useApp();
  return items.length ? (
    <div className="panel">
      {items.map((item) => (
        <div
          className="listing-manage"
          data-testid="managed-listing"
          key={item.id}
        >
          <div>
            {item.imageIds.length ? (
              <AssetImage id={item.imageIds[0]} thumb />
            ) : (
              <Icon name="camera" size={40} />
            )}
          </div>
          <div>
            <h3>{item.title}</h3>
            <Badge status={item.status} listing />
            <span className="small muted">
              {" "}
              · {money(item.priceKopecks)} / день
            </span>
            {item.rejectionReason && (
              <p className="notice error mt">Причина: {item.rejectionReason}</p>
            )}
          </div>
          <div className="row wrap">
            {item.status === "published" && (
              <a className="btn" href={`#/items/${item.slug}`}>
                Открыть
              </a>
            )}
            {item.status !== "archived" && (
              <a className="btn" href={`#/listing/${item.id}/edit`}>
                Редактировать
              </a>
            )}
            {["draft", "rejected"].includes(item.status) && !admin && (
              <button
                className="btn primary"
                onClick={() =>
                  run(
                    () => service.submitListing(actor, item.id),
                    "Объявление отправлено на модерацию",
                  )
                }
              >
                На модерацию
              </button>
            )}
            {item.status === "published" && (
              <button
                className="btn"
                onClick={() =>
                  run(
                    () => service.unpublishListing(actor, item.id),
                    "Объявление снято с показа",
                  )
                }
              >
                Снять с показа
              </button>
            )}
            {item.status !== "archived" && (
              <button
                className="btn danger"
                onClick={() =>
                  run(
                    () => service.archiveListing(actor, item.id),
                    "Объявление перемещено в архив",
                  )
                }
              >
                В архив
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Empty
      title="В этом разделе пока пусто"
      text="Создайте объявление и сохраните черновик. Предмет появится в каталоге после демо-модерации."
      href="#/listing/new"
      action="Сдать реквизит"
    />
  );
}
function Profile() {
  const { state, actor, service, run } = useApp();
  const user = state.users.find((u) => u.id === actor)!;
  const seller = state.sellers.find((s) => s.userId === actor);
  const [form, setForm] = useState({
    name: seller?.name || user.alias,
    description: seller?.description || "",
    district: seller?.district || "Москва",
    pickupTerms: seller?.pickupTerms || "",
  });
  return (
    <div className="narrow">
      <div className="panel">
        <h2>{user.alias}</h2>
        <p className="muted">
          Один профиль для ваших запросов и объявлений. Это локальный тестовый
          псевдоним, без настоящей регистрации.
        </p>
      </div>
      <form
        className="panel stack"
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            () => service.saveSeller(actor, form),
            "Профиль владельца сохранён",
          );
        }}
      >
        <h2>{seller ? "Профиль владельца" : "Начните сдавать реквизит"}</h2>
        <label>
          Название демо-профиля
          <input
            required
            maxLength={80}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          Описание владельца
          <textarea
            maxLength={2000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label>
          Район выдачи
          <input
            required
            maxLength={120}
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
          />
        </label>
        <label>
          Условия выдачи
          <textarea
            required
            value={form.pickupTerms}
            onChange={(e) => setForm({ ...form, pickupTerms: e.target.value })}
          />
        </label>
        <p className="notice">
          Используйте только вымышленные сведения. Не добавляйте телефон, email
          и точный частный адрес.
        </p>
        <button className="btn primary">Сохранить профиль владельца</button>
      </form>
    </div>
  );
}
export function Account({ tab = "requests" }: { tab?: string }) {
  const { state, actor } = useApp();
  const [status, setStatus] = useState("");
  if (actor === "guest") return <LoginRequired />;
  const user = state.users.find((u) => u.id === actor);
  return (
    <div className="page">
      <div className="row spread">
        <div>
          <span className="eyebrow">Единый кабинет</span>
          <h1 style={{ marginTop: 10 }}>{user?.alias}</h1>
        </div>
        <a href="#/listing/new" className="btn primary">
          <Icon name="plus" size={18} />
          Сдать реквизит
        </a>
      </div>
      {user?.isAdmin && (
        <div className="notice">
          <a className="link" href="#/admin/overview">
            Открыть административный раздел демо
          </a>
        </div>
      )}
      <nav className="tabs" aria-label="Разделы кабинета">
        {[
          ["requests", "Мои запросы"],
          ["selections", "Подборки"],
          ["incoming", "Входящие запросы"],
          ["listings", "Мои объявления"],
          ["favorites", "Избранное"],
          ["profile", "Профиль"],
        ].map(([key, label]) => (
          <a
            href={`#/account/${key}`}
            className={key === tab ? "active" : ""}
            key={key}
          >
            {label}
          </a>
        ))}
      </nav>
      {tab === "requests" ? (
        <Requests />
      ) : tab === "selections" ? (
        <SavedSelections />
      ) : tab === "incoming" ? (
        <Requests incoming />
      ) : tab === "favorites" ? (
        <Favorites />
      ) : tab === "profile" ? (
        <Profile key={actor} />
      ) : tab === "listings" ? (
        <>
          <div className="row spread">
            <h2>Мои объявления</h2>
            <select
              aria-label="Статус объявлений"
              className="inline-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Все статусы</option>
              {["draft", "pending", "published", "rejected", "archived"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s === "pending" ? "На модерации" : statusLabels[s]}
                  </option>
                ),
              )}
            </select>
          </div>
          <ListingManage
            items={state.listings.filter(
              (l) => l.ownerId === actor && (!status || l.status === status),
            )}
          />
        </>
      ) : (
        <Empty
          title="Раздел не найден"
          text="Выберите нужную вкладку кабинета."
        />
      )}
    </div>
  );
}

function SavedSelections() {
  const { state, actor, service, run } = useApp();
  const saved = (state.savedSelections || []).filter(
    (s) => s.actorId === actor,
  );
  return (
    <>
      <h2>Сохранённые подборки</h2>
      {saved.length ? (
        saved.map((s) => (
          <div className="panel" key={s.id}>
            <h3>{s.name}</h3>
            <p className="small muted">
              {s.startDate} - {s.endDate} · {s.lines.length} вещей
            </p>
            <div className="row wrap">
              <button
                className="btn primary"
                onClick={async () => {
                  if (
                    await run(
                      () => service.restoreNamedSelection(actor, s.id),
                      "Подборка восстановлена с текущими условиями",
                    )
                  )
                    go("/selection");
                }}
              >
                Открыть подборку
              </button>
              <button
                className="btn danger"
                onClick={() =>
                  run(
                    () => service.deleteNamedSelection(actor, s.id),
                    "Сохранённая подборка удалена",
                  )
                }
              >
                Удалить подборку
              </button>
            </div>
          </div>
        ))
      ) : (
        <Empty
          title="Сохраните будущую сцену"
          text="В текущей подборке укажите даты и название, затем нажмите «Сохранить подборку». Её увидит только этот тестовый участник."
          href="#/selection"
          action="Текущая подборка"
        />
      )}
    </>
  );
}
