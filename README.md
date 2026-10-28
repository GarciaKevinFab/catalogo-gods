# Catálogo GODS

Copia del catálogo de zapatillas GODS publicada con GitHub Pages.

- Los productos y la configuración de la tienda se leen en vivo desde Firestore (proyecto `catalogo-gods`, documento `stores/GODS`), igual que el sitio original.
- Los botones de WhatsApp de esta copia ofrecen dos números: **+51 964 312 870** y **+51 991 951 234** (lista `WHATSAPPS` en `index.html`). Al tocar cualquier botón el cliente elige a cuál escribir.
- Los precios de esta copia son los de la nube más **S/81 por par** (S/99.00 pasa a S/180.00; promos 2 pares S/260.90 y 3 pares S/330.90). Se ajusta con `AUMENTO` y `PRECIOS_FIJOS` en `index.html`.
- Las fotos se sirven desde ImgBB a través del CDN wsrv.nl.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Toda la página: estilos, catálogo, filtros, buscador y modal de producto |
| `firebase-config.js` | Claves públicas de Firebase e ImgBB |
| `favicon.ico` | Ícono de la pestaña |

## Cambiar el número de WhatsApp

Edita la lista `const WHATSAPPS = ["51964312870", "51991951234"];` en `index.html` (código de país + número, sin espacios ni `+`). Con un solo número desaparece el selector y los botones abren WhatsApp directo.
