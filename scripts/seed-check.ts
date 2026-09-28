import { readFile, stat } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import type { CatalogPackage } from "../src/domain/models";

const root = resolve("public");
const catalog = JSON.parse(
  await readFile(resolve(root, "catalog.json"), "utf8"),
) as CatalogPackage;
const errors: string[] = [];
const check = (value: unknown, message: string) => {
  if (!value) errors.push(message);
};
const unique = (values: string[], label: string) =>
  check(new Set(values).size === values.length, `Повторы ${label}`);
const positiveInteger = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const published = catalog.listings.filter(
  (item) => item.status === "published",
);
check(catalog.schemaVersion === 1, "Неподдерживаемая schemaVersion");
check(
  published.length === 48,
  `Опубликовано ${published.length}, требуется 48`,
);
check(
  catalog.categories.length === 8,
  `Категорий ${catalog.categories.length}, требуется 8`,
);
check(
  catalog.sellers.length === 8,
  `Владельцев ${catalog.sellers.length}, требуется 8`,
);
check(
  catalog.collections.length === 6,
  `Подборок ${catalog.collections.length}, требуется 6`,
);
check(
  catalog.listings.some((item) => item.status === "draft"),
  "Нет черновика",
);
check(
  catalog.listings.some((item) => item.status === "pending"),
  "Нет карточки в очереди",
);
check(
  catalog.listings.some(
    (item) => item.status === "rejected" && item.rejectionReason?.trim(),
  ),
  "Нет отклонённой карточки с причиной",
);
check(
  published.some((item) => item.quantity > 1),
  "Нет нескольких экземпляров для проверки количества",
);
check(
  published.some((item) => item.depositKopecks === 0),
  "Нет карточки без залога",
);
for (const [name, values] of Object.entries({
  category: catalog.categories,
  owner: catalog.sellers,
  listing: catalog.listings,
  image: catalog.images,
  collection: catalog.collections,
})) {
  unique(
    values.map((value) => value.id),
    `${name}.id`,
  );
}
unique(
  catalog.listings.map((item) => item.slug),
  "listing.slug",
);
unique(
  catalog.categories.map((item) => item.slug),
  "category.slug",
);
unique(
  catalog.collections.map((item) => item.slug),
  "collection.slug",
);
unique(
  catalog.sellers.map((item) => item.userId),
  "seller.userId",
);
const ownerIds = new Set(catalog.sellers.map((item) => item.userId));
const categories = new Set(catalog.categories.map((item) => item.id));
const imageIds = new Set(catalog.images.map((item) => item.id));
const publishedIds = new Set(published.map((item) => item.id));
for (const category of catalog.categories) {
  const items = published.filter((item) => item.categoryId === category.id);
  check(items.length === 6, `${category.name}: ${items.length} вместо 6 вещей`);
  check(
    new Set(items.map((item) => item.ownerId)).size > 1,
    `${category.name}: должен быть не один владелец`,
  );
}
for (const seller of catalog.sellers) {
  check(seller.isDemo === true, `${seller.id}: отсутствует isDemo`);
  check(
    seller.name.trim() &&
      seller.description.trim() &&
      seller.district.trim() &&
      seller.pickupTerms.trim(),
    `${seller.id}: неполный публичный профиль`,
  );
  check(
    new Set(
      published
        .filter((item) => item.ownerId === seller.userId)
        .map((item) => item.categoryId),
    ).size > 1,
    `${seller.id}: нужны несколько категорий`,
  );
}
for (const item of catalog.listings) {
  check(
    ownerIds.has(item.ownerId),
    `${item.id}: нет владельца ${item.ownerId}`,
  );
  check(
    categories.has(item.categoryId),
    `${item.id}: нет категории ${item.categoryId}`,
  );
  check(
    item.isDemo === true && item.origin === "seed",
    `${item.id}: неверная маркировка seed`,
  );
  check(
    positiveInteger(item.priceKopecks),
    `${item.id}: ставка должна быть целыми положительными копейками`,
  );
  check(
    Number.isSafeInteger(item.depositKopecks) && item.depositKopecks >= 0,
    `${item.id}: неверный залог`,
  );
  check(positiveInteger(item.quantity), `${item.id}: неверное количество`);
  check(
    item.imageIds.length > 0 && item.imageIds.every((id) => imageIds.has(id)),
    `${item.id}: отсутствует изображение`,
  );
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
  ] as const) {
    check(
      typeof item[field] === "string" && item[field].trim().length > 0,
      `${item.id}: поле ${field} пустое`,
    );
  }
  check(
    !Number.isNaN(Date.parse(item.updatedAt)),
    `${item.id}: неверная дата изменения`,
  );
  check(
    ["draft", "pending", "published", "rejected", "archived"].includes(
      item.status,
    ),
    `${item.id}: неверный статус`,
  );
}
for (const collection of catalog.collections) {
  check(collection.listingIds.length > 0, `${collection.id}: пустая подборка`);
  unique(collection.listingIds, `${collection.id}.listingIds`);
  check(
    collection.listingIds.every((id) => publishedIds.has(id)),
    `${collection.id}: ссылка на отсутствующую или скрытую карточку`,
  );
}
let imageBytes = 0;
const seenPaths = new Set<string>();
for (const image of catalog.images) {
  check(
    image.alt.trim() && image.source.trim() && image.license.trim(),
    `${image.id}: нужны alt, источник и права`,
  );
  check(
    positiveInteger(image.width) && positiveInteger(image.height),
    `${image.id}: неверные размеры`,
  );
  check(
    Boolean(image.thumbnailPath),
    `${image.id}: отсутствует уменьшенное превью`,
  );
  for (const path of [image.path, image.thumbnailPath].filter(
    (value): value is string => Boolean(value),
  )) {
    const full = resolve(root, path);
    const rel = relative(root, full);
    if (
      /^https?:|^blob:|^data:/.test(path) ||
      isAbsolute(path) ||
      rel.startsWith("..")
    ) {
      errors.push(`${image.id}: путь вне public: ${path}`);
      continue;
    }
    try {
      const info = await stat(full);
      check(info.isFile() && info.size > 0, `${image.id}: пустой файл ${path}`);
      check(
        /\.(webp|avif)$/i.test(path),
        `${image.id}: нужен WebP/AVIF: ${path}`,
      );
      if (!seenPaths.has(path)) {
        imageBytes += info.size;
        seenPaths.add(path);
      }
    } catch {
      errors.push(`${image.id}: файл отсутствует ${path}`);
    }
  }
}
unique(
  published.map((item) => item.imageIds[0]!),
  "cover ID опубликованных вещей",
);
if (errors.length) {
  console.error(
    `SEED FAIL (${errors.length}):\n${errors.map((error) => `- ${error}`).join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `SEED PASS: ${published.length} опубликованных, ${catalog.listings.length - published.length} неопубликованных, ${catalog.categories.length} категорий, ${catalog.sellers.length} владельцев, ${catalog.collections.length} подборок, ${catalog.images.length} изображений; ${seenPaths.size} файлов, ${(imageBytes / 1024 / 1024).toFixed(2)} МиБ на диске.`,
  );
}
