/* ENAREN WebGIS – Bölge gezgini: üzerine gelince ad, seçince yakınlaş;
 * Türkiye › dağıtım bölgesi › il › ilçe › mahalle; her seviyede tesisler ve akış. */
(() => {
'use strict';
const A = window.ENAREN_APP;
const { map, state, fmt } = A;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm = s => String(s).toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
const KAD = {hidro:'Hidro', gunes:'Güneş', ruzgar:'Rüzgâr', jeotermal:'Jeotermal', biyokutle:'Biyokütle', linyit:'Yerli kömür', ithal_komur:'İthal kömür', dogalgaz:'Doğal gaz', nukleer:'Nükleer', petrol:'Petrol'};
const KRENK = {hidro:'#1f78b4', gunes:'#f2a900', ruzgar:'#41b6c4', jeotermal:'#e7298a', biyokutle:'#33a02c', linyit:'#8c6d31', ithal_komur:'#444', dogalgaz:'#d95f02', nukleer:'#6a3d9a', petrol:'#1a1a1a'};

// ---------- panel ----------
const pane = document.createElement('div'); pane.className = 'pane'; pane.id = 'pane-bolge';
document.querySelector('.panes').appendChild(pane);
const tab = document.createElement('button'); tab.className = 'tab'; tab.dataset.tab = 'bolge'; tab.textContent = 'Bölge';
document.querySelector('.tabs').appendChild(tab);
tab.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === tab)); document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p === pane)); });
pane.innerHTML = `<p class="hint">Haritada bir dağıtım bölgesine dokunun ya da aşağıdan seçin. Bölgeden ile, ilden ilçeye ve mahalleye inebilirsiniz.</p><div id="drBody"></div>`;

// ---------- üzerine gelince ad ----------
const tip = document.createElement('div'); tip.className = 'maptip hidden'; document.body.appendChild(tip);
let hoverId = null;
function ready(fn){ const t = setInterval(() => { if (state.edas && map.getLayer('edas-fill') && map.getLayer('santral')){ clearInterval(t); fn(); } }, 300); }
ready(() => {
  map.on('mousemove', 'edas-fill', e => {
    if (state.mode) return;
    const f = e.features[0]; const p = f.properties;
    tip.innerHTML = `<b>${esc(p.edas)}</b><span>${esc(p.iller)}</span><small>Seçmek için tıklayın</small>`;
    tip.style.left = (e.originalEvent.clientX + 14) + 'px'; tip.style.top = (e.originalEvent.clientY + 14) + 'px'; tip.classList.remove('hidden');
    if (hoverId !== f.id){ if (hoverId != null) map.setFeatureState({source:'edas', id:hoverId}, {hover:false}); hoverId = f.id; map.setFeatureState({source:'edas', id:hoverId}, {hover:true}); }
  });
  map.on('mouseleave', 'edas-fill', () => { tip.classList.add('hidden'); if (hoverId != null) map.setFeatureState({source:'edas', id:hoverId}, {hover:false}); hoverId = null; });
  map.setPaintProperty('edas-line', 'line-width', ['case', ['boolean', ['feature-state', 'sel'], false], 3.5, ['boolean', ['feature-state', 'hover'], false], 2.5, 1]);
  map.on('click', 'edas-fill', e => {
    if (state.mode) return;
    const hit = map.queryRenderedFeatures(e.point, {layers: ['santral', 'stratejik', 'oim-plants', 'oim-subs', 'giris', 'koridor'].filter(l => map.getLayer(l) && map.getLayoutProperty(l, 'visibility') !== 'none')});
    if (hit.length) return; // tesis tıklaması öncelikli
    const id = e.features[0].id; const f = state.edas.features.find(x => x.id === id);
    if (state.drill?.edas?.id === id && state.drill.level !== 'edas') return;
    showEdas(f);
  });
  renderHome();
  // ---------- yer adları: bölge, il, ilçe merkezi, mahalle/köy ----------
  map.setLayoutProperty('edas-label', 'text-size', ['interpolate', ['linear'], ['zoom'], 4, 11, 7, 15]);
  map.setLayerZoomRange('edas-label', 4, 7.5);
  map.setPaintProperty('edas-label', 'text-halo-width', 2);
  const halo = {'text-halo-color':'#fff', 'text-halo-width':1.6};
  map.addLayer({id:'ad-il-line', type:'line', source:'il', minzoom:5.5, paint:{'line-color':'#0E3047', 'line-opacity':0.35, 'line-width':0.8, 'line-dasharray':[3, 2]}});
  map.addLayer({id:'ad-il', type:'symbol', source:'il', minzoom:5.8, maxzoom:10, layout:{'text-field':['upcase', ['get', 'il']], 'text-size':['interpolate', ['linear'], ['zoom'], 6, 10, 9, 14], 'text-letter-spacing':0.06, 'text-font':['Open Sans Semibold']}, paint:{'text-color':'#0E3047', ...halo}});
  const nm = ['coalesce', ['get', 'name:tr'], ['get', 'name'], ['get', 'name:latin']];
  const addPlaces = () => {
    if (!map.getSource('ofm')) return setTimeout(addPlaces, 400);
    map.addLayer({id:'ad-ilce', type:'symbol', source:'ofm', 'source-layer':'place', minzoom:7.5, filter:['in', ['get', 'class'], ['literal', ['city', 'town']]], layout:{'text-field':nm, 'text-size':['interpolate', ['linear'], ['zoom'], 8, 11, 12, 14], 'text-font':['Open Sans Semibold']}, paint:{'text-color':'#18242E', ...halo}});
    map.addLayer({id:'ad-mah', type:'symbol', source:'ofm', 'source-layer':'place', minzoom:11, filter:['in', ['get', 'class'], ['literal', ['village', 'suburb', 'quarter', 'neighbourhood', 'hamlet']]], layout:{'text-field':nm, 'text-size':11.5, 'text-font':['Open Sans Regular']}, paint:{'text-color':'#3d4f5c', ...halo}});
    Object.assign(A.LAYER_MAP, {lyrAdlar:['ad-il-line', 'ad-il', 'ad-ilce', 'ad-mah']});
    $('#lyrAdlar').addEventListener('change', A.syncLayerChecks);
  };
  addPlaces();
});

// ---------- yardımcılar ----------
function inGeom(pt, g){ return !!A.whichFeature({features:[{geometry:g}]}, pt); }
function facilities(g){
  const s = (state.santral?.features || []).filter(f => inGeom(f.geometry.coordinates, g));
  const p = (state.stratejik?.features || []).filter(f => inGeom(f.geometry.coordinates, g));
  return {s, p};
}
function facHtml(g){
  const {s, p} = facilities(g);
  const by = {}; s.forEach(f => { const k = f.properties.kaynak; (by[k] ||= {n:0, mw:0}); by[k].n++; by[k].mw += f.properties.mw; });
  const tot = Object.values(by).reduce((a, b) => a + b.mw, 0);
  const bars = Object.entries(by).sort((a, b) => b[1].mw - a[1].mw).map(([k, v]) => `<div class="bar ev"><span>${window.ICON(k, 14, KRENK[k] || '#555', 2)} ${KAD[k] || k}</span><div class="t"><i style="width:${(v.mw / (tot || 1) * 100).toFixed(0)}%;background:${KRENK[k] || '#555'}"></i></div><span class="v">${fmt(v.mw)} MW · ${v.n}</span></div>`).join('');
  const list = [...s].sort((a, b) => b.properties.mw - a.properties.mw).slice(0, 8).map(f => `<li data-c="${f.geometry.coordinates.join(',')}">${window.ICON(f.properties.kaynak, 14, KRENK[f.properties.kaynak] || '#555', 2)} ${esc(f.properties.ad)} <b>${fmt(f.properties.mw)} MW</b></li>`).join('');
  const plist = p.map(f => `<li data-c="${f.geometry.coordinates.join(',')}">${window.ICON(f.properties.kaynak, 14, '#0E3047', 2)} ${esc(f.properties.ad)}</li>`).join('');
  return `<h3>Tesisler</h3>${tot ? `<p class="hint">Büyük santraller (WRI veritabanı): toplam <b>${fmt(tot)} MW</b>.</p>${bars}<ul class="flist">${list}</ul>` : '<p class="hint">Bu alanda veritabanında büyük santral yok.</p>'}
    ${plist ? `<h3>Stratejik projeler ve kaynaklar</h3><ul class="flist">${plist}</ul>` : ''}`;
}
function crumbs(){
  const d = state.drill || {}; const c = [`<a data-l="tr">Türkiye</a>`];
  if (d.edas) c.push(`<a data-l="edas">${esc(d.edas.properties.edas)}</a>`);
  if (d.il) c.push(`<a data-l="il">${esc(d.il.properties.il)}</a>`);
  if (d.ilce) c.push(`<a data-l="ilce">${esc(d.ilce.ad)}</a>`);
  if (d.mah) c.push(`<span>${esc(d.mah.ad)}</span>`);
  return `<div class="crumbs">${c.join('<i>›</i>')}</div>`;
}
function open(html){ $('#drBody').innerHTML = crumbs() + html; A.goTab('bolge'); A.openSheet(); }
function highlight(geom, color = '#E8B21C'){
  if (!map.getSource('drsel')){ map.addSource('drsel', {type:'geojson', data:{type:'FeatureCollection', features:[]}}); map.addLayer({id:'drsel', type:'line', source:'drsel', paint:{'line-color':color,'line-width':3.5}}); }
  map.getSource('drsel').setData(geom ? {type:'Feature', geometry:geom, properties:{}} : {type:'FeatureCollection', features:[]});
}
function dimOthers(id){ map.setPaintProperty('edas-fill', 'fill-opacity', id == null ? ['case', ['boolean', ['feature-state', 'sel'], false], 0.75, 0.5] : ['case', ['==', ['id'], id], 0.15, 0.55]); }

// ---------- seviyeler ----------
function renderHome(){
  const rows = [...state.edas.features].sort((a, b) => a.properties.edas.localeCompare(b.properties.edas, 'tr'));
  $('#drBody').innerHTML = `<div class="chips">${rows.map(f => `<button class="chip" data-id="${f.id}">${esc(f.properties.edas.replace(' EDAŞ', ''))}</button>`).join('')}</div>`;
}
function showEdas(f){
  state.drill = {level:'edas', edas:f}; A.selectEdas(f.id); dimOthers(f.id); highlight(null);
  map.fitBounds(A.bbox(f.geometry), {padding: 40, duration: 900});
  const p = f.properties;
  // akış: bu bölgeye giren/çıkan
  const fd = window.ENAREN_VIZ?.computeFlows ? window.ENAREN_VIZ.computeFlows('tumu') : null;
  const R = fd?.R.find(r => r.p.edas === p.edas);
  const fl = fd ? fd.flows.filter(x => x.from.p.edas === p.edas || x.to.p.edas === p.edas) : [];
  const flowHtml = R ? `<h3>Enerji akışı (simülasyon, 2025)</h3>
    <div class="kpi"><div><strong>${fmt(R.genT, 1)} TWh</strong><span>bölgede üretim</span></div><div><strong>${fmt(R.cons, 1)} TWh</strong><span>bölgede tüketim</span></div>
    <div><strong style="color:${R.net > 0 ? '#1f8a4c' : '#c0392b'}">${R.net > 0 ? '+' : ''}${fmt(R.net, 1)} TWh</strong><span>${R.net > 0 ? 'fazla (dışarı akar)' : 'açık (dışarıdan gelir)'}</span></div>
    <div><strong>${fmt(Object.entries(R.gen).filter(([k]) => ['hidro','gunes','ruzgar','jeotermal','biyokutle','linyit'].includes(k)).reduce((s, [, v]) => s + v, 0) / (R.genT || 1) * 100)}%</strong><span>üretimde yerli payı</span></div></div>
    <ul class="flist">${fl.map(x => `<li>${x.from.p.edas === p.edas ? '→' : '←'} ${esc((x.from.p.edas === p.edas ? x.to : x.from).p.edas)} <b>${fmt(x.twh, 1)} TWh</b></li>`).join('') || '<li>Bölgeler arası belirgin aktarım yok</li>'}</ul>` : '';
  const iller = state.il.features.filter(x => x.properties.edas === p.edas).sort((a, b) => b.properties.tasit - a.properties.tasit);
  open(`<h3 style="margin-top:6px">${esc(p.edas)}</h3>
    <div class="kpi"><div><strong>${fmt(p.toplam_twh, 2)} TWh</strong><span>faturalanan tüketim</span></div><div><strong>${fmt(p.tuketici / 1e6, 2)} mn</strong><span>tüketici</span></div>
    <div><strong>%${fmt(p.kayip, 1)}</strong><span>kayıp oranı</span></div><div><strong>${fmt(p.ghi)}</strong><span>ışınım kWh/m²·yıl</span></div></div>
    ${flowHtml}${facHtml(f.geometry)}
    <h3>İller</h3><div class="chips">${iller.map(i => `<button class="chip" data-il="${esc(i.properties.il)}">${esc(i.properties.il)}</button>`).join('')}</div>
    <div class="btnrow"><button class="btn" id="drRapor">Bölge fırsat raporu</button><button class="btn ghost" id="drExit" style="margin-top:0">Türkiye görünümüne dön</button></div>`);
}
async function showIl(name){
  const f = state.il.features.find(x => x.properties.il === name); if (!f) return;
  const ed = state.edas.features.find(x => x.properties.edas === f.properties.edas);
  state.drill = {level:'il', edas:ed, il:f}; highlight(f.geometry);
  map.fitBounds(A.bbox(f.geometry), {padding: 30, duration: 900});
  const p = f.properties;
  open(`<h3 style="margin-top:6px">${esc(p.il)}</h3>
    <div class="kpi"><div><strong>${fmt(p.tasit)}</strong><span>taşıt (Eyl. 2026)</span></div><div><strong>${fmt(p.otomobil)}</strong><span>otomobil</span></div>
    <div><strong>${fmt(p.ghi_yil)}</strong><span>ışınım kWh/m²·yıl</span></div><div><strong>${esc(p.edas.replace(' EDAŞ', ''))}</strong><span>dağıtım bölgesi</span></div></div>
    ${facHtml(f.geometry)}<h3>İlçeler</h3><div id="drIlce" class="chips"><span class="hint">Yükleniyor…</span></div>`);
  const iller = await fetch('data/tkgm/iller.json?v=6').then(r => r.json());
  const tk = iller.find(([, ad]) => norm(ad) === norm(p.il)) || iller.find(([, ad]) => norm(ad).startsWith(norm(p.il).slice(0, 5)));
  if (!tk){ $('#drIlce').innerHTML = '<span class="hint">İlçe listesi bulunamadı.</span>'; return; }
  const ilce = await fetch(`data/tkgm/${tk[0]}.json?v=6`).then(r => r.json());
  state.drill.ilceData = ilce; state.drill.ilId = tk[0];
  $('#drIlce').innerHTML = ilce.map(([id, ad]) => `<button class="chip" data-ilce="${id}">${esc(ad)}</button>`).join('');
}
async function geocode(q){
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=tr&polygon_geojson=1`).then(r => r.json()).catch(() => []);
  const g = r[0]; if (!g) return null;
  let geom = g.geojson && /Polygon/.test(g.geojson.type) ? g.geojson : null;
  if (!geom){ const lat = +g.lat, lng = +g.lon, d = 0.006; geom = {type:'Polygon', coordinates:[[[lng - d, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng - d, lat + d], [lng - d, lat - d]]]}; }
  return geom;
}
async function showIlce(id){
  const d = state.drill; const row = d.ilceData.find(x => String(x[0]) === String(id)); if (!row) return;
  open(`<p class="hint">Sınır alınıyor…</p>`);
  const geom = await geocode(`${row[1]}, ${d.il.properties.il}, Türkiye`);
  state.drill = {...d, level:'ilce', ilce:{id, ad: row[1], geom}, mah:null};
  if (geom){ highlight(geom); map.fitBounds(A.bbox(geom), {padding: 30, duration: 900, maxZoom: 13}); }
  open(`<h3 style="margin-top:6px">${esc(row[1])} (${esc(d.il.properties.il)})</h3>
    ${geom ? facHtml(geom) : ''}
    <h3>Mahalleler (${row[2].length})</h3><input type="text" id="drMahAra" placeholder="Mahalle ara…" style="margin-bottom:8px">
    <div id="drMah" class="chips">${row[2].map(([k, ad]) => `<button class="chip" data-mah="${k}">${esc(ad)}</button>`).join('')}</div>`);
  $('#drMahAra').addEventListener('input', e => { const q = norm(e.target.value); document.querySelectorAll('#drMah .chip').forEach(c => c.style.display = norm(c.textContent).includes(q) ? '' : 'none'); });
}
async function showMah(kod){
  const d = state.drill; const row = d.ilceData.find(x => String(x[0]) === String(d.ilce.id)); const m = row[2].find(x => String(x[0]) === String(kod)); if (!m) return;
  open(`<p class="hint">Mahalle sınırı alınıyor…</p>`);
  const geom = await geocode(`${m[1]}, ${d.ilce.ad}, ${d.il.properties.il}, Türkiye`);
  state.drill = {...d, level:'mah', mah:{kod, ad:m[1], geom}};
  if (geom){ highlight(geom); map.fitBounds(A.bbox(geom), {padding: 30, duration: 900, maxZoom: 16}); }
  open(`<h3 style="margin-top:6px">${esc(m[1])}</h3><p class="hint">${esc(d.ilce.ad)} · ${esc(d.il.properties.il)} · ${esc(d.edas?.properties.edas || '')}</p>
    <div class="btnrow"><button class="btn primary" id="drCati">Bu mahallenin çatı GES önerisi</button><button class="btn" id="drParsel">Ada / parsel sorgula</button></div>
    ${geom ? facHtml(geom) : ''}`);
}

// ---------- olaylar ----------
pane.addEventListener('click', e => {
  const t = e.target.closest('button, a, li'); if (!t) return;
  if (t.dataset.id) return showEdas(state.edas.features.find(x => String(x.id) === t.dataset.id));
  if (t.dataset.il) return showIl(t.dataset.il);
  if (t.dataset.ilce) return showIlce(t.dataset.ilce);
  if (t.dataset.mah) return showMah(t.dataset.mah);
  if (t.dataset.c){ const [x, y] = t.dataset.c.split(',').map(Number); map.flyTo({center:[x, y], zoom: Math.max(map.getZoom(), 10)}); return; }
  if (t.dataset.l){ const d = state.drill || {}; if (t.dataset.l === 'tr') return exit(); if (t.dataset.l === 'edas') return showEdas(d.edas); if (t.dataset.l === 'il') return showIl(d.il.properties.il); if (t.dataset.l === 'ilce') return showIlce(d.ilce.id); }
  if (t.id === 'drExit') return exit();
  if (t.id === 'drRapor') return window.ENAREN_REP?.bolgeReport(state.drill.edas.properties.edas);
  if (t.id === 'drCati'){ const m = state.drill.mah; if (m?.geom) window.ENAREN_CATI?.calcFor(`${m.ad} (${state.drill.ilce.ad})`, m.geom); return; }
  if (t.id === 'drParsel'){ A.goTab('parsel'); A.openSheet(); return; }
});
function exit(){ state.drill = null; A.selectEdas(null); dimOthers(null); highlight(null); map.flyTo({center:[35.2, 39], zoom:5}); open(''); renderHome(); }
window.ENAREN_DRILL = { showEdas, showIl, exit };
})();
/* ENAREN yazısı: ana sayfaya dön (Türkiye görünümü + Genel Bakış) */
(() => {
  const b = document.querySelector('.brand'); if (!b) return;
  b.style.cursor = 'pointer'; b.setAttribute('role', 'link'); b.setAttribute('tabindex', '0'); b.title = 'Ana sayfaya dön';
  const home = () => {
    const A = window.ENAREN_APP; const D = window.ENAREN_DRILL;
    if (D && A.state.drill) D.exit(); else A.map.flyTo({center:[35.2, 39], zoom:5, bearing:0, pitch:0});
    A.goTab('vizyon'); A.openSheet();
  };
  b.addEventListener('click', home);
  b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); home(); } });
})();
