/* ENAREN WebGIS – Vizyon: "Enerji ihraç eden Türkiye"
 * Ulusal enerji dengesi çubukları, ihracat senaryosu, kaynak matrisi, santral ve stratejik proje ikonları,
 * bölgeler arası elektrik akışı simülasyonu, tarım/sanayi arazi kullanımı potansiyeli, görev → altlık eşlemesi. */
(() => {
'use strict';
const A = window.ENAREN_APP;
const { map, state, fmt } = A;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---------------- Kaynak sözlüğü ----------------
const K = {
  hidro:       {ad:'Hidroelektrik (baraj/akarsu)', kisa:'Hidro', renk:'#1f78b4', ikon:'💧', yerli:1},
  gunes:       {ad:'Güneş', kisa:'Güneş', renk:'#f2a900', ikon:'☀️', yerli:1},
  ruzgar:      {ad:'Rüzgâr', kisa:'Rüzgâr', renk:'#41b6c4', ikon:'💨', yerli:1},
  jeotermal:   {ad:'Jeotermal', kisa:'Jeotermal', renk:'#e7298a', ikon:'♨️', yerli:1},
  biyokutle:   {ad:'Biyokütle / atık', kisa:'Biyokütle', renk:'#33a02c', ikon:'🌿', yerli:1},
  linyit:      {ad:'Yerli kömür (linyit, taşkömürü, asfaltit)', kisa:'Yerli kömür', renk:'#8c6d31', ikon:'🪨', yerli:1},
  nukleer:     {ad:'Nükleer', kisa:'Nükleer', renk:'#6a3d9a', ikon:'⚛️', yerli:0.5},
  dogalgaz:    {ad:'Doğal gaz (%95+ ithal)', kisa:'Doğal gaz', renk:'#d95f02', ikon:'🔥', yerli:0.05},
  ithal_komur: {ad:'İthal kömür', kisa:'İthal kömür', renk:'#444444', ikon:'⚫', yerli:0},
  petrol:      {ad:'Petrol / fuel-oil', kisa:'Petrol', renk:'#1a1a1a', ikon:'🛢️', yerli:0.15},
  dogalgaz_kaynak:{ad:'Yerli doğal gaz', renk:'#d95f02', ikon:'🔥'}, petrol_kaynak:{ad:'Yerli petrol', renk:'#1a1a1a', ikon:'🛢️'},
  linyit_kaynak:{ad:'Kömür havzası', renk:'#8c6d31', ikon:'⛏️'}, depolama:{ad:'Gaz depolama', renk:'#7570b3', ikon:'🔋'},
  boru:{ad:'Boru hattı girişi', renk:'#7570b3', ikon:'🧭'}, bor:{ad:'Bor / lityum', renk:'#66a61e', ikon:'💎'}, toryum:{ad:'Toryum / nadir toprak', renk:'#e6ab02', ikon:'☢️'}
};
const DURUM = {uretim:['Üretimde','#1f8a4c'], insa:['İnşa / devreye alma','#f2a900'], plan:['Planlama','#7570b3'], ihale:['YEKA ihalesi','#e6550d']};

// ---------------- Ulusal veriler (kaynaklı) ----------------
const URETIM_2025 = {toplam:363.0, talep:360.9, pay:{hidro:16, ruzgar:11, gunes:10, biyokutle:3, jeotermal:3, dogalgaz:23, ithal_komur:21, linyit:13}}; // EPİAŞ/SHURA; linyit = linyit 11 + taşkömürü 1 + asfaltit 1
const KURULU_2026 = {hidro:32332, gunes:28222, dogalgaz:25009, ruzgar:15540, linyit:11565, ithal_komur:10466, biyokutle:2423, jeotermal:1798}; // ETKB Eylül 2026
const BIRINCIL_2024 = [['petrol',29,0.857],['dogalgaz',27,0.98],['linyit',26,0.60],['biyokutle',11,0],['hidro',4,0],['ruzgar',4,0]]; // pay %, ithal oranı (SHURA/ETKB)

// ---------------- İkonlar ----------------
function makeIcon(id, emoji, color, ring){
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d');
  g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2); g.fillStyle = color; g.fill();
  g.lineWidth = 4; g.strokeStyle = ring || '#ffffff'; g.stroke();
  g.font = '30px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(emoji, s / 2, s / 2 + 2);
  if (!map.hasImage(id)) map.addImage(id, g.getImageData(0, 0, s, s), {pixelRatio: 2});
}
function addIcons(){
  Object.entries(K).forEach(([k, v]) => makeIcon('ic-' + k, v.ikon, v.renk));
  Object.entries(DURUM).forEach(([d, [, col]]) => Object.entries(K).forEach(([k, v]) => makeIcon(`ic-${k}-${d}`, v.ikon, v.renk, col)));
}

// ---------------- Katmanlar ----------------
const ready = (fn) => { const t = setInterval(() => { if (state.edas && map.getSource('ofm') && map.isStyleLoaded()){ clearInterval(t); fn(); } }, 300); };
ready(async () => {
  addIcons();
  const [sant, strat] = await Promise.all(['data/santraller.geojson?v=12', 'data/stratejik.geojson?v=12'].map(u => fetch(u).then(r => r.json())));
  state.santral = sant; state.stratejik = strat;
  const size = ['interpolate', ['linear'], ['sqrt', ['coalesce', ['get', 'mw'], 300]], 3, 0.32, 20, 0.6, 40, 0.95, 70, 1.45];
  // Arazi kullanımı (OpenFreeMap / OSM)
  map.addLayer({id:'tarim', type:'fill', source:'ofm', 'source-layer':'landcover', minzoom:8, filter:['==', ['get', 'class'], 'farmland'], layout:{visibility:'none'}, paint:{'fill-color':'#a6d96a','fill-opacity':0.45}}, 'edas-fill');
  map.addLayer({id:'sanayi', type:'fill', source:'ofm', 'source-layer':'landuse', minzoom:8, filter:['==', ['get', 'class'], 'industrial'], layout:{visibility:'none'}, paint:{'fill-color':'#7b3294','fill-opacity':0.5}}, 'edas-fill');
  // Akış simülasyonu
  map.addSource('akis', {type:'geojson', data:{type:'FeatureCollection', features:[]}});
  map.addLayer({id:'akis-bg', type:'line', source:'akis', layout:{visibility:'none','line-cap':'round'}, paint:{'line-color':'#f2a900','line-opacity':0.25,'line-width':['interpolate',['linear'],['get','twh'],1,3,20,14]}});
  map.addLayer({id:'akis', type:'line', source:'akis', layout:{visibility:'none','line-cap':'butt'}, paint:{'line-color':'#c0392b','line-width':['interpolate',['linear'],['get','twh'],1,2,20,7],'line-dasharray':[0,4,3]}});
  map.addSource('denge', {type:'geojson', data:{type:'FeatureCollection', features:[]}});
  map.addLayer({id:'denge', type:'circle', source:'denge', layout:{visibility:'none'}, paint:{
    'circle-radius':['interpolate',['linear'],['abs',['get','net']],0,4,40,26], 'circle-color':['case',['>',['get','net'],0],'#1f8a4c','#c0392b'], 'circle-opacity':0.75, 'circle-stroke-color':'#fff','circle-stroke-width':1.5}});
  map.addLayer({id:'denge-lbl', type:'symbol', source:'denge', layout:{visibility:'none','text-field':['concat',['case',['>',['get','net'],0],'+',''],['to-string',['get','neti']],' TWh'],'text-size':11,'text-font':['Open Sans Semibold'],'text-offset':[0,2.2]}, paint:{'text-color':'#1d2733','text-halo-color':'#fff','text-halo-width':1.5}});
  // Santraller (WRI GPPD – büyük santraller) ve stratejik projeler
  map.addSource('santral', {type:'geojson', data:sant});
  map.addLayer({id:'santral', type:'symbol', source:'santral', layout:{visibility:'visible','icon-image':['concat','ic-',['get','kaynak']],'icon-size':size,'icon-allow-overlap':true,'symbol-sort-key':['-',0,['get','mw']],
    'text-field':['step',['zoom'],'',7,['concat',['get','ad'],'\n',['to-string',['round',['get','mw']]],' MW']],'text-size':10.5,'text-font':['Open Sans Semibold'],'text-offset':[0,1.6],'text-anchor':'top','text-optional':true}, paint:{'text-color':'#1d2733','text-halo-color':'#fff','text-halo-width':1.4}});
  map.addSource('stratejik', {type:'geojson', data:strat});
  map.addLayer({id:'stratejik', type:'symbol', source:'stratejik', layout:{visibility:'visible','icon-image':['concat','ic-',['get','kaynak'],'-',['get','durum']],'icon-size':['interpolate',['linear'],['sqrt',['coalesce',['get','mw'],900]],10,0.7,70,1.6],'icon-allow-overlap':true,
    'text-field':['step',['zoom'],'',5.5,['get','ad']],'text-size':11,'text-font':['Open Sans Semibold'],'text-offset':[0,1.9],'text-anchor':'top','text-optional':true}, paint:{'text-color':'#0f3d5e','text-halo-color':'#fff','text-halo-width':1.6}});
  Object.assign(A.LAYER_MAP, {lyrSantral:['santral'], lyrStrat:['stratejik'], lyrAkis:['akis','akis-bg','denge','denge-lbl'], lyrTarim:['tarim','sanayi']});
  ['lyrSantral','lyrStrat','lyrAkis','lyrTarim'].forEach(id => $('#' + id).addEventListener('change', () => { A.syncLayerChecks(); if (id === 'lyrAkis') toggleFlow($('#lyrAkis').checked); }));
  A.syncLayerChecks();
  // tıklama
  ['santral','stratejik'].forEach(l => {
    map.on('click', l, e => {
      if (state.mode) return;
      const p = e.features[0].properties, k = K[p.kaynak] || {};
      const html = l === 'santral'
        ? `<div class="pop"><h5>${k.ikon || ''} ${esc(p.ad)}</h5><table><tr><td>Kaynak</td><td>${esc(k.ad || p.kaynak)}</td></tr><tr><td>Kurulu güç</td><td>${fmt(p.mw)} MW</td></tr>${p.sahip ? `<tr><td>Sahip</td><td>${esc(p.sahip)}</td></tr>` : ''}${p.uretim_gwh ? `<tr><td>Tahmini üretim (2017)</td><td>${fmt(p.uretim_gwh)} GWh</td></tr>` : ''}</table><small class="muted">WRI Global Power Plant Database v1.3 (2021); güncel envanter için EPDK lisans verisi.</small></div>`
        : `<div class="pop"><h5>${k.ikon || ''} ${esc(p.ad)}</h5><table><tr><td>Durum</td><td>${esc(DURUM[p.durum]?.[0] || p.durum)}</td></tr>${p.mw && p.mw !== 'null' ? `<tr><td>Güç</td><td>${fmt(p.mw)} MW</td></tr>` : ''}</table><p style="margin:6px 0 0;font-size:12.5px">${esc(p.aciklama)}</p></div>`;
      new maplibregl.Popup({maxWidth:'290px'}).setLngLat(e.lngLat).setHTML(html).addTo(map);
      e.preventDefault?.();
    });
    map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', l, () => { map.getCanvas().style.cursor = ''; });
  });
  renderVizyon();
});

// ---------------- Bölgeler arası akış simülasyonu ----------------
let flowTimer = null, flowData = null;
function polyArea(g){ const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; return polys.reduce((s, p) => s + A.ringArea(p[0].slice(0, -1)), 0); }
function centroidOf(g){ const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; let best = polys[0], ba = 0; polys.forEach(p => { const a = A.ringArea(p[0]); if (a > ba){ ba = a; best = p; } }); return A.centroid({type:'Polygon', coordinates:best}); }
function computeFlows(){
  const R = state.edas.features.map(f => ({f, p: f.properties, c: centroidOf(f.geometry), area: polyArea(f.geometry), gen:{}}));
  // yakıt bazında ulusal üretim (TWh, 2025)
  const nat = Object.fromEntries(Object.entries(URETIM_2025.pay).map(([k, v]) => [k, URETIM_2025.toplam * v / 100]));
  // bölgesel paylar: termik/hidro/jeotermal → WRI santral kapasitesi; güneş → alan×ışınım; rüzgâr → alan×v³; biyokütle → tüketim
  const wind = map.getSource('wind')?.serialize?.().data?.features || [];
  const wsOf = r => { const v = wind.filter(c => { const g = c.geometry.coordinates[0]; return A.whichFeature({features:[r.f]}, [(g[0][0] + g[2][0]) / 2, (g[0][1] + g[2][1]) / 2]); }).map(c => c.properties.ws50); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 3; };
  R.forEach(r => { r.ws = wsOf(r); });
  const capBy = {};
  state.santral.features.forEach(f => { const r = R.find(x => A.whichFeature({features:[x.f]}, f.geometry.coordinates)); if (!r) return; const k = f.properties.kaynak; r.cap = r.cap || {}; r.cap[k] = (r.cap[k] || 0) + f.properties.mw; capBy[k] = (capBy[k] || 0) + f.properties.mw; });
  const w = {
    gunes: r => r.area * Math.pow(r.p.ghi / 1500, 2), ruzgar: r => r.area * Math.pow(r.ws, 3), biyokutle: r => r.p.toplam_twh
  };
  Object.keys(nat).forEach(k => {
    const wf = w[k] || (r => (r.cap?.[k] || 0));
    const tot = R.reduce((s, r) => s + wf(r), 0) || 1;
    R.forEach(r => { r.gen[k] = nat[k] * wf(r) / tot; });
  });
  const scale = URETIM_2025.talep / R.reduce((s, r) => s + r.p.toplam_twh, 0);
  R.forEach(r => { r.genT = Object.values(r.gen).reduce((s, v) => s + v, 0); r.cons = r.p.toplam_twh * scale; r.net = r.genT - r.cons; });
  // açgözlü taşıma: fazla veren → en yakın açık veren
  const sur = R.filter(r => r.net > 0).map(r => ({r, v: r.net})), def = R.filter(r => r.net < 0).map(r => ({r, v: -r.net}));
  const dist = (a, b) => Math.hypot((a.c[0] - b.c[0]) * Math.cos(39 * Math.PI / 180), a.c[1] - b.c[1]);
  const flows = [];
  sur.sort((a, b) => b.v - a.v).forEach(s => {
    def.filter(d => d.v > 0.05).sort((a, b) => dist(s.r, a.r) - dist(s.r, b.r)).forEach(d => {
      if (s.v <= 0.05) return; const q = Math.min(s.v, d.v); s.v -= q; d.v -= q; flows.push({from: s.r, to: d.r, twh: q});
    });
  });
  return {R, flows};
}
function arc(a, b, n = 32){
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
  const cx = mx - dy * 0.2, cy = my + dx * 0.2; const pts = [];
  for (let i = 0; i <= n; i++){ const t = i / n; pts.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cx + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cy + t * t * b[1]]); }
  return pts;
}
const DASH = [[0,4,3],[0.5,4,2.5],[1,4,2],[1.5,4,1.5],[2,4,1],[2.5,4,0.5],[3,4,0],[0,0.5,3,3.5],[0,1,3,3],[0,1.5,3,2.5],[0,2,3,2],[0,2.5,3,1.5],[0,3,3,1],[0,3.5,3,0.5]];
function toggleFlow(on){
  if (!on){ clearInterval(flowTimer); flowTimer = null; return; }
  flowData = computeFlows();
  map.getSource('akis').setData({type:'FeatureCollection', features: flowData.flows.filter(f => f.twh >= 0.3).map(f => ({type:'Feature', geometry:{type:'LineString', coordinates: arc(f.from.c, f.to.c)}, properties:{twh: +f.twh.toFixed(1), from: f.from.p.edas, to: f.to.p.edas}}))});
  map.getSource('denge').setData({type:'FeatureCollection', features: flowData.R.map(r => ({type:'Feature', geometry:{type:'Point', coordinates:r.c}, properties:{net: r.net, neti: Math.round(r.net), edas: r.p.edas}}))});
  let step = 0; clearInterval(flowTimer);
  flowTimer = setInterval(() => { step = (step + 1) % DASH.length; if (map.getLayer('akis')) map.setPaintProperty('akis', 'line-dasharray', DASH[step]); }, 90);
  renderFlowTable();
  if (map.getZoom() > 6.5) map.flyTo({center:[35.2, 39], zoom:5});
}
function renderFlowTable(){
  if (!flowData) return;
  const R = [...flowData.R].sort((a, b) => b.net - a.net);
  $('#akisTablo').innerHTML = `<p class="hint">Yeşil: üretimi tüketiminden fazla (ihracatçı) bölge, kırmızı: açık veren bölge. Oklar fazlanın en yakın açık bölgelere akışını temsil eder.</p>` +
    R.map(r => `<div class="bar ev"><span>${esc(r.p.edas.replace(' EDAŞ', ''))}</span><div class="t"><i style="width:${Math.min(100, Math.abs(r.net) / 45 * 100).toFixed(0)}%;background:${r.net > 0 ? '#1f8a4c' : '#c0392b'}"></i></div><span class="v">${r.net > 0 ? '+' : ''}${fmt(r.net, 1)} TWh</span></div>`).join('') +
    `<small class="muted">Simülasyon: 2025 ulusal üretimi (EPİAŞ) yakıt bazında bölgelere dağıtıldı — termik/hidro/jeotermal WRI santral kapasitesine, güneş alan×ışınıma, rüzgâr alan×v³'e göre; tüketim ELDER 2024 bölge payları. Gerçek hat bazında yük akışı TEİAŞ SCADA/yük akışı verisi gerektirir.</small>`;
}

// ---------------- Tarım / sanayi potansiyeli ----------------
function landCalc(){
  if (map.getZoom() < 9){ A.toast('Tarım/sanayi alanları için yakınlaşın (zoom ≥ 9)'); return; }
  const b = map.getBounds(); let sanayi = 0, tarim = 0;
  const sum = (layer) => { const seen = new Set(); let a = 0; map.queryRenderedFeatures({layers:[layer]}).forEach(f => { const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : []; polys.forEach(p => { const ring = p[0].slice(0, -1); if (ring.length < 3) return; const c = [ring.reduce((s, q) => s + q[0], 0) / ring.length, ring.reduce((s, q) => s + q[1], 0) / ring.length]; const k = c.map(v => v.toFixed(5)).join(); if (seen.has(k) || !b.contains(c)) return; seen.add(k); a += A.ringArea(ring); }); }); return a; };
  sanayi = sum('sanayi'); tarim = sum('tarim');
  const ed = A.whichFeature(state.edas, [map.getCenter().lng, map.getCenter().lat]);
  const y = ed ? ed.properties.ghi * 0.92 : 1500; // kWh/kWp ~
  const sKwp = sanayi * 0.35 * 0.6 * 0.2, tKwp = tarim * 0.03 * 0.4; // sanayi: %35 çatı, %60 kullanılabilir; tarım: %3'ünde agrivoltaik, 0,4 kWp/m²
  $('#landRes').className = 'result';
  $('#landRes').innerHTML = `<div class="kpi">
    <div><strong>${fmt(sanayi / 1e6, 2)} km²</strong><span>sanayi alanı (OSM)</span></div><div><strong>${fmt(sKwp / 1000)} MWp</strong><span>sanayi çatı GES*</span></div>
    <div><strong>${fmt(tarim / 1e6, 1)} km²</strong><span>tarım arazisi (OSM)</span></div><div><strong>${fmt(tKwp / 1000)} MWp</strong><span>agrivoltaik (%3 alan)*</span></div>
    <div><strong>${fmt((sKwp + tKwp) * y / 1e6, 1)} GWh</strong><span>yıllık toplam üretim</span></div><div><strong>${fmt((sKwp + tKwp) * y / 2600)}</strong><span>hane eşdeğeri</span></div></div>
    <small class="muted">*Sanayi: alanın %35'i çatı, bunun %60'ı kullanılabilir, 0,2 kWp/m². Tarım: alanın %3'ünde yüksek montajlı agrivoltaik (0,4 kWp/m²) — sulama pompaları, soğuk hava depoları ve seralar için yerinde üretim. Arazi sınıfları OSM'den, eksik olabilir.</small>`;
}

// ---------------- İhracat senaryosu ----------------
const CF = {gunes:0.17, ruzgar:0.31, hidro:0.205, jeobiyo:0.62, linyit:0.55, nukleer:0.88};
const PRESET = {
  bugun:   {gunes:28.2, ruzgar:15.5, hidro:32.3, jeobiyo:4.2, linyit:11.6, nukleer:0,   buyume:0,   yil:2025},
  hedef35: {gunes:70,   ruzgar:50,   hidro:35,   jeobiyo:6,   linyit:11.6, nukleer:4.8, buyume:3,   yil:2035},
  vizyon:  {gunes:150,  ruzgar:85,   hidro:38,   jeobiyo:9,   linyit:11.6, nukleer:14.4,buyume:3,   yil:2040}
};
function senaryo(){
  const v = id => +$('#sv-' + id).value;
  const yil = v('yil'), talep = URETIM_2025.talep * Math.pow(1 + v('buyume') / 100, Math.max(0, yil - 2025));
  const gen = {gunes: v('gunes') * CF.gunes * 8.76, ruzgar: v('ruzgar') * CF.ruzgar * 8.76, hidro: v('hidro') * CF.hidro * 8.76, jeobiyo: v('jeobiyo') * CF.jeobiyo * 8.76, linyit: v('linyit') * CF.linyit * 8.76, nukleer: v('nukleer') * CF.nukleer * 8.76};
  const yerli = Object.values(gen).reduce((s, x) => s + x, 0), fark = yerli - talep;
  const max = Math.max(talep, yerli) * 1.05;
  const seg = (k, val, col, lbl) => val > 0 ? `<div class="seg" style="width:${val / max * 100}%;background:${col}" title="${lbl}: ${fmt(val)} TWh">${val / max > 0.07 ? lbl : ''}</div>` : '';
  $('#svBar').innerHTML = `<div class="stack">${seg('hidro', gen.hidro, K.hidro.renk, '💧')}${seg('gunes', gen.gunes, K.gunes.renk, '☀️')}${seg('ruzgar', gen.ruzgar, K.ruzgar.renk, '💨')}${seg('jeo', gen.jeobiyo, K.jeotermal.renk, '♨️🌿')}${seg('linyit', gen.linyit, K.linyit.renk, '🪨')}${seg('nuk', gen.nukleer, K.nukleer.renk, '⚛️')}${fark < 0 ? `<div class="seg gap" style="width:${-fark / max * 100}%">ithal yakıt</div>` : ''}</div>
    <div class="demand" style="left:${talep / max * 100}%"><span>Talep ${fmt(talep)} TWh</span></div>`;
  const usd = fark * 1e6 * 70 / 1e9; // 70 $/MWh ihracat değeri varsayımı
  $('#svOut').innerHTML = fark >= 0
    ? `<div class="verdict g">🇹🇷 ${yil}: Yerli kaynaklar talebi <b>${fmt(fark)} TWh</b> aşıyor → elektrik ihracatı potansiyeli ~<b>${fmt(usd, 1)} milyar $/yıl</b> (70 $/MWh). Doğal gaz ve ithal kömür santralleri yedek/dengeleme rolüne çekilir.</div>`
    : `<div class="verdict ${fark > -60 ? 'o' : 'r'}">${yil}: Yerli kaynaklar talebin <b>%${fmt(yerli / talep * 100)}</b>'ini karşılıyor. Açık <b>${fmt(-fark)} TWh</b> → ithal doğal gaz / kömürle ~<b>${fmt(-usd, 1)} milyar $</b> yakıt faturası.</div>`;
  $('#svOut').insertAdjacentHTML('beforeend', `<small class="muted">Kapasite faktörleri: güneş %17, rüzgâr %31, hidro %20,5 (2025 gerçekleşen), nükleer %88. Yüksek güneş/rüzgâr payı depolama (batarya, pompaj, yeşil hidrojen), esneklik ve ara bağlantı kapasitesi gerektirir; bu basit enerji dengesi saatlik dengelemeyi içermez.</small>`);
}

// ---------------- Vizyon sekmesi ----------------
function stackBar(parts, total, unit){
  return `<div class="stack">${parts.map(([k, v, lbl]) => `<div class="seg" style="width:${v / total * 100}%;background:${(K[k] || {}).renk || k}" title="${esc(lbl)}: ${fmt(v, 1)} ${unit}">${v / total > 0.075 ? (K[k]?.ikon || '') : ''}</div>`).join('')}</div>
    <div class="legend2">${parts.map(([k, v, lbl]) => `<span><i style="background:${(K[k] || {}).renk || k}"></i>${esc(lbl)} ${fmt(v, 1)}</span>`).join('')}</div>`;
}
function renderVizyon(){
  const gen = Object.entries(URETIM_2025.pay).map(([k, p]) => [k, URETIM_2025.toplam * p / 100, K[k].kisa]).sort((a, b) => (K[b[0]].yerli - K[a[0]].yerli) || b[1] - a[1]);
  const yerliTWh = gen.filter(([k]) => K[k].yerli >= 1).reduce((s, x) => s + x[1], 0);
  const cap = Object.entries(KURULU_2026).map(([k, v]) => [k, v / 1000, K[k].kisa]).sort((a, b) => (K[b[0]].yerli - K[a[0]].yerli) || b[1] - a[1]);
  const prim = BIRINCIL_2024.map(([k, p, ith]) => [k, p, ith]);
  const ithalPay = prim.reduce((s, [, p, i]) => s + p * i, 0);
  const kaynaklar = [
    ['☀️','Güneş','Konya, Karaman, Antalya, GA Anadolu','GES, agrivoltaik, yüzer GES','28,2 GW kurulu','2035: güneş+rüzgâr 120 GW hedefi',[33.5,37.7]],
    ['💨','Rüzgâr','Ege, Marmara, Trakya, Kuzey Ege denizi','Kara ve açık deniz RES','15,5 GW','Açık deniz RES (Saros, Gökçeada)',[26.5,39.8]],
    ['💧','Su','Fırat-Dicle, Çoruh, Kızılırmak','Barajlı/akarsu HES, pompaj depolama','32,3 GW','Pompaj depolama ile dengeleme',[38.3,37.5]],
    ['♨️','Jeotermal','Denizli, Aydın, Manisa','Elektrik + sera/şehir ısıtma','1,8 GW','Isı pompası ve sanayi buharı',[28.8,37.9]],
    ['🌿','Biyokütle','Tarım ve hayvancılık havzaları','Biyogaz, biyometan','2,4 GW','BEPA atlası ile atıktan enerji',[32.5,39]],
    ['🪨','Linyit / taşkömürü','Afşin-Elbistan, Soma, Zonguldak','Termik, gazlaştırma','11,6 GW','Geçiş yakıtı; karbon yakalama',[36.95,38.25]],
    ['🔥','Doğal gaz (yerli)','Karadeniz – Sakarya sahası','Esnek santral, sanayi','Üretimde','İthalatı ikame',[31.4,42.6]],
    ['🛢️','Petrol (yerli)','Gabar, Şırnak','Ulaşım yakıtı','Üretimde','Elektrifikasyonla talep düşüşü',[42.35,37.55]],
    ['⚛️','Nükleer','Akkuyu, Sinop, Trakya','Baz yük','Akkuyu 4,8 GW inşa','2050: 20 GW nükleer hedefi',[33.53,36.14]],
    ['💎','Bor / lityum','Eskişehir, Balıkesir, Kütahya','Batarya, hidrojen depolama','BOREN lityum tesisi','Depolama zinciri yerlileşir',[30.53,39.29]],
    ['☢️','Toryum / nadir toprak','Eskişehir Beylikova','Gelecek reaktörleri, mıknatıslar','Ar-Ge (NATEN)','Toryum yakıt döngüsü',[31.2,39.68]],
    ['🌊','Deniz','Karadeniz, Ege, Akdeniz','Açık deniz RES, yüzer GES, akıntı','Ön tarama','Mavi Vatan enerji koridorları',[26.2,39.6]]
  ];
  $('#pane-vizyon').innerHTML = `
    <div class="manifest"><b>Felsefe: Enerji ithal eden değil, ihraç eden Türkiye.</b>
      <span>Güneş, rüzgâr, su, jeotermal, linyit, bor, toryum ve denizlerimizle; ithal ettiğimiz her birim enerjinin yerine kendi kaynağımızı koyarak önce kendine yeten, sonra komşularına enerji satan bir Türkiye. ENAREN'in iletim, dağıtım, depolama ve verimlilik görevleri bu dönüşümün omurgasıdır.</span></div>
    <h3>Elektrik: 2025 üretimi ${fmt(URETIM_2025.toplam)} TWh · talep ${fmt(URETIM_2025.talep)} TWh</h3>
    ${stackBar(gen, URETIM_2025.toplam, 'TWh')}
    <p class="hint">Yerli kaynaklı üretim: <b>~${fmt(yerliTWh)} TWh (%${fmt(yerliTWh / URETIM_2025.toplam * 100)})</b>. Kalanı ithal kömür ve büyük ölçüde ithal doğal gazla.</p>
    <h3>Kurulu güç: Eylül 2026 · ${fmt(127.4, 1)} GW</h3>
    ${stackBar(cap, 127.355, 'GW')}
    <h3>Birincil enerji (tüm sektörler, 2024) – ithal payı</h3>
    <div class="stack">${prim.map(([k, p, i]) => `<div class="seg" style="width:${p * i}%;background:${K[k].renk}" title="${K[k].kisa} ithal">${p * i > 7 ? '🚢' : ''}</div>`).join('')}${prim.map(([k, p, i]) => `<div class="seg yerli" style="width:${p * (1 - i)}%;background:${K[k].renk}" title="${K[k].kisa} yerli"></div>`).join('')}</div>
    <p class="hint">Enerji ihtiyacının yaklaşık <b>%${fmt(ithalPay)}</b>'i ithal (🚢 taralı olmayan kısım); 2025 net enerji ithalatı <b>47,2 milyar $</b>. 2040 hedefi: dışa bağımlılığı %68'den %48'e indirmek.</p>

    <h3>İhracatçı Türkiye senaryosu</h3>
    <div class="chips" id="svPreset"><button class="chip" data-p="bugun">Bugün</button><button class="chip active" data-p="hedef35">2035 hedefleri</button><button class="chip" data-p="vizyon">Vizyon 2040</button></div>
    <div id="svBar" class="svbar"></div><div id="svOut"></div>
    <details><summary>⚙ Kurulu güç (GW) ve talep</summary><div class="grid2">
      <label>Yıl<input type="number" id="sv-yil"></label><label>Talep artışı (%/yıl)<input type="number" id="sv-buyume" step="0.5"></label>
      <label>☀️ Güneş<input type="number" id="sv-gunes" step="5"></label><label>💨 Rüzgâr (kara+deniz)<input type="number" id="sv-ruzgar" step="5"></label>
      <label>💧 Hidro<input type="number" id="sv-hidro" step="1"></label><label>♨️🌿 Jeotermal+biyokütle<input type="number" id="sv-jeobiyo" step="1"></label>
      <label>🪨 Yerli kömür<input type="number" id="sv-linyit" step="1"></label><label>⚛️ Nükleer<input type="number" id="sv-nukleer" step="1.2"></label></div>
      <p class="hint">2035 hedefi: güneş+rüzgâr 120 GW (bakanlık; güneş/rüzgâr ayrımı varsayım), Akkuyu 4,8 GW. Vizyon 2040: Akkuyu+Sinop+Trakya'nın bir kısmı ve açık deniz RES.</p></details>

    <h3>Haritada göster</h3>
    <label class="row"><input type="checkbox" id="lyrSantral" checked> Büyük santraller – kaynak ikonlu, güçle ölçekli</label>
    <label class="row"><input type="checkbox" id="lyrStrat" checked> Stratejik projeler ve ulusal kaynaklar</label>
    <label class="row"><input type="checkbox" id="lyrAkis"> ⚡ Bölgeler arası elektrik akışı simülasyonu</label>
    <div id="akisTablo"></div>
    <label class="row"><input type="checkbox" id="lyrTarim"> Tarım ve sanayi alanları (OSM)</label>
    <div class="btnrow"><button id="btnLand" class="btn">🌾🏭 Görünümde tarım/sanayi potansiyeli</button></div>
    <div id="landRes" class="result muted">Bir OSB veya tarım havzasına yakınlaşıp hesaplayın.</div>
    <div class="legend2" style="margin-top:6px">${Object.entries(DURUM).map(([, [l, c]]) => `<span><i style="background:#fff;border:3px solid ${c}"></i>${l}</span>`).join('')}</div>

    <h3>Türkiye'nin kaynakları → enerji</h3>
    <div class="matrix">${kaynaklar.map(([i, ad, yer, enerji, bugun, vizyon, c]) => `<div class="mrow" data-c="${c.join(',')}"><b>${i} ${ad}</b><span>📍 ${yer}</span><span>⚡ ${enerji}</span><span>📊 ${bugun} → 🎯 ${vizyon}</span></div>`).join('')}</div>
    <p class="hint">Kaynaklar: ETKB kurulu güç (Eylül 2026), EPİAŞ/SHURA 2025 üretim, ETKB/SHURA birincil enerji 2024, ETKB 2040 yol haritası; santral noktaları WRI Global Power Plant Database (2021, büyük santraller), stratejik proje konumları yaklaşık.</p>`;
  $('#svPreset').addEventListener('click', e => { const k = e.target.dataset.p; if (!k) return; $$('#svPreset .chip').forEach(c => c.classList.toggle('active', c === e.target)); setPreset(k); });
  $$('[id^="sv-"]').forEach(i => i.addEventListener('input', senaryo));
  setPreset('hedef35');
  ['lyrSantral','lyrStrat','lyrAkis','lyrTarim'].forEach(id => $('#' + id).addEventListener('change', () => { A.syncLayerChecks(); if (id === 'lyrAkis') toggleFlow($('#lyrAkis').checked); }));
  $('#btnLand').onclick = () => { $('#lyrTarim').checked = true; A.syncLayerChecks(); if (map.getZoom() < 9){ map.flyTo({center:[29.94, 40.78], zoom:11}); A.toast('Örnek: Kocaeli sanayi + tarım'); } A.minimizeSheet(); map.once('idle', () => setTimeout(() => { landCalc(); A.openSheet(); A.goTab('vizyon'); }, 400)); };
  $$('.mrow').forEach(r => r.addEventListener('click', () => { const [x, y] = r.dataset.c.split(',').map(Number); map.flyTo({center:[x, y], zoom:7.5}); A.minimizeSheet(); }));
  renderGorevler();
}
function setPreset(k){ Object.entries(PRESET[k]).forEach(([f, v]) => { const el = $('#sv-' + f); if (el) el.value = v; }); senaryo(); }

// ---------------- Görev → altlık faydası ----------------
const ALTLIK = {
  'Yerli enerji teknolojileri': 'Santral ve stratejik proje katmanı + bor/toryum kaynakları → yerli teknoloji ihtiyacının nerede yoğunlaştığı (inverter, türbin, batarya, trafo).',
  'Ar-Ge ve inovasyon': 'Deniz (yüzer GES/RES, akıntı), agrivoltaik ve EV-şebeke katmanları → pilot sahaların seçimi ve test alanları.',
  'İşbirliği': 'Bölge raporları + EDAŞ bölgeleri → her dağıtım şirketi ve üniversiteyle ortak, verisi hazır proje önerisi.',
  'Verimlilik ve dönüşüm': 'Kayıp oranı haritası, bina/çatı potansiyeli, sanayi alanları → verimlilik yatırımının en yüksek getiri verdiği yerler.',
  'Politikaya veri': 'Vizyon enerji dengesi + ihracat senaryosu + EV senaryosu → Bakanlığa sayısal, haritalı politika notu.',
  'Test altyapısı': 'Güneş/rüzgâr ölçüm ve parsel karşılaştırma → ölçüm istasyonu ve test sahası yer seçimi.',
  'Eğitim ve yayın': 'Tip raporlar ve infografikler → kamuoyu ve paydaş bilgilendirmesi, açık veri yayını.',
  'Uluslararası': 'Deniz yetki alanları, ara bağlantılar ve ihracat senaryosu → AB/komşu ülkelerle enerji koridoru projeleri.'
};
function renderGorevler(){
  const el = $('#enstituContent'); if (!el) return;
  $$('#enstituContent .duty').forEach(d => {
    const t = d.querySelector('b')?.textContent; if (ALTLIK[t] && !d.querySelector('.altlik')) d.insertAdjacentHTML('beforeend', `<span class="altlik">🗺 <i>Altlık faydası:</i> ${esc(ALTLIK[t])}</span>`);
  });
}
window.ENAREN_VIZ = { computeFlows, senaryo };
})();
