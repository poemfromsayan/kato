# Modelo de datos — Katö

Postgres relacional. Estas son las tablas centrales y por qué existen.

## Catálogo

**`stores`** — cada supermercado que scrapeamos (Automercado, MaxiPali, Walmart CR...). Guarda el `slug`, nombre, URL base y si está activo, para poder desactivar un scraper sin borrar su historial de precios.

**`categories`** — categorías de producto (Proteínas, Lácteos, Granos...) para poder filtrar/agrupar en el frontend y en las recomendaciones nutricionales.

**`products`** — el producto "genérico" (ej. "Pechuga de pollo"), independiente de en qué tienda se venda. Tiene `unit` y `unit_size` (ej. `kg`, `1.0`) para poder comparar precio por unidad entre presentaciones distintas, y un `barcode` opcional para hacer *matching* más confiable entre tiendas.

**`nutrition_facts`** — ficha nutricional de un producto, por porción. Separada de `products` porque no todo producto tiene datos nutricionales confiables desde el inicio, y porque el campo `source` (`scraped` / `manual` / `estimated`) deja registrado qué tan confiable es ese dato — esto importa mucho en una app de nutrición: nunca queremos mostrar un número inventado como si fuera un hecho verificado.

**`store_products`** — tabla puente: qué tienda vende qué producto, con su SKU/URL propios. Un mismo producto genérico puede tener una fila por tienda. Aquí vive `last_scraped_at`, para saber qué tan fresca es la info de cada tienda.

**`price_snapshots`** — la tabla que crece todos los días. Cada scrape inserta una fila nueva (no actualiza una existente), así queda un historial real de precios en el tiempo — necesario para features futuras como "el precio bajó" o gráficas de tendencia. El precio "actual" de un producto en una tienda es simplemente el snapshot más reciente; para eso definimos la vista `current_prices` (ver más abajo) en vez de mantener una columna de "precio actual" duplicada que se pueda desincronizar.

## Usuarios y planes nutricionales

**`users`** — cuenta del usuario. La contraseña nunca se guarda en texto plano, solo su hash (bcrypt). Incluye `price_quality_preference` (`price` / `quality` / `balance`) como default global, aunque cada lista de compras puede generarse con una preferencia distinta.

**`nutrition_plans`** — un plan subido por el usuario. Importante: el PDF en sí **no se guarda en la base de datos** como blob — se guarda en almacenamiento de archivos (ej. un bucket) y aquí solo vive la referencia (`storage_path`). Guardar binarios grandes en Postgres es mala práctica de rendimiento y de backups.

**`plan_items`** — la salida *estructurada* que Claude extrae del PDF: nombre del alimento tal como aparece en el plan, cantidad, unidad, frecuencia, y un rango de precio orientativo. Ese rango de precio es una estimación del modelo, **no autoritativa** — se guarda aparte de cualquier precio real para que nunca se confunda con datos de `price_snapshots`. `matched_product_id` se llena después, con lógica determinística de nuestro propio código (búsqueda/similaridad de texto contra `products`), no con otra llamada al modelo.

**`shopping_lists`** / **`shopping_list_items`** — el resultado final: cada ítem del plan resuelto a un producto y tienda concretos, con el precio real (`price_snapshots`) vigente al momento de generar la lista. Implementado en `apps/api/src/modules/shopping-lists/`.

> **Limitación conocida:** `preference_used` guarda la preferencia del usuario (`price` / `quality` / `balance`), pero HOY la resolución de "mejor tienda" siempre usa precio más bajo — no existe todavía ninguna señal real de calidad por tienda en el schema (reputación, frescura, etc.), así que `quality`/`balance` no tienen lógica propia por ahora. Ídem para el comparador (`modules/prices`): resalta la tienda más barata sin importar la preferencia guardada. Corregir esto requiere primero decidir qué dato real va a representar "calidad".

## Escaneo colaborativo de productos

Si un usuario no encuentra un producto en Katö, puede fotografiarlo (empaque
+, opcionalmente, su tabla nutricional) para proponerlo. El principio es el
mismo que en toda la app: **una foto de un usuario nunca es un hecho
verificado**, así que nunca escribe directo en `products`/`nutrition_facts`.

**`product_scans`** — cola de revisión. Guarda las rutas a las dos fotos
(`package_image_path`, `nutrition_image_path` — nunca el binario, mismo
criterio que `nutrition_plans.storage_path`), lo que Claude vision extrajo
de ellas (`extracted_*`, ver `apps/api/src/services/ai/extractProductScan.js`),
un posible `matched_product_id` (resuelto por similaridad de texto con
`pg_trgm`, igual que el matching de `plan_items` — nunca decidido por el
modelo), y el estado del review (`status`: `pending` / `approved` /
`rejected`, más `reviewed_by`/`reviewed_at`/`rejection_reason`/`resulting_product_id`).

**`users.is_admin`** — columna simple (no hay tabla de roles todavía)
que habilita `requireAdmin` (`apps/api/src/middleware/auth.js`) para
aprobar/rechazar escaneos. Deliberadamente NO viaja en el JWT — se
consulta fresca contra la base en cada petición, para que revocar el
permiso sea inmediato en vez de esperar a que expire un token de 2h. No
existe endpoint para volverse admin: se otorga solo de forma local con
`apps/api/scripts/makeAdmin.js` (`npm run make-admin -- email@ejemplo.com`),
a propósito, para minimizar la superficie de ataque.

**Qué pasa al aprobar un escaneo** (`approveScan` en
`modules/product-scans/repository.js`, transaccional): si el escaneo no
tenía `matched_product_id`, crea un `products` nuevo con los datos que el
admin confirmó (puede haber corregido lo que Claude leyó); si sí lo tenía,
completa/actualiza la ficha nutricional de ESE producto vía
`ON CONFLICT (product_id, serving_size) DO UPDATE`. En ambos casos el
`nutrition_facts.source` que queda es `'crowdsourced'` (nuevo valor del
enum `nutrition_source`, distinto de `scraped`/`manual`/`estimated`) — así
el frontend siempre puede distinguir "esto lo confirmó un admin a partir
de una foto de un usuario" de "esto viene de una tabla oficial" (`manual`).

**Por qué las fotos se sirven autenticadas y no por una URL pública**: un
UUID en el nombre de archivo ya evita que alguien adivine la ruta, pero
igual se decidió no montar `uploads/product-scans` como estático — las
fotos de un escaneo solo las necesita ver un admin durante la revisión, así
que `GET /product-scans/:id/image/:type` exige `requireAuth` +
`requireAdmin` y transmite el archivo con `res.sendFile`. El frontend no
puede usar un `<img src="...">` directo contra esa ruta (el navegador no
manda el header `Authorization` en pedidos de imagen), así que la trae con
`fetch` y arma un object URL (`apps/web/js/lib/apiClient.js#getBlob`).

## Open Food Facts como fuente complementaria

**Legitimidad confirmada:** asociación sin fines de lucro francesa (ley
1901), fundada en 2012 por Stéphane Gigandet. Sus datos están bajo licencia
ODbL — reuso libre, incluso comercial, con atribución y "compartir igual".
Tiene un subdominio específico para Costa Rica (`cr.openfoodfacts.org`) con
productos reales de marcas locales, y una API de contribución documentada
(relevante para la tarea #53: aportar datos de vuelta).

**Cobertura verificada para las marcas del seed de Katö** (vía
`cgi/search.pl?search_terms=...&json=1`, 2026-08-21):

| Marca | Resultado |
|---|---|
| Dos Pinos | ✅ Buena cobertura — varios productos reales (Delactomy, Leche Semidescremada, Queso Crema, Leche+proteína, etc.) |
| Bimbo | ✅ Buena cobertura — Pan Blanco Artesano, Pan Cuadrado, Pan integral, etc. |
| Pipasa | ✅ 2 productos con macros reales (Filetes de Pechuga de Pollo: 152kcal/100g; Pollo Mechado: 110kcal/100g) |
| Tío Pelón | ✅ 5 productos, incluye un "Arroz" cuyos macros coinciden bien con el valor INCAP que ya usamos en el seed (163kcal, 3g proteína, 35.7g carbs/100g) |
| Cocinero | ❌ 0 resultados |
| CATSA, Sardimar, Café Rey, Quaker, Yema Dorada, Del Monte | ⏳ **Pendiente** — la API anónima de Open Food Facts empezó a devolver "Page temporarily unavailable" (límite de tasa para usuarios no autenticados) a mitad de la revisión. Reintentar más tarde, o crear una cuenta de aportante para levantar el límite. |

**Conclusión preliminar:** cobertura real y útil para las marcas
grandes/nacionales (Dos Pinos, Bimbo, Pipasa, Tío Pelón), pero desigual —
no hay que asumir que todo el catálogo de Katö va a tener match ahí. Sirve
como fuente complementaria de nutrición, no como reemplazo de INCAP/USDA
para lo que ya está sourceado a mano.

## Por qué la IA no toca `price_snapshots`

El límite de responsabilidad es intencional: Claude solo lee un PDF no estructurado y devuelve una lista de alimentos/cantidades (una tarea de comprensión de lenguaje, donde un LLM aporta valor real). Decidir "cuál tienda es más barata" es una consulta SQL determinística sobre datos que sí verificamos por scraping. Si el modelo alucinara un precio, nunca llega a mostrarse como precio real porque vive en una columna distinta (`price_range_min/max` en `plan_items`, claramente separada de `price_snapshots`).

## Vista `current_prices`

En vez de guardar "el precio actual" como columna mutable, se define una vista que selecciona el snapshot más reciente por `store_product_id`. Así el histórico (`price_snapshots`) queda como única fuente de verdad y la vista simplemente lo interpreta — ver `apps/api/src/db/migrations/0001_init.sql`.
