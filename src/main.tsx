import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { CatalogPackage, CatalogState } from "./domain/models";
import { IndexedDbRepository } from "./data/repository";
import { MarketplaceService } from "./domain/service";
import { Context, base, go } from "./ui/context";
import { Icon } from "./ui/Icon";
import { Modal } from "./ui/components";
import { Catalog } from "./routes/Catalog";
import {
  Detail,
  Owner,
  CollectionPage,
  Favorites,
  Help,
  NotFound,
} from "./routes/Detail";
import { SelectionPage, SharedSelection } from "./routes/Selection";
import { Account } from "./routes/Account";
import { ListingEditor } from "./routes/ListingEditor";
import { Admin } from "./routes/Admin";
import "./styles.css";
const repo = new IndexedDbRepository();
const service = new MarketplaceService(repo);
function App() {
  const [state, setState] = useState<CatalogState>();
  const [seed, setSeed] = useState<CatalogPackage>();
  const [failure, setFailure] = useState("");
  const [hash, setHash] = useState(location.hash.slice(1) || "/");
  const [actor, setActor] = useState(() => {
    try {
      return sessionStorage.getItem("kinostore-actor") || "guest";
    } catch {
      return "guest";
    }
  });
  const [login, setLogin] = useState(false);
  const [alias, setAlias] = useState("");
  const [start, setStart] = useState("find");
  const [toast, setToast] = useState<{ text: string; error: boolean }>();
  const [busy, setBusy] = useState(false);
  const notify = (text: string, error = false) => setToast({ text, error });
  useEffect(() => {
    let mounted = true;
    fetch(base("catalog.json"))
      .then((r) => {
        if (!r.ok)
          throw new Error("Не удалось загрузить демонстрационный каталог");
        return r.json();
      })
      .then(async (data: CatalogPackage) => {
        const value = await repo.init(data);
        if (mounted) {
          setSeed(data);
          setState(value);
          if (actor !== "guest" && !value.users.some((u) => u.id === actor))
            setActor("guest");
        }
      })
      .catch((e) => setFailure(String(e.message)));
    const unsub = repo.subscribe(() => {
      repo
        .getState()
        .then((value) => {
          if (mounted) setState(value);
        })
        .catch((e) => notify(String(e.message), true));
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);
  useEffect(() => {
    const fn = () => {
      setHash(location.hash.slice(1) || "/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(undefined), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  async function run<T>(
    fn: () => Promise<T>,
    success?: string,
  ): Promise<T | undefined> {
    try {
      const result = await fn();
      setState(await repo.getState());
      if (success) notify(success);
      return result;
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "Не удалось выполнить действие",
        true,
      );
      return undefined;
    }
  }
  async function switchActor(id: string) {
    const result = await run(() => service.switchActor(id));
    if (result) {
      setActor(id);
      try {
        sessionStorage.setItem("kinostore-actor", id);
      } catch {
        /* UI selection still works when sessionStorage is unavailable. */
      }
      setLogin(false);
    }
  }
  if (failure)
    return (
      <main className="shell page">
        <h1>Не удалось открыть локальное демо</h1>
        <p role="alert">{failure}</p>
        <p>
          Данные не сбрасывались. Проверьте доступ браузера к локальному
          хранилищу.
        </p>
        <button className="btn" onClick={() => location.reload()}>
          Повторить
        </button>
      </main>
    );
  if (!state || !seed)
    return (
      <main className="shell page" aria-busy="true">
        <h1>Открываем Kinostore…</h1>
        <p>Загружаем каталог и локальные данные.</p>
      </main>
    );
  const [path, query = ""] = hash.split("?");
  const count =
    state.selections.find((s) => s.actorId === actor)?.lines.length || 0;
  return (
    <Context.Provider
      value={{
        state,
        seed,
        actor,
        service,
        repo,
        run,
        notify,
        login: () => setLogin(true),
        switchActor,
      }}
    >
      <div className="demo-banner">
        Демонстрационная версия. Вещи, цены и участники вымышлены. Изменения
        сохраняются только в этом браузере
      </div>
      <header className="header">
        <div className="shell header-row">
          <a href="#/" className="logo" aria-label="Kinostore, каталог">
            <img src={base("favicon.svg")} alt="" />
            <div>
              kinostore<span className="brand-dot">РЕКВИЗИТ ДЛЯ ИСТОРИЙ</span>
            </div>
          </a>
          <span className="location">
            <Icon name="pin" size={16} />
            Москва и МО
          </span>
          <nav className="header-nav" aria-label="Основная навигация">
            <a href="#/favorites">
              <Icon name="heart" />
              <span className="nav-text">Избранное</span>
            </a>
            <a href="#/selection">
              <Icon name="bag" />
              <span className="nav-text">
                Подборка {count > 0 && `(${count})`}
              </span>
            </a>
            <a href="#/account/requests">
              <Icon name="user" />
              <span className="nav-text">Кабинет</span>
            </a>
            <a href="#/listing/new" className="btn primary">
              <Icon name="plus" size={18} />
              <span>Сдать реквизит</span>
            </a>
          </nav>
        </div>
      </header>
      <div className="shell demo-control">
        <div className="actor-control">
          <span>
            <span className="live-dot" />
            Режим демонстрации
          </span>
          <select
            aria-label="Текущий демо-участник"
            value={actor}
            onChange={(e) => switchActor(e.target.value)}
          >
            <option value="guest">Гость</option>
            {state.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.alias}
              </option>
            ))}
          </select>
        </div>
        <a href="#/help">
          Как проверить демо <span aria-hidden="true">↗</span>
        </a>
      </div>
      <main className="shell" id="main">
        {path === "/" ? (
          <Catalog query={query} />
        ) : path.startsWith("/items/") ? (
          <Detail key={path} slug={path.split("/")[2]} />
        ) : path.startsWith("/owners/") ? (
          <Owner id={path.split("/")[2]} />
        ) : path.startsWith("/collections/") ? (
          <CollectionPage slug={path.split("/")[2]} />
        ) : path === "/favorites" ? (
          <Favorites />
        ) : path === "/selection" ? (
          <SelectionPage key={actor} />
        ) : path === "/share" ? (
          <SharedSelection query={query} />
        ) : path.startsWith("/account") ? (
          <Account key={actor} tab={path.split("/")[2] || "requests"} />
        ) : path.startsWith("/listing/") ? (
          <ListingEditor
            key={actor + "-" + path}
            id={path.split("/")[2] === "new" ? undefined : path.split("/")[2]}
          />
        ) : path.startsWith("/admin") ? (
          <Admin
            key={path + query}
            tab={path.split("/")[2] || "overview"}
            query={query}
          />
        ) : path === "/help" ? (
          <Help />
        ) : (
          <NotFound />
        )}
      </main>
      <footer className="shell footer">
        <div>
          <strong>kinostore</strong> · Предметы для ваших историй
          <br />
          Москва и Московская область · Только демонстрация
        </div>
        <div>
          <a href="#/help">Как это работает</a> ·{" "}
          <button onClick={() => setLogin(true)} className="link">
            Тестовый профиль
          </button>
          {state.users.find((u) => u.id === actor)?.isAdmin && (
            <>
              {" "}
              · <a href="#/admin/overview">Администратор демо</a>
            </>
          )}
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="Мобильная навигация">
        {[
          ["/", "grid", "Каталог"],
          ["/favorites", "heart", "Избранное"],
          ["/selection", "bag", `Подборка${count ? " · " + count : ""}`],
          ["/account/requests", "user", "Кабинет"],
        ].map(([href, icon, label]) => (
          <a
            href={`#${href}`}
            key={href}
            className={path === href ? "active" : ""}
          >
            <Icon name={icon} size={21} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.text}
          <button
            aria-label="Закрыть сообщение"
            onClick={() => setToast(undefined)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {login && (
        <Modal title="Войти в демо" onClose={() => setLogin(false)}>
          <div className="stack">
            <p className="muted">
              Тестовые профили работают только в этом браузере. Email, телефон и
              пароль не нужны.
            </p>
            <button
              className="btn primary"
              onClick={() => switchActor("participant")}
            >
              Войти как демо-участник
            </button>
            <hr
              style={{ width: "100%", border: 0, borderTop: "1px solid #ddd" }}
            />
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const user = await run(() => service.createProfile(alias));
                  if (user) {
                    await switchActor(user.id);
                    go(
                      start === "rent"
                        ? "/listing/new"
                        : start === "both"
                          ? "/account/profile"
                          : "/",
                    );
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Новый тестовый псевдоним
                <input
                  required
                  minLength={2}
                  maxLength={40}
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Например, Сценограф"
                />
              </label>
              <label>
                Что хотите сделать сначала?
                <select
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                >
                  <option value="find">Найти реквизит</option>
                  <option value="rent">Сдать реквизит</option>
                  <option value="both">И то и другое</option>
                </select>
              </label>
              <button className="btn" disabled={busy}>
                Создать тестовый профиль
              </button>
            </form>
          </div>
        </Modal>
      )}
    </Context.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
