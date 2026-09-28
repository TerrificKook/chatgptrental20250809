import { useEffect, useRef, useState } from "react";
import { calendarDays, money } from "../domain/calculations";
import { selectionFor } from "../domain/service";
import { useApp, go } from "../ui/context";
import { AssetImage, Empty } from "../ui/components";
import { Icon } from "../ui/Icon";
export function SelectionPage() {
  const { state, actor, service, run, login, notify } = useApp();
  const selection = selectionFor(state, actor);
  const [start, setStart] = useState(selection.startDate);
  const [end, setEnd] = useState(selection.endDate);
  const [busy, setBusy] = useState(false);
  const [savedName, setSavedName] = useState("");
  const token = useRef(crypto.randomUUID());
  useEffect(() => {
    setStart(selection.startDate);
    setEnd(selection.endDate);
  }, [actor, selection.startDate, selection.endDate]);
  const lines = selection.lines.map((line) => ({
    line,
    item: state.listings.find((l) => l.id === line.listingId),
  }));
  const owners = [
    ...new Set(lines.map((l) => l.item?.ownerId).filter(Boolean)),
  ];
  let days = 0,
    dateError = "";
  try {
    days = calendarDays(start, end);
  } catch (e) {
    dateError = e instanceof Error ? e.message : "Выберите даты";
  }
  const rent = lines.reduce(
      (v, { line, item }) =>
        v + (item?.priceKopecks || 0) * line.quantity * days,
      0,
    ),
    deposit = lines.reduce(
      (v, { line, item }) => v + (item?.depositKopecks || 0) * line.quantity,
      0,
    );
  const text = () =>
    `Kinostore · демонстрационная подборка\n${start || "Дата начала не выбрана"} — ${end || "дата окончания не выбрана"} (${days} календ. дн.)\n${owners
      .map(
        (id) =>
          `${state.sellers.find((s) => s.userId === id)?.name}\n${lines
            .filter((l) => l.item?.ownerId === id)
            .map(
              ({ item, line }) =>
                `${item?.title} × ${line.quantity}: ${money((item?.priceKopecks || 0) * line.quantity * days)} аренда; ${money((item?.depositKopecks || 0) * line.quantity)} залог`,
            )
            .join("\n")}`,
      )
      .join(
        "\n\n",
      )}\nИтого аренда: ${money(rent)}\nЗалог отдельно: ${money(deposit)}\nДоставка по согласованию. Наличие подтверждает каждый владелец. Внешней отправки нет.`;
  async function share() {
    if (lines.some((l) => l.item?.origin !== "seed")) {
      notify(
        "В подборке есть локальная карточка. Скопируйте текст или экспортируйте каталог с фото.",
        true,
      );
      return;
    }
    if (dateError) {
      notify(dateError, true);
      return;
    }
    const data = JSON.stringify({
      v: 1,
      start,
      end,
      items: lines.map(({ item, line }) => ({
        id: item!.id,
        q: line.quantity,
      })),
    });
    const url = new URL(location.href);
    url.hash = "/share?data=" + encodeURIComponent(data);
    if (url.href.length > 4000) {
      notify("Подборка слишком велика для ссылки. Скопируйте текст.", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(url.href);
      notify(
        "Демо-ссылка скопирована. Она содержит только исходные ID, количество и даты.",
      );
    } catch {
      notify(
        "Браузер не разрешил копирование. Используйте печатную версию.",
        true,
      );
    }
  }
  async function submit() {
    if (dateError) {
      notify(dateError, true);
      return;
    }
    if (actor === "guest") {
      if (await run(() => service.setSelectionDates(actor, start, end)))
        login();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const saved = await run(() =>
        service.setSelectionDates(actor, start, end),
      );
      if (!saved) return;
      const request = await run(
        () => service.submitRequest(actor, token.current),
        "Демо-запрос сохранён",
      );
      if (request) {
        token.current = crypto.randomUUID();
        go("/account/requests");
      }
    } finally {
      setBusy(false);
    }
  }
  if (!lines.length)
    return (
      <div className="page">
        <h1>Ваша подборка</h1>
        <Empty
          title="Здесь начинается новая история"
          text="Добавьте вещи из каталога. Затем выберите даты и отправьте отдельный демо-запрос каждому владельцу."
          href="#/"
          action="Найти реквизит"
        />
      </div>
    );
  return (
    <div className="page">
      <div className="row spread">
        <div>
          <div className="eyebrow">Собираем кадр</div>
          <h1 style={{ marginTop: 10 }}>Ваша подборка</h1>
        </div>
        <a className="btn" href="#/">
          Добавить ещё <Icon name="plus" size={18} />
        </a>
      </div>
      <p className="muted">
        Каждый владелец подтверждает свою часть. Общего договора и единой
        доставки нет.
      </p>
      <div className="two-col">
        <div>
          {owners.map((ownerId) => (
            <section className="panel" key={ownerId}>
              <div className="row spread">
                <h2 className="no-margin">
                  {state.sellers.find((s) => s.userId === ownerId)?.name}
                </h2>
                <span className="small muted">Демо-владелец</span>
              </div>
              {lines
                .filter((l) => l.item?.ownerId === ownerId)
                .map(({ line, item }) => (
                  <div
                    className="selection-item"
                    data-testid="selection-line"
                    key={line.listingId}
                  >
                    <AssetImage id={item!.imageIds[0]} thumb />
                    <div>
                      <h3>{item!.title}</h3>
                      <span className="small muted">
                        {money(item!.priceKopecks)} / день
                      </span>
                      {item!.status !== "published" && (
                        <p className="field-error">
                          Снято с показа. Удалите из подборки.
                        </p>
                      )}
                      {item!.ownerId === actor && (
                        <p className="field-error">
                          Нельзя запросить свою вещь
                        </p>
                      )}
                    </div>
                    <label>
                      <span className="visually-hidden">
                        Количество: {item!.title}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={item!.quantity}
                        step="1"
                        value={line.quantity}
                        onChange={(e) => {
                          const q = Number(e.target.value);
                          if (!Number.isInteger(q) || q < 1) {
                            notify(
                              "Количество должно быть целым и больше нуля",
                              true,
                            );
                            return;
                          }
                          void run(() =>
                            service.setSelectionItem(actor, item!.id, q),
                          );
                        }}
                      />
                    </label>
                    <button
                      className="icon-btn no-print"
                      onClick={() =>
                        run(() => service.setSelectionItem(actor, item!.id, 0))
                      }
                      aria-label={`Удалить: ${item!.title}`}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ))}
              <div className="total-row">
                <span>Аренда у владельца</span>
                <strong>
                  {money(
                    lines
                      .filter((l) => l.item?.ownerId === ownerId)
                      .reduce(
                        (v, { line, item }) =>
                          v + item!.priceKopecks * line.quantity * days,
                        0,
                      ),
                  )}
                </strong>
              </div>
              <div className="total-row muted small">
                <span>Залог отдельно</span>
                <span>
                  {money(
                    lines
                      .filter((l) => l.item?.ownerId === ownerId)
                      .reduce(
                        (v, { line, item }) =>
                          v + item!.depositKopecks * line.quantity,
                        0,
                      ),
                  )}
                </span>
              </div>
              <p className="small muted no-margin">Доставка: по согласованию</p>
            </section>
          ))}
          <div className="panel no-print">
            <h3>Сохранить подборку</h3>
            <label>
              Название подборки
              <input
                maxLength={80}
                value={savedName}
                onChange={(e) => setSavedName(e.target.value)}
                placeholder="Например, Кабинет для короткого метра"
              />
            </label>
            <button
              className="btn mt"
              onClick={async () => {
                if (dateError) {
                  notify(dateError, true);
                  return;
                }
                if (
                  !(await run(() =>
                    service.setSelectionDates(actor, start, end),
                  ))
                )
                  return;
                if (actor === "guest") {
                  login();
                  return;
                }
                await run(
                  () => service.saveNamedSelection(actor, savedName),
                  "Подборка сохранена в кабинете",
                );
              }}
            >
              Сохранить подборку
            </button>
          </div>
          <div className="selection-actions no-print">
            <button
              className="btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text());
                  notify("Текст подборки скопирован");
                } catch {
                  notify("Копирование недоступно. Используйте печать.", true);
                }
              }}
            >
              Копировать текст
            </button>
            <button className="btn" onClick={() => window.print()}>
              Печатная версия
            </button>
            <button className="btn" onClick={share}>
              Ссылка для другого устройства
            </button>
          </div>
        </div>
        <aside className="panel sticky">
          <h2>Даты и расчёт</h2>
          <div className="dates">
            <label>
              Первый день
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                onBlur={() => {
                  if (start && end && !dateError)
                    void run(() =>
                      service.setSelectionDates(actor, start, end),
                    );
                }}
              />
            </label>
            <label>
              Последний день
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                onBlur={() => {
                  if (start && end && !dateError)
                    void run(() =>
                      service.setSelectionDates(actor, start, end),
                    );
                }}
              />
            </label>
          </div>
          {dateError ? (
            <p className="field-error mt" role="alert">
              {dateError}
            </p>
          ) : (
            <p className="small muted mt">
              {days} календ. дн. · Оба дня включены
            </p>
          )}
          <div className="total-row big">
            <span>Аренда</span>
            <span data-testid="rent-total">{money(rent)}</span>
          </div>
          <div className="total-row">
            <span>Залог отдельно</span>
            <span data-testid="deposit-total">
              {deposit ? money(deposit) : "Без залога"}
            </span>
          </div>
          <div className="total-row small muted">
            <span>Доставка</span>
            <span>По согласованию</span>
          </div>
          <button
            className="btn primary full mt no-print"
            disabled={busy}
            onClick={submit}
          >
            {busy
              ? "Сохраняем…"
              : actor === "guest"
                ? "Выбрать профиль и продолжить"
                : "Отправить демо-запрос"}
          </button>
          <p className="small muted mt no-margin">
            Ничего не оплачивается. После сохранения проверьте ответы владельцев
            в кабинете.
          </p>
        </aside>
      </div>
    </div>
  );
}
export function SharedSelection({ query }: { query: string }) {
  const { state, actor, service, run } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  let data:
    | {
        v: number;
        start: string;
        end: string;
        items: { id: string; q: number }[];
      }
    | undefined;
  try {
    const raw = new URLSearchParams(query).get("data") || "";
    if (raw.length > 3500) throw Error("Ссылка слишком длинная");
    const parsed = JSON.parse(raw);
    if (
      parsed.v !== 1 ||
      typeof parsed.start !== "string" ||
      typeof parsed.end !== "string" ||
      !Array.isArray(parsed.items) ||
      !parsed.items.length ||
      parsed.items.length > 48 ||
      Object.keys(parsed).some(
        (k) => !["v", "start", "end", "items"].includes(k),
      )
    )
      throw Error("Некорректная схема ссылки");
    calendarDays(parsed.start, parsed.end);
    const ids = new Set();
    for (const line of parsed.items) {
      const item = state.listings.find(
        (l) =>
          l.id === line.id && l.origin === "seed" && l.status === "published",
      );
      if (
        !item ||
        !Number.isInteger(line.q) ||
        line.q < 1 ||
        line.q > item.quantity ||
        ids.has(line.id) ||
        Object.keys(line).some((k) => !["id", "q"].includes(k))
      )
        throw Error("В ссылке неизвестные вещи или неверное количество");
      ids.add(line.id);
    }
    data = parsed;
  } catch {
    return (
      <div className="page">
        <Empty
          title="Некорректная ссылка подборки"
          text="Ссылка должна содержать только опубликованные исходные демо-вещи, корректные даты и количество."
          href="#/"
        />
      </div>
    );
  }
  return (
    <div className="page narrow">
      <h1>Подборка по ссылке</h1>
      <p>
        {data!.items.length} вещей · {data!.start} – {data!.end}
      </p>
      <p>
        Вещи будут добавлены к вашей подборке. Даты заменятся датами из ссылки.
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <button
        className="btn primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          if (
            data!.items.some(
              (line) =>
                state.listings.find((l) => l.id === line.id)?.ownerId === actor,
            )
          ) {
            setError("В подборке есть ваша вещь. Выберите другого участника.");
            setBusy(false);
            return;
          }
          const result = await run(() =>
            service.importSelection(actor, {
              startDate: data!.start,
              endDate: data!.end,
              lines: data!.items.map((line) => ({
                listingId: line.id,
                quantity: line.q,
              })),
            }),
          );
          setBusy(false);
          if (result) go("/selection");
        }}
      >
        Добавить в мою подборку
      </button>
    </div>
  );
}
