import type {
  Listing,
  RequestLineSnapshot,
  RequestStatus,
  SelectionLine,
  Totals,
} from "./models";

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
export function calendarDays(start: string, end: string): number {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new DomainError("Укажите обе календарные даты.");
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      year < 2000 ||
      year > 2200 ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    )
      throw new DomainError("Некорректная календарная дата.");
    return date.getTime();
  };
  const days = (parse(end) - parse(start)) / 86400000 + 1;
  if (days < 1) throw new DomainError("Окончание не может быть раньше начала.");
  return days;
}
export function validQuantity(value: number, available: number): number {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new DomainError("Количество должно быть целым положительным числом.");
  if (value > available)
    throw new DomainError(
      `Доступно только ${available}. Уменьшите количество.`,
    );
  return value;
}
export function money(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: value % 100 ? 2 : 0,
  }).format(value / 100);
}
export function calculateTotals(
  lines: Pick<
    RequestLineSnapshot,
    "quantity" | "priceKopecks" | "depositKopecks"
  >[],
  days: number,
): Totals {
  if (!Number.isSafeInteger(days) || days < 1)
    throw new DomainError("Укажите корректный период.");
  let rentKopecks = 0,
    depositKopecks = 0;
  for (const line of lines) {
    validQuantity(line.quantity, Number.MAX_SAFE_INTEGER);
    if (
      !Number.isSafeInteger(line.priceKopecks) ||
      line.priceKopecks <= 0 ||
      !Number.isSafeInteger(line.depositKopecks) ||
      line.depositKopecks < 0
    )
      throw new DomainError("Некорректные денежные значения.");
    rentKopecks += line.priceKopecks * line.quantity * days;
    depositKopecks += line.depositKopecks * line.quantity;
  }
  if (
    !Number.isSafeInteger(rentKopecks) ||
    !Number.isSafeInteger(depositKopecks)
  )
    throw new DomainError("Сумма слишком велика.");
  return { days, rentKopecks, depositKopecks };
}
export function groupByOwner(
  lines: SelectionLine[],
  listings: Listing[],
): Record<string, { listing: Listing; quantity: number }[]> {
  const groups: Record<string, { listing: Listing; quantity: number }[]> =
    Object.create(null);
  for (const line of lines) {
    const listing = listings.find((item) => item.id === line.listingId);
    if (!listing)
      throw new DomainError("Вещь из подборки больше не существует.");
    validQuantity(line.quantity, listing.quantity);
    (groups[listing.ownerId] ??= []).push({ listing, quantity: line.quantity });
  }
  return groups;
}
export function aggregateStatus(
  decisions: ("pending" | "confirmed" | "rejected")[],
): RequestStatus {
  if (!decisions.length || decisions.every((value) => value === "pending"))
    return "pending";
  if (decisions.every((value) => value === "confirmed")) return "confirmed";
  if (decisions.every((value) => value === "rejected")) return "rejected";
  return "partial";
}
