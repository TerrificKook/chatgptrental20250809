import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import rawSeed from '../public/catalog.json'
import { IndexedDbRepository } from '../src/data/repository'
import { exportCatalogJSON, importCatalogZip, mergeCatalog, readCatalogZip, safePackagePath, validateCatalogPackage } from '../src/domain/catalog-package'
import { MarketplaceService } from '../src/domain/service'
import type { CatalogPackage } from '../src/domain/models'

const seed = validateCatalogPackage(rawSeed)
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY1cAAAAASUVORK5CYII=', 'base64'))
const repos: IndexedDbRepository[] = []
afterEach(async () => { for (const repo of repos.splice(0)) await repo.close() })
async function setup() { const repo = new IndexedDbRepository(`package-test-${crypto.randomUUID()}`); repos.push(repo); await repo.init(seed); return repo }
function portable(): { catalog: CatalogPackage; files: Record<string, Uint8Array> } {
 const catalog = structuredClone(seed)
 catalog.images = catalog.images.map(image => ({ ...image, path: `images/${image.id}.png`, thumbnailPath: undefined, width: 1, height: 1 }))
 const files: Record<string, Uint8Array> = { 'catalog.json': strToU8(JSON.stringify(catalog)) }
 for (const image of catalog.images) files[image.path] = png
 return { catalog, files }
}
describe('Переносимый каталог', () => {
 it('проверяет seed и отклоняет сломанные ссылки, ID, slug, числа и статусы', () => {
  expect(seed.listings.filter(item => item.status === 'published')).toHaveLength(48)
  for (const mutate of [
   (value: CatalogPackage) => { value.listings[0].ownerId = 'missing' },
   (value: CatalogPackage) => { value.listings[0].categoryId = 'missing' },
   (value: CatalogPackage) => { value.listings[0].imageIds = ['missing'] },
   (value: CatalogPackage) => { value.listings[0].priceKopecks = -1 },
   (value: CatalogPackage) => { value.listings[0].quantity = 1.5 },
   (value: CatalogPackage) => { value.listings[0].id = value.listings[1].id },
   (value: CatalogPackage) => { value.listings[0].slug = value.listings[1].slug },
   (value: CatalogPackage) => { value.listings[0].status = 'fake' as never },
  ]) { const value = structuredClone(seed); mutate(value); expect(() => validateCatalogPackage(value)).toThrow() }
 })
 it('отклоняет traversal, абсолютные пути, SVG, внешние URL и посторонние файлы', () => {
  for (const path of ['../catalog.json', '/catalog.json', 'images/../../a.png', 'images\\a.png', 'https://example.test/a.png', 'images/a.svg', 'private.json', 'images//a.png']) expect(safePackagePath(path)).toBe(false)
  expect(safePackagePath('images/uploads/demo-image.webp')).toBe(true)
  expect(() => readCatalogZip(zipSync({ '../evil.png': png }))).toThrow('путь')
 })
 it('отклоняет отсутствующий файл, повреждённый JSON и поддельный растровый файл', () => {
  const missing = portable(); delete missing.files[missing.catalog.images[0].path]
  expect(() => readCatalogZip(zipSync(missing.files))).toThrow('Не найден файл')
  expect(() => readCatalogZip(zipSync({ 'catalog.json': strToU8('{oops') }))).toThrow('JSON')
  const spoofed = portable(); spoofed.files[spoofed.catalog.images[0].path] = strToU8('<html>bad file</html>')
  expect(() => readCatalogZip(zipSync(spoofed.files))).toThrow('растровым')
 })
 it('JSON экспорт не содержит запросы, журнал, роли, blob URL и внутреннюю причину отказа', async () => {
  const repo = await setup(); await repo.mutate(state => { state.audit.push({ id: 'audit', actorId: 'admin', action: 'secret', entityId: 'listing', details: 'ВНУТРЕННЯЯ ЗАМЕТКА', createdAt: new Date().toISOString() }); state.listings[0].rejectionReason = 'СЛУЖЕБНАЯ ПРИЧИНА' })
  const json = exportCatalogJSON(await repo.getState()), data = JSON.parse(json)
  expect(data.users).toBeUndefined(); expect(data.audit).toBeUndefined(); expect(data.requestGroups).toBeUndefined(); expect(json).not.toContain('ВНУТРЕННЯЯ'); expect(json).not.toContain('СЛУЖЕБНАЯ'); expect(json).not.toContain('blob:')
 })
 it('ZIP import сохраняет bytes в IndexedDB, обновляет по ID и оставляет остальные данные', async () => {
  const repo = await setup(), service = new MarketplaceService(repo)
  await service.toggleFavorite('participant', seed.listings[0].id)
  const pack = portable(); pack.catalog.listings[0].title = 'Импортированное название'; pack.files['catalog.json'] = strToU8(JSON.stringify(pack.catalog))
  const preview = readCatalogZip(zipSync(pack.files))
  const state = await importCatalogZip(repo, 'admin', preview)
  expect(state.listings).toHaveLength(seed.listings.length); expect(state.listings[0].title).toBe('Импортированное название'); expect(state.favorites).toHaveLength(1)
  expect(new Uint8Array(await state.images[0].blob!.arrayBuffer())).toEqual(png)
  const persisted = await repo.init(seed); expect(new Uint8Array(await persisted.images[0].blob!.arrayBuffer())).toEqual(png)
  await importCatalogZip(repo, 'admin', preview); expect((await repo.getState()).listings).toHaveLength(seed.listings.length)
 })
 it('запрещает импорт участнику и оставляет данные при ошибке пакета', async () => {
  const repo = await setup(), pack = portable(), preview = readCatalogZip(zipSync(pack.files)), before = await repo.getState()
  await expect(importCatalogZip(repo, 'participant', preview)).rejects.toThrow('администратору')
  preview.catalog.listings[0].ownerId = 'missing'
  await expect(importCatalogZip(repo, 'admin', preview)).rejects.toThrow('ownerId')
  expect(await repo.getState()).toEqual(before)
 })
 it('слияние неполного пакета не уничтожает остальные записи', () => {
  const subset = { ...seed, listings: [seed.listings[0]], collections: [] }
  const merged = mergeCatalog(seed, subset); expect(merged.listings).toHaveLength(seed.listings.length); expect(merged.collections).toHaveLength(6)
 })
})

it('экспорт не включает удалённое или ещё не прикреплённое фото', async () => {
 const repo = await setup();
 await repo.mutate(state => { state.images.push({ ...state.images[0], id: 'orphan-image', path: 'images/orphan.webp', thumbnailPath: undefined }) });
 const exported = JSON.parse(exportCatalogJSON(await repo.getState()));
 expect(exported.images.some((image: {id: string}) => image.id === 'orphan-image')).toBe(false);
 expect(exported.images).toHaveLength(48);
});
