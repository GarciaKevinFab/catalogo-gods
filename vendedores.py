# -*- coding: utf-8 -*-
"""Genera la página principal y una página por vendedor (misma web, distinto WhatsApp).

Uso:  python vendedores.py
Para agregar un vendedor: añade una línea a PAGINAS, ejecuta el script y sube los cambios.
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

SITIO  = "https://garciakevinfab.github.io/catalogo-gods/"
PROMO2 = "S/260.90"   # solo para el texto de la vista previa (los precios reales salen de la nube + AUMENTO)
PROMO3 = "S/330.90"

PAGINAS = [
    dict(carpeta="",          nombre=None,        whatsapps=["51964312870", "51991951234"]),
    dict(carpeta="ronaldo",   nombre="Ronaldo",   whatsapps=["51991951234"]),
    dict(carpeta="alexander", nombre="Alexander", whatsapps=["51964312870"]),
    dict(carpeta="richard",   nombre="Richard",   whatsapps=["51966955747"]),
    dict(carpeta="aron",      nombre="Aron",      whatsapps=["51942035360"]),
]

def tel(n): return "+%s %s %s %s" % (n[:2], n[2:5], n[5:8], n[8:])

PLANTILLA = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#f1e8d9">
<title>{titulo}</title>
<link rel="icon" href="{base}favicon.ico">
<meta name="description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GODS">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{url}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="es_PE">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{titulo}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{url}og.png">

<!-- Acelera el handshake con el host de imágenes y Firebase -->
<link rel="preconnect" href="https://i.ibb.co" crossorigin>
<link rel="dns-prefetch" href="https://i.ibb.co">
<link rel="preconnect" href="https://www.gstatic.com" crossorigin>
<link rel="preconnect" href="https://firestore.googleapis.com" crossorigin>
<link rel="stylesheet" href="{base}styles.css">
</head>
<body>

<script src="{base}firebase-config.js"></script>
<script>window.VENDEDOR = {vendedor};</script>

<div id="app"><div class="loadscreen"><div class="spin"></div><div>Cargando catálogo…</div></div></div>

<script type="module" src="{base}app.js"></script>
</body>
</html>
"""

def fuente(nombre, tam):
    for f in (nombre, "segoeuib.ttf", "arialbd.ttf", "arial.ttf"):
        try: return ImageFont.truetype("C:/Windows/Fonts/" + f, tam)
        except Exception: pass
    return ImageFont.load_default()

def imagen_og(ruta, nombre, numeros):
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), "#f1e8d9"); d = ImageDraw.Draw(im)
    fb = lambda s: fuente("segoeuib.ttf", s); fr = lambda s: fuente("segoeui.ttf", s)
    d.rounded_rectangle((80, 80, 200, 200), radius=30, fill="#e84c8a")
    d.text((140, 140), "G", font=fb(84), fill="#ffffff", anchor="mm")
    d.text((230, 140), "GODS", font=fb(92), fill="#18181c", anchor="lm")
    d.text((80, 280), "Catálogo de zapatillas", font=fb(60), fill="#18181c", anchor="lm")
    d.text((80, 350), "Nike · Adidas · Jordan · New Balance · Puma · Vans y más", font=fr(32), fill="#6c6c75", anchor="lm")
    for i, (p, t) in enumerate([(PROMO2, "2 pares"), (PROMO3, "3 pares"), ("Premium", "sin promo")]):
        x = 80 + i * 350
        d.rounded_rectangle((x, 410, x + 320, 540), radius=24, fill="#ffffff", outline="#e3d9c8", width=2)
        d.text((x + 24, 455), p, font=fb(44), fill="#e84c8a", anchor="lm")
        d.text((x + 24, 508), t, font=fr(26), fill="#6c6c75", anchor="lm")
    quien = ("Asesor: %s · " % nombre) if nombre else "Pedidos por WhatsApp: "
    d.text((80, 585), quien + " · ".join(tel(n) for n in numeros), font=fb(28), fill="#18181c", anchor="lm")
    im.save(ruta, optimize=True)

for p in PAGINAS:
    carpeta = p["carpeta"]; base = "../" if carpeta else ""
    url = SITIO + (carpeta + "/" if carpeta else "")
    nums = " · ".join(tel(n) for n in p["whatsapps"])
    titulo = "GODS · Catálogo de zapatillas" + (" · " + p["nombre"] if p["nombre"] else "")
    desc = ("Asesor: %s · WhatsApp %s. " % (p["nombre"], nums)) if p["nombre"] else ("Pedidos por WhatsApp %s. " % nums)
    desc += "Promo 2 pares %s · 3 pares %s. Nike, Adidas, Jordan, New Balance, Puma, Vans y más." % (PROMO2, PROMO3)
    vendedor = json.dumps({"nombre": p["nombre"], "whatsapps": p["whatsapps"]}, ensure_ascii=False)
    if carpeta: os.makedirs(carpeta, exist_ok=True)
    with open(os.path.join(carpeta, "index.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(PLANTILLA.format(titulo=titulo, desc=desc, url=url, base=base, vendedor=vendedor))
    imagen_og(os.path.join(carpeta, "og.png"), p["nombre"], p["whatsapps"])
    print("ok", url, nums)
