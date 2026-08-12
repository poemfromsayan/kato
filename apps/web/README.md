# Katö · Web (frontend)

SPA sin frameworks: HTML/CSS/JS puro, construida con `html.js`. Sin paso de
build (no hay bundler) — los módulos ES se sirven tal cual.

## Estructura

```
index.html          punto de entrada único (ver css/js enlazados en el head)
server.js            servidor estático de desarrollo, sin dependencias
css/                 tokens.css, base.css, components.css (fuente de verdad
                      de estilos de la app real — ver docs/ARCHITECTURE.md)
js/
  html.js             framework
  config.js           URL base de la API
  lib/
    router.js          router SPA (History API)
    apiClient.js        wrapper de fetch (adjunta el token, normaliza errores)
    auth.js              estado de sesión (localStorage)
    theme.js              claro/oscuro
  components/          UI reutilizable (botones, inputs, cards, nav...)
  screens/              una pantalla por archivo
  main.js                bootstrap: monta el layout y registra las rutas
tests/
  e2e.mjs               prueba end-to-end con Playwright (ver cabecera del archivo)
```

## Cómo correrlo

Necesita `apps/api` corriendo en `http://localhost:3001` (ver su propio
README/`.env.example`). Con eso:

```bash
npm run dev   # http://localhost:5173
```

Para que el comparador de precios muestre algo, tiene que haber productos
con precios en la base — si todavía no hay scrapers reales corriendo, se
puede insertar un par de filas de prueba a mano (ver el seed usado en
`tests/e2e.mjs` como referencia de la forma de los datos).

## Rutas

| Ruta | Pantalla | Protegida |
|---|---|---|
| `/login` | Login / registro | No |
| `/` | Dashboard (planes subidos, accesos rápidos) | Sí |
| `/comparador` | Buscar producto y comparar precio por tienda | Sí |
| `/subir-plan` | Subir PDF del plan, ver la extracción de Claude | Sí |

"Protegida" = si no hay sesión, el router redirige a `/login?next=<ruta>` y
vuelve ahí después de iniciar sesión (ver `js/lib/router.js`).

## Por qué SPA con router propio (no una librería)

Con `html.js` ya evitamos frameworks de UI; meter una librería de routing
solo para esto hubiera sido inconsistente con esa decisión, y el router que
se necesita acá es chico (interceptar clics + pushState + un guard de
auth) — ver `js/lib/router.js`, tiene menos de 80 líneas y está comentado
línea por línea de las partes no obvias.
