import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import rawSeed from '../public/catalog.json'
import { IndexedDbRepository } from '../src/data/repository'
import { MarketplaceService, selectionFor } from '../src/domain/service'
import { publicCatalog, validateCatalogPackage } from '../src/domain/catalog-package'

const seed = validateCatalogPackage(rawSeed)
const first = seed.listings.find(item => item.status === 'published')!
let repo: IndexedDbRepository
let service: MarketplaceService
beforeEach(async () => { repo = new IndexedDbRepository(`saved-test-${crypto.randomUUID()}`); service = new MarketplaceService(repo); await repo.init(seed) })
afterEach(async () => { await repo.close() })
async function save() {
 await service.setSelectionItem('participant', first.id, 1)
 await service.setSelectionDates('participant', '2026-10-01', '2026-10-03')
 return service.saveNamedSelection('participant', 'Кадр для кабинета')
}
describe('Сохранённые подборки', () => {
 it('хранит отдельную копию и восстанавливает даты с количеством после перезагрузки', async () => {
  const state = await save(), saved = state.savedSelections[0]
  await service.clearSelection('participant')
  expect((await repo.init(seed)).savedSelections[0]).toEqual(saved)
  const restored = await service.restoreNamedSelection('participant', saved.id)
  expect(selectionFor(restored, 'participant')).toEqual({ actorId: 'participant', startDate: '2026-10-01', endDate: '2026-10-03', lines: [{ listingId: first.id, quantity: 1 }] })
 })
 it('одно имя обновляет подборку того же участника, данные других не смешиваются', async () => {
  const firstSave = await save(), savedId = firstSave.savedSelections[0].id
  await service.setSelectionDates('participant', '2026-11-01', '2026-11-01')
  await service.saveNamedSelection('participant', 'кадр для кабинета')
  const otherActor = seed.sellers.find(item => item.userId !== first.ownerId)!.userId
  await service.setSelectionItem(otherActor, first.id, 1)
  const state = await service.saveNamedSelection(otherActor, 'Кадр для кабинета')
  expect(state.savedSelections).toHaveLength(2)
  expect(state.savedSelections.find(item => item.actorId === 'participant')?.id).toBe(savedId)
  expect(state.savedSelections.find(item => item.actorId === 'participant')?.startDate).toBe('2026-11-01')
  expect(state.savedSelections.find(item => item.actorId === otherActor)?.startDate).toBe('')
 })
 it('гость, чужой участник и даже Admin не восстанавливают и не удаляют чужую подборку', async () => {
  const state = await save(), savedId = state.savedSelections[0].id
  await expect(service.saveNamedSelection('guest', 'Гостевая')).rejects.toThrow('профиль')
  for (const actor of [first.ownerId, 'admin']) {
   await expect(service.restoreNamedSelection(actor, savedId)).rejects.toThrow('другому')
   await expect(service.deleteNamedSelection(actor, savedId)).rejects.toThrow('другому')
  }
  expect((await repo.getState()).savedSelections).toHaveLength(1)
  await service.deleteNamedSelection('participant', savedId)
  expect((await repo.getState()).savedSelections).toHaveLength(0)
 })
 it('недоступная вещь отклоняет восстановление без частичной замены', async () => {
  const savedId = (await save()).savedSelections[0].id
  await service.clearSelection('participant')
  await service.archiveListing(first.ownerId, first.id)
  const before = await repo.getState()
  await expect(service.restoreNamedSelection('participant', savedId)).rejects.toThrow('снята с показа')
  expect(await repo.getState()).toEqual(before)
 })
 it('старое хранилище получает пустой раздел без потери избранного и каталога', async () => {
  await service.toggleFavorite('participant', first.id)
  await repo.mutate(state => { delete (state as Partial<typeof state>).savedSelections })
  expect((await repo.getState()).savedSelections).toEqual([])
  const migrated = await repo.init(seed)
  expect(migrated.favorites).toEqual([{ actorId: 'participant', listingId: first.id }])
  expect(migrated.listings).toHaveLength(seed.listings.length)
  expect(migrated.savedSelections).toEqual([])
 })
 it('пустые подборки не сохраняются, внутренние подборки не экспортируются', async () => {
  await expect(service.saveNamedSelection('participant', 'Пустая')).rejects.toThrow('пуста')
  const state = await save()
  expect(publicCatalog(state)).not.toHaveProperty('savedSelections')
 })
 it('повторный запрос атомарно собирается заново по актуальным карточкам', async () => {
  await save()
  const request = await service.submitRequest('participant', 'saved-repeat')
  const restored = await service.repeatRequest('participant', request.id)
  expect(selectionFor(restored, 'participant').lines).toEqual([{ listingId: first.id, quantity: 1 }])
  await expect(service.repeatRequest(first.ownerId, request.id)).rejects.toThrow('свой')
 })
 it('черновик не допускает числовые значения, которые ломают экспорт', async () => {
  await expect(service.saveListing('participant', { ...first, id: undefined, quantity: 0 })).rejects.toThrow('Количество')
  await expect(service.saveListing('participant', { ...first, id: undefined, priceKopecks: Infinity })).rejects.toThrow('Цена')
  const state = await service.saveListing('participant', { ...first, id: undefined, title: '', description: '', categoryId: '', imageIds: [], priceKopecks: 0 })
  expect(() => publicCatalog(state)).not.toThrow()
 })
})
