import { decodeSelection, encodeSelection } from "./selection-share";
import type { SharedSelection } from "./selection-share";
import type {
  ActorId,
  CatalogPackage,
  CatalogState,
  Category,
  ImageAsset,
  LineDecision,
  Listing,
  ListingInput,
  RequestGroup,
  SellerProfile,
  User,
} from "./models";
import type { MarketplaceRepository } from "../data/repository";
import { stateFromSeed } from "../data/repository";
import {
  aggregateStatus,
  calculateTotals,
  calendarDays,
  DomainError,
  validQuantity,
} from "./calculations";

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
export function requireActor(state: CatalogState, actorId: ActorId): User {
  const user = state.users.find((item) => item.id === actorId);
  if (!user)
    throw new DomainError("Выберите тестовый профиль, чтобы продолжить.");
  return user;
}
export function requireAdmin(state: CatalogState, actorId: ActorId): User {
  const user = requireActor(state, actorId);
  if (!user.isAdmin)
    throw new DomainError("Это действие доступно только администратору демо.");
  return user;
}
function requireListingOwner(
  state: CatalogState,
  actorId: ActorId,
  listingId: string,
): Listing {
  const actor = requireActor(state, actorId),
    listing = state.listings.find((item) => item.id === listingId);
  if (!listing) throw new DomainError("Объявление не найдено.");
  if (listing.ownerId !== actor.id && !actor.isAdmin)
    throw new DomainError("Нельзя изменять чужое объявление.");
  return listing;
}
function actorOrGuest(state: CatalogState, actorId: ActorId) {
  if (actorId !== "guest") requireActor(state, actorId);
}
function audit(
  state: CatalogState,
  actorId: ActorId,
  action: string,
  entityId: string,
  details = "",
) {
  state.audit.push({
    id: id("audit"),
    actorId,
    action,
    entityId,
    details,
    createdAt: now(),
  });
}
export function selectionFor(state: CatalogState, actorId: ActorId) {
  return (
    state.selections.find((item) => item.actorId === actorId) ?? {
      actorId,
      startDate: "",
      endDate: "",
      lines: [],
    }
  );
}
function writableSelection(state: CatalogState, actorId: ActorId) {
  let selection = state.selections.find((item) => item.actorId === actorId);
  if (!selection) {
    selection = { actorId, startDate: "", endDate: "", lines: [] };
    state.selections.push(selection);
  }
  return selection;
}
function validateRestorableSelection(
  state: CatalogState,
  actorId: ActorId,
  selection: SharedSelection,
): void {
  if (!selection.lines.length)
    throw new DomainError("Подборка пуста. Добавьте хотя бы одну вещь.");
  if (selection.startDate && selection.endDate)
    calendarDays(selection.startDate, selection.endDate);
  for (const line of selection.lines) {
    const listing = state.listings.find(
      (item) => item.id === line.listingId && item.status === "published",
    );
    if (!listing)
      throw new DomainError(
        "Одна из вещей подборки снята с показа. Удалите её или соберите новую подборку.",
      );
    if (listing.ownerId === actorId)
      throw new DomainError(
        "В подборке есть ваша вещь. Выберите другого участника.",
      );
    validQuantity(line.quantity, listing.quantity);
  }
}
function validateDraftShape(state: CatalogState, listing: Listing): void {
  if (
    !Number.isSafeInteger(listing.priceKopecks) ||
    listing.priceKopecks < 0 ||
    listing.priceKopecks > 100000000 ||
    !Number.isSafeInteger(listing.depositKopecks) ||
    listing.depositKopecks < 0 ||
    listing.depositKopecks > 1000000000
  )
    throw new DomainError(
      "Цена и залог должны быть неотрицательными числами: цена до 1 000 000 ₽, залог до 10 000 000 ₽.",
    );
  validQuantity(listing.quantity, 10000);
  if (
    listing.title.length > 120 ||
    [
      "description",
      "material",
      "color",
      "dimensions",
      "era",
      "condition",
      "unit",
      "district",
      "pickupTerms",
      "packaging",
    ].some((key) => (listing[key as keyof Listing] as string).length > 5000)
  )
    throw new DomainError(
      "Сократите название до 120 символов, остальные поля до 5000.",
    );
  if (listing.tags.some((tag) => typeof tag !== "string" || tag.length > 80))
    throw new DomainError(
      "Каждый тег должен быть строкой не длиннее 80 символов.",
    );
  if (
    listing.categoryId &&
    !state.categories.some((item) => item.id === listing.categoryId)
  )
    throw new DomainError("Неизвестная категория объявления.");
  if (
    !["working", "prop", "replica", "not-applicable"].includes(
      listing.functionality,
    )
  )
    throw new DomainError("Неизвестное состояние работоспособности.");
}
export function validateListing(state: CatalogState, listing: Listing): void {
  if (listing.title.trim().length < 3 || listing.title.length > 120)
    throw new DomainError("Название должно содержать от 3 до 120 символов.");
  if (
    listing.description.trim().length < 20 ||
    listing.description.length > 5000
  )
    throw new DomainError("Добавьте описание от 20 до 5000 символов.");
  if (!state.categories.some((item) => item.id === listing.categoryId))
    throw new DomainError("Выберите категорию.");
  if (
    !listing.imageIds.length ||
    listing.imageIds.length > 6 ||
    listing.imageIds.some(
      (imageId) => !state.images.some((image) => image.id === imageId),
    )
  )
    throw new DomainError("Добавьте от 1 до 6 корректных изображений.");
  if (
    !Number.isSafeInteger(listing.priceKopecks) ||
    listing.priceKopecks < 1 ||
    listing.priceKopecks > 100000000
  )
    throw new DomainError("Укажите положительную цену до 1 000 000 ₽ в день.");
  if (
    !Number.isSafeInteger(listing.depositKopecks) ||
    listing.depositKopecks < 0 ||
    listing.depositKopecks > 1000000000
  )
    throw new DomainError("Укажите залог от 0 до 10 000 000 ₽.");
  validQuantity(listing.quantity, 10000);
  for (const field of [
    "material",
    "color",
    "dimensions",
    "era",
    "condition",
    "unit",
    "district",
    "pickupTerms",
    "packaging",
  ] as const)
    if (!listing[field]?.trim())
      throw new DomainError(
        "Заполните характеристики, район и условия выдачи.",
      );
}
export class MarketplaceService {
  constructor(readonly repo: MarketplaceRepository) {}
  async createProfile(alias: string): Promise<User> {
    const name = alias.trim();
    if (name.length < 2 || name.length > 40 || /[@<>]|\d{7,}/.test(name))
      throw new DomainError(
        "Укажите вымышленный псевдоним от 2 до 40 символов, без контактов.",
      );
    const user: User = {
      id: id("user"),
      alias: name,
      isAdmin: false,
      isDemo: true,
      createdAt: now(),
    };
    await this.repo.mutate((state) => {
      state.users.push(user);
      audit(state, user.id, "Создан тестовый профиль", user.id);
    });
    return user;
  }
  switchActor(actorId: ActorId): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      actorOrGuest(state, actorId);
      if (actorId === "guest") return;
      const guest = state.selections.find((item) => item.actorId === "guest"),
        target = writableSelection(state, actorId);
      if (guest) {
        for (const line of guest.lines) {
          const existing = target.lines.find(
            (item) => item.listingId === line.listingId,
          );
          if (!existing) target.lines.push(line);
        }
        if (!target.startDate && guest.startDate) {
          target.startDate = guest.startDate;
          target.endDate = guest.endDate;
        }
        state.selections = state.selections.filter(
          (item) => item.actorId !== "guest",
        );
      }
      for (const favorite of state.favorites.filter(
        (item) => item.actorId === "guest",
      ))
        if (
          !state.favorites.some(
            (item) =>
              item.actorId === actorId && item.listingId === favorite.listingId,
          )
        )
          state.favorites.push({ actorId, listingId: favorite.listingId });
      state.favorites = state.favorites.filter(
        (item) => item.actorId !== "guest",
      );
    });
  }
  toggleFavorite(actorId: ActorId, listingId: string): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      actorOrGuest(state, actorId);
      const exists = state.favorites.some(
        (item) => item.actorId === actorId && item.listingId === listingId,
      );
      if (exists)
        state.favorites = state.favorites.filter(
          (item) => item.actorId !== actorId || item.listingId !== listingId,
        );
      else {
        if (
          !state.listings.some(
            (item) => item.id === listingId && item.status === "published",
          )
        )
          throw new DomainError("Эта вещь не опубликована.");
        state.favorites.push({ actorId, listingId });
      }
    });
  }
  setSelectionItem(
    actorId: ActorId,
    listingId: string,
    quantity: number,
  ): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      actorOrGuest(state, actorId);
      const selection = writableSelection(state, actorId);
      if (quantity === 0) {
        selection.lines = selection.lines.filter(
          (item) => item.listingId !== listingId,
        );
        return;
      }
      const listing = state.listings.find(
        (item) => item.id === listingId && item.status === "published",
      );
      if (!listing) throw new DomainError("Эта вещь сейчас не опубликована.");
      validQuantity(quantity, listing.quantity);
      if (listing.ownerId === actorId)
        throw new DomainError(
          "Нельзя запросить собственную вещь. Переключитесь на другого демо-участника.",
        );
      const existing = selection.lines.find(
        (item) => item.listingId === listingId,
      );
      if (existing) existing.quantity = quantity;
      else selection.lines.push({ listingId, quantity });
    });
  }
  setSelectionDates(
    actorId: ActorId,
    startDate: string,
    endDate: string,
  ): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      actorOrGuest(state, actorId);
      if (startDate && endDate) calendarDays(startDate, endDate);
      Object.assign(writableSelection(state, actorId), { startDate, endDate });
    });
  }
  saveNamedSelection(actorId: ActorId, name: string): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireActor(state, actorId);
      const title = name.trim();
      if (title.length < 2 || title.length > 80)
        throw new DomainError("Название подборки: от 2 до 80 символов.");
      const selection = selectionFor(state, actorId);
      validateRestorableSelection(state, actorId, selection);
      const existing = state.savedSelections.find(
        (item) =>
          item.actorId === actorId &&
          item.name.toLocaleLowerCase("ru") === title.toLocaleLowerCase("ru"),
      );
      const saved = {
        ...structuredClone(selection),
        id: existing?.id ?? id("saved-selection"),
        name: title,
        updatedAt: now(),
      };
      if (existing) Object.assign(existing, saved);
      else state.savedSelections.push(saved);
      audit(state, actorId, "Сохранена именованная подборка", saved.id, title);
    });
  }
  restoreNamedSelection(
    actorId: ActorId,
    savedSelectionId: string,
  ): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireActor(state, actorId);
      const saved = state.savedSelections.find(
        (item) => item.id === savedSelectionId && item.actorId === actorId,
      );
      if (!saved)
        throw new DomainError(
          "Подборка не найдена или принадлежит другому участнику.",
        );
      validateRestorableSelection(state, actorId, saved);
      Object.assign(writableSelection(state, actorId), {
        startDate: saved.startDate,
        endDate: saved.endDate,
        lines: structuredClone(saved.lines),
      });
      audit(
        state,
        actorId,
        "Восстановлена именованная подборка",
        saved.id,
        saved.name,
      );
    });
  }
  deleteNamedSelection(
    actorId: ActorId,
    savedSelectionId: string,
  ): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireActor(state, actorId);
      const saved = state.savedSelections.find(
        (item) => item.id === savedSelectionId && item.actorId === actorId,
      );
      if (!saved)
        throw new DomainError(
          "Подборка не найдена или принадлежит другому участнику.",
        );
      state.savedSelections = state.savedSelections.filter(
        (item) => item.id !== savedSelectionId,
      );
      audit(
        state,
        actorId,
        "Удалена именованная подборка",
        saved.id,
        saved.name,
      );
    });
  }
  repeatRequest(actorId: ActorId, groupId: string): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireActor(state, actorId);
      const group = state.requestGroups.find(
        (item) => item.id === groupId && item.requesterId === actorId,
      );
      if (!group)
        throw new DomainError("Можно собрать снова только свой запрос.");
      const lines = state.ownerRequests
        .filter((item) => item.groupId === groupId)
        .flatMap((item) => item.lines)
        .flatMap((line) => {
          const listing = state.listings.find(
            (item) =>
              item.id === line.listingId &&
              item.status === "published" &&
              item.ownerId !== actorId,
          );
          return listing
            ? [
                {
                  listingId: listing.id,
                  quantity: Math.min(line.quantity, listing.quantity),
                },
              ]
            : [];
        });
      if (!lines.length)
        throw new DomainError("Все вещи сняты с показа или принадлежат вам.");
      const selection = {
        actorId,
        startDate: group.startDate,
        endDate: group.endDate,
        lines,
      };
      validateRestorableSelection(state, actorId, selection);
      Object.assign(writableSelection(state, actorId), selection);
    });
  }
  importSelection(
    actorId: ActorId,
    shared: SharedSelection,
  ): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      actorOrGuest(state, actorId);
      const checked = decodeSelection(
        encodeSelection(shared, state.listings),
        state.listings,
      );
      if (
        checked.lines.some(
          (line) =>
            state.listings.find((item) => item.id === line.listingId)
              ?.ownerId === actorId,
        )
      )
        throw new DomainError(
          "В подборке есть ваша вещь. Выберите другого участника.",
        );
      const selection = writableSelection(state, actorId);
      for (const line of checked.lines) {
        const existing = selection.lines.find(
          (item) => item.listingId === line.listingId,
        );
        if (existing) existing.quantity = line.quantity;
        else selection.lines.push(line);
      }
      selection.startDate = checked.startDate;
      selection.endDate = checked.endDate;
    });
  }
  clearSelection(actorId: ActorId): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      actorOrGuest(state, actorId);
      writableSelection(state, actorId).lines = [];
    });
  }
  async submitRequest(
    actorId: ActorId,
    idempotencyKey: string,
  ): Promise<RequestGroup> {
    let result: RequestGroup | undefined;
    await this.repo.mutate((state) => {
      requireActor(state, actorId);
      if (!idempotencyKey || idempotencyKey.length > 120)
        throw new DomainError(
          "Не удалось проверить повторное отправление. Повторите действие.",
        );
      const previous = state.requestGroups.find(
        (item) =>
          item.requesterId === actorId &&
          item.idempotencyKey === idempotencyKey,
      );
      if (previous) {
        result = previous;
        return;
      }
      const selection = writableSelection(state, actorId),
        days = calendarDays(selection.startDate, selection.endDate);
      if (!selection.lines.length)
        throw new DomainError("Подборка пуста. Добавьте хотя бы одну вещь.");
      const group: RequestGroup = {
        id: id("request"),
        requesterId: actorId,
        startDate: selection.startDate,
        endDate: selection.endDate,
        days,
        ownerRequestIds: [],
        status: "pending",
        createdAt: now(),
        idempotencyKey,
      };
      for (const line of selection.lines) {
        const listing = state.listings.find(
          (item) => item.id === line.listingId && item.status === "published",
        );
        if (!listing)
          throw new DomainError(
            "Одна из вещей больше не опубликована. Удалите её из подборки.",
          );
        if (listing.ownerId === actorId)
          throw new DomainError("Нельзя отправить запрос на собственную вещь.");
        validQuantity(line.quantity, listing.quantity);
        let part = state.ownerRequests.find(
          (item) =>
            item.groupId === group.id && item.ownerId === listing.ownerId,
        );
        if (!part) {
          part = {
            id: id("owner-request"),
            groupId: group.id,
            ownerId: listing.ownerId,
            requesterId: actorId,
            lines: [],
            status: "pending",
            createdAt: now(),
          };
          state.ownerRequests.push(part);
          group.ownerRequestIds.push(part.id);
        }
        part.lines.push({
          id: id("line"),
          listingId: listing.id,
          title: listing.title,
          quantity: line.quantity,
          priceKopecks: listing.priceKopecks,
          depositKopecks: listing.depositKopecks,
          unit: listing.unit,
          imageId: listing.imageIds[0],
          district: listing.district,
          pickupTerms: listing.pickupTerms,
          packaging: listing.packaging,
          delivery: listing.delivery,
          decision: "pending",
          comment: "",
        });
      }
      calculateTotals(
        state.ownerRequests
          .filter((item) => item.groupId === group.id)
          .flatMap((item) => item.lines),
        days,
      );
      state.requestGroups.push(group);
      selection.lines = [];
      audit(
        state,
        actorId,
        "Демо-запрос сохранён",
        group.id,
        `${group.ownerRequestIds.length} владельцев`,
      );
      result = group;
    });
    return structuredClone(result!);
  }
  decideLine(
    actorId: ActorId,
    ownerRequestId: string,
    lineId: string,
    decision: Exclude<LineDecision, "pending">,
    comment = "",
  ): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireActor(state, actorId);
      const part = state.ownerRequests.find(
        (item) => item.id === ownerRequestId,
      );
      if (!part || part.ownerId !== actorId)
        throw new DomainError(
          "Можно отвечать только на адресованные вам запросы.",
        );
      const group = state.requestGroups.find(
        (item) => item.id === part.groupId,
      )!;
      if (group.status === "cancelled" || group.status === "completed")
        throw new DomainError("Этот запрос уже закрыт.");
      const line = part.lines.find((item) => item.id === lineId);
      if (!line || line.decision !== "pending")
        throw new DomainError("На эту строку уже дан ответ.");
      if (decision !== "confirmed" && decision !== "rejected")
        throw new DomainError("Недопустимый ответ.");
      line.decision = decision;
      line.comment = comment.trim().slice(0, 1000);
      part.status = aggregateStatus(part.lines.map((item) => item.decision));
      group.status = aggregateStatus(
        state.ownerRequests
          .filter((item) => item.groupId === group.id)
          .flatMap((item) => item.lines.map((entry) => entry.decision)),
      );
      audit(
        state,
        actorId,
        decision === "confirmed"
          ? "Подтверждена строка запроса"
          : "Отклонена строка запроса",
        group.id,
        `${line.title}: ${line.comment}`,
      );
    });
  }
  cancelRequest(actorId: ActorId, groupId: string): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireActor(state, actorId);
      const group = state.requestGroups.find((item) => item.id === groupId);
      if (!group || group.requesterId !== actorId)
        throw new DomainError("Можно отменить только свой запрос.");
      if (["cancelled", "completed", "rejected"].includes(group.status))
        throw new DomainError("Этот запрос уже закрыт.");
      group.status = "cancelled";
      for (const part of state.ownerRequests.filter(
        (item) => item.groupId === groupId,
      ))
        part.status = "cancelled";
      audit(state, actorId, "Запрос отменён участником", groupId);
    });
  }
  completeRequest(actorId: ActorId, groupId: string): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireActor(state, actorId);
      const group = state.requestGroups.find((item) => item.id === groupId);
      if (!group || group.requesterId !== actorId)
        throw new DomainError("Можно завершить только свой сценарий.");
      const parts = state.ownerRequests.filter(
        (item) => item.groupId === groupId,
      );
      if (
        !["confirmed", "partial"].includes(group.status) ||
        parts.some((item) =>
          item.lines.some((line) => line.decision === "pending"),
        )
      )
        throw new DomainError("Сначала дождитесь ответов всех владельцев.");
      group.status = "completed";
      for (const part of parts) part.status = "completed";
      audit(state, actorId, "Демонстрационный сценарий завершён", groupId);
    });
  }
  saveListing(actorId: ActorId, input: ListingInput): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      const actor = requireActor(state, actorId),
        existing = input.id
          ? requireListingOwner(state, actorId, input.id)
          : undefined;
      if (existing?.status === "archived")
        throw new DomainError(
          "Архивное объявление нельзя редактировать. Создайте новое.",
        );
      const listingId = existing?.id ?? id("listing"),
        slug = existing?.slug ?? `local-${listingId.replace("listing-", "")}`;
      // Explicit allowlist: caller cannot inject owner, admin authority or publication status.
      const listing: Listing = {
        id: listingId,
        slug,
        ownerId: existing?.ownerId ?? actorId,
        title: input.title?.trim() || "Новый предмет",
        description: input.description ?? "",
        categoryId: input.categoryId ?? "",
        imageIds: [...(input.imageIds ?? [])],
        tags: [...(input.tags ?? [])].slice(0, 20),
        material: input.material ?? "",
        color: input.color ?? "",
        dimensions: input.dimensions ?? "",
        era: input.era ?? "",
        condition: input.condition ?? "",
        functionality: input.functionality ?? "not-applicable",
        priceKopecks: input.priceKopecks ?? 0,
        depositKopecks: input.depositKopecks ?? 0,
        unit: input.unit ?? "шт.",
        quantity: input.quantity ?? 1,
        district: input.district ?? "",
        delivery: Boolean(input.delivery),
        pickupTerms: input.pickupTerms ?? "",
        packaging: input.packaging ?? "",
        status: existing?.status === "published" ? "pending" : "draft",
        updatedAt: now(),
        isDemo: true,
        origin: existing?.origin ?? "local",
      };
      validateDraftShape(state, listing);
      if (
        listing.imageIds.length > 6 ||
        listing.imageIds.some(
          (imageId) => !state.images.some((image) => image.id === imageId),
        )
      )
        throw new DomainError("Некорректные изображения объявления.");
      if (existing?.status === "published") validateListing(state, listing);
      if (existing) state.listings[state.listings.indexOf(existing)] = listing;
      else state.listings.push(listing);
      if (!state.sellers.some((item) => item.userId === listing.ownerId))
        state.sellers.push({
          id: id("seller"),
          userId: listing.ownerId,
          name: actor.alias,
          description: "Демонстрационный профиль владельца реквизита.",
          district: listing.district,
          pickupTerms: listing.pickupTerms,
          isDemo: true,
        });
      audit(
        state,
        actorId,
        existing?.status === "published"
          ? "Изменённое объявление отправлено на модерацию"
          : "Сохранён черновик объявления",
        listing.id,
      );
    });
  }
  submitListing(actorId: ActorId, listingId: string): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      const listing = requireListingOwner(state, actorId, listingId);
      if (!["draft", "rejected"].includes(listing.status))
        throw new DomainError(
          "Отправить можно черновик или исправленное объявление.",
        );
      validateListing(state, listing);
      listing.status = "pending";
      listing.updatedAt = now();
      delete listing.rejectionReason;
      audit(state, actorId, "Объявление отправлено на модерацию", listingId);
    });
  }
  moderateListing(
    actorId: ActorId,
    listingId: string,
    decision: "published" | "rejected",
    reason = "",
  ): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireAdmin(state, actorId);
      const listing = state.listings.find((item) => item.id === listingId);
      if (!listing || listing.status !== "pending")
        throw new DomainError("Объявление не находится на модерации.");
      if (decision !== "published" && decision !== "rejected")
        throw new DomainError("Недопустимое решение.");
      if (decision === "rejected" && !reason.trim())
        throw new DomainError("Укажите причину отклонения.");
      if (decision === "published") validateListing(state, listing);
      listing.status = decision;
      listing.updatedAt = now();
      listing.rejectionReason =
        decision === "rejected" ? reason.trim().slice(0, 1000) : undefined;
      audit(
        state,
        actorId,
        decision === "published"
          ? "Объявление опубликовано"
          : "Объявление отклонено",
        listingId,
        reason.trim(),
      );
    });
  }
  archiveListing(actorId: ActorId, listingId: string): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      const listing = requireListingOwner(state, actorId, listingId);
      listing.status = "archived";
      listing.updatedAt = now();
      audit(state, actorId, "Объявление архивировано", listingId);
    });
  }
  unpublishListing(actorId: ActorId, listingId: string): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      const listing = requireListingOwner(state, actorId, listingId);
      if (listing.status !== "published")
        throw new DomainError(
          "Снять с показа можно опубликованное объявление.",
        );
      listing.status = "draft";
      listing.updatedAt = now();
      audit(state, actorId, "Объявление снято с показа", listingId);
    });
  }
  saveSeller(
    actorId: ActorId,
    input: Pick<
      SellerProfile,
      "name" | "description" | "district" | "pickupTerms"
    >,
  ): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireActor(state, actorId);
      if (!input.name.trim())
        throw new DomainError("Укажите название демо-профиля владельца.");
      const existing = state.sellers.find((item) => item.userId === actorId);
      const seller: SellerProfile = {
        id: existing?.id ?? id("seller"),
        userId: actorId,
        name: input.name.trim().slice(0, 80),
        description: input.description.slice(0, 2000),
        district: input.district.slice(0, 120),
        pickupTerms: input.pickupTerms.slice(0, 2000),
        isDemo: true,
      };
      if (existing) Object.assign(existing, seller);
      else state.sellers.push(seller);
      audit(state, actorId, "Обновлён профиль владельца", seller.id);
    });
  }
  saveCategory(actorId: ActorId, category: Category): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireAdmin(state, actorId);
      if (
        !category.name.trim() ||
        !Number.isSafeInteger(category.order) ||
        category.order < 0 ||
        !/^[a-z0-9-]+$/.test(category.id) ||
        !/^[a-z0-9-]+$/.test(category.slug)
      )
        throw new DomainError(
          "Проверьте название, идентификатор и порядок категории.",
        );
      if (
        state.categories.some(
          (item) => item.slug === category.slug && item.id !== category.id,
        )
      )
        throw new DomainError("Такой адрес категории уже существует.");
      const existing = state.categories.find((item) => item.id === category.id);
      if (existing) Object.assign(existing, category);
      else state.categories.push(category);
      audit(state, actorId, "Обновлена категория", category.id);
    });
  }
  deleteCategory(actorId: ActorId, categoryId: string): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireAdmin(state, actorId);
      if (state.listings.some((item) => item.categoryId === categoryId))
        throw new DomainError(
          "Нельзя удалить категорию с объявлениями. Сначала переназначьте их.",
        );
      state.categories = state.categories.filter(
        (item) => item.id !== categoryId,
      );
      audit(state, actorId, "Удалена пустая категория", categoryId);
    });
  }
  async addImage(
    actorId: ActorId,
    file: File,
    alt: string,
  ): Promise<ImageAsset> {
    requireActor(await this.repo.getState(), actorId);
    const image = await sanitizeRaster(file, alt);
    await this.repo.mutate((state) => {
      requireActor(state, actorId);
      state.images.push(image);
      audit(state, actorId, "Загружено изображение", image.id);
    });
    return image;
  }
  resetSeed(
    actorId: ActorId,
    seed: CatalogPackage,
    confirmation: string,
  ): Promise<CatalogState> {
    return this.repo.mutate((state) => {
      requireAdmin(state, actorId);
      if (confirmation !== "СБРОСИТЬ")
        throw new DomainError(
          "Для сброса введите СБРОСИТЬ. Сначала можно экспортировать каталог.",
        );
      const revision = state.revision;
      Object.assign(state, stateFromSeed(seed), { revision });
      audit(state, "admin", "Восстановлен демонстрационный набор", "catalog");
    });
  }
}
export async function sanitizeRaster(
  file: File,
  alt: string,
): Promise<ImageAsset> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new DomainError(
      "Поддерживаются только JPEG, PNG и WebP. SVG и HTML не принимаются.",
    );
  if (file.size < 16 || file.size > 8 * 1024 * 1024)
    throw new DomainError("Размер изображения должен быть не больше 8 МБ.");
  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const jpeg =
    signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
  const png =
    signature[0] === 137 &&
    signature[1] === 80 &&
    signature[2] === 78 &&
    signature[3] === 71;
  const webp =
    String.fromCharCode(...signature.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
  if (
    !(
      (file.type === "image/jpeg" && jpeg) ||
      (file.type === "image/png" && png) ||
      (file.type === "image/webp" && webp)
    )
  )
    throw new DomainError(
      "Содержимое файла не соответствует растровому изображению.",
    );
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new DomainError(
      "Изображение повреждено или не декодируется браузером.",
    );
  }
  try {
    if (
      bitmap.width < 80 ||
      bitmap.height < 80 ||
      bitmap.width * bitmap.height > 40000000
    )
      throw new DomainError(
        "Размер изображения: от 80 × 80, максимум 40 мегапикселей.",
      );
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context)
      throw new DomainError("Браузер не поддерживает обработку изображения.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new DomainError("Не удалось сохранить изображение.")),
        "image/webp",
        0.86,
      ),
    );
    const imageId = id("image");
    return {
      id: imageId,
      path: `images/uploads/${imageId}.${blob.type === "image/webp" ? "webp" : "png"}`,
      alt: alt.trim().slice(0, 300) || "Изображение демонстрационного предмета",
      source: "Загружено пользователем в локальное демо",
      license:
        "Права на загруженный материал подтверждает загрузивший участник",
      width: canvas.width,
      height: canvas.height,
      blob,
    };
  } finally {
    bitmap.close();
  }
}
