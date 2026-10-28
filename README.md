# Catálogo GODS

Copia del catálogo de zapatillas GODS publicada con GitHub Pages.

- Los productos y la configuración de la tienda se leen en vivo desde Firestore (proyecto `catalogo-gods`, documento `stores/GODS`), igual que el sitio original.
- El botón y los enlaces de WhatsApp de esta copia usan el número **+51 964 312 870** (constante `WHATSAPP` en `index.html`).
- Los precios de esta copia son los de la nube más **S/81 por par** (S/99.00 pasa a S/180.00; promos 2 pares S/260.90 y 3 pares S/330.90). Se ajusta con `AUMENTO` y `PRECIOS_FIJOS` en `index.html`.
- Las fotos se sirven desde ImgBB a través del CDN wsrv.nl.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Toda la página: estilos, catálogo, filtros, buscador y modal de producto |
| `firebase-config.js` | Claves públicas de Firebase e ImgBB |
| `favicon.ico` | Ícono de la pestaña |

## Cambiar el número de WhatsApp

Edita la línea `const WHATSAPP = "51964312870";` en `index.html` (código de país + número, sin espacios ni `+`).
