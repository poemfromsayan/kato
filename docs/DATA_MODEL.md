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

**`shopping_lists`** / **`shopping_list_items`** — el resultado final: cada ítem del plan resuelto a un producto y tienda concretos, con el precio real (`price_snapshots`) vigente al momento de generar la lista, según la preferencia (precio / calidad / balance) que el usuario haya elegido.

## Por qué la IA no toca `price_snapshots`

El límite de responsabilidad es intencional: Claude solo lee un PDF no estructurado y devuelve una lista de alimentos/cantidades (una tarea de comprensión de lenguaje, donde un LLM aporta valor real). Decidir "cuál tienda es más barata" es una consulta SQL determinística sobre datos que sí verificamos por scraping. Si el modelo alucinara un precio, nunca llega a mostrarse como precio real porque vive en una columna distinta (`price_range_min/max` en `plan_items`, claramente separada de `price_snapshots`).

## Vista `current_prices`

En vez de guardar "el precio actual" como columna mutable, se define una vista que selecciona el snapshot más reciente por `store_product_id`. Así el histórico (`price_snapshots`) queda como única fuente de verdad y la vista simplemente lo interpreta — ver `apps/api/src/db/migrations/0001_init.sql`.
