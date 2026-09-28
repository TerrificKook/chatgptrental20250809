import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import rawSeed from '../public/catalog.json'
import { IndexedDbRepository } from '../src/data/repository'
import { MarketplaceService, sanitizeRaster, selectionFor } from '../src/domain/service'
import { aggregateStatus, calculateTotals, calendarDays, groupByOwner, validQuantity } from '../src/domain/calculations'
import { validateCatalogPackage } from '../src/domain/catalog-package'
import type { CatalogPackage, ListingInput, User } from '../src/domain/models'

const seed: CatalogPackage = validateCatalogPackage(rawSeed)
const first = seed.listings.find(item => item.status === 'published')!
const second = seed.listings.find(item => item.status === 'published' && item.ownerId !== first.ownerId)!
let repo: IndexedDbRepository
let service: MarketplaceService
const extraRepos: IndexedDbRepository[] = []
beforeEach(async () => { repo = new IndexedDbRepository(`kinostore-test-${crypto.randomUUID()}`); service = new MarketplaceService(repo); await repo.init(seed) })
afterEach(async () => { await repo.close(); for (const extra of extraRepos.splice(0)) await extra.close() })
async function prepareRequest() {
 await service.setSelectionItem('participant', first.id, 1)
 await service.setSelectionItem('participant', second.id, 1)
 await service.setSelectionDates('participant', '2026-10-01', '2026-10-03')
 return service.submitRequest('participant', crypto.randomUUID())
}

describe('Календарь и деньги', () => {
 it('включает оба дня, считает месяцы, год, високосный год и переход DST', () => {
  expect(calendarDays('2026-10-01', '2026-10-01')).toBe(1)
  expect(calendarDays('2026-10-01', '2026-10-03')).toBe(3)
  expect(calendarDays('2026-12-31', '2027-01-01')).toBe(2)
  expect(calendarDays('2024-02-28', '2024-03-01')).toBe(3)
  expect(calendarDays('2026-03-28', '2026-03-30')).toBe(3)
 })
 it('отклоняет несуществующие, пустые и обратные даты', () => {
  for (const [a, b] of [['', '2026-10-01'], ['2026-02-29', '2026-03-01'], ['2026-10-03', '2026-10-01'], ['2026-13-01', '2026-13-02'], ['2026-2-01', '2026-02-02']]) expect(() => calendarDays(a, b)).toThrow()
 })
 it('умножает аренду на дни, залог только на количество, сохраняет копейки', () => {
  expect(calculateTotals([{ priceKopecks: 12345, depositKopecks: 50000, quantity: 2 }], 3)).toEqual({ days: 3, rentKopecks: 74070, depositKopecks: 100000 })
  expect(calculateTotals([{ priceKopecks: 100, depositKopecks: 0, quantity: 1 }], 1).depositKopecks).toBe(0)
 })
 it('запрещает дробное, нулевое, отрицательное и превышающее остаток количество', () => { for (const quantity of [0, -1, 1.5, 4, NaN]) expect(() => validQuantity(quantity, 3)).toThrow(); expect(validQuantity(3, 3)).toBe(3) })
 it('смешанные ответы не становятся полным подтверждением', () => {
  expect(aggregateStatus(['confirmed', 'rejected'])).toBe('partial')
  expect(aggregateStatus(['confirmed', 'pending'])).toBe('partial')
  expect(aggregateStatus(['rejected', 'rejected'])).toBe('rejected')
  expect(aggregateStatus(['confirmed', 'confirmed'])).toBe('confirmed')
 })
 it('группирует вещи по реальным владельцам', () => { expect(Object.keys(groupByOwner([{ listingId: first.id, quantity: 1 }, { listingId: second.id, quantity: 1 }], seed.listings))).toHaveLength(2); expect(groupByOwner([{ listingId: first.id, quantity: 1 }], [{ ...first, ownerId: 'constructor' }]).constructor).toHaveLength(1) })
})

describe('Профили и атомарное хранилище', () => {
 it('после повторного init сохраняет локальные изменения', async () => { await service.toggleFavorite('participant', first.id); const state = await repo.init(seed); expect(state.favorites).toEqual([{ actorId: 'participant', listingId: first.id }]) })
 it('параллельные вкладки не теряют изменения', async () => {
  const other = new IndexedDbRepository(repo.name); extraRepos.push(other); const otherService = new MarketplaceService(other)
  await Promise.all([service.toggleFavorite('participant', first.id), otherService.toggleFavorite(first.ownerId, second.id)])
  expect((await repo.getState()).favorites).toHaveLength(2)
 })
 it('переносит гостевую подборку и избранное один раз, не смешивает участников', async () => {
  await service.setSelectionItem('guest', first.id, 1); await service.toggleFavorite('guest', first.id); await service.setSelectionDates('guest', '2026-10-01', '2026-10-03')
  await service.switchActor('participant'); await service.switchActor(second.ownerId)
  const state = await repo.getState()
  expect(selectionFor(state, 'participant').lines).toHaveLength(1)
  expect(selectionFor(state, 'participant').startDate).toBe('2026-10-01')
  expect(selectionFor(state, second.ownerId).lines).toHaveLength(0)
  expect(state.favorites).toEqual([{ actorId: 'participant', listingId: first.id }])
 })
 it('обычное создание профиля никогда не выдаёт Admin', async () => {
  const create = service.createProfile.bind(service) as (...args: unknown[]) => Promise<User>
  const user = await create('Новый демо-участник', { isAdmin: true, id: 'admin' })
  expect(user.isAdmin).toBe(false); expect(user.id).not.toBe('admin')
  await expect(service.moderateListing(user.id, first.id, 'published')).rejects.toThrow('администратору')
 })
 it('неизвестный actor и чужой владелец не меняют данные', async () => {
  await expect(service.archiveListing('missing', first.id)).rejects.toThrow()
  await expect(service.saveListing('participant', { ...first, title: 'Чужая правка' })).rejects.toThrow('чужое')
  expect((await repo.getState()).listings.find(item => item.id === first.id)?.title).toBe(first.title)
 })
})

describe('Запросы и неизменяемые снимки', () => {
 it('создаёт две части и защищает от повторной отправки', async () => {
  await service.setSelectionItem('participant', first.id, 1); await service.setSelectionItem('participant', second.id, 1); await service.setSelectionDates('participant', '2026-10-01', '2026-10-03')
  const [a, b] = await Promise.all([service.submitRequest('participant', 'same-click'), service.submitRequest('participant', 'same-click')])
  expect(a.id).toBe(b.id); expect(a.ownerRequestIds).toHaveLength(2)
  const state = await repo.getState(); expect(state.requestGroups).toHaveLength(1); expect(state.ownerRequests).toHaveLength(2); expect(selectionFor(state, 'participant').lines).toHaveLength(0)
 })
 it('снимок не меняется после правки и архивирования объявления', async () => {
  const group = await prepareRequest(); const before = (await repo.getState()).ownerRequests.find(item => item.groupId === group.id && item.ownerId === first.ownerId)!.lines[0]
  await service.saveListing(first.ownerId, { ...first, title: 'Новое название', priceKopecks: first.priceKopecks + 10000 })
  await service.archiveListing(first.ownerId, first.id)
  const after = (await repo.getState()).ownerRequests.find(item => item.groupId === group.id && item.ownerId === first.ownerId)!.lines[0]
  expect(after).toEqual(before); expect(after.title).toBe(first.title); expect(after.priceKopecks).toBe(first.priceKopecks)
 })
 it('сохраняет partial после подтверждения одного и отказа второго', async () => {
  const group = await prepareRequest(), parts = (await repo.getState()).ownerRequests
  await service.decideLine(parts[0].ownerId, parts[0].id, parts[0].lines[0].id, 'confirmed')
  await service.decideLine(parts[1].ownerId, parts[1].id, parts[1].lines[0].id, 'rejected', 'Не подходит для этих дат')
  expect((await repo.getState()).requestGroups.find(item => item.id === group.id)?.status).toBe('partial')
  await expect(service.decideLine(parts[0].ownerId, parts[0].id, parts[0].lines[0].id, 'rejected')).rejects.toThrow('уже дан')
 })
 it('чужой участник не отвечает на часть владельца', async () => {
  await prepareRequest(); const part = (await repo.getState()).ownerRequests[0]
  await expect(service.decideLine('participant', part.id, part.lines[0].id, 'confirmed')).rejects.toThrow('адресованные')
  expect((await repo.getState()).ownerRequests[0].status).toBe('pending')
 })
 it('отмена закрывает части и запрещает последующий ответ', async () => {
  const group = await prepareRequest(); await expect(service.cancelRequest(first.ownerId, group.id)).rejects.toThrow('свой')
  await service.cancelRequest('participant', group.id)
  const part = (await repo.getState()).ownerRequests[0]
  expect(part.status).toBe('cancelled')
  await expect(service.decideLine(part.ownerId, part.id, part.lines[0].id, 'confirmed')).rejects.toThrow('закрыт')
 })
 it('завершение возможно явно после всех ответов', async () => {
  const group = await prepareRequest(); await expect(service.completeRequest('participant', group.id)).rejects.toThrow('ответов')
  for (const part of (await repo.getState()).ownerRequests) await service.decideLine(part.ownerId, part.id, part.lines[0].id, 'confirmed')
  await service.completeRequest('participant', group.id)
  expect((await repo.getState()).requestGroups[0].status).toBe('completed')
 })
 it('не сохраняет запрос, если итог не помещается в безопасное целое число копеек', async () => {
  await repo.mutate(state => { const listing = state.listings.find(item => item.id === first.id)!; listing.priceKopecks = 100000000; listing.quantity = 10000 })
  await service.setSelectionItem('participant', first.id, 10000)
  await service.setSelectionDates('participant', '2000-01-01', '2200-01-01')
  await expect(service.submitRequest('participant', 'overflow')).rejects.toThrow('слишком велика')
  expect((await repo.getState()).requestGroups).toHaveLength(0)
  expect((await repo.getState()).ownerRequests).toHaveLength(0)
 })
 it('гость, пустая подборка, собственная вещь и устаревшее количество не создают запрос', async () => {
  await expect(service.submitRequest('guest', 'guest')).rejects.toThrow('профиль')
  await service.setSelectionDates('participant', '2026-10-01', '2026-10-01')
  await expect(service.submitRequest('participant', 'empty')).rejects.toThrow('пуста')
  await expect(service.setSelectionItem(first.ownerId, first.id, 1)).rejects.toThrow('собственную')
  await service.setSelectionItem('participant', first.id, 1)
  await repo.mutate(state => { state.listings.find(item => item.id === first.id)!.status = 'archived' })
  await expect(service.submitRequest('participant', 'stale')).rejects.toThrow('опубликована')
  expect((await repo.getState()).requestGroups).toHaveLength(0)
 })
})

describe('Объявления и модерация', () => {
 it('новое объявление создаёт SellerProfile у того же участника и не публикуется само', async () => {
  const input = { ...first, id: undefined, title: 'Учебная лампа', ownerId: first.ownerId, status: 'published', isAdmin: true } as ListingInput
  const state = await service.saveListing('participant', input), listing = state.listings.at(-1)!
  expect(listing.ownerId).toBe('participant'); expect(listing.status).toBe('draft'); expect(state.sellers.find(item => item.userId === 'participant')).toBeDefined()
  expect(state.users.find(item => item.id === 'participant')?.isAdmin).toBe(false)
 })
 it('отклонение требует причину; исправление и повторная модерация работают', async () => {
  let state = await service.saveListing('participant', { ...first, id: undefined }), listing = state.listings.at(-1)!
  await service.submitListing('participant', listing.id)
  await expect(service.moderateListing('admin', listing.id, 'rejected')).rejects.toThrow('причину')
  await service.moderateListing('admin', listing.id, 'rejected', 'Уточните размеры')
  state = await service.saveListing('participant', { ...listing, dimensions: '120 × 60 × 80 см' }); listing = state.listings.find(item => item.id === listing.id)!
  expect(listing.status).toBe('draft'); await service.submitListing('participant', listing.id); await service.moderateListing('admin', listing.id, 'published')
  expect((await repo.getState()).listings.find(item => item.id === listing.id)?.status).toBe('published')
  expect((await repo.getState()).audit.some(item => item.details === 'Уточните размеры')).toBe(true)
 })
 it('существенная правка возвращает опубликованную карточку на модерацию', async () => {
  const state = await service.saveListing(first.ownerId, { ...first, title: 'Обновлённое название' })
  expect(state.listings.find(item => item.id === first.id)?.status).toBe('pending')
 })
 it('отклоняет SVG, поддельный PNG и слишком большой файл до декодирования', async () => {
  await expect(sanitizeRaster(new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], 'image.svg', { type: 'image/svg+xml' }), 'Предмет')).rejects.toThrow('JPEG')
  await expect(sanitizeRaster(new File(['<html>not a bitmap image</html>'], 'image.png', { type: 'image/png' }), 'Предмет')).rejects.toThrow('Содержимое')
  await expect(sanitizeRaster(new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }), 'Предмет')).rejects.toThrow('8 МБ')
 })
 it('категорию с объявлениями удалить нельзя; reset требует admin и явную фразу', async () => {
  await expect(service.deleteCategory('admin', first.categoryId)).rejects.toThrow('с объявлениями')
  await expect(service.resetSeed('participant', seed, 'СБРОСИТЬ')).rejects.toThrow('администратору')
  await expect(service.resetSeed('admin', seed, '')).rejects.toThrow('СБРОСИТЬ')
  await service.toggleFavorite('participant', first.id); await service.resetSeed('admin', seed, 'СБРОСИТЬ'); expect((await repo.getState()).favorites).toHaveLength(0)
 })
})
