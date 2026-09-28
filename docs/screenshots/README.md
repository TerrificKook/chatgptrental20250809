# Визуальная проверка

Снимки создаёт `tests/e2e.spec.ts` на production-сборке, открытой по базовому пути `/chatgptrental20250809/`. Главная сохранена в размере первого экрана; остальные страницы - целиком. На полных мобильных снимках закреплённое нижнее меню видно у границы исходного viewport. При прокрутке оно остаётся у нижнего края экрана.

| Экран | Телефон, 390 × 844 | Компьютер, 1440 × 1000 |
| --- | --- | --- |
| Каталог | [catalog-mobile.png](catalog-mobile.png) | [catalog-desktop.png](catalog-desktop.png) |
| Предмет | [item-mobile.png](item-mobile.png) | [item-desktop.png](item-desktop.png) |
| Подборка двух владельцев | [selection-mobile.png](selection-mobile.png) | [selection-desktop.png](selection-desktop.png) |
| Кабинет владельца | [owner-account-mobile.png](owner-account-mobile.png) | [owner-account-desktop.png](owner-account-desktop.png) |
| Размещение | [listing-mobile.png](listing-mobile.png) | [listing-desktop.png](listing-desktop.png) |
| Администратор | [admin-mobile.png](admin-mobile.png) | [admin-desktop.png](admin-desktop.png) |

Все 12 снимков открыты и визуально осмотрены. В первом проходе обнаружилась ошибочная высота изображений вне сетки: HTML-атрибут высоты растягивал фото в карточке, подборке и кабинете. Добавлено адаптивное `height: auto`, а браузерная проверка теперь отдельно контролирует отношение высоты к ширине 3:4. После исправления production-сборка и 14 сквозных сценариев выполнены повторно; снимки обновлены.

Автоматически также проверяются изменение ширины без перезагрузки на 360, 390, 768, 1024 и 1440 px, отсутствие горизонтального переполнения, загрузка изображений, ошибки JavaScript и console.error. Фотографии начинаются в первом мобильном экране.

[mobile-first-load.json](mobile-first-load.json) содержит фактический Resource Timing первого открытия production-preview в новом контексте Chromium: HTML, JavaScript, CSS, seed, favicon и успевшие загрузиться превью. Измерение выполняется до прокрутки. `transferBytes` включает сетевые накладные расходы браузера, `encodedBodyBytes` - переданные тела ресурсов. Это локальный замер объёма, а не обещание скорости мобильного интернета или результат замера GitHub Pages. Из-за ленивой загрузки точное число успевших превью может немного различаться между запусками.

Физические телефоны, Safari/WebKit и Firefox этим набором не проверялись. Публичная выкладка проверяется отдельно от локального preview; её статус указан в [ACCEPTANCE_REPORT.md](../ACCEPTANCE_REPORT.md).
