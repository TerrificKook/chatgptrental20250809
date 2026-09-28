import type { CatalogState, Listing, Selection } from "./models";
import {
  calculateTotals,
  calendarDays,
  DomainError,
  money,
  validQuantity,
} from "./calculations";

export type SharedSelection = Pick<
  Selection,
  "startDate" | "endDate" | "lines"
>;
function validateShared(value: unknown, listings: Listing[]): SharedSelection {
  if (!value || typeof value !== "object")
    throw new DomainError("Некорректная ссылка подборки.");
  const data = value as Record<string, unknown>;
  if (
    data.v !== 1 ||
    typeof data.start !== "string" ||
    typeof data.end !== "string" ||
    !Array.isArray(data.items) ||
    data.items.length < 1 ||
    data.items.length > 48 ||
    Object.keys(data).some(
      (key) => !["v", "start", "end", "items"].includes(key),
    )
  )
    throw new DomainError("Ссылка подборки имеет неверную схему.");
  calendarDays(data.start, data.end);
  const ids = new Set<string>();
  const lines = data.items.map((item) => {
    if (
      !Array.isArray(item) ||
      item.length !== 2 ||
      typeof item[0] !== "string" ||
      item[0].length > 100 ||
      typeof item[1] !== "number" ||
      ids.has(item[0])
    )
      throw new DomainError("Некорректная строка или повтор вещи в ссылке.");
    ids.add(item[0]);
    const listing = listings.find(
      (entry) =>
        entry.id === item[0] &&
        entry.origin === "seed" &&
        entry.status === "published",
    );
    if (!listing)
      throw new DomainError(
        "Ссылка содержит локальную или недоступную вещь. Для локальных карточек используйте текст или экспорт каталога.",
      );
    validQuantity(item[1], listing.quantity);
    return { listingId: item[0], quantity: item[1] };
  });
  return { startDate: data.start, endDate: data.end, lines };
}
export function encodeSelection(
  selection: SharedSelection,
  listings: Listing[],
): string {
  const data = {
    v: 1,
    start: selection.startDate,
    end: selection.endDate,
    items: selection.lines.map((item) => [item.listingId, item.quantity]),
  };
  validateShared(data, listings);
  const encoded = encodeURIComponent(JSON.stringify(data));
  if (encoded.length > 3000)
    throw new DomainError(
      "Подборка слишком велика для ссылки. Используйте копирование текста.",
    );
  return encoded;
}
export function decodeSelection(
  encoded: string,
  listings: Listing[],
): SharedSelection {
  if (!encoded || encoded.length > 3000)
    throw new DomainError("Ссылка пустая или превышает допустимую длину.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(encoded));
  } catch {
    throw new DomainError("Не удалось прочитать ссылку подборки.");
  }
  return validateShared(parsed, listings);
}
export function selectionText(
  selection: SharedSelection,
  state: CatalogState,
): string {
  const days = calendarDays(selection.startDate, selection.endDate);
  if (!selection.lines.length) throw new DomainError("Подборка пуста.");
  const lines = selection.lines.map((line) => {
    const listing = state.listings.find((item) => item.id === line.listingId);
    if (!listing) throw new DomainError("Вещь больше не найдена.");
    validQuantity(line.quantity, listing.quantity);
    return { ...listing, quantity: line.quantity };
  });
  const totals = calculateTotals(lines, days);
  return [
    "Kinostore · демонстрационная подборка",
    "Вещи, цены и участники вымышлены. Это не бронь и не подтверждение наличия.",
    `Период: ${selection.startDate} - ${selection.endDate}, календарных дней: ${days}.`,
    ...lines.map(
      (line) =>
        `${line.title} · ${line.quantity} ${line.unit} · ${money(line.priceKopecks)}/день · ${state.sellers.find((seller) => seller.userId === line.ownerId)?.name ?? "Владелец демо"} · ${line.district}`,
    ),
    `Ориентировочная аренда: ${money(totals.rentKopecks)}. Залог: ${totals.depositKopecks ? money(totals.depositKopecks) : "Без залога"}.`,
    "Доставка по согласованию с каждым владельцем. Условия и наличие требуют отдельного подтверждения.",
  ].join("\n");
}
