# Catálogo GODS

Copia del catálogo de zapatillas GODS publicada con GitHub Pages.

- Los productos y la configuración de la tienda se leen en vivo desde Firestore (proyecto `catalogo-gods`, documento `stores/GODS`), igual que el sitio original.
- La página principal ofrece dos números (**+51 964 312 870** y **+51 991 951 234**) y cada vendedor tiene su página con su número (ver tabla abajo). Con un solo número los botones abren WhatsApp directo; con dos, el cliente elige.
- Los precios de esta copia son los de la nube más **S/81 por par** (S/99.00 pasa a S/180.00; promos 2 pares S/260.90 y 3 pares S/330.90). Se ajusta con `AUMENTO` y `PRECIOS_FIJOS` en `app.js`.
- Productos ocultos solo en esta copia: el "RELOJ PREMIUN" (listas `OCULTAR_IDS` y `OCULTAR_NOMBRES` en `app.js`).
- Las fotos se sirven desde ImgBB a través del CDN wsrv.nl.

## Páginas por vendedor

Misma web y mismo catálogo; solo cambia el WhatsApp al que llegan los pedidos.

| Página | Enlace | WhatsApp |
|---|---|---|
| General (elige entre dos) | https://garciakevinfab.github.io/catalogo-gods/ | +51 964 312 870 · +51 991 951 234 |
| Ronaldo | https://garciakevinfab.github.io/catalogo-gods/ronaldo/ | +51 991 951 234 |
| Alexander | https://garciakevinfab.github.io/catalogo-gods/alexander/ | +51 964 312 870 |
| Richard | https://garciakevinfab.github.io/catalogo-gods/richard/ | +51 966 955 747 |

Para agregar o cambiar un vendedor: edita la lista `PAGINAS` en `vendedores.py`, ejecuta `python vendedores.py` y sube los cambios. El script genera el `index.html` y la imagen de vista previa (`og.png`) de cada carpeta.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `app.js` | El catálogo: carga de Firestore, precios, filtros, buscador, modal y WhatsApp |
| `styles.css` | Estilos (incluye las reglas para celular al final) |
| `index.html` y `<vendedor>/index.html` | Cascarones generados por `vendedores.py`; definen `window.VENDEDOR` |
| `vendedores.py` | Generador de las páginas por vendedor |
| `firebase-config.js` | Claves públicas de Firebase e ImgBB |
| `favicon.ico` | Ícono de la pestaña |

## Cambiar el número de WhatsApp

Edita la lista `PAGINAS` en `vendedores.py` (código de país + número, sin espacios ni `+`) y ejecuta `python vendedores.py`.
