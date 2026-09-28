import { expect, type Page } from '@playwright/test'
import type { CatalogState } from '../src/domain/models'

/** Read-only persistence assertions complement interactions through the visible UI. */
export async function readBrowserState(page: Page): Promise<CatalogState> {
  return page.evaluate(() => new Promise<CatalogState>((resolve, reject) => {
    const request = indexedDB.open('kinostore-catalog-demo-v1', 1)
    request.onerror = () => reject(new Error('Не удалось прочитать тестовое хранилище'))
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('state', 'readonly')
      const record = transaction.objectStore('state').get('catalog')
      record.onsuccess = () => resolve(record.result)
      record.onerror = () => reject(new Error('Не удалось прочитать состояние'))
      transaction.oncomplete = () => db.close()
    }
  }))
}

export async function switchActor(page: Page, actorId: string) {
  await page.getByLabel('Текущий демо-участник', { exact: true }).selectOption(actorId)
  await expect(page.getByLabel('Текущий демо-участник', { exact: true })).toHaveValue(actorId)
}

export async function assertNoOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }))
  expect(metrics.document, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1)
  expect(metrics.body, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1)
}

export async function assertVisibleImages(page: Page) {
  await expect.poll(() => page.locator('img').evaluateAll(images => (images as HTMLImageElement[]).filter(image => {
    const rect = image.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0
  }).every(image => image.complete && image.naturalWidth > 0))).toBe(true)
}

export async function loadFullPageImages(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < height; y += 650) {
    await page.evaluate(top => window.scrollTo(0, top), y)
    await assertVisibleImages(page)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await assertVisibleImages(page)
}

/** Intrinsic HTML height must not stretch a responsive 4:3 catalog image. */
export async function assertCatalogImageRatio(page: Page) {
  const images = await page.locator('.detail-photo, .selection-item img, .listing-manage img').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect()
    return { alt: element.getAttribute('alt'), width: rect.width, height: rect.height }
  }).filter(image => image.width > 0 && image.height > 0))
  for (const image of images) expect(Math.abs(image.height - image.width * 0.75), `Пропорции фото ${JSON.stringify(image)}`).toBeLessThanOrEqual(1)
}
