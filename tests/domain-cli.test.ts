import { describe, expect, it } from 'vitest'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { strToU8, zipSync } from 'fflate'
import rawSeed from '../public/catalog.json'
import { validateCatalogPackage } from '../src/domain/catalog-package'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
describe('Рабочая CLI-команда catalog:import', () => {
 it('dry-run не изменяет файлы, импорт создаёт backup и обновляет каталог, неверный пакет отклоняется', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'kinostore-cli-test-'))
  mkdirSync(join(sandbox, 'public')); mkdirSync(join(sandbox, 'scripts'))
  cpSync(join(root, 'src/domain'), join(sandbox, 'src/domain'), { recursive: true }); cpSync(join(root, 'src/data'), join(sandbox, 'src/data'), { recursive: true })
  cpSync(join(root, 'scripts/catalog-import.ts'), join(sandbox, 'scripts/catalog-import.ts'))
  symlinkSync(join(root, 'node_modules'), join(sandbox, 'node_modules'), 'dir')
  writeFileSync(join(sandbox, 'package.json'), '{"type":"module"}')
  const original = JSON.stringify(rawSeed, null, 2)
  writeFileSync(join(sandbox, 'public/catalog.json'), original)
  const catalog = validateCatalogPackage(rawSeed)
  catalog.images = catalog.images.map(image => ({ ...image, path: `images/${image.id}.png`, thumbnailPath: undefined, width: 1, height: 1 }))
  catalog.listings[0].title = 'Изменено переносимым пакетом'
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY1cAAAAASUVORK5CYII=', 'base64'))
  const files: Record<string, Uint8Array> = { 'catalog.json': strToU8(JSON.stringify(catalog)) }
  for (const image of catalog.images) files[image.path] = png
  const archive = join(sandbox, 'catalog.zip'); writeFileSync(archive, zipSync(files))
  const run = (...args: string[]) => spawnSync(process.execPath, [join(root, 'node_modules/tsx/dist/cli.mjs'), join(sandbox, 'scripts/catalog-import.ts'), ...args], { cwd: sandbox, encoding: 'utf8' })
  const dry = run(archive, '--dry-run'); expect(dry.status, dry.stderr).toBe(0); expect(dry.stdout).toContain('DRY RUN'); expect(readFileSync(join(sandbox, 'public/catalog.json'), 'utf8')).toBe(original); expect(existsSync(join(sandbox, 'backups'))).toBe(false)
  const imported = run(archive); expect(imported.status, imported.stderr).toBe(0); expect(imported.stdout).toContain('Импорт выполнен')
  const after = readFileSync(join(sandbox, 'public/catalog.json'), 'utf8'); expect(JSON.parse(after).listings[0].title).toBe(catalog.listings[0].title)
  const backupDir = join(sandbox, 'backups', readdirSync(join(sandbox, 'backups'))[0]); expect(readFileSync(join(backupDir, 'catalog.json'), 'utf8')).toBe(original); expect(existsSync(join(backupDir, 'manifest.json'))).toBe(true)
  expect(readFileSync(join(sandbox, 'public', catalog.images[0].path))).toEqual(Buffer.from(png))
  const invalid = join(sandbox, 'invalid.zip'); writeFileSync(invalid, zipSync({ 'catalog.json': strToU8('{}') }))
  expect(run(invalid).status).toBe(1); expect(readFileSync(join(sandbox, 'public/catalog.json'), 'utf8')).toBe(after)
 }, 15000)
})
