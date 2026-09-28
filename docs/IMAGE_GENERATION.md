# Изображения демонстрационного каталога Kinostore

Дата набора: 28 сентября 2026 года.

## Способ получения

Использован встроенный инструмент OpenAI `image_gen` из Codex и навык `imagegen`. Вызов выполнен отдельно для каждого из 48 предметов. Внешние фотографии, Avito, фотографии конкурентов и отдельные платные API не использовались. Все предметы вымышлены. Сгенерированная картинка не подтверждает характеристики, работоспособность или наличие реальной вещи.

Сначала сгенерированы 8 ключевых предметов: кресло, торшер, ваза, чайный сервиз, телевизор, чемодан, ковёр и шахматы. После визуальной проверки первых восьми реальных карточек в Chromium сгенерирована оставшаяся часть набора. Все 48 обложек и 48 превью сохранены локально. Статус фактически имеющихся файлов фиксирует `assets-manifest.json`.

У каждого предмета одна обложка. Дополнительные ракурсы не создавались: идентичность вымышленного предмета между отдельными генерациями не подтверждена. Галерея пользовательского объявления поддерживает дополнительные фотографии независимо от seed.

Финальные файлы: `public/images/catalog/<slug>.webp` (1200 × 900), `public/images/catalog/<slug>-thumb.webp` (480 × 360). Пересохранение и уменьшение сделаны Pillow, WebP quality 82 для основного файла и 77 для превью. Соотношение сторон 4:3. Небольшое центрированное приведение исходного размера к точному 4:3 не меняет содержание предмета. Метаданные исходника не переносятся.

## Воспроизведение

Ниже точные промпты. Нужно вызвать встроенный `image_gen` отдельно с каждым `prompt` и `transparent_background=false`. Встроенный генератор сохраняет исходник в рабочем пространстве Codex; после получения файл копируется в репозиторий и оптимизируется. Пути, ключи и временные ссылки исходного окружения в этом документе не публикуются. Повторный запуск даст близкий стиль, но не гарантированную побитовую копию и не гарантированно тот же предмет.

## Промпты

### item-01 · Ретрокресло с деревянными подлокотниками

Файл: `images/catalog/olive-retro-armchair.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one mid-century retro armchair upholstered in muted olive green textile with walnut wooden armrests and four tapered wooden legs. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-02 · Компактный диван цвета охры

Файл: `images/catalog/compact-sofa.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one compact two-seat 1970s sofa upholstered in muted ochre velvet, low gently curved backrest and straight walnut legs. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-03 · Письменный стол с тремя ящиками

Файл: `images/catalog/writing-desk.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one vintage walnut writing desk with a flat rectangular desktop, three drawers on one side and slender legs, no objects on desktop. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-04 · Журнальный столик с нижней полкой

Файл: `images/catalog/coffee-table.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one low mid-century rectangular dark walnut coffee table with a slatted lower shelf and tapered legs, empty tabletop. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-05 · Деревянный стул с гнутой спинкой

Файл: `images/catalog/wooden-chair.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one brown bentwood cafe chair, circular wooden seat and graceful curved backrest, no upholstery. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-06 · Прикроватная тумба на ножках

Файл: `images/catalog/bedside-cabinet.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one mid-century honey-colored wood bedside cabinet with one drawer, small brass handle, open lower cubby and four tapered legs. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-07 · Торшер с плиссированным абажуром

Файл: `images/catalog/brass-floor-lamp.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one slim antique brass floor lamp with a pleated cream fabric lampshade, circular base. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-08 · Лампа банкира с зелёным плафоном

Файл: `images/catalog/bankers-lamp.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one classic bankers desk lamp with a glossy deep green glass horizontal shade, antique brass stem and heavy brass base, switched off. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-09 · Настольная лампа 1980-х

Файл: `images/catalog/eighties-desk-lamp.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one generic 1980s coral red metal desk lamp with a rounded hemispherical dome shade and cylindrical stand, switched off. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-10 · Настенное бра с матовым стеклом

Файл: `images/catalog/wall-sconce.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one unmounted vintage wall sconce with a milky frosted round glass shade and small antique brass wall bracket, displayed alone on a neutral studio surface, switched off. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-11 · Подвесной светильник с янтарным стеклом

Файл: `images/catalog/pendant-light.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one vintage amber ribbed glass pendant light with small brass fitting and short black suspension cord, hanging alone against neutral background, switched off. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-12 · Керосиновая лампа без топлива

Файл: `images/catalog/kerosene-lamp.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one old kerosene oil lamp with clear glass chimney and weathered grey metal fuel reservoir, completely unlit and empty, no flame. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-13 · Керамическая ваза из терракоты

Файл: `images/catalog/ceramic-vase.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one handmade tall matte terracotta ceramic vase with a narrow neck and gently rounded body. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-14 · Настенное зеркало в овальной раме

Файл: `images/catalog/wall-mirror.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one oval wall mirror with a slim dark wooden frame, upright alone against a warm grey seamless studio background, reflection only soft neutral studio gradient with no people or room. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-15 · Круглые настенные часы

Файл: `images/catalog/wall-clock.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one vintage round wall clock with honey wood frame, ivory dial, simple black index tick marks instead of numerals, plain two black hands, absolutely no letters or logos. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-16 · Латунный подсвечник на одну свечу

Файл: `images/catalog/candlestick.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one antique brass candlestick holder with turned stem and circular weighted base, without candle, soft natural patina. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-17 · Резная рама без изображения

Файл: `images/catalog/empty-frame.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one empty ornate rectangular vintage gilded wooden picture frame with restrained carved floral relief, no glass and no artwork inside, standing at slight angle. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-18 · Абстрактная интерьерная скульптура

Файл: `images/catalog/interior-sculpture.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one small minimalist ivory plaster abstract sculpture of a smooth looping arch on a low rectangular base, no human likeness, tactile matte finish. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-19 · Чайный сервиз с синей каймой

Файл: `images/catalog/tea-service.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one coherent ivory porcelain tea service: one teapot, four matching teacups on saucers, subtle thin cobalt blue rims. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-20 · Эмалированный чайник кремового цвета

Файл: `images/catalog/enamel-kettle.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one cream enamel metal kettle with black rim, black arched top handle and short spout, subtle signs of age, no flowers or brand. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-21 · Стеклянный графин с пробкой

Файл: `images/catalog/glass-decanter.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one empty clear cut-glass decanter with faceted body and a solid faceted glass stopper, elegant reflections, no liquid. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-22 · Набор бокалов на тонкой ножке

Файл: `images/catalog/glass-set.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one coordinated set of four empty clear stemmed wine glasses, thin stems and simple rounded bowls, grouped neatly, nothing else. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-23 · Металлический поднос с ручками

Файл: `images/catalog/metal-tray.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one empty oval silver-toned vintage metal serving tray with two handles and a gently embossed raised rim, top seen from three-quarter angle. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-24 · Стеклянная конфетница на ножке

Файл: `images/catalog/glass-candy-bowl.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one empty clear pressed-glass footed candy bowl with faceted sides and gently scalloped rim, short pedestal base. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-25 · ЭЛТ-телевизор в корпусе под дерево

Файл: `images/catalog/crt-television.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one generic 1980s CRT television with walnut effect housing, curved dark switched-off glass screen and two analog knobs, unbranded. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-26 · Дисковый телефон цвета слоновой кости

Файл: `images/catalog/rotary-phone.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one vintage ivory rotary dial telephone with curved handset resting on cradle and coiled cord, blank dial windows without readable numbers, unbranded. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-27 · Кассетная магнитола с двумя динамиками

Файл: `images/catalog/cassette-boombox.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one generic 1980s silver and charcoal cassette boombox with two large round speakers, central single cassette deck, raised handle, no readable lettering or logos. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-28 · Механическая пишущая машинка

Файл: `images/catalog/typewriter.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one vintage charcoal grey mechanical typewriter with round black keys and chrome carriage details, no paper inserted, no readable logo or branding. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-29 · Плёночный фотоаппарат с ремнём

Файл: `images/catalog/film-camera.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one unbranded vintage 35mm film camera with black textured leatherette body and silver metal top, modest prime lens, simple dark strap placed beside it, no markings. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-30 · Радиоприёмник в деревянном корпусе

Файл: `images/catalog/radio-receiver.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one vintage small tabletop radio with rounded honey wood cabinet, beige woven speaker grille and two round ivory knobs, blank tuning strip without readable text. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-31 · Ретрочемодан с латунными замками

Файл: `images/catalog/retro-suitcase.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one closed 1960s brown leather hard-sided travel suitcase, brass latches and reinforced corners, handle visible. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-32 · Кожаный портфель с одной застёжкой

Файл: `images/catalog/leather-briefcase.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one structured dark brown leather briefcase with top handle, flap front and a single central brass clasp, standing upright closed, unbranded. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-33 · Дорожный саквояж из кожи

Файл: `images/catalog/travel-bag.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one cognac brown leather vintage travel doctors bag with two short handles and metal frame top, closed, no contents, unbranded. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-34 · Зонт-трость с деревянной ручкой

Файл: `images/catalog/umbrella.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one closed navy blue full-length umbrella with a curved polished wooden handle, placed diagonally on the studio surface, whole umbrella visible. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-35 · Круглая шляпная коробка

Файл: `images/catalog/hat-box.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one round cream fabric-covered vintage hat box with fitted lid and a slender brown carrying strap, closed, no lettering or labels. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-36 · Ручной веер с деревянными спицами

Файл: `images/catalog/hand-fan.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one open ivory fabric folding hand fan with natural light wooden ribs, plain fabric without painting, arranged flat in a semicircle. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-37 · Небольшой ковёр с геометрическим узором

Файл: `images/catalog/small-rug.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one small rectangular vintage wool rug with faded burgundy, sand and navy geometric patterns, lying flat, seen from a high three-quarter angle. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-38 · Льняная скатерть с мягкой фактурой

Файл: `images/catalog/linen-tablecloth.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one natural oatmeal linen tablecloth neatly folded into a broad rectangle with one corner softly draped open, visible woven linen texture, no table or other objects. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-39 · Декоративная подушка с фактурным чехлом

Файл: `images/catalog/decorative-cushion.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one square muted teal decorative cushion with textured cotton cover and softly rounded stuffed edges, no pattern or piping. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-40 · Шерстяной плед в крупную клетку

Файл: `images/catalog/wool-blanket.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one folded wool blanket with a large beige and brown plaid pattern and short cream fringe, soft thick woven texture, neatly layered. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-41 · Лёгкая льняная занавеска

Файл: `images/catalog/curtain.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one single ivory linen curtain panel hanging loosely from a simple thin rod cropped near top, full curtain visible with soft vertical folds and slight floor pooling, neutral studio backdrop. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-42 · Дорожная накидка на кресло

Файл: `images/catalog/chair-throw.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one narrow charcoal grey wool chair throw with short fringe, folded into a long layered rectangle on a neutral surface, no chair, tactile woven texture. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-43 · Деревянные шахматы с доской

Файл: `images/catalog/chess-set.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one open walnut wooden chessboard with a complete light and dark wooden chess set arranged in initial starting positions, perspective large enough to see recognizable pieces. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-44 · Настольный глобус в тёплых тонах

Файл: `images/catalog/desk-globe.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one vintage decorative desktop globe with tan oceans, muted brown abstract continent silhouettes and dark wooden stand with brass meridian ring, no labels, no readable text, clearly decorative. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-45 · Деревянные счёты

Файл: `images/catalog/wooden-abacus.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one old wooden counting abacus with dark rectangular wood frame, many horizontal metal rods and brown round wooden beads, lying at a slight angle. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-46 · Настольный перекидной календарь без бренда

Файл: `images/catalog/desk-calendar.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one vintage wooden desktop flip calendar stand with two metal binding rings and a blank cream paper page with no dates, no text, no logos, at a three-quarter angle. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-47 · Канцелярский набор для кабинета

Файл: `images/catalog/stationery-set.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one vintage wooden desktop stationery organizer set with a pencil cup holding three plain pencils, an unmarked wooden ruler and an empty paper tray on one wooden base, no paper, no logos. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

### item-48 · Деревянная игрушка-лошадка

Файл: `images/catalog/wooden-toy.webp`

```text
Use case: product-mockup. Asset type: Kinostore demo catalog cover. Primary request: a photorealistic studio product photograph of one small vintage natural wood toy pull-along horse on four simple wooden wheels with a short cotton pull cord, minimalist carved form, no paint or logos. Scene/backdrop: warm light grey seamless studio background with a subtle grounded soft shadow. Composition: horizontal 4:3, whole object centered, large with generous 10% safe margins, accurate recognizable shape and tactile materials. Lighting: soft diffused daylight, understated premium catalog quality. Only the specified object or set. No people, hands, added decor, writing, logos, trademarks, watermark, price, grid or collage. Make a single standalone photograph.
```

## Итоговая проверка

- 48 уникальных обложек и 48 соответствующих превью, всего 96 WebP-файлов.
- Все 96 файлов декодируются, размеры проверены; отсутствующих путей нет.
- SHA-256 у всех 96 файлов различаются. Реестр содержит путь, itemId, источник, условия использования, дату, размеры и точные байты.
- Все исходные генерации осмотрены: предмет соответствует названию, нейтральный фон, нет людей и рекламных логотипов.
- Первые восемь фотографий отдельно осмотрены в действующих карточках интерфейса в Chromium до генерации остальных.
- Иностранные фотографии и внешние URL не использованы. Дополнительные ракурсы не создавались.

Основные изображения: 2 962 464 байт всего  12 414-169 668 байт на файл. Превью: 433 854 байт всего  2 468-23 232 байт на файл; медиана 7 408 байт. Общий объём всех изображений 3 396 318 байт. Это объём всего набора  не измерение первой загрузки страницы. Измерение первого экрана фиксируется отдельно в отчёте приёмки.
