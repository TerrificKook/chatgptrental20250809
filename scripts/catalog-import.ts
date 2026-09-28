import { readFile, writeFile, mkdir, copyFile, stat } from "node:fs/promises";
import { dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readCatalogZip,
  validateCatalogPackage,
  mergeCatalog,
} from "../src/domain/catalog-package.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "public");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const archiveArg = args.find((arg) => !arg.startsWith("--"));
if (
  !archiveArg ||
  args.some((arg) => arg.startsWith("--") && arg !== "--dry-run")
) {
  console.error(
    "Использование: npm run catalog:import -- <catalog.zip> [--dry-run]",
  );
  process.exitCode = 1;
} else {
  try {
    const archivePath = resolve(archiveArg);
    if ((await stat(archivePath)).size > 30 * 1024 * 1024)
      throw new Error("Архив больше 30 МБ.");
    const preview = readCatalogZip(new Uint8Array(await readFile(archivePath)));
    const current = validateCatalogPackage(
      JSON.parse(await readFile(resolve(publicDir, "catalog.json"), "utf8")),
    );
    const merged = mergeCatalog(current, preview.catalog);
    console.log(preview.report.join("\n"));
    console.log(`После объединения: ${merged.listings.length} объявлений.`);
    if (dryRun) console.log("DRY RUN: проверка пройдена, файлы не изменены.");
    else {
      const backupDir = resolve(
        root,
        "backups",
        new Date().toISOString().replace(/[:.]/g, "-"),
      );
      await mkdir(backupDir, { recursive: true });
      await copyFile(
        resolve(publicDir, "catalog.json"),
        resolve(backupDir, "catalog.json"),
      );
      const writes: {
        destination: string;
        source: Uint8Array;
        previous: boolean;
      }[] = [];
      for (const [path, source] of Object.entries(preview.files)) {
        if (path === "catalog.json") continue;
        const destination = resolve(publicDir, path);
        if (!destination.startsWith(publicDir + sep))
          throw new Error("Путь выходит за папку public.");
        let previous = false;
        try {
          await stat(destination);
          previous = true;
        } catch {
          /* New file, no previous version. */
        }
        if (previous) {
          const backup = resolve(backupDir, path);
          await mkdir(dirname(backup), { recursive: true });
          await copyFile(destination, backup);
        }
        writes.push({ destination, source, previous });
      }
      await writeFile(
        resolve(backupDir, "manifest.json"),
        JSON.stringify(
          {
            createdAt: new Date().toISOString(),
            previousCatalog: "catalog.json",
            files: writes.map((item) => ({
              path: relative(publicDir, item.destination),
              previous: item.previous,
            })),
          },
          null,
          2,
        ),
      );
      // Validate the entire package and save the previous version BEFORE touching public.
      // catalog.json is written last, so a failed image copy never points at missing new files.
      for (const write of writes) {
        await mkdir(dirname(write.destination), { recursive: true });
        await writeFile(write.destination, write.source);
      }
      await writeFile(
        resolve(publicDir, "catalog.json"),
        JSON.stringify(merged, null, 2) + "\n",
      );
      console.log(
        `Импорт выполнен. Предыдущая версия: ${relative(root, backupDir)}`,
      );
    }
  } catch (error) {
    console.error(
      `Импорт отклонён: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
