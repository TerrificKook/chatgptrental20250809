import { useState } from "react";
import type { Category, Listing } from "../domain/models";
import {
  exportCatalogJSON,
  exportCatalogZip,
  readCatalogZip,
  importCatalogZip,
  type PackagePreview,
} from "../domain/catalog-package";
import { money } from "../domain/calculations";
import { useApp, statusLabels } from "../ui/context";
import { AssetImage, Empty, Modal } from "../ui/components";
import { ListingManage, Requests } from "./Account";
import { Icon } from "../ui/Icon";
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Categories() {
  const { state, actor, service, run } = useApp();
  const [edit, setEdit] = useState<Category>();
  return (
    <section className="panel">
      <h2>Категории</h2>
      <p className="small muted">
        Название и порядок применяются в этом браузере. Категорию с объявлениями
        удалить нельзя.
      </p>
      {[...state.categories]
        .sort((a, b) => a.order - b.order)
        .map((c) => (
          <div
            className="row spread"
            style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}
            key={c.id}
          >
            <span>
              {c.order}. {c.name}
            </span>
            <div className="row">
              <button className="btn" onClick={() => setEdit({ ...c })}>
                Изменить
              </button>
              <button
                className="btn danger"
                onClick={() =>
                  run(
                    () => service.deleteCategory(actor, c.id),
                    "Категория удалена",
                  )
                }
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      {edit && (
        <Modal
          title="Редактировать категорию"
          onClose={() => setEdit(undefined)}
        >
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await run(
                  () => service.saveCategory(actor, edit),
                  "Категория сохранена",
                )
              )
                setEdit(undefined);
            }}
          >
            <label>
              Название категории
              <input
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label>
              Порядок категории
              <input
                type="number"
                min="0"
                step="1"
                value={edit.order}
                onChange={(e) =>
                  setEdit({ ...edit, order: Number(e.target.value) })
                }
              />
            </label>
            <button className="btn primary">Сохранить категорию</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
function Moderation() {
  const { state, actor, service, run } = useApp();
  const [item, setItem] = useState<Listing>();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const pending = state.listings.filter((l) => l.status === "pending");
  return (
    <>
      <h2>Очередь модерации · {pending.length}</h2>
      {pending.length ? (
        <div className="panel">
          {pending.map((l) => (
            <div className="listing-manage" key={l.id}>
              {l.imageIds[0] ? (
                <AssetImage id={l.imageIds[0]} thumb />
              ) : (
                <Icon name="camera" />
              )}
              <div>
                <h3>{l.title}</h3>
                <span className="small muted">
                  {state.sellers.find((s) => s.userId === l.ownerId)?.name} ·{" "}
                  {money(l.priceKopecks)} / день
                </span>
              </div>
              <button
                className="btn primary"
                onClick={() => {
                  setItem(l);
                  setReason("");
                  setError("");
                }}
              >
                Проверить объявление
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="Всё просмотрено"
          text="Новые объявления появятся здесь после отправки на модерацию."
        />
      )}
      {item && (
        <Modal title="Модерация объявления" onClose={() => setItem(undefined)}>
          <div className="stack">
            <h3>{item.title}</h3>
            {item.imageIds.map((img) => (
              <AssetImage id={img} key={img} eager />
            ))}
            <p>{item.description}</p>
            <div className="notice">
              {item.material} · {item.color} · {item.dimensions} · {item.era}
              <br />
              {item.condition}
              <br />
              {item.district} · {item.pickupTerms}
              <br />
              {item.packaging}
              <br />
              {money(item.priceKopecks)} / день · {item.quantity} {item.unit} ·
              Залог {money(item.depositKopecks)}
            </div>
            <label>
              Причина отклонения
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Обязательно при отклонении"
                maxLength={1000}
              />
            </label>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <div className="row wrap">
              <button
                className="btn primary"
                onClick={async () => {
                  if (
                    await run(
                      () =>
                        service.moderateListing(actor, item.id, "published"),
                      "Объявление опубликовано",
                    )
                  )
                    setItem(undefined);
                }}
              >
                Опубликовать
              </button>
              <button
                className="btn danger"
                onClick={async () => {
                  if (!reason.trim()) {
                    setError("Укажите причину отклонения");
                    return;
                  }
                  if (
                    await run(
                      () =>
                        service.moderateListing(
                          actor,
                          item.id,
                          "rejected",
                          reason,
                        ),
                      "Объявление отклонено с причиной",
                    )
                  )
                    setItem(undefined);
                }}
              >
                Отклонить объявление
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
function DataTools() {
  const { state, seed, actor, service, repo, run, notify, switchActor } =
    useApp();
  const [preview, setPreview] = useState<PackagePreview>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  async function exportZip() {
    setBusy(true);
    try {
      const blob = await exportCatalogZip(state, document.baseURI);
      download(blob, "kinostore-catalog.zip");
      notify("ZIP каталога сохранён. Заявки и внутренние записи не включены.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Экспорт не удался");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <section className="panel">
        <h2>Перенос публичного каталога</h2>
        <p>
          JSON содержит категории, публичные профили, карточки и ссылки на
          файлы. ZIP дополнительно включает фото, в том числе загруженные в этом
          браузере. Экспорт включает объявления всех статусов, включая
          черновики. Заявок, внутренних заметок и полномочий администратора в
          нём нет.
        </p>
        <div className="row wrap">
          <button
            className="btn"
            onClick={() => {
              try {
                download(
                  new Blob([exportCatalogJSON(state)], {
                    type: "application/json",
                  }),
                  "catalog.json",
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Экспорт не удался");
              }
            }}
          >
            <Icon name="download" size={18} />
            Экспорт JSON
          </button>
          <button className="btn primary" disabled={busy} onClick={exportZip}>
            {busy ? "Готовим архив…" : "Экспорт ZIP с фото"}
          </button>
        </div>
        <p className="notice mt">
          Экспорт каталога не является полной резервной копией браузера. История
          запросов в него не входит.
        </p>
      </section>
      <section className="panel stack">
        <h2>Импорт ZIP</h2>
        <p className="muted">
          До 30 МБ. Сначала проверяем структуру и изображения, затем показываем
          отчёт. Добавление и обновление по ID, без удаления остальных карточек.
        </p>
        <label>
          Пакет каталога
          <input
            aria-label="Пакет каталога ZIP"
            type="file"
            accept=".zip,application/zip"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              setPreview(undefined);
              setError("");
              if (!file) return;
              if (file.size > 30 * 1024 * 1024) {
                setError("Архив превышает 30 МБ");
                return;
              }
              setBusy(true);
              try {
                const p = await readCatalogZip(
                  new Uint8Array(await file.arrayBuffer()),
                );
                setPreview(p);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Некорректный пакет",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {preview && (
          <>
            <div className="result-message" role="status">
              {preview.report.join("\n")}
            </div>
            <button
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const result = await run(
                  () => importCatalogZip(repo, actor, preview),
                  "Каталог импортирован. Изменения видны только в этом браузере.",
                );
                setBusy(false);
                if (result) setPreview(undefined);
              }}
            >
              Применить импорт
            </button>
            <button className="btn" onClick={() => setPreview(undefined)}>
              Отменить импорт
            </button>
          </>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Восстановить демо-набор</h2>
        <p>
          Удалит локальные объявления, загруженные фото, профили, избранное и
          запросы только Kinostore. Сначала можно экспортировать публичный
          каталог.
        </p>
        <button className="btn danger" onClick={() => setReset(true)}>
          Восстановить демонстрационные данные
        </button>
      </section>
      {reset && (
        <Modal title="Сбросить локальное демо?" onClose={() => setReset(false)}>
          <div className="stack">
            <p>
              Данные других приложений не затрагиваются. Локальная история
              запросов будет удалена. Экспорт каталога сохраняет вещи и фото, но
              не заявки.
            </p>
            <button className="btn" disabled={busy} onClick={exportZip}>
              Сначала экспортировать каталог
            </button>
            <label>
              Введите СБРОСИТЬ
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            <button
              className="btn danger"
              disabled={confirmation !== "СБРОСИТЬ" || busy}
              onClick={async () => {
                if (
                  await run(
                    () => service.resetSeed(actor, seed, confirmation),
                    "Демонстрационные данные восстановлены",
                  )
                ) {
                  await switchActor("admin");
                  setReset(false);
                }
              }}
            >
              Подтвердить сброс
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function Admin({
  tab = "overview",
  query = "",
}: {
  tab?: string;
  query?: string;
}) {
  const { state, actor } = useApp();
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState(
    new URLSearchParams(query).get("owner") || "",
  );
  const [status, setStatus] = useState("");
  if (!state.users.find((u) => u.id === actor)?.isAdmin)
    return (
      <div className="page">
        <Empty
          title="Администратор демо"
          text="Для этого раздела выберите «Администратор демо» в явно обозначенной панели сверху. Это открытый демонстрационный инструмент, без серверной защиты."
        />
      </div>
    );
  const nav = [
    ["overview", "Обзор"],
    ["moderation", "Модерация"],
    ["catalog", "Каталог"],
    ["owners", "Владельцы"],
    ["requests", "Запросы"],
    ["categories", "Категории"],
    ["data", "Данные"],
  ];
  return (
    <div className="page">
      <span className="eyebrow">Служебный демо-режим</span>
      <h1 style={{ marginTop: 12 }}>Управление каталогом</h1>
      <p className="notice">
        Эти изменения пока видны только здесь. Для обновления общей демонстрации
        экспортируйте каталог и обновите данные в репозитории
      </p>
      <nav className="tabs" aria-label="Разделы администратора">
        {nav.map(([key, label]) => (
          <a
            href={`#/admin/${key}`}
            className={key === tab ? "active" : ""}
            key={key}
          >
            {label}
            {key === "moderation" &&
              ` · ${state.listings.filter((l) => l.status === "pending").length}`}
          </a>
        ))}
      </nav>
      {tab === "overview" ? (
        <>
          <div className="metrics">
            {[
              [
                "Опубликовано",
                state.listings.filter((l) => l.status === "published").length,
              ],
              [
                "На модерации",
                state.listings.filter((l) => l.status === "pending").length,
              ],
              ["Владельцев", state.sellers.length],
              ["Запросов", state.requestGroups.length],
            ].map(([label, n]) => (
              <div className="metric" key={label}>
                <small>{label}</small>
                <strong>{n}</strong>
                <span className="small muted">В этом браузере</span>
              </div>
            ))}
          </div>
          <section className="panel">
            <h2>Журнал действий</h2>
            {state.audit.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Когда</th>
                      <th>Кто</th>
                      <th>Что изменилось</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.audit
                      .slice()
                      .reverse()
                      .map((a) => (
                        <tr key={a.id}>
                          <td>
                            {new Date(a.createdAt).toLocaleString("ru-RU")}
                          </td>
                          <td>
                            {state.users.find((u) => u.id === a.actorId)
                              ?.alias || a.actorId}
                          </td>
                          <td className="audit-detail">
                            {a.action}
                            {a.details && (
                              <>
                                <br />
                                <span className="muted">{a.details}</span>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">
                После первого действия здесь появится запись.
              </p>
            )}
          </section>
        </>
      ) : tab === "moderation" ? (
        <Moderation />
      ) : tab === "catalog" ? (
        <>
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <label>
              Поиск по каталогу
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              Владелец
              <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Все владельцы</option>
                {state.sellers.map((s) => (
                  <option key={s.id} value={s.userId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Статус
              <select
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
            </label>
          </div>
          <ListingManage
            admin
            items={state.listings.filter(
              (l) =>
                (!owner || l.ownerId === owner) &&
                (!status || l.status === status) &&
                l.title.toLowerCase().includes(search.toLowerCase()),
            )}
          />
        </>
      ) : tab === "owners" ? (
        <div className="panel">
          {state.sellers.map((s) => (
            <div
              className="row spread"
              key={s.id}
              style={{
                padding: "18px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>
                <h3>{s.name}</h3>
                <span className="small muted">
                  {s.district} ·{" "}
                  {state.listings.filter((l) => l.ownerId === s.userId).length}{" "}
                  объявлений ·{" "}
                  {
                    state.ownerRequests.filter((r) => r.ownerId === s.userId)
                      .length
                  }{" "}
                  запросов
                </span>
              </div>
              <div className="row wrap">
                <a className="btn" href={`#/owners/${s.userId}`}>
                  Профиль
                </a>
                <a className="btn" href={`#/admin/catalog?owner=${s.userId}`}>
                  Объявления
                </a>
                <a className="btn" href={`#/admin/requests?owner=${s.userId}`}>
                  Запросы
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : tab === "requests" ? (
        <Requests
          admin
          ownerFilter={new URLSearchParams(query).get("owner") || ""}
        />
      ) : tab === "categories" ? (
        <Categories />
      ) : tab === "data" ? (
        <DataTools />
      ) : (
        <Empty
          title="Раздел не найден"
          text="Выберите раздел в меню администратора."
        />
      )}
    </div>
  );
}
