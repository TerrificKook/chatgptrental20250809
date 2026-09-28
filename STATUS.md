# Kinostore: состояние проекта

Дата: 28.09.2026. Основной handoff этого отдельного репозитория.

Исходный repo содержал только kinostore_vanilla_index.html. Рабочая ветка codex/kinostore-catalog-demo, baseline c945024e862e71ff1fdec217ecef32b7ef25aaac. Исходник скопирован без изменений в legacy/. Другие репозитории не изменялись.

Реализованы React/TypeScript/Vite, IndexedDB, доменные сервисы с проверкой actorId, полноценные маршруты каталога/кабинета/размещения/админки, JSON/ZIP и CLI import. Идут E2E, завершающая генерация фото и визуальная проверка. Полные финальные результаты будут в docs/ACCEPTANCE_REPORT.md.

Pages baseline: legacy, main /, без CNAME. GitHub environment github-pages разрешает только main. Защиту не изменять и не обходить; для деплоя рабочей ветки потребуется решение владельца. PR не сливать автоматически.
