import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import rawSeed from '../public/catalog.json'
import { IndexedDbRepository } from '../src/data/repository'
import { MarketplaceService, selectionFor } from '../src/domain/service'
import { validateCatalogPackage } from '../src/domain/catalog-package'
import { decodeSelection, encodeSelection, selectionText } from '../src/domain/selection-share'

const seed = validateCatalogPackage(rawSeed)
const first = seed.listings.find(item => item.status === 'published')!
const second = seed.listings.find(item => item.status === 'published' && item.ownerId !== first.ownerId)!
const shared = { startDate: '2026-10-01', endDate: '2026-10-03', lines: [{ listingId: first.id, quantity: 1 }, { listingId: second.id, quantity: 1 }] }
const repos: IndexedDbRepository[] = []
afterEach(async () => { for (const repo of repos.splice(0)) await repo.close() })
async function setup() { const repo = new IndexedDbRepository(`share-test-${crypto.randomUUID()}`); repos.push(repo); await repo.init(seed); return { repo, service: new MarketplaceService(repo) } }
describe('Ссылка и атомарный импорт подборки', () => {
 it('переносит только ID, количество и даты без профилей и контактов', () => { const encoded = encodeSelection(shared, seed.listings); expect(decodeSelection(encoded, seed.listings)).toEqual(shared); expect(decodeURIComponent(encoded)).not.toContain('owner') })
 it('отклоняет слишком длинную, невалидную ссылку и дополнительные поля', () => {
  expect(() => decodeSelection('a'.repeat(3001), seed.listings)).toThrow('длину')
  expect(() => decodeSelection('%xx', seed.listings)).toThrow()
  expect(() => decodeSelection(encodeURIComponent(JSON.stringify({ v: 1, start: shared.startDate, end: shared.endDate, items: [[first.id, 1]], contact: 'secret' })), seed.listings)).toThrow('схему')
 })
 it('не выдаёт локальной карточке ссылку для другого телефона', () => { const listings = structuredClone(seed.listings); listings[0].origin = 'local'; expect(() => encodeSelection(shared, listings)).toThrow('локальную') })
 it('импортирует все строки и даты одним сохранением', async () => {
  const { repo, service } = await setup(), before = await repo.getState()
  await service.importSelection('participant', shared)
  const state = await repo.getState(); expect(selectionFor(state, 'participant')).toEqual({ actorId: 'participant', ...shared }); expect(state.revision).toBe(before.revision + 1)
  expect(selectionText(shared, state)).toContain('календарных дней: 3')
 })
 it('ошибка поздней строки не оставляет частично добавленной подборки', async () => {
  const { repo, service } = await setup(), before = await repo.getState()
  await expect(service.importSelection('participant', { ...shared, lines: [...shared.lines, { listingId: 'missing', quantity: 1 }] })).rejects.toThrow()
  expect(await repo.getState()).toEqual(before)
  await expect(service.importSelection(first.ownerId, shared)).rejects.toThrow('ваша вещь')
  expect(await repo.getState()).toEqual(before)
 })
})
