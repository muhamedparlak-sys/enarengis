/* ENAREN WebGIS – Deniz enerjisi (Mavi Vatan), ortofoto/bina çatı potansiyeli demosu,
 * kurumsal WMS ekleme, parsel kısayolu ve idari birime yakınlaşma. */
(() => {
'use strict';
const settle = (fn, ms = 2500) => { let d = false; const go = () => { if (!d){ d = true; fn(); } }; window.enarenMap.once('idle', go); setTimeout(go, ms); };
const A = window.ENAREN_APP, M = window.ENAREN_MOD;
const { map, state, addReport, fmt } = A;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EMOD_WMS = 'https://ows.emodnet-bathymetry.eu/wms';
const MR_WFS = 'https://geo.vliz.be/geoserver/MarineRegions/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=MarineRegions:eez&outputFormat=application/json&CQL_FILTER=' + encodeURIComponent("sovereign1='Turkey'");

// ---------- Katmanlar ----------
function waitStyle(){ return new Promise(res => { const t0 = Date.now(); const chk = () => { if (map.isStyleLoaded() || Date.now() - t0 > 10000) res(); else setTimeout(chk, 150); }; chk(); }); }
function whenReady(fn){ const t = setInterval(() => { if (state.edas && map.getSource('parsel')){ clearInterval(t); fn(); } }, 300); }
whenReady(async () => {
  await waitStyle();
  const before = 'edas-fill';
  map.addSource('bathy', {type:'raster', tiles:[`${EMOD_WMS}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=emodnet:mean_atlas_land&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true`], tileSize:256, attribution:'Batimetri © EMODnet Bathymetry Consortium'});
  map.addLayer({id:'bathy', type:'raster', source:'bathy', paint:{'raster-opacity':0.75}, layout:{visibility:'none'}}, before);
  map.addSource('meb', {type:'geojson', data:{type:'FeatureCollection', features:[]}, attribution:'MEB © Flanders Marine Institute, Marine Regions'});
  map.addLayer({id:'meb-fill', type:'fill', source:'meb', paint:{'fill-color':'#1f78b4','fill-opacity':0.07}, layout:{visibility:'visible'}}, before);
  map.addLayer({id:'meb-line', type:'line', source:'meb', paint:{'line-color':'#1f5f8b','line-width':['interpolate',['linear'],['zoom'],4,1.2,8,2],'line-dasharray':[3,2]}, layout:{visibility:'visible'}});
  const dy = await fetch('data/deniz_yetki.geojson?v=8').then(r => r.json());
  await waitStyle();
  map.addSource('dyetki', {type:'geojson', data:dy});
  map.addLayer({id:'dyetki', type:'line', source:'dyetki', filter:['!=',['get','nitelik'],'sematik'], layout:{visibility:'visible','line-cap':'round'}, paint:{'line-color':'#c0392b','line-width':['interpolate',['linear'],['zoom'],4,2.2,8,3.5]}});
  map.addLayer({id:'dyetki-sem', type:'line', source:'dyetki', filter:['==',['get','nitelik'],'sematik'], layout:{visibility:'visible'}, paint:{'line-color':'#c0392b','line-width':2.5,'line-dasharray':[1,2]}});
  map.addLayer({id:'dyetki-lbl', type:'symbol', source:'dyetki', minzoom:5.5, layout:{visibility:'visible','symbol-placement':'line','text-field':['get','ad'],'text-size':11,'text-font':['Open Sans Semibold']}, paint:{'text-color':'#c0392b','text-halo-color':'#fff','text-halo-width':1.5}});
  // OpenFreeMap bina izleri (ortofoto demosu)
  map.addSource('ofm', {type:'vector', url:'https://tiles.openfreemap.org/planet', attribution:'Bina izleri © OpenStreetMap katkıcıları, OpenFreeMap'});
  await waitStyle();
  map.addLayer({id:'bina', type:'fill', source:'ofm', 'source-layer':'building', minzoom:14, layout:{visibility:'none'}, paint:{'fill-color':'#f2a900','fill-opacity':0.35,'fill-outline-color':'#c0392b'}});
  ['lyrBathy','lyrDyetki','lyrBina'].forEach(id => A.LAYER_MAP[id] && $('#' + id).addEventListener('change', A.syncLayerChecks));
  A.syncLayerChecks();
});
Object.assign(A.LAYER_MAP, {lyrBathy:['bathy'], lyrDyetki:['dyetki','dyetki-sem','dyetki-lbl'], lyrBina:['bina']});
// Karadeniz: Türkiye'nin taraf olduğu antlaşmalarla belirlenmiş deniz sınırları (koordinatlar Marine Regions derlemesinden)
(async () => {
  for (let i = 0; i < 100 && !map.getSource('meb'); i++) await new Promise(r => setTimeout(r, 200));
  const sin = await fetch('data/meb_sinir.geojson?v=2').then(r => r.json());
  map.addSource('mebsin', {type:'geojson', data:sin});
  map.addLayer({id:'mebsin', type:'line', source:'mebsin', layout:{'line-cap':'round'}, paint:{'line-color':['match', ['get', 'tip'], 'antlasma', '#c0392b', '#c0392b'], 'line-width':['interpolate', ['linear'], ['zoom'], 4, 2, 8, 3.2], 'line-dasharray':['literal', [1, 0]]}, filter:['==', ['get', 'tip'], 'antlasma']});
  map.addLayer({id:'mebsin-acik', type:'line', source:'mebsin', paint:{'line-color':'#c0392b', 'line-width':['interpolate', ['linear'], ['zoom'], 4, 1.8, 8, 2.8], 'line-dasharray':[2, 1.5]}, filter:['!=', ['get', 'tip'], 'antlasma']});
  map.addLayer({id:'mebsin-lbl', type:'symbol', source:'mebsin', minzoom:5.5, layout:{'symbol-placement':'line', 'text-field':['concat', ['get', 'ad'], ' · ', ['get', 'tipad']], 'text-size':11, 'text-font':['Open Sans Semibold']}, paint:{'text-color':'#c0392b', 'text-halo-color':'#fff', 'text-halo-width':1.6}});
  A.LAYER_MAP.lyrDyetki = [...new Set([...(A.LAYER_MAP.lyrDyetki || []), 'mebsin', 'mebsin-acik', 'mebsin-lbl'])];
  ['mebsin', 'mebsin-acik'].forEach(l => map.on('click', l, e => { const q = e.features[0].properties; new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<b>${q.ad}</b><br>${q.tipad}<br><small>${q.kaynak || 'Marine Regions, Flanders Marine Institute'}</small>`).addTo(map); }));
})();

// ---------- Deniz noktası analizi ----------
const STRAITS = [
  {ad:'İstanbul Boğazı', bb:[28.95, 40.98, 29.15, 41.25], akinti:'yüzey akıntısı tipik 1–3 m/s (kuzeyden güneye), dip akıntısı ters yönde'},
  {ad:'Çanakkale Boğazı', bb:[26.15, 40.0, 26.75, 40.45], akinti:'yüzey akıntısı tipik 1–2,5 m/s (Marmara → Ege)'}
];
function coastKm(lng, lat){
  let best = Infinity;
  state.il.features.forEach(f => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    polys.forEach(p => p[0].forEach(([x, y], i) => { if (i % 2) return; const d = Math.hypot((x - lng) * Math.cos(lat * Math.PI / 180) * 111.32, (y - lat) * 110.57); if (d < best) best = d; }));
  });
  return best;
}
async function denizAnaliz(lng, lat){
  $('#denizResult').className = 'result'; $('#denizResult').innerHTML = 'Derinlik, rüzgâr ve güneş verisi alınıyor…';
  const [dep, site] = await Promise.all([
    fetch(`https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${lng.toFixed(5)}%20${lat.toFixed(5)})`).then(r => r.ok ? r.json() : null).catch(() => null),
    M.addCmp(lng, lat, `Deniz ${lat.toFixed(3)}, ${lng.toFixed(3)}`)
  ]);
  const depth = dep?.avg != null ? Math.abs(dep.avg) : null;
  const kara = A.whichFeature(state.il, [lng, lat]);
  const kiyi = kara ? 0 : coastKm(lng, lat);
  const strait = STRAITS.find(s => lng >= s.bb[0] && lng <= s.bb[2] && lat >= s.bb[1] && lat <= s.bb[3]);
  const ws = site.ws100, rec = [];
  if (kara) rec.push(['ℹ', 'Nokta karada', 'Kara için Analiz → çatı/arazi GES ve parsel araçlarını kullanın.']);
  else {
    if (depth != null && depth <= 50 && ws >= 6) rec.push(['', 'Sabit tabanlı açık deniz RES (monopile / jacket)', `Derinlik ~${fmt(depth)} m (≤ 50 m) ve 100 m rüzgâr ~${fmt(ws, 1)} m/s. Kıyıya ${fmt(kiyi, 1)} km — kablo maliyeti ${kiyi < 30 ? 'düşük' : 'yüksek'}.`]);
    else if (depth != null && depth > 50 && depth <= 1000 && ws >= 6.5) rec.push(['', 'Yüzer açık deniz RES', `Derinlik ~${fmt(depth)} m (50–1000 m bandı) — sabit temel ekonomik değil, yüzer platform (spar / yarı-dalgıç) gerekir.`]);
    else if (ws != null && ws < 6) rec.push(['', 'Rüzgâr zayıf (kaba veri)', `100 m'de ~${fmt(ws, 1)} m/s; açık deniz RES için tipik eşik ≥ 7 m/s. Ölçüm (LiDAR şamandıra) önerilir.`]);
    if (depth != null && depth > 1000) rec.push(['', 'Çok derin', `~${fmt(depth)} m: mevcut teknolojiyle RES maliyeti çok yüksek.`]);
    if (kiyi < 5 && depth != null && depth < 60) rec.push(['', 'Yüzer GES (korunaklı kıyı / koy)', `Kıyıya ${fmt(kiyi, 1)} km, sığ. Dalga yükü düşük koylarda, balık çiftlikleri ve liman alanlarıyla hibrit yüzer GES düşünülebilir. PV verimi ~${site.pvout ? fmt(site.pvout) : '–'} kWh/kWp (+%5–10 su soğutma etkisi).`]);
    if (strait) rec.push(['', `Akıntı türbini adayı – ${strait.ad}`, `${strait.akinti}. Deniz trafiği ve askerî/seyir kısıtları nedeniyle yalnızca kıyı kenarı pilotları gerçekçi.`]);
    if (!strait) rec.push(['', 'Akıntı enerjisi', 'Türkiye denizlerinde gelgit küçük; ekonomik akıntı potansiyeli büyük ölçüde boğazlarla sınırlı. Dalga enerjisi Karadeniz ve Ege açıklarında düşük–orta.']);
    if (ws >= 6 && site.pvout) rec.push(['', 'Hibrit RES + yüzer GES', 'Aynı sahada RES aralarına yüzer GES: kablo/trafo altyapısı ortak kullanılır, üretim profili dengelenir.']);
  }
  const html = `<table class="t">
    <tr><td>Konum</td><td>${lat.toFixed(4)}, ${lng.toFixed(4)}${kara ? ' (kara: ' + esc(kara.properties.il) + ')' : ''}</td></tr>
    <tr><td>Derinlik (EMODnet)</td><td>${depth != null ? fmt(depth) + ' m' : 'kapsam dışı'}</td></tr>
    <tr><td>Kıyıya uzaklık</td><td>${kara ? '0' : fmt(kiyi, 1)} km</td></tr>
    <tr><td>Rüzgâr 100 m · güç yoğunluğu</td><td>${ws != null ? fmt(ws, 1) + ' m/s · ' + fmt(site.wpd) + ' W/m²' : '–'}</td></tr>
    <tr><td>GHI · PV verimi</td><td>${site.ghi ? fmt(site.ghi) : '–'} · ${site.pvout ? fmt(site.pvout) : '–'}</td></tr>
    <tr><td>En yakın trafo (OSM, görünür)</td><td>${site.trafo ? esc(site.trafo.ad) + ' · ' + fmt(site.trafo.km, 1) + ' km' : '–'}</td></tr></table>
    <h6 style="margin:10px 0 4px">Uygun teknoloji ön değerlendirmesi</h6>
    ${rec.map(([i, t, d]) => `<div class="duty"><b>${i} ${t}</b><span>${d}</span></div>`).join('')}
    <small class="muted">Ön tarama; ÇED, seyir güvenliği, askerî alan, kablo güzergâhı ve deniz yetki alanı durumu ayrıca değerlendirilmelidir.</small>`;
  $('#denizResult').innerHTML = html;
  state.lastDenizData = {lng, lat, depth, kiyi, site, rec, strait, kara: !!kara};
  state.lastDeniz = {html, baslik:`Deniz enerjisi ön değerlendirmesi – ${lat.toFixed(3)}, ${lng.toFixed(3)}`};
  $('#btnDenizReport').classList.remove('hidden');
}
window.ENAREN_DENIZ = { denizAnaliz };
$('#btnDenizPick').onclick = () => {
  if (state.mode === 'deniz'){ setMode(null); return; }
  ['lyrWind','lyrBathy'].forEach(id => { $('#' + id).checked = true; });
  $('#lyrEdas').checked = false; A.syncLayerChecks();
  if (map.getZoom() > 6.5) map.flyTo({zoom:5.5});
  setMode('deniz', 'Denizde bir noktaya dokunun'); A.minimizeSheet();
};
$('#btnDenizReport').onclick = () => state.lastDeniz && addReport({tip:'deniz', baslik:state.lastDeniz.baslik, html:state.lastDeniz.html});
function setMode(m, text){
  state.mode = m; $('#modeBanner').textContent = text || ''; $('#modeBanner').classList.toggle('hidden', !m);
  $('#btnDenizPick').classList.toggle('on', m === 'deniz');
}
map.on('click', e => {
  if (state.mode !== 'deniz') return;
  setMode(null); A.openSheet(); A.goTab('deniz');
  denizAnaliz(e.lngLat.lng, e.lngLat.lat);
});

// ---------- Ortofoto / bina çatı potansiyeli demosu ----------
$('#btnBinaDemo').onclick = () => {
  $('#lyrBina').checked = true; A.syncLayerChecks(); A.setBasemap('uydu');
  map.jumpTo({center:[32.8541, 39.9208], zoom:16.2});
  A.minimizeSheet();
  settle(() => setTimeout(binaHesap, 400));
};
function binaHesap(){
  // Karo geometrileri görünür alanın dışına taşar: yalnızca merkezi ekranda olan bina parçalarını say
  const fs = map.queryRenderedFeatures({layers:['bina']});
  const b = map.getBounds(), seen = new Set(); let n = 0, area = 0;
  fs.forEach(f => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
    polys.forEach(p => {
      const ring = p[0].slice(0, -1); if (ring.length < 3) return;
      const cx = ring.reduce((s, q) => s + q[0], 0) / ring.length, cy = ring.reduce((s, q) => s + q[1], 0) / ring.length;
      if (!b.contains([cx, cy])) return;
      const k = cx.toFixed(6) + ',' + cy.toFixed(6); if (seen.has(k)) return; seen.add(k);
      area += A.ringArea(ring); n++;
    });
  });
  const c = map.getCenter();
  const use = 0.45, kwpm2 = 0.2; // düz/eğimli karma çatı, engeller ve aralık payı
  const kwp = area * use * kwpm2;
  M.addCmp(c.lng, c.lat, 'Bina demo alanı').then(d => {
    const y = d.pvout || 1500, mwh = kwp * y / 1000;
    const ed = A.whichFeature(state.edas, [c.lng, c.lat]);
    const evs = mwh * 1000 / 2244;
    const html = `<div class="kpi">
      <div><strong>${fmt(n)}</strong><span>bina (görünür alan)</span></div><div><strong>${fmt(area / 1000, 1)} bin m²</strong><span>çatı izi alanı</span></div>
      <div><strong>${fmt(kwp / 1000, 2)} MWp</strong><span>çatı GES potansiyeli*</span></div><div><strong>${fmt(mwh)} MWh</strong><span>yıllık üretim</span></div>
      <div><strong>${fmt(evs)}</strong><span>EV'nin yıllık şarjı</span></div><div><strong>${fmt(y)}</strong><span>PV verimi kWh/kWp (GSA)</span></div></div>
      <small class="muted">*Çatı izinin %45'i kullanılabilir, 0,2 kWp/m² varsayımı. Bina izleri OSM'den; ortofoto ile eksik binalar tamamlanmalı. ${ed ? 'Bölge: ' + esc(ed.properties.edas) + '.' : ''} Gerçek uygulamada TUCBS/HGM İHA ortofotosu + yapay zekâ ile çatı tipi, panel ve kolektör tespiti yapılır.</small>`;
    $('#binaResult').className = 'result'; $('#binaResult').innerHTML = html; A.openSheet(); A.goTab('analiz');
    $$('#pane-analiz details').forEach(dd => { dd.open = !!dd.querySelector('#binaResult'); });
    state.lastBina = {html, baslik:`Görünür alan çatı GES potansiyeli (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)})`};
    $('#btnBinaReport').classList.remove('hidden');
  });
}
$('#btnBinaCalc').onclick = () => { if (map.getZoom() < 14){ A.toast('Önce yakınlaşın (zoom ≥ 14)'); return; } $('#lyrBina').checked = true; A.syncLayerChecks(); settle(() => setTimeout(binaHesap, 300)); };
$('#btnBinaReport').onclick = () => state.lastBina && addReport({tip:'bina', baslik:state.lastBina.baslik, html:state.lastBina.html});

// ---------- Kurumsal / harici WMS ekleme ----------
let wmsN = 0;
$('#btnWmsAdd').onclick = () => {
  const url = $('#wmsUrl').value.trim(), layer = $('#wmsLayer').value.trim();
  if (!/^https:\/\//.test(url) || !layer){ A.toast('https:// ile başlayan servis adresi ve katman adı gerekli'); return; }
  const id = 'ext-wms-' + (++wmsN);
  map.addSource(id, {type:'raster', tileSize:256, tiles:[`${url}${url.includes('?') ? '&' : '?'}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${encodeURIComponent(layer)}&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true`]});
  map.addLayer({id, type:'raster', source:id, paint:{'raster-opacity':0.8}}, 'edas-fill');
  const row = document.createElement('label'); row.className = 'row';
  row.innerHTML = `<input type="checkbox" checked> ${esc(layer)} <i class="status">harici</i>`;
  row.querySelector('input').onchange = ev => A.setVis(id, ev.target.checked);
  $('#extLayers').appendChild(row); A.toast('Katman eklendi');
};

// ---------- Parsel kısayolu + idari birime yakınlaşma ----------
$('#btnParselTop').onclick = () => { A.openSheet(); A.goTab('parsel'); };
const geoCache = {};
async function geocode(q){
  if (geoCache[q]) return geoCache[q];
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=tr&polygon_geojson=1`).then(r => r.json()).catch(() => []);
  return (geoCache[q] = r[0] || null);
}
function showBoundary(gj){
  if (!map.getSource('idari')){
    map.addSource('idari', {type:'geojson', data:{type:'FeatureCollection', features:[]}});
    map.addLayer({id:'idari-line', type:'line', source:'idari', paint:{'line-color':'#0f3d5e','line-width':2.5,'line-dasharray':[2,1]}});
  }
  map.getSource('idari').setData(gj ? {type:'Feature', geometry:gj, properties:{}} : {type:'FeatureCollection', features:[]});
}
async function zoomTo(q, fallbackZoom){
  const g = await geocode(q); if (!g) return;
  const [s, n, w, e] = g.boundingbox.map(Number);
  if (g.geojson && /Polygon/.test(g.geojson.type)) showBoundary(g.geojson); else showBoundary(null);
  if (n - s > 0.0005) map.fitBounds([[w, s], [e, n]], {padding: 40, maxZoom: 16});
  else map.flyTo({center:[+g.lon, +g.lat], zoom: fallbackZoom});
}
const txt = sel => sel.selectedOptions[0]?.textContent || '';
$('#pIl').addEventListener('change', () => {
  const ad = txt($('#pIl')); if (!$('#pIl').value) return;
  const f = state.il.features.find(x => x.properties.il === ad);
  if (f){ map.fitBounds(A.bbox(f.geometry), {padding: 30}); showBoundary(f.geometry); } else zoomTo(`${ad}, Türkiye`, 8);
});
$('#pIlce').addEventListener('change', () => { if ($('#pIlce').value) zoomTo(`${txt($('#pIlce'))}, ${txt($('#pIl'))}, Türkiye`, 11); });
$('#pMah').addEventListener('change', () => { if ($('#pMah').value) zoomTo(`${txt($('#pMah'))}, ${txt($('#pIlce'))}, ${txt($('#pIl'))}, Türkiye`, 15); });
})();
// Sınır çizgilerini şebeke hatlarından ayırmak için beyaz zemin (casing) ve kalın çizgi
(async () => {
  const A = window.ENAREN_APP, map = A.map;
  for (let i = 0; i < 150 && !(map.getLayer('mebsin') && map.getLayer('trsinir') && map.getLayer('dyetki')); i++) await new Promise(r => setTimeout(r, 200));
  const W = ['interpolate', ['linear'], ['zoom'], 4, 3.2, 8, 4.6];
  [['dyetki', 'dyetki'], ['mebsin', 'mebsin'], ['trsinir', 'trsinir']].forEach(([id, src]) => {
    const L = map.getLayer(id); if (!L) return;
    const f = map.getFilter(id);
    map.addLayer({id:id + '-case', type:'line', source:src, ...(f ? {filter:f} : {}), layout:{'line-cap':'round', 'line-join':'round'}, paint:{'line-color':'#ffffff', 'line-width':['interpolate', ['linear'], ['zoom'], 4, 6, 8, 8.5], 'line-opacity':0.9}}, id);
    map.setPaintProperty(id, 'line-width', W);
  });
  map.setPaintProperty('dyetki', 'line-color', '#B3001B'); map.setPaintProperty('mebsin', 'line-color', '#B3001B');
  map.setPaintProperty('dyetki-sem', 'line-color', '#B3001B');
  A.LAYER_MAP.lyrDyetki = [...new Set([...(A.LAYER_MAP.lyrDyetki || []), 'dyetki-case', 'mebsin-case', 'trsinir-case'])];
})();
// Mavi Vatan: kapalı alan (Karadeniz antlaşmaları + Doğu Akdeniz resmî bildirimleri + Ege'de şematik orta hat)
(async () => {
  const A = window.ENAREN_APP, map = A.map;
  for (let i = 0; i < 150 && !(map.getLayer('dyetki') && map.isStyleLoaded()); i++) await new Promise(r => setTimeout(r, 200));
  const mv = await fetch('data/mavi_vatan.geojson?v=1').then(r => r.json());
  map.addSource('mavivatan', {type:'geojson', data:mv});
  map.addLayer({id:'mavivatan-fill', type:'fill', source:'mavivatan', paint:{'fill-color':'#1f5f8b', 'fill-opacity':0.13}}, map.getLayer('dyetki-case') ? 'dyetki-case' : 'dyetki');
  map.addLayer({id:'mavivatan-line', type:'line', source:'mavivatan', paint:{'line-color':'#B3001B', 'line-width':['interpolate', ['linear'], ['zoom'], 4, 1, 8, 1.8], 'line-opacity':0.85}}, 'dyetki');
  const ege = [[26.04,40.72],[25.62,40.38],[25.28,39.92],[25.0,39.3],[24.9,38.7],[25.18,38.0],[25.3,37.3],[25.62,36.62],[26.08,35.92],[26.38,35.3],[26.32,34.27]];
  map.addSource('mv-ege', {type:'geojson', data:{type:'Feature', geometry:{type:'LineString', coordinates:ege}, properties:{}}});
  map.addLayer({id:'mv-ege', type:'line', source:'mv-ege', paint:{'line-color':'#B3001B', 'line-width':['interpolate', ['linear'], ['zoom'], 4, 2.6, 8, 3.6], 'line-dasharray':[2, 1.2]}});
  map.addLayer({id:'mavivatan-lbl', type:'symbol', source:'mavivatan', layout:{'text-field':'MAVİ VATAN', 'text-font':['Open Sans Semibold'], 'text-size':['interpolate', ['linear'], ['zoom'], 4, 12, 7, 18], 'text-letter-spacing':0.25}, paint:{'text-color':'#1f5f8b', 'text-halo-color':'#fff', 'text-halo-width':1.5, 'text-opacity':0.85}});
  A.LAYER_MAP.lyrDyetki = [...new Set([...(A.LAYER_MAP.lyrDyetki || []), 'mavivatan-fill', 'mavivatan-line', 'mv-ege', 'mavivatan-lbl'])];
  map.on('click', 'mv-ege', e => new maplibregl.Popup({maxWidth:'300px'}).setLngLat(e.lngLat).setHTML('<b>Ege: şematik sınır</b><br>Ege\'de iki ülke arasında sınırlandırma yapılmamıştır ve Türkiye resmî koordinat yayımlamamıştır. Bu hat, ana karalar arası orta hat esas alınarak şematik çizilmiştir; Yunan adalarının çevresinde 6 deniz mili karasuyu bırakılmıştır.').addTo(map));
})();
