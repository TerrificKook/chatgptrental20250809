import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { CatalogPackage, CatalogState, ImageAsset } from "./models";
import type { MarketplaceRepository } from "../data/repository";
import { DomainError } from "./calculations";
import { requireAdmin } from "./service";

export const PACKAGE_LIMITS = {
  archiveBytes: 30 * 1024 * 1024,
  fileBytes: 8 * 1024 * 1024,
  totalBytes: 100 * 1024 * 1024,
  files: 600,
  jsonBytes: 4 * 1024 * 1024,
};
export interface PackagePreview {
  catalog: CatalogPackage;
  files: Record<string, Uint8Array>;
  report: string[];
}
export function safePackagePath(path: string): boolean {
  return (
    path.length <= 200 &&
    /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path) &&
    !path.split("/").some((part) => !part || part === "." || part === "..") &&
    (path === "catalog.json" || /^images\/.+\.(webp|png|jpe?g)$/.test(path))
  );
}
export function rasterMime(path: string): string {
  return path.endsWith(".webp")
    ? "image/webp"
    : path.endsWith(".png")
      ? "image/png"
      : "image/jpeg";
}
function rasterSignature(bytes: Uint8Array, path: string): boolean {
  if (/\.jpe?g$/.test(path))
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (path.endsWith(".png"))
    return (
      bytes[0] === 137 &&
      bytes[1] === 80 &&
      bytes[2] === 78 &&
      bytes[3] === 71 &&
      bytes[4] === 13 &&
      bytes[5] === 10 &&
      bytes[6] === 26 &&
      bytes[7] === 10
    );
  return (
    strFromU8(bytes.slice(0, 4)) === "RIFF" &&
    strFromU8(bytes.slice(8, 12)) === "WEBP"
  );
}
type Obj = Record<string, unknown>;
const object = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const string = (value: unknown, max = 5000): value is string =>
  typeof value === "string" && value.length <= max;
const identity = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value);
const integer = (
  value: unknown,
  min: number,
  max = 1000000000,
): value is number =>
  Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
export function validateCatalogPackage(
  value: unknown,
  availableFiles?: Set<string>,
): CatalogPackage {
  const errors: string[] = [];
  if (!object(value) || value.schemaVersion !== 1)
    throw new DomainError("Пакет должен содержать schemaVersion: 1.");
  const names = [
    "categories",
    "sellers",
    "listings",
    "images",
    "collections",
  ] as const;
  const arrays: Record<string, Obj[]> = {};
  for (const name of names) {
    if (
      !Array.isArray(value[name]) ||
      value[name].length > 1000 ||
      !value[name].every(object)
    )
      errors.push(`${name}: нужен массив объектов, не больше 1000.`);
    else arrays[name] = value[name] as Obj[];
  }
  if (errors.length) throw new DomainError(errors.join("\n"));
  for (const name of names) {
    const ids = new Set<unknown>(),
      slugs = new Set<unknown>();
    for (const item of arrays[name]) {
      if (!identity(item.id)) errors.push(`${name}: некорректный ID.`);
      if (ids.has(item.id))
        errors.push(`${name}: повтор ID ${String(item.id)}.`);
      ids.add(item.id);
      if ("slug" in item) {
        if (!identity(item.slug)) errors.push(`${name}: некорректный slug.`);
        if (slugs.has(item.slug))
          errors.push(`${name}: повтор slug ${String(item.slug)}.`);
        slugs.add(item.slug);
      }
    }
  }
  const categoryIds = new Set(arrays.categories.map((item) => item.id)),
    imageIds = new Set(arrays.images.map((item) => item.id)),
    listingIds = new Set(arrays.listings.map((item) => item.id)),
    ownerIds = new Set(arrays.sellers.map((item) => item.userId));
  for (const category of arrays.categories)
    if (
      !string(category.name, 100) ||
      !category.name.trim() ||
      !identity(category.slug) ||
      !string(category.icon, 50) ||
      !integer(category.order, 0, 10000)
    )
      errors.push(
        `Категория ${String(category.id)}: проверьте имя, slug, иконку и порядок.`,
      );
  const uniqueOwners = new Set<unknown>();
  for (const seller of arrays.sellers) {
    if (
      !identity(seller.userId) ||
      seller.userId === "guest" ||
      uniqueOwners.has(seller.userId)
    )
      errors.push(
        `Владелец ${String(seller.id)}: некорректный или повторяющийся userId.`,
      );
    uniqueOwners.add(seller.userId);
    for (const field of ["name", "description", "district", "pickupTerms"])
      if (!string(seller[field], 2000))
        errors.push(
          `Владелец ${String(seller.id)}: некорректное поле ${field}.`,
        );
    if (seller.isDemo !== true)
      errors.push("Владельцы демо должны иметь isDemo=true.");
  }
  const paths = new Set<unknown>();
  for (const image of arrays.images) {
    if (
      typeof image.path !== "string" ||
      !safePackagePath(image.path) ||
      image.path === "catalog.json" ||
      paths.has(image.path)
    )
      errors.push(
        `Изображение ${String(image.id)}: небезопасный или повторяющийся путь.`,
      );
    paths.add(image.path);
    for (const field of ["alt", "source", "license"])
      if (!string(image[field], 2000) || !(image[field] as string).trim())
        errors.push(`Изображение ${String(image.id)}: отсутствует ${field}.`);
    if (
      !integer(image.width, 1, 20000) ||
      !integer(image.height, 1, 20000) ||
      Number(image.width) * Number(image.height) > 40000000
    )
      errors.push(`Изображение ${String(image.id)}: некорректные размеры.`);
    if (availableFiles && !availableFiles.has(String(image.path)))
      errors.push(`Не найден файл ${String(image.path)}.`);
    if (
      image.thumbnailPath !== undefined &&
      (typeof image.thumbnailPath !== "string" ||
        !safePackagePath(image.thumbnailPath) ||
        image.thumbnailPath === "catalog.json" ||
        (availableFiles && !availableFiles.has(image.thumbnailPath)))
    )
      errors.push(
        `Изображение ${String(image.id)}: некорректное или отсутствующее превью.`,
      );
  }
  for (const listing of arrays.listings) {
    const label = `Объявление ${String(listing.id)}`;
    if (!identity(listing.slug)) errors.push(`${label}: отсутствует slug.`);
    if (!ownerIds.has(listing.ownerId))
      errors.push(`${label}: неизвестный ownerId.`);
    if (
      !categoryIds.has(listing.categoryId) &&
      !(listing.status === "draft" && listing.categoryId === "")
    )
      errors.push(`${label}: неизвестный categoryId.`);
    for (const field of [
      "title",
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
      "updatedAt",
    ])
      if (!string(listing[field]))
        errors.push(`${label}: некорректное поле ${field}.`);
    if (
      !Array.isArray(listing.tags) ||
      listing.tags.length > 20 ||
      !listing.tags.every((tag) => string(tag, 80))
    )
      errors.push(`${label}: некорректные теги.`);
    if (
      !Array.isArray(listing.imageIds) ||
      listing.imageIds.length > 6 ||
      listing.imageIds.some((id) => !imageIds.has(id))
    )
      errors.push(`${label}: некорректные ссылки на изображения.`);
    if (
      listing.status !== "draft" &&
      Array.isArray(listing.imageIds) &&
      !listing.imageIds.length
    )
      errors.push(`${label}: нужно хотя бы одно изображение.`);
    if (
      !integer(
        listing.priceKopecks,
        listing.status === "draft" ? 0 : 1,
        100000000,
      ) ||
      !integer(listing.depositKopecks, 0) ||
      !integer(listing.quantity, 1, 10000)
    )
      errors.push(`${label}: некорректная цена, залог или количество.`);
    if (
      !["draft", "pending", "published", "rejected", "archived"].includes(
        String(listing.status),
      )
    )
      errors.push(`${label}: неизвестный статус.`);
    if (
      !["working", "prop", "replica", "not-applicable"].includes(
        String(listing.functionality),
      )
    )
      errors.push(`${label}: неизвестная работоспособность.`);
    if (
      typeof listing.delivery !== "boolean" ||
      listing.isDemo !== true ||
      !["seed", "local"].includes(String(listing.origin))
    )
      errors.push(`${label}: некорректные флаги.`);
    if (
      typeof listing.updatedAt !== "string" ||
      Number.isNaN(Date.parse(listing.updatedAt))
    )
      errors.push(`${label}: некорректная дата изменения.`);
  }
  for (const collection of arrays.collections)
    if (
      !identity(collection.slug) ||
      !string(collection.title, 200) ||
      !string(collection.description, 2000) ||
      !Array.isArray(collection.listingIds) ||
      collection.listingIds.some((id) => !listingIds.has(id))
    )
      errors.push(
        `Подборка ${String(collection.id)}: некорректные данные или ссылки.`,
      );
  if (errors.length) throw new DomainError(errors.slice(0, 30).join("\n"));
  // Reconstruct only public-schema fields. Never admit profile roles, requests,
  // audit notes, arbitrary properties or executable/blob URLs from imported JSON.
  const take = (item: Obj, keys: string[]) =>
    Object.fromEntries(
      keys
        .filter((key) => item[key] !== undefined)
        .map((key) => [key, item[key]]),
    );
  return {
    schemaVersion: 1,
    categories: arrays.categories.map((item) =>
      take(item, ["id", "slug", "name", "icon", "order"]),
    ),
    sellers: arrays.sellers.map((item) =>
      take(item, [
        "id",
        "userId",
        "name",
        "description",
        "district",
        "pickupTerms",
        "isDemo",
      ]),
    ),
    listings: arrays.listings.map((item) =>
      take(item, [
        "id",
        "slug",
        "ownerId",
        "categoryId",
        "title",
        "description",
        "imageIds",
        "tags",
        "material",
        "color",
        "dimensions",
        "era",
        "condition",
        "functionality",
        "priceKopecks",
        "depositKopecks",
        "unit",
        "quantity",
        "district",
        "delivery",
        "pickupTerms",
        "packaging",
        "status",
        "updatedAt",
        "isDemo",
        "origin",
      ]),
    ),
    images: arrays.images.map((item) =>
      take(item, [
        "id",
        "path",
        "thumbnailPath",
        "alt",
        "source",
        "license",
        "width",
        "height",
      ]),
    ),
    collections: arrays.collections.map((item) =>
      take(item, ["id", "slug", "title", "description", "listingIds"]),
    ),
  } as unknown as CatalogPackage;
}
export function publicCatalog(state: CatalogState): CatalogPackage {
  const referencedImages = new Set(state.listings.flatMap(listing => listing.imageIds));
  return validateCatalogPackage({
    schemaVersion: 1,
    categories: state.categories,
    sellers: state.sellers,
    listings: state.listings,
    images: state.images.filter(image => referencedImages.has(image.id)),
    collections: state.collections,
  });
}
export function exportCatalogJSON(state: CatalogState): string {
  return JSON.stringify(publicCatalog(state), null, 2);
}
export async function exportCatalogZip(
  state: CatalogState,
  baseUrl: string,
): Promise<Blob> {
  const catalog = publicCatalog(state),
    files: Record<string, Uint8Array> = {
      "catalog.json": strToU8(JSON.stringify(catalog, null, 2)),
    };
  let total = files["catalog.json"].byteLength;
  for (const image of catalog.images) {
    const original = state.images.find((item) => item.id === image.id)!;
    for (const path of [image.path, image.thumbnailPath].filter(
      (entry): entry is string => Boolean(entry),
    )) {
      if (files[path]) continue;
      let bytes: Uint8Array;
      if (original.blob && path === image.path)
        bytes = new Uint8Array(await original.blob.arrayBuffer());
      else {
        const response = await fetch(
          new URL(path, new URL(baseUrl, location.href)),
        );
        if (!response.ok)
          throw new DomainError(
            `Не удалось получить ${path}: HTTP ${response.status}.`,
          );
        bytes = new Uint8Array(await response.arrayBuffer());
      }
      if (
        bytes.byteLength > PACKAGE_LIMITS.fileBytes ||
        !rasterSignature(bytes, path)
      )
        throw new DomainError(`Неподдерживаемый файл изображения ${path}.`);
      total += bytes.byteLength;
      if (total > PACKAGE_LIMITS.totalBytes)
        throw new DomainError(
          "Каталог превышает предел переносимого пакета 100 МБ.",
        );
      files[path] = bytes;
    }
  }
  const zipped = zipSync(files, { level: 3 });
  if (zipped.byteLength > PACKAGE_LIMITS.archiveBytes)
    throw new DomainError("Архив превышает ограничение 30 МБ.");
  return new Blob([new Uint8Array(zipped)], { type: "application/zip" });
}
export function readCatalogZip(bytes: Uint8Array): PackagePreview {
  if (bytes.byteLength > PACKAGE_LIMITS.archiveBytes)
    throw new DomainError("Архив больше 30 МБ.");
  let count = 0,
    expanded = 0;
  const archiveNames = new Set<string>();
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (file) => {
        count++;
        expanded += file.originalSize;
        if (archiveNames.has(file.name))
          throw new DomainError(`Повторяющийся путь в архиве: ${file.name}.`);
        archiveNames.add(file.name);
        if (!safePackagePath(file.name))
          throw new DomainError(`Недопустимый путь в архиве: ${file.name}.`);
        if (
          count > PACKAGE_LIMITS.files ||
          expanded > PACKAGE_LIMITS.totalBytes ||
          file.originalSize >
            (file.name === "catalog.json"
              ? PACKAGE_LIMITS.jsonBytes
              : PACKAGE_LIMITS.fileBytes)
        )
          throw new DomainError(
            "Архив превышает допустимые размеры или число файлов.",
          );
        return true;
      },
    });
  } catch (error) {
    throw new DomainError(
      error instanceof DomainError
        ? error.message
        : "Не удалось прочитать ZIP. Файл повреждён или имеет неверный формат.",
    );
  }
  if (!files["catalog.json"])
    throw new DomainError("В архиве отсутствует catalog.json.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(strFromU8(files["catalog.json"]));
  } catch {
    throw new DomainError("catalog.json содержит некорректный JSON.");
  }
  const catalog = validateCatalogPackage(parsed, new Set(Object.keys(files)));
  for (const [path, data] of Object.entries(files))
    if (path !== "catalog.json" && !rasterSignature(data, path))
      throw new DomainError(
        `Файл ${path} не является допустимым растровым изображением.`,
      );
  return {
    catalog,
    files,
    report: [
      `Объявлений: ${catalog.listings.length}`,
      `Владельцев: ${catalog.sellers.length}`,
      `Категорий: ${catalog.categories.length}`,
      `Изображений: ${catalog.images.length}`,
      "Режим: добавление и обновление по ID. Остальные данные сохранятся.",
    ],
  };
}
export function mergeCatalog(
  existing: CatalogPackage,
  incoming: CatalogPackage,
): CatalogPackage {
  const merge = <T extends { id: string }>(old: T[], next: T[]): T[] => {
    const map = new Map(old.map((item) => [item.id, item]));
    for (const item of next) map.set(item.id, item);
    return [...map.values()];
  };
  const result = {
    schemaVersion: 1 as const,
    categories: merge(existing.categories, incoming.categories),
    sellers: merge(existing.sellers, incoming.sellers),
    listings: merge(
      existing.listings,
      incoming.listings.map((listing) =>
        listing.status === "rejected"
          ? {
              ...listing,
              rejectionReason:
                existing.listings.find((previous) => previous.id === listing.id)
                  ?.rejectionReason ??
                "Объявление импортировано со статусом «Отклонено». Уточните данные и отправьте на повторную модерацию.",
            }
          : listing,
      ),
    ),
    images: merge(existing.images, incoming.images),
    collections: merge(existing.collections, incoming.collections),
  };
  validateCatalogPackage(result);
  return result;
}
export async function importCatalogZip(
  repo: MarketplaceRepository,
  actorId: string,
  preview: PackagePreview,
): Promise<CatalogState> {
  requireAdmin(await repo.getState(), actorId);
  const catalog = validateCatalogPackage(
    preview.catalog,
    new Set(Object.keys(preview.files)),
  );
  const images: ImageAsset[] = [];
  for (const image of catalog.images) {
    const bytes = preview.files[image.path];
    if (!rasterSignature(bytes, image.path))
      throw new DomainError(`Повреждено изображение ${image.path}.`);
    const blob = new Blob([new Uint8Array(bytes)], {
      type: rasterMime(image.path),
    });
    if (typeof createImageBitmap !== "undefined") {
      try {
        const bitmap = await createImageBitmap(blob);
        if (bitmap.width * bitmap.height > 40000000) {
          bitmap.close();
          throw new Error("размер");
        }
        bitmap.close();
      } catch {
        throw new DomainError(`Изображение ${image.path} не декодируется.`);
      }
    }
    // A blob persists the image; no temporary URL goes into IndexedDB or exports.
    images.push({ ...image, thumbnailPath: undefined, blob });
  }
  return repo.mutate((state) => {
    requireAdmin(state, actorId);
    const merged = mergeCatalog(state, { ...catalog, images });
    Object.assign(state, merged);
    for (const seller of merged.sellers)
      if (!state.users.some((user) => user.id === seller.userId))
        state.users.push({
          id: seller.userId,
          alias: seller.name,
          isAdmin: false,
          isDemo: true,
          createdAt: new Date().toISOString(),
        });
    state.audit.push({
      id: `audit-${crypto.randomUUID()}`,
      actorId,
      entityId: "catalog",
      action: "Импортирован каталог",
      details: `Добавление / обновление: ${catalog.listings.length} объявлений`,
      createdAt: new Date().toISOString(),
    });
  });
}
