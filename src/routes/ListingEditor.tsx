import { useState } from "react";
import type { ListingInput } from "../domain/models";
import { money } from "../domain/calculations";
import { useApp, go } from "../ui/context";
import { AssetImage, Empty } from "../ui/components";
import { Icon } from "../ui/Icon";
import { LoginRequired } from "./Account";
export function ListingEditor({ id }: { id?: string }) {
  const { state, actor, service, run, notify } = useApp();
  const existing = state.listings.find((l) => l.id === id);
  const seller = state.sellers.find((s) => s.userId === actor);
  const [form, setForm] = useState<ListingInput>(() =>
    existing
      ? { ...existing }
      : {
          title: "",
          description: "",
          categoryId: state.categories[0]?.id || "",
          imageIds: [],
          tags: [],
          material: "",
          color: "",
          dimensions: "",
          era: "",
          condition: "",
          functionality: "not-applicable",
          priceKopecks: 0,
          depositKopecks: 0,
          quantity: 1,
          unit: "шт.",
          district: seller?.district || "",
          delivery: false,
          pickupTerms: seller?.pickupTerms || "",
          packaging: "",
        },
  );
  const [step, setStep] = useState(1);
  const [savedId, setSavedId] = useState(id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState(
    existing ? String(existing.priceKopecks / 100) : "",
  );
  const [deposit, setDeposit] = useState(
    existing ? String(existing.depositKopecks / 100) : "0",
  );
  if (actor === "guest") return <LoginRequired />;
  if (id && !existing)
    return (
      <Empty
        title="Объявление не найдено"
        text="Этого локального объявления нет в данном браузере."
        href="#/account/listings"
      />
    );
  if (
    existing &&
    existing.ownerId !== actor &&
    !state.users.find((u) => u.id === actor)?.isAdmin
  )
    return (
      <Empty
        title="Это чужое объявление"
        text="Редактирование доступно владельцу и администратору демо."
        href="#/account/listings"
      />
    );
  if (existing?.status === "archived")
    return (
      <Empty
        title="Объявление в архиве"
        text="История запросов сохранена. Для нового размещения создайте другое объявление."
        href="#/listing/new"
      />
    );
  function field<K extends keyof ListingInput>(key: K, value: ListingInput[K]) {
    setForm((v) => ({ ...v, [key]: value }));
    setErrors((v) => ({ ...v, [key]: "" }));
  }
  function validate(target: number) {
    const e: Record<string, string> = {};
    if (target === 1) {
      if (form.title.trim().length < 3)
        e.title = "Укажите название от 3 символов";
      if (form.description.trim().length < 20)
        e.description = "Опишите предмет минимум в 20 символах";
      for (const k of [
        "categoryId",
        "material",
        "color",
        "dimensions",
        "era",
        "condition",
      ] as const)
        if (!form[k]) e[k] = "Заполните это поле";
    }
    if (target === 2 && !form.imageIds.length)
      e.imageIds = "Добавьте хотя бы одно фото";
    if (target === 3) {
      if (
        !/^\d+(?:[.,]\d{1,2})?$/.test(price) ||
        Number(price.replace(",", ".")) <= 0
      )
        e.priceKopecks =
          "Укажите положительную цену, до двух знаков после запятой";
      if (!/^\d+(?:[.,]\d{1,2})?$/.test(deposit))
        e.depositKopecks = "Залог должен быть числом от 0";
      if (
        !Number.isInteger(form.quantity) ||
        form.quantity < 1 ||
        form.quantity > 10000
      )
        e.quantity = "Количество от 1 до 10 000, целое";
      for (const k of ["district", "pickupTerms", "packaging", "unit"] as const)
        if (!form[k].trim()) e[k] = "Заполните это поле";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  const prepared = () => ({
    ...form,
    id: savedId,
    priceKopecks: Math.round(Number(price.replace(",", ".")) * 100) || 0,
    depositKopecks: Math.round(Number(deposit.replace(",", ".")) * 100) || 0,
  });
  async function save(show = true) {
    const before = new Set(state.listings.map((l) => l.id));
    const result = await run(
      () => service.saveListing(actor, prepared()),
      show ? "Черновик сохранён в этом браузере" : undefined,
    );
    if (!result) return;
    const saved = savedId
      ? result.listings.find((l) => l.id === savedId)
      : result.listings.find((l) => !before.has(l.id) && l.ownerId === actor);
    if (saved) {
      setSavedId(saved.id);
      setForm((v) => ({ ...v, id: saved.id }));
      if (!id) {
        history.replaceState(null, "", `#/listing/${saved.id}/edit`);
      }
    }
    return saved;
  }
  async function next() {
    if (!validate(step)) return;
    setBusy(true);
    try {
      if (await save(false)) setStep(step + 1);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!validate(3)) return;
    setBusy(true);
    try {
      const saved = await save(false);
      if (!saved) return;
      const result =
        saved.status === "pending"
          ? true
          : await run(() => service.submitListing(actor, saved.id));
      if (result) {
        notify("Объявление отправлено на модерацию");
        go("/account/listings");
      }
    } finally {
      setBusy(false);
    }
  }
  const input = (
    key:
      | "title"
      | "material"
      | "color"
      | "dimensions"
      | "era"
      | "condition"
      | "unit"
      | "district",
    label: string,
    placeholder = "",
  ) => (
    <label>
      {label}
      <input
        value={form[key]}
        placeholder={placeholder}
        maxLength={key === "title" ? 120 : 160}
        onChange={(e) => field(key, e.target.value)}
        aria-invalid={!!errors[key]}
      />
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </label>
  );
  return (
    <div className="page narrow">
      <span className="eyebrow">Сдать реквизит</span>
      <h1 style={{ marginTop: 12 }}>
        {existing
          ? "Редактирование объявления"
          : "У каждого предмета есть роль"}
      </h1>
      <p className="muted">
        Три шага до демо-каталога. Черновик можно сохранить в любой момент.
      </p>
      {existing?.rejectionReason && (
        <p className="notice error">
          Причина отклонения: {existing.rejectionReason}
        </p>
      )}
      {existing?.status === "published" && (
        <p className="notice warning">
          Изменение опубликованной вещи возвращает её на модерацию. Прошлые
          заявки сохранят прежние цены и условия.
        </p>
      )}
      <div className="wizard-steps">
        {["Предмет", "Изображения", "Аренда"].map((t, i) => (
          <div
            className={`wizard-step ${step === i + 1 ? "active" : ""}`}
            key={t}
          >
            {i + 1}. {t}
          </div>
        ))}
      </div>
      <div className="panel">
        {step === 1 ? (
          <div className="form-grid">
            <div className="span-2">
              {input(
                "title",
                "Название предмета",
                "Например, настольная лампа с зелёным абажуром",
              )}
            </div>
            <label className="span-2">
              Категория
              <select
                value={form.categoryId}
                onChange={(e) => field("categoryId", e.target.value)}
              >
                {state.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="span-2">
              Описание предмета
              <textarea
                value={form.description}
                maxLength={5000}
                onChange={(e) => field("description", e.target.value)}
                aria-invalid={!!errors.description}
                placeholder="Форма, детали, для какой сцены подойдёт. Только тестовые сведения."
              />
              {errors.description && (
                <span className="field-error">{errors.description}</span>
              )}
            </label>
            {input("material", "Материал", "Дерево, ткань")}
            {input("color", "Цвет", "Оливковый")}
            {input("dimensions", "Размеры с единицами", "60 × 50 × 80 см")}
            {input("era", "Эпоха или стиль", "1970-е")}
            {input("condition", "Состояние", "Небольшие следы использования")}
            <label>
              Работоспособность
              <select
                value={form.functionality}
                onChange={(e) =>
                  field(
                    "functionality",
                    e.target.value as ListingInput["functionality"],
                  )
                }
              >
                <option value="not-applicable">Предмет интерьера</option>
                <option value="working">Рабочая вещь</option>
                <option value="prop">Неработающая вещь для кадра</option>
                <option value="replica">Муляж</option>
              </select>
            </label>
            <label className="span-2">
              Теги через запятую
              <input
                value={form.tags.join(", ")}
                onChange={(e) =>
                  field(
                    "tags",
                    e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .slice(0, 20),
                  )
                }
              />
            </label>
          </div>
        ) : step === 2 ? (
          <>
            <h2>Покажите предмет</h2>
            <p className="muted">
              До 6 фото. JPEG, PNG или WebP, не больше 8 МБ каждое. Первое фото
              станет обложкой.
            </p>
            <label className="upload-zone">
              <Icon name="camera" size={32} />
              <span style={{ display: "block", marginTop: 10 }}>
                Добавить фотографии
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={busy || form.imageIds.length >= 6}
                aria-label="Фотографии предмета"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  if (form.imageIds.length + files.length > 6) {
                    setErrors({
                      imageIds: "Не больше 6 фотографий на объявление",
                    });
                    return;
                  }
                  setBusy(true);
                  const ids = [...form.imageIds];
                  try {
                    for (const file of files) {
                      const img = await run(() =>
                        service.addImage(
                          actor,
                          file,
                          form.title || "Предмет для демо-каталога",
                        ),
                      );
                      if (img) ids.push(img.id);
                    }
                    field("imageIds", ids);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            {errors.imageIds && (
              <p className="field-error" role="alert">
                {errors.imageIds}
              </p>
            )}
            {busy && <p role="status">Обрабатываем изображения…</p>}
            <div className="upload-grid">
              {form.imageIds.map((imageId, i) => (
                <div key={imageId}>
                  <AssetImage id={imageId} eager />
                  <p className="small muted" style={{ margin: "7px 0" }}>
                    {i === 0 ? "Главное фото" : `Фото ${i + 1}`}
                  </p>
                  <div className="row wrap">
                    <button
                      className="btn"
                      disabled={i === 0}
                      onClick={() =>
                        field("imageIds", [
                          imageId,
                          ...form.imageIds.filter((v) => v !== imageId),
                        ])
                      }
                    >
                      Главное
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={`Удалить фото ${i + 1}`}
                      onClick={() =>
                        field(
                          "imageIds",
                          form.imageIds.filter((v) => v !== imageId),
                        )
                      }
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="notice">
              Загружайте изображения, на которые у вас есть права. Фото
              пересохраняется в браузере без исходных метаданных.
            </p>
          </>
        ) : (
          <>
            <div className="form-grid">
              <label>
                Цена за день, ₽
                <input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  aria-invalid={!!errors.priceKopecks}
                />
                {errors.priceKopecks && (
                  <span className="field-error">{errors.priceKopecks}</span>
                )}
              </label>
              <label>
                Залог за единицу, ₽
                <input
                  inputMode="decimal"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  aria-invalid={!!errors.depositKopecks}
                />
                <small>0 означает «Без залога»</small>
                {errors.depositKopecks && (
                  <span className="field-error">{errors.depositKopecks}</span>
                )}
              </label>
              <label>
                Доступное количество
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={form.quantity}
                  onChange={(e) => field("quantity", Number(e.target.value))}
                />
                {errors.quantity && (
                  <span className="field-error">{errors.quantity}</span>
                )}
              </label>
              {input("unit", "Единица количества", "шт.")}
              {input("district", "Район", "Москва, Сокол")}
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={form.delivery}
                  onChange={(e) => field("delivery", e.target.checked)}
                />
                Возможна доставка по согласованию
              </label>
              <label className="span-2">
                Условия выдачи
                <textarea
                  value={form.pickupTerms}
                  onChange={(e) => field("pickupTerms", e.target.value)}
                  placeholder="Самовывоз после согласования времени"
                />
                {errors.pickupTerms && (
                  <span className="field-error">{errors.pickupTerms}</span>
                )}
              </label>
              <label className="span-2">
                Упаковка
                <textarea
                  value={form.packaging}
                  onChange={(e) => field("packaging", e.target.value)}
                />
                {errors.packaging && (
                  <span className="field-error">{errors.packaging}</span>
                )}
              </label>
            </div>
            <section className="mt">
              <h3 className="preview-heading">Предпросмотр объявления</h3>
              <div className="row" style={{ alignItems: "start" }}>
                <div style={{ width: 150, flexShrink: 0 }}>
                  {form.imageIds[0] && (
                    <AssetImage id={form.imageIds[0]} thumb />
                  )}
                </div>
                <div>
                  <h3>{form.title}</h3>
                  <p>{money(prepared().priceKopecks)} / день</p>
                  <p className="small muted">
                    {form.district} · {form.quantity} {form.unit}
                  </p>
                </div>
              </div>
              <p className="small muted mt">{form.description}</p>
            </section>
          </>
        )}
        <div className="wizard-actions">
          {step > 1 && (
            <button
              className="btn"
              disabled={busy}
              onClick={() => setStep(step - 1)}
            >
              Назад
            </button>
          )}
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await save();
              setBusy(false);
            }}
          >
            Сохранить черновик
          </button>
          {step < 3 ? (
            <button className="btn primary" disabled={busy} onClick={next}>
              Далее <Icon name="arrow" size={16} />
            </button>
          ) : (
            <button className="btn primary" disabled={busy} onClick={publish}>
              Отправить на модерацию
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
