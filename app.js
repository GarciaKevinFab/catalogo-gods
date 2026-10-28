import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const STORE  = (params.get("store")||"GODS").toUpperCase();

/* Números de WhatsApp de ESTA copia del catálogo (reemplazan al que viene de la nube).
   Con dos o más, al tocar cualquier botón de WhatsApp el cliente elige a cuál escribir. */
const VENDEDOR = window.VENDEDOR || {};   // lo define cada página (ronaldo/, alexander/, richard/)
const WHATSAPPS = (VENDEDOR.whatsapps && VENDEDOR.whatsapps.length) ? VENDEDOR.whatsapps : ["51964312870", "51991951234"];
const WHATSAPP = WHATSAPPS[0];
function fmtTel(n){ return "+" + n.slice(0,2) + " " + n.slice(2,5) + " " + n.slice(5,8) + " " + n.slice(8); }

/* Selector de número: intercepta todos los enlaces wa.me y conserva el mensaje del modelo */
document.addEventListener("click", e=>{
  const a = e.target.closest && e.target.closest('a[href^="https://wa.me/"]');
  if(!a || a.classList.contains("num") || WHATSAPPS.length < 2) return;
  e.preventDefault();
  const q = a.href.split("?")[1] || "";
  const m = document.createElement("div"); m.className = "modal open wachooser";
  m.innerHTML = `<div class="sheet"><div class="body">
    <div class="title">¿A qué número te atendemos?</div>
    <div class="hint">Elige uno, los dos responden igual 👇</div>
    ${WHATSAPPS.map((n,i)=>`<a class="num" href="https://wa.me/${n}${q ? "?" + q : ""}" target="_blank" rel="noopener">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 5-1.3A10 10 0 1 0 12 2z"/></svg>
      <span>WhatsApp ${i+1}</span><small>${fmtTel(n)}</small></a>`).join("")}
    <button class="cancel" type="button">Cancelar</button>
  </div></div>`;
  const close = ()=>m.remove();
  m.addEventListener("click", ev=>{ if(ev.target===m) close(); });
  m.querySelector(".cancel").onclick = close;
  m.querySelectorAll("a.num").forEach(x=>x.addEventListener("click", ()=>setTimeout(close, 150)));
  document.body.appendChild(m);
});

/* ===== PRECIOS DE ESTA COPIA =====
   Los precios llegan de la nube (los del catálogo original). Aquí se les
   suma AUMENTO soles a cada par: S/99.00 -> S/180.00, S/119.90 -> S/200.90, etc.
   En las promos tambien se suman AUMENTO soles (2 pares S/179.90 -> S/260.90, 3 pares S/249.90 -> S/330.90).
   Para un precio puntual distinto, agrégalo en PRECIOS_FIJOS (tiene prioridad). */
/* Productos de la nube que NO se muestran en esta copia (por id o por texto del nombre) */
const OCULTAR_IDS = [1784417715491];
const OCULTAR_NOMBRES = ["RELOJ"];
function visible(p){
  if(OCULTAR_IDS.some(id => String(id) === String(p.id))) return false;
  const n = String(p.name || "").toUpperCase();
  return !OCULTAR_NOMBRES.some(t => n.includes(t.toUpperCase()));
}

const AUMENTO = 81;
const PRECIOS_FIJOS = { "S/99.00": "S/180.00" };
function subirPrecio(precio, pares){
  const s = String(precio == null ? "" : precio).trim();
  if(PRECIOS_FIJOS[s]) return PRECIOS_FIJOS[s];
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if(!m) return s;
  const n = parseFloat(m[1].replace(",", ".")) + AUMENTO * (pares || 1);
  return s.replace(m[1], n.toFixed(2));
}

/* Cuántos modelos se pintan por tanda. Bájalo a 24 si tu público es muy 3G. */
const PAGE_SIZE = 40;

function fail(msg){ document.getElementById("app").innerHTML = `<div class="loadscreen"><div style="font-size:40px">🙁</div><div>${msg}</div></div>`; }

/* Escapa comillas y <> para que un nombre raro no rompa el HTML */
const ESC = {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>ESC[c]); }

/* Placeholder generado en el navegador: no pesa ni pide red */
function ph(label, hex){
  const c = hex || "#222";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
    <rect width='400' height='400' fill='${c}'/><rect width='400' height='400' fill='url(#g)'/>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
    <stop offset='0' stop-color='#ffffff22'/><stop offset='1' stop-color='#00000055'/></linearGradient></defs>
    <text x='50%' y='52%' font-family='Arial' font-size='26' fill='#ffffffcc' text-anchor='middle' font-weight='bold'>${label}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

/* ===== CDN DE IMÁGENES =====
   Las fotos viven en ImgBB en resolución original (varios MB cada una) y
   ese host las entrega lentísimo desde Perú. En vez de migrarlas, se pasan
   por un proxy que las achica, las convierte a WebP y las cachea en un CDN
   global. Mismo archivo de origen, ~40 KB en vez de ~3 MB.
   Para apagarlo y volver a las URLs originales: CDN_ON = false. */
const CDN_ON = true;
function cdn(url, w){
  if(!CDN_ON || !url || /^data:/i.test(url)) return url;
  if(!/^https?:\/\//i.test(url)) return url;
  const bare = url.replace(/^https?:\/\//i, "");
  return "https://wsrv.nl/?url=" + encodeURIComponent(bare) +
         "&w=" + w + "&we&output=webp&q=80";
}

/* ===== RED DE SEGURIDAD DE IMÁGENES =====
   1er fallo  -> reintenta con la URL original (por si el CDN se cae).
   2do fallo  -> pinta el placeholder de la marca.
   Así nunca queda un cuadro en blanco. */
document.addEventListener("error", e=>{
  const el = e.target;
  if(!el || el.tagName !== "IMG" || !el.hasAttribute("data-ph")) return;
  el.removeAttribute("data-loading");
  if(el.dataset.try === "done") return;
  if(!el.dataset.try && el.dataset.orig && el.src !== el.dataset.orig){
    el.dataset.try = "orig";
    el.src = el.dataset.orig;
    return;
  }
  el.dataset.try = "done";
  el.src = ph(el.dataset.brand||"", el.dataset.hex||"#222");
}, true);

document.addEventListener("load", e=>{
  const el = e.target;
  if(el && el.tagName === "IMG") el.removeAttribute("data-loading");
}, true);

let db;
try{
  if(!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey==="PEGA_AQUI") throw new Error("sin config");
  db = getFirestore(initializeApp(window.FIREBASE_CONFIG));
}catch(e){ fail("Catálogo aún no configurado."); }

let lastSig = "";
if(db){
  onSnapshot(doc(db,"stores",STORE), snap=>{
    if(!snap.exists()){ fail("Este catálogo aún no tiene productos."); return; }
    const d = snap.data();
    if(!d.config || !d.products || !d.products.filter(visible).length){ fail("Este catálogo aún no tiene productos."); return; }
    /* Evita repintar todo cuando Firestore reenvía el mismo documento */
    const sig = JSON.stringify([d.config, d.products]);
    if(sig === lastSig) return;
    lastSig = sig;
    const promos = (d.config.promos || []).map(pr => ({ ...pr, precio: subirPrecio(pr.precio, 1) }));
    const products = d.products.filter(visible).map(p => ({ ...p, price: subirPrecio(p.price, 1) }));
    mount({ ...d.config, whatsapp: WHATSAPP, promos }, products);
  }, err=>{ fail("No se pudo cargar el catálogo."); });
}

/* ============ MOTOR DEL CATÁLOGO ============ */
function mount(CONFIG, PRODUCTS){
  const r = document.documentElement.style;
  r.setProperty('--bg', CONFIG.colors.bg);
  r.setProperty('--accent', CONFIG.colors.accent);
  r.setProperty('--accent-text', CONFIG.colors.accentText);
  document.title = CONFIG.storeName + " · Catálogo" + (VENDEDOR.nombre ? " · " + VENDEDOR.nombre : "");

  function hexRGB(h){ h=(h||"").replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join('');
    return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]; }
  function lum(h){ const [a,b,c]=hexRGB(h); return (a*299+b*587+c*114)/1000; }
  function rgba(h,al){ const [a,b,c]=hexRGB(h); return `rgba(${a},${b},${c},${al})`; }
  (function theme(){
    const bg = CONFIG.colors.bg || "#0c0c0e";
    const light = lum(bg) > 150;
    if(light){
      r.setProperty('--surface','#ffffff'); r.setProperty('--surface-2','#eeeeee');
      r.setProperty('--text','#18181c'); r.setProperty('--muted','#6c6c75');
      r.setProperty('--line','rgba(0,0,0,.10)'); r.setProperty('--card-hover','rgba(0,0,0,.22)');
      r.setProperty('--header-bg', rgba(bg,.90));
    } else {
      r.setProperty('--surface','#161619'); r.setProperty('--surface-2','#1f1f24');
      r.setProperty('--text','#f5f5f7'); r.setProperty('--muted','#9a9aa3');
      r.setProperty('--line','#26262c'); r.setProperty('--card-hover','#3a3a42');
      r.setProperty('--header-bg', rgba(bg,.92));
    }
  })();

  if(CONFIG.font && CONFIG.font !== "Sistema"){
    const link = document.createElement('link'); link.rel='stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + CONFIG.font.replace(/ /g,'+') + ':wght@400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
    r.setProperty('--font', "'" + CONFIG.font + "', -apple-system, Arial, sans-serif");
  }

  function isDirectImg(u){ return /i\.ibb\.co|\.(jpg|jpeg|png|webp|gif|avif)(\?|$)|^data:image/i.test(u||""); }
  function imgFor(p, ci){ const col = p.colors[ci||0]; return (col && isDirectImg(col.img)) ? col.img : ph(p.brand, col ? col.hex : "#222"); }
  function isPremium(p){ return p.premium!==undefined ? !!p.premium : !!p.noPromo; }

  let viewList = [];
  let shown = 0;
  let gender = "Todos", brand = "Todas", query = "";
  const brands = ["Todas", ...Array.from(new Set(PRODUCTS.map(p=>p.brand)))];

  const DEFAULT_WA_MSG = `TIO ${CONFIG.storeName} ! YA QUIERO SEPARAR MIS ZAPATILLAS, AHI TE MANDO LOS MODELOS:`;
  function waLink(p){
    const msg = p ? `TIO ${CONFIG.storeName} ! ME INTERESA ESTE MODELO: ${p.brand} ${p.name} (Tallas ${p.sizes})` : DEFAULT_WA_MSG;
    return `https://wa.me/${CONFIG.whatsapp}?text=` + encodeURIComponent(msg);
  }

  /* ---- TARJETA ----
     loading="lazy"  -> solo descarga las fotos que entran en pantalla
     width/height    -> reserva el espacio, no hay saltos de layout
     data-ph/brand/hex -> datos para el placeholder si la foto falla */
  function cardHTML(p){
    const col  = p.colors[0] || {};
    const tag  = p.section==="new" ? `<span class="tag new">NUEVO</span>` : p.section==="best" ? `<span class="tag">TOP</span>` : "";
    const vid  = (p.video || p.colors.some(c=>c.video)) ? `<div class="vid">▶</div>` : "";
    const dots = p.colors.slice(0,5).map(c=>`<i style="background:${esc(c.hex)}"></i>`).join("");
    const src  = imgFor(p,0);
    const price = p.noPromo
      ? `<div class="price nopromo">${esc(p.price)}<small>Precio fijo · sin promo</small></div>`
      : `<div class="price">${esc(p.price)}<small>c/u · promo 2x/3x</small></div>`;
    return `<div class="card" data-id="${esc(p.id)}">
      <div class="ph">${tag}${vid}<img src="${esc(cdn(src,500))}" data-orig="${esc(src)}" alt=""
        loading="lazy" decoding="async" fetchpriority="low" width="400" height="400"
        data-loading data-ph data-brand="${esc(p.brand)}" data-hex="${esc(col.hex||'#222')}"></div>
      <div class="info">
        <div class="brand">${esc(p.brand)}</div><div class="name">${esc(p.name)}</div>
        <div class="sizes">Tallas ${esc(p.sizes)}</div><div class="dots">${dots}</div>${price}
      </div></div>`;
  }

  /* ---- CÁSCARA: se pinta UNA sola vez ----
     Antes se reconstruía todo el #app en cada tecla del buscador y en cada
     filtro, así que las 175 fotos se volvían a pedir cada vez. Eso era lo
     que trababa la página. Ahora solo cambia la lista de productos. */
  const logo = CONFIG.logoUrl
    ? `<img src="${esc(cdn(CONFIG.logoUrl,160))}" data-orig="${esc(CONFIG.logoUrl)}" alt="${esc(CONFIG.storeName)}" data-ph data-brand="${esc(CONFIG.storeName)}" data-hex="${esc(CONFIG.colors.accent||'#222')}">`
    : `<span class="badge">${esc(CONFIG.storeName.charAt(0))}</span><span>${esc(CONFIG.storeName)}</span>`;

  document.getElementById("app").innerHTML = `
  <header><div class="wrap">
    <div class="bar">
      <a class="logo" href="#">${logo}</a>
      <div class="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="q" placeholder="Buscar modelo o marca..." autocomplete="off">
      </div>
    </div>
  </div></header>
  <div class="wrap"><div class="promos">
    ${CONFIG.promos.map(pr=>`<div class="promo"><b>${esc(pr.precio)}</b><span>${esc(pr.detalle)}</span></div>`).join("")}
    <div class="promo"><b>Premium</b><span>modelos sin promo</span></div>
  </div></div>
  <div class="filters"><div class="wrap">
    <div class="gender">${["Todos","Hombre","Mujer"].map(g=>`<button class="${g===gender?'on':''}" data-g="${g}">${g}</button>`).join("")}<button class="prem" data-g="Premium">⭐ Premium</button></div>
    <div class="brands">${brands.map(b=>`<div class="chip ${b===brand?'on':''}" data-b="${esc(b)}">${esc(b)}</div>`).join("")}</div>
  </div></div>
  <div class="wrap">
    <div id="feat"></div>
    <div class="section"><h2><span class="dot"></span><span id="listTitle">Todo el catálogo</span></h2><div class="sub" id="listCount"></div></div>
    <div class="grid" id="grid"></div>
    <div id="sentinel"></div>
    <button class="loadmore" id="more" hidden>Ver más modelos</button>
    <div class="empty" id="empty" hidden>No encontramos modelos con ese filtro 🤔<br>Prueba otra marca o búsqueda.<br><button class="reset" id="resetFilters" type="button">Quitar filtros</button></div>
  </div>
  <div class="trust"><div class="wrap"><div class="grid3">
    <div class="item"><div class="ic">🚚</div><div><h3>Envíos a todo el Perú</h3><p>${esc(CONFIG.trust.envios)}</p></div></div>
    <div class="item"><div class="ic">💳</div><div><h3>Métodos de pago</h3><p>${esc(CONFIG.trust.pagos)}</p></div></div>
    <div class="item"><div class="ic">🛡️</div><div><h3>Garantía</h3><p>${esc(CONFIG.trust.garantia)}</p></div></div>
  </div></div></div>
  <footer><div class="wrap">
    <a class="fb" href="${waLink()}" target="_blank" rel="noopener">💬 Escríbenos por WhatsApp</a>
    <div class="nums">${VENDEDOR.nombre ? "Asesor: " + esc(VENDEDOR.nombre) + " · " : ""}📱 ${WHATSAPPS.map(fmtTel).join(" · ")}</div>
    <div>${esc(CONFIG.storeName)} · Todas las marcas · Hecho con cariño 🇵🇪</div>
  </div></footer>
  <a class="fab" href="${waLink()}" target="_blank" rel="noopener" aria-label="WhatsApp">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.7-1.2-4.4-3.9-4.6-4.1-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.5.1.3.7 1.1 1.5 1.8 1 .9 1.8 1.1 2 1.2.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.8.9c.2.1.4.2.4.3.1.1.1.5-.1 1.1z"/></svg>
  </a>`;

  const $grid  = document.getElementById("grid");
  const $feat  = document.getElementById("feat");
  const $more  = document.getElementById("more");
  const $empty = document.getElementById("empty");
  const $count = document.getElementById("listCount");
  const $title = document.getElementById("listTitle");
  const $q     = document.getElementById("q");
  document.getElementById("resetFilters").onclick = ()=>{
    gender = "Todos"; brand = "Todas"; query = ""; $q.value = "";
    document.querySelectorAll("[data-g]").forEach(x=>x.classList.toggle("on", x.dataset.g===gender));
    document.querySelectorAll("[data-b]").forEach(x=>x.classList.toggle("on", x.dataset.b===brand));
    applyFilters();
  };

  /* La barra de filtros se pega justo debajo del header, sea cual sea su alto.
     Antes estaba fijo en 61px y se escondía detrás del header al hacer scroll. */
  const $header = document.querySelector("header");
  function syncHeader(){ r.setProperty('--headerH', $header.offsetHeight + "px"); }
  syncHeader();
  window.addEventListener("resize", syncHeader, {passive:true});
  if("ResizeObserver" in window) new ResizeObserver(syncHeader).observe($header);

  /* Carruseles: se pintan una sola vez y solo se ocultan/muestran */
  const news = PRODUCTS.filter(p=>p.section==="new");
  const best = PRODUCTS.filter(p=>p.section==="best");
  $feat.innerHTML =
    (news.length ? `<div class="section"><h2><span class="dot"></span>Novedades</h2><div class="sub">Lo último que llegó</div><div class="row">${news.map(cardHTML).join("")}</div></div>` : "") +
    (best.length ? `<div class="section"><h2><span class="dot"></span>Más vendidos</h2><div class="sub">Los favoritos de nuestros clientes</div><div class="row">${best.map(cardHTML).join("")}</div></div>` : "");

  function okGender(p){ return gender==="Todos" ? true : (gender==="Premium" ? isPremium(p) : p.gender===gender); }

  /* Oculta las marcas que no tienen modelos para el género elegido
     (p. ej. Mujer + Lacoste) para que el cliente no llegue a una lista vacía. */
  function syncBrands(){
    const chips = document.querySelectorAll("[data-b]");
    let brandOk = brand==="Todas";
    chips.forEach(ch=>{
      const b = ch.dataset.b; if(b==="Todas") return;
      const has = PRODUCTS.some(p=>p.brand===b && okGender(p));
      ch.hidden = !has;
      if(b===brand && has) brandOk = true;
    });
    if(!brandOk){ brand = "Todas"; chips.forEach(x=>x.classList.toggle("on", x.dataset.b===brand)); }
  }

  function applyFilters(){
    syncBrands();
    const qq = query.trim().toLowerCase();
    viewList = PRODUCTS.filter(p=>{
      const g = okGender(p);
      const b = brand==="Todas" || p.brand===brand;
      const q = !qq || (p.brand+" "+p.name).toLowerCase().includes(qq);
      return g && b && q;
    });
    const showSections = !qq && gender==="Todos" && brand==="Todas";
    $feat.hidden  = !showSections;
    $title.textContent = showSections ? "Todo el catálogo" : "Resultados";
    $count.textContent = `${viewList.length} modelo${viewList.length!==1?"s":""}`;
    $empty.hidden = viewList.length > 0;
    shown = 0;
    $grid.innerHTML = "";
    appendPage();
    requestAnimationFrame(()=>{ if(typeof maybeMore === "function") maybeMore(); });
  }

  /* Añade la siguiente tanda SIN tocar las tarjetas ya pintadas,
     así las fotos que ya cargaron no se vuelven a pedir. */
  function appendPage(){
    const slice = viewList.slice(shown, shown + PAGE_SIZE);
    if(slice.length) $grid.insertAdjacentHTML("beforeend", slice.map(cardHTML).join(""));
    shown += slice.length;
    $more.hidden = shown >= viewList.length;
  }

  /* Scroll infinito: sigue cargando mientras el final siga cerca de la pantalla */
  const $sentinel = document.getElementById("sentinel");
  function maybeMore(){
    if(shown >= viewList.length) return;
    if($sentinel.getBoundingClientRect().top < window.innerHeight + 600){
      appendPage();
      requestAnimationFrame(maybeMore);
    }
  }
  if("IntersectionObserver" in window){
    new IntersectionObserver(entries=>{ if(entries[0].isIntersecting) maybeMore(); },
      {rootMargin:"600px 0px"}).observe($sentinel);
  }
  window.addEventListener("scroll", ()=>{ if(!$more.hidden) maybeMore(); }, {passive:true});
  $more.onclick = ()=>{ appendPage(); maybeMore(); };

  /* Buscador con debounce: no repinta en cada tecla */
  let t;
  $q.addEventListener("input", e=>{
    query = e.target.value;
    clearTimeout(t);
    t = setTimeout(applyFilters, 200);
  });

  document.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{
    gender = b.dataset.g;
    document.querySelectorAll("[data-g]").forEach(x=>x.classList.toggle("on", x.dataset.g===gender));
    applyFilters();
  });
  document.querySelectorAll("[data-b]").forEach(b=>b.onclick=()=>{
    brand = b.dataset.b;
    document.querySelectorAll("[data-b]").forEach(x=>x.classList.toggle("on", x.dataset.b===brand));
    applyFilters();
  });

  /* Un solo listener para todas las tarjetas (antes eran 175 listeners) */
  document.getElementById("app").addEventListener("click", e=>{
    const card = e.target.closest(".card");
    if(card) openModal(card.dataset.id);
  });

  function openModal(id){
    let list = (viewList && viewList.length) ? viewList : PRODUCTS;
    let idx = list.findIndex(x=>String(x.id)===String(id));
    if(idx<0){ list = PRODUCTS; idx = list.findIndex(x=>String(x.id)===String(id)); }
    if(idx<0) return;
    let ci = 0;
    const m = document.createElement("div"); m.className = "modal open";
    function priceBlock(p){
      if(p.noPromo) return `<div class="priceblock"><div class="nopromo">${esc(p.price)}</div><div class="p" style="justify-content:center;color:var(--muted);font-size:12px">Precio fijo · no aplica promo</div></div>`;
      return `<div class="priceblock"><div class="p"><span>1 par</span><b>${esc(p.price)}</b></div><div class="p"><span>2 pares</span><b>${esc(CONFIG.promos[0].precio)}</b></div><div class="p"><span>3 pares</span><b>${esc(CONFIG.promos[1].precio)}</b></div></div>`;
    }
    function paint(){
      const p = list[idx];
      const multi = p.colors.length>1;
      const arrows = multi
        ? `<button class="navarrow left" data-nav="-1" aria-label="Color anterior">‹</button><button class="navarrow right" data-nav="1" aria-label="Color siguiente">›</button>` : "";
      const curVid = (p.colors[ci] && p.colors[ci].video) || (ci===0 ? p.video : "");
      const hsrc = imgFor(p,ci);
      const hcol = p.colors[ci] || {};
      const heroMedia = `<img src="${esc(cdn(hsrc,900))}" data-orig="${esc(hsrc)}" alt="${esc(p.name)}" decoding="async" fetchpriority="high" data-ph data-brand="${esc(p.brand)}" data-hex="${esc(hcol.hex||'#222')}">`;
      const vidBtn = curVid ? `<a class="vidbtn" href="${esc(curVid)}" target="_blank" rel="noopener"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Ver video de este color</a>` : "";
      m.innerHTML = `<div class="sheet">
        <div class="hero">${heroMedia}${arrows}<button class="close">×</button></div>
        <div class="body">
          <div class="brand">${esc(p.brand)}</div><div class="title">${esc(p.name)}</div>
          <div class="meta"><span class="pill">👤 ${esc(p.gender)}</span><span class="pill">📏 Tallas ${esc(p.sizes)}</span>${isPremium(p)?`<span class="pill" style="background:linear-gradient(135deg,#f5c542,#e79a2c);color:#2a1c00;font-weight:800">⭐ Premium</span>`:""}${curVid?`<span class="pill">▶ Video de este color</span>`:""}</div>
          <div class="label">Colores disponibles (${p.colors.length})</div>
          <div class="swatches">${p.colors.map((c,i)=>`<div class="swatch ${i===ci?'on':''}" data-i="${i}"><i style="background:${esc(c.hex)}"></i><span>${esc(c.name)}${c.video?' ▶':''}</span></div>`).join("")}</div>
          <div class="thumbs">${p.colors.map((c,i)=>{const s=imgFor(p,i);return `<img src="${esc(cdn(s,160))}" data-orig="${esc(s)}" class="${i===ci?'on':''}" data-i="${i}" loading="lazy" decoding="async" data-ph data-brand="${esc(p.brand)}" data-hex="${esc(c.hex||'#222')}">`}).join("")}</div>
          ${priceBlock(p)}
          ${vidBtn}
          <a class="cta" href="${waLink(p)}" target="_blank" rel="noopener"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 5-1.3A10 10 0 1 0 12 2z"/></svg> Pedir por WhatsApp</a>
        </div></div>`;
      m.querySelector(".close").onclick = close;
      m.querySelectorAll("[data-nav]").forEach(el=>el.onclick=(e)=>{ e.stopPropagation(); ci=(ci + (+el.dataset.nav) + p.colors.length)%p.colors.length; paint(); });
      m.querySelectorAll("[data-i]").forEach(el=>el.onclick=(e)=>{ e.stopPropagation(); ci=+el.dataset.i; paint(); });
    }
    function close(){ m.remove(); document.body.style.overflow=""; document.removeEventListener("keydown", onKey); }
    function onKey(e){ const p=list[idx]; if(e.key==="Escape") close(); else if(e.key==="ArrowRight" && p.colors.length>1){ ci=(ci+1)%p.colors.length; paint(); } else if(e.key==="ArrowLeft" && p.colors.length>1){ ci=(ci-1+p.colors.length)%p.colors.length; paint(); } }
    m.addEventListener("click", e=>{ if(e.target===m) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(m); document.body.style.overflow="hidden"; paint();
  }

  applyFilters();
}
