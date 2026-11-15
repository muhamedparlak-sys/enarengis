/* ENAREN Enerji WebGIS – demo
 * MapLibre GL + açık servisler. Sunucu gerektirmez (GitHub Pages).
 */
(() => {
'use strict';
const DATA_V = '7'; // veri güncellenince artırın (önbellek kırıcı)
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const fmt = (n, d = 0) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('tr-TR', {maximumFractionDigits: d, minimumFractionDigits: d});

const OIM_TILES = 'https://openinframap.org/tiles/{z}/{x}/{y}.pbf';
const GEPA_WMS = 'https://tucbs-public-api.csb.gov.tr/trk_eigm_gepa_2010_yillik_toplam_radyasyon_wms';
const CORINE_WMS = 'https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer';
const wmsUrl = (base, layer) => `${base}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${layer}&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true`;

const BASEMAPS = {
  sade:  {ad:'Sade', tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'], attr:'Altlık © Esri, HERE, Garmin, © OpenStreetMap katkıcıları', max:16},
  osm:   {ad:'OSM', tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], attr:'© OpenStreetMap katkıcıları', max:19},
  uydu:  {ad:'Uydu (yüksek çöz.)', tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attr:'Görüntü © Esri, Maxar, Earthstar Geographics', max:19},
  s2:    {ad:'Sentinel-2 2023', tiles:['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg'], attr:'<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2023)', max:15}
};

const METRICS = {
  toplam_twh: {ad:'Faturalanan tüketim', birim:'TWh', d:2, ramp:['#eef4fa','#9ecae1','#4292c6','#08306b']},
  kayip:      {ad:'Kayıp oranı', birim:'%', d:1, ramp:['#fff5eb','#fdae6b','#e6550d','#7f2704']},
  tuketici:   {ad:'Tüketici sayısı', birim:'', d:0, ramp:['#f2f0f7','#bcbddc','#807dba','#3f007d']},
  kwh_kisi:   {ad:'Tüketici başına dağıtım tüketimi', birim:'kWh', d:0, ramp:['#f7fcf5','#a1d99b','#41ab5d','#00441b']},
  otomobil:   {ad:'Otomobil sayısı (Eyl. 2026)', birim:'', d:0, ramp:['#f7f4f9','#c994c7','#dd1c77','#67001f']},
  ev_pct:     {ad:'EV ek tüketimi', birim:'% mevcut', d:1, ramp:['#ffffe5','#fec44f','#ec7014','#8c2d04']},
  ev_puant_pct:{ad:'EV ek akşam puantı', birim:'% tahmini puant', d:1, ramp:['#fff7f3','#fa9fb5','#dd3497','#49006a']},
  ghi:        {ad:'Ortalama güneş ışınımı', birim:'kWh/m²·yıl', d:0, ramp:['#ffffcc','#fed976','#fd8d3c','#bd0026']}
};

const state = { edas:null, il:null, report:[], mode:null, draw:[], gesPoint:null, gesGhi:null, lastView:null };

// ---------- Harita ----------
const style = {version:8, glyphs:'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf', sources:{}, layers:[]};
Object.entries(BASEMAPS).forEach(([k, b]) => {
  style.sources['bm-' + k] = {type:'raster', tiles:b.tiles, tileSize:256, attribution:b.attr, maxzoom:b.max};
  style.layers.push({id:'bm-' + k, type:'raster', source:'bm-' + k, layout:{visibility: k === 'sade' ? 'visible' : 'none'}});
});

const map = new maplibregl.Map({
  container:'map', style, center:[35.2, 39.0], zoom:4.6, minZoom:3, maxZoom:19,
  hash:true, attributionControl:{compact:true}, preserveDrawingBuffer:true, cooperativeGestures:false
});
window.enarenMap = map;
map.addControl(new maplibregl.NavigationControl({showCompass:false}), 'bottom-right');
map.addControl(new maplibregl.ScaleControl({unit:'metric'}), 'bottom-left');

function setVis(id, on){ if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); }

map.on('load', async () => {
  const [edas, il, grid] = await Promise.all(['data/dagitim_bolgeleri.geojson','data/iller.geojson','data/gunes_grid.geojson'].map(u => fetch(u + '?v=' + DATA_V).then(r => r.json())));
  // bölge ortalama GHI
  const ghiBy = {};
  il.features.forEach(f => { (ghiBy[f.properties.edas] ||= []).push(f.properties.ghi_yil); });
  edas.features.forEach((f, i) => { f.id = i; const a = ghiBy[f.properties.edas]; f.properties.ghi = Math.round(a.reduce((s, v) => s + v, 0) / a.length); });
  il.features.forEach((f, i) => f.id = i);
  state.edas = edas; state.il = il;

  // WMS
  map.addSource('wms-corine', {type:'raster', tiles:[wmsUrl(CORINE_WMS, '12')], tileSize:256, attribution:'CORINE Land Cover 2018 © EEA/Copernicus'});
  map.addLayer({id:'wms-corine', type:'raster', source:'wms-corine', paint:{'raster-opacity':0.7}, layout:{visibility:'none'}});
  map.addSource('wms-gepa', {type:'raster', tiles:[wmsUrl(GEPA_WMS, '0')], tileSize:256, attribution:'GEPA © ETKB'});
  map.addLayer({id:'wms-gepa', type:'raster', source:'wms-gepa', paint:{'raster-opacity':0.7}, layout:{visibility:'none'}});

  // Güneş ızgarası
  map.addSource('solar', {type:'geojson', data:grid});
  map.addLayer({id:'solar', type:'fill', source:'solar', layout:{visibility:'none'}, paint:{
    'fill-color':['interpolate',['linear'],['get','ghi_yil'],1400,'#ffffcc',1600,'#fed976',1750,'#fd8d3c',1900,'#bd0026'], 'fill-opacity':['case',['get','deniz'],0.4,0.55]}});

  // Rüzgâr ızgarası (denizler dahil)
  const wind = await fetch('data/ruzgar_grid.geojson?v=' + DATA_V).then(r => r.json());
  map.addSource('wind', {type:'geojson', data:wind});
  map.addLayer({id:'wind', type:'fill', source:'wind', layout:{visibility:'none'}, paint:{
    'fill-color':['interpolate',['linear'],['get','ws50'],2,'#f7fbff',3.5,'#c6dbef',4.5,'#6baed6',5.5,'#2171b5',6.5,'#08306b',7.5,'#3f007d'], 'fill-opacity':0.6}});
  map.addLayer({id:'wind-sea', type:'line', source:'wind', filter:['==',['get','deniz'],true], layout:{visibility:'none'}, paint:{'line-color':'#ffffff','line-width':0.3,'line-opacity':0.5}});

  // Dağıtım bölgeleri
  map.addSource('edas', {type:'geojson', data:edas});
  map.addLayer({id:'edas-fill', type:'fill', source:'edas', paint:{'fill-color':'#4292c6','fill-opacity':['case',['boolean',['feature-state','sel'],false],0.75,0.5]}});
  map.addLayer({id:'edas-line', type:'line', source:'edas', paint:{'line-color':'#0f3d5e','line-width':['case',['boolean',['feature-state','sel'],false],3,1]}});
  map.addLayer({id:'edas-label', type:'symbol', source:'edas', minzoom:5, layout:{'text-field':['get','edas'],'text-size':11,'text-font':['Open Sans Semibold'],'text-allow-overlap':false}, paint:{'text-color':'#0f3d5e','text-halo-color':'#fff','text-halo-width':1.5}});

  // İller
  map.addSource('il', {type:'geojson', data:il});
  map.addLayer({id:'il-line', type:'line', source:'il', layout:{visibility:'none'}, paint:{'line-color':'#555','line-width':0.6,'line-dasharray':[2,1]}});
  map.addLayer({id:'il-label', type:'symbol', source:'il', minzoom:6, layout:{visibility:'none','text-field':['get','il'],'text-size':11,'text-font':['Open Sans Regular']}, paint:{'text-color':'#333','text-halo-color':'#fff','text-halo-width':1.2}});

  // OpenInfraMap (OSM enerji altyapısı)
  map.addSource('oim', {type:'vector', tiles:[OIM_TILES], maxzoom:17, attribution:'Enerji altyapısı © OpenStreetMap katkıcıları, <a href="https://openinframap.org">OpenInfraMap</a>'});
  const V = ['to-number',['coalesce',['get','voltage'],0]];
  map.addLayer({id:'oim-lines', type:'line', source:'oim', 'source-layer':'power_line', paint:{
    'line-color':['step',V,'#8a8a8a',35,'#2ca25f',100,'#2b8cbe',200,'#e6550d',300,'#c0392b'],
    'line-width':['interpolate',['linear'],['zoom'],5,['step',V,0.3,100,0.8,300,1.4],12,['step',V,1,100,2,300,3]]}});
  map.addLayer({id:'oim-subs', type:'circle', source:'oim', 'source-layer':'power_substation_point', minzoom:6, paint:{
    'circle-radius':['interpolate',['linear'],['zoom'],6,2,12,5],'circle-color':'#6a3d9a','circle-stroke-color':'#fff','circle-stroke-width':1}});
  const SRC = ['coalesce',['get','source'],['get','plant:source'],''];
  map.addLayer({id:'oim-plants', type:'circle', source:'oim', 'source-layer':'power_plant_point', layout:{visibility:'none'}, paint:{
    'circle-radius':['interpolate',['linear'],['zoom'],5,3,12,7],
    'circle-color':['match',SRC,'solar','#f2a900','wind','#1f78b4','hydro','#33a0d6','gas','#b15928','coal','#333333','geothermal','#e7298a','nuclear','#6a3d9a','biomass','#33a02c','#999999'],
    'circle-stroke-color':'#fff','circle-stroke-width':1}});
  map.addLayer({id:'oim-solarheat', type:'heatmap', source:'oim', 'source-layer':'power_heatmap_solar', maxzoom:13, layout:{visibility:'none'}, paint:{
    'heatmap-radius':['interpolate',['linear'],['zoom'],4,6,10,18], 'heatmap-intensity':['interpolate',['linear'],['zoom'],4,0.6,10,1.5],
    'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(255,255,204,0)',0.2,'#ffeda0',0.5,'#feb24c',0.8,'#f03b20',1,'#bd0026'],'heatmap-opacity':0.85}});

  // Çizim
  map.addSource('draw', {type:'geojson', data:{type:'FeatureCollection', features:[]}});
  map.addLayer({id:'draw-fill', type:'fill', source:'draw', filter:['==','$type','Polygon'], paint:{'fill-color':'#f2a900','fill-opacity':0.35}});
  map.addLayer({id:'draw-line', type:'line', source:'draw', paint:{'line-color':'#f2a900','line-width':2.5}});
  map.addLayer({id:'draw-pt', type:'circle', source:'draw', filter:['==','$type','Point'], paint:{'circle-radius':6,'circle-color':'#f2a900','circle-stroke-color':'#000','circle-stroke-width':1.5}});

  // dar ekranda atıf kutusunu kapalı başlat
  document.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  applyMetric();
  renderRank();
  syncLayerChecks();
  checkGepa();
});

// ---------- Altlık seçimi ----------
let currentBm = 'sade';
function setBasemap(k){
  currentBm = k;
  Object.keys(BASEMAPS).forEach(b => setVis('bm-' + b, b === k));
  $$('#basemaps .chip').forEach(c => c.classList.toggle('active', c.dataset.k === k));
}
$('#basemaps').innerHTML = Object.entries(BASEMAPS).map(([k, b]) => `<button class="chip ${k === 'sade' ? 'active' : ''}" data-k="${k}">${b.ad}</button>`).join('');
$('#basemaps').addEventListener('click', e => { const k = e.target.dataset.k; if (k) setBasemap(k); });

// ---------- Katman kutuları ----------
const LAYER_MAP = {
  lyrEdas:['edas-fill','edas-line','edas-label'], lyrIl:['il-line','il-label'], lyrSolar:['solar'], lyrWind:['wind','wind-sea'],
  lyrLines:['oim-lines'], lyrSubs:['oim-subs'], lyrPlants:['oim-plants'], lyrSolarHeat:['oim-solarheat'],
  lyrCorine:['wms-corine'], lyrGepa:['wms-gepa']
};
function syncLayerChecks(){
  Object.entries(LAYER_MAP).forEach(([id, layers]) => layers.forEach(l => setVis(l, $('#' + id).checked)));
  renderLegend();
}
Object.keys(LAYER_MAP).forEach(id => $('#' + id).addEventListener('change', syncLayerChecks));
$('#wmsOpacity').addEventListener('input', e => ['wms-corine','wms-gepa'].forEach(l => map.getLayer(l) && map.setPaintProperty(l, 'raster-opacity', +e.target.value)));
$('#edasMetric').addEventListener('change', () => { applyMetric(); renderLegend(); });

function breaks(key){
  const v = state.edas.features.map(f => f.properties[key]).sort((a, b) => a - b);
  const q = p => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))];
  return [q(0), q(0.33), q(0.66), q(1)];
}
function applyMetric(){
  if (!state.edas) return;
  const key = $('#edasMetric').value, m = METRICS[key], b = breaks(key);
  // eşit olmayan kırılımlarda sıralamayı garanti et
  for (let i = 1; i < b.length; i++) if (b[i] <= b[i - 1]) b[i] = b[i - 1] + 1e-6;
  map.setPaintProperty('edas-fill', 'fill-color', ['interpolate',['linear'],['get',key], b[0],m.ramp[0], b[1],m.ramp[1], b[2],m.ramp[2], b[3],m.ramp[3]]);
  state.breaks = b;
}

function renderLegend(){
  const parts = [];
  if ($('#lyrEdas').checked && state.edas){
    const key = $('#edasMetric').value, m = METRICS[key], b = state.breaks || breaks(key);
    parts.push(`<div class="lt">${m.ad}${m.birim ? ' (' + m.birim + ')' : ''}</div><div class="ramp" style="background:linear-gradient(90deg,${m.ramp.join(',')})"></div><div class="lab"><span>${fmt(b[0], m.d)}</span><span>${fmt(b[3], m.d)}</span></div>`);
  }
  if ($('#lyrWind').checked) parts.push(`<div class="lt" style="margin-top:6px">50 m rüzgâr hızı (m/s)</div><div class="ramp" style="background:linear-gradient(90deg,#f7fbff,#6baed6,#2171b5,#08306b,#3f007d)"></div><div class="lab"><span>2</span><span>7,5+</span></div>`);
  if ($('#lyrSolar').checked) parts.push(`<div class="lt" style="margin-top:6px">Güneş ışınımı (kWh/m²·yıl)</div><div class="ramp" style="background:linear-gradient(90deg,#ffffcc,#fed976,#fd8d3c,#bd0026)"></div><div class="lab"><span>1.400</span><span>1.900</span></div>`);
  if ($('#lyrLines').checked) parts.push(`<div class="lt" style="margin-top:6px">Hat gerilimi</div>
    <div><i class="sw" style="background:#c0392b"></i>380–400 kV</div><div><i class="sw" style="background:#e6550d"></i>200–300 kV</div>
    <div><i class="sw" style="background:#2b8cbe"></i>154 kV</div><div><i class="sw" style="background:#2ca25f"></i>35–100 kV</div><div><i class="sw" style="background:#8a8a8a"></i>&lt;35 kV / bilinmiyor</div>`);
  $('#legend').innerHTML = parts.length ? `<button class="lg-toggle" aria-label="Lejantı aç/kapat">Lejant</button><div class="lg-body">${parts.join('')}</div>` : '';
}
$('#legend').addEventListener('click', () => $('#legend').classList.toggle('open'));
if (window.innerWidth >= 900) $('#legend').classList.add('open');

// ---------- Panel (bottom sheet) ----------
const sheetStates = ['', 'sheet-max', 'sheet-min'];
let sheetIdx = 0;
$('#sheetHandle').addEventListener('click', () => {
  document.body.classList.remove(...sheetStates.filter(Boolean));
  sheetIdx = (sheetIdx + 1) % sheetStates.length;
  if (sheetStates[sheetIdx]) document.body.classList.add(sheetStates[sheetIdx]);
  setTimeout(() => map.resize(), 280);
});
function minimizeSheet(){
  if (window.innerWidth >= 900) return;
  document.body.classList.remove('sheet-max'); document.body.classList.add('sheet-min'); sheetIdx = 2;
  setTimeout(() => map.resize(), 280);
}
function openSheet(){
  document.body.classList.remove('sheet-min','sheet-max'); sheetIdx = 0; setTimeout(() => map.resize(), 280);
}
$$('.tab').forEach(t => t.addEventListener('click', () => {
  $$('.tab').forEach(x => x.classList.toggle('active', x === t));
  $$('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + t.dataset.tab));
  if (document.body.classList.contains('sheet-min')) openSheet();
}));
function goTab(name){ $(`.tab[data-tab="${name}"]`).click(); }

// ---------- Konum ----------
$('#btnLocate').addEventListener('click', () => {
  if (!navigator.geolocation) return alert('Tarayıcı konum desteklemiyor.');
  navigator.geolocation.getCurrentPosition(p => map.flyTo({center:[p.coords.longitude, p.coords.latitude], zoom:15}), () => alert('Konum alınamadı.'), {enableHighAccuracy:true, timeout:10000});
});

// ---------- Tıklama / bilgi kutuları ----------
let selId = null;
function selectEdas(id){
  if (selId != null) map.setFeatureState({source:'edas', id:selId}, {sel:false});
  selId = id; if (id != null) map.setFeatureState({source:'edas', id}, {sel:true});
}
function edasHtml(p){
  return `<div class="pop"><h5>${p.edas}</h5><table>
    <tr><td>İller</td><td style="font-weight:400;font-size:12px">${p.iller}</td></tr>
    <tr><td>Faturalanan tüketim</td><td>${fmt(p.toplam_twh, 2)} TWh</td></tr>
    <tr><td>Türkiye payı</td><td>%${fmt(p.pay, 2)}</td></tr>
    <tr><td>Tüketici sayısı</td><td>${fmt(p.tuketici)}</td></tr>
    <tr><td>Kayıp oranı</td><td>%${fmt(p.kayip, 2)}</td></tr>
    <tr><td>Tüketici başına (dağıtım)</td><td>${fmt(p.kwh_kisi)} kWh</td></tr>
    <tr><td>Ort. güneş ışınımı</td><td>${fmt(p.ghi)} kWh/m²</td></tr></table></div>`;
}
const VAL_LABEL = {solar:'Güneş', wind:'Rüzgâr', hydro:'Hidro', gas:'Doğalgaz', coal:'Kömür', geothermal:'Jeotermal', nuclear:'Nükleer', biomass:'Biyokütle'};

map.on('click', (e) => {
  if (state.mode === 'point') return setGesPoint(e.lngLat);
  if (state.mode === 'draw') return addVertex(e.lngLat);
  if (state.mode) return; // diğer modlar (karşılaştırma vb.) modules.js'de işlenir

  const layers = ['oim-plants','oim-subs','oim-lines','edas-fill'].filter(l => map.getLayer(l) && map.getLayoutProperty(l, 'visibility') !== 'none');
  const bb = [[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]];
  const fs = map.queryRenderedFeatures(bb, {layers});
  if (!fs.length) return;
  const f = fs[0], p = f.properties;
  let html, item;
  if (f.layer.id === 'edas-fill'){
    selectEdas(f.id);
    html = edasHtml(p);
    item = {tip:'bolge', baslik:p.edas, html:edasHtml(p)};
  } else {
    const ad = p.name || p['name:tr'] || '(adsız)';
    const num = v => { const n = parseFloat(v); return isNaN(n) ? v : fmt(n, n % 1 ? 1 : 0); };
    const FIELDS = [['operator','İşletmeci'],['voltage','Gerilim',v => num(v) + ' kV'],['source','Kaynak',v => VAL_LABEL[v] || v],['method','Yöntem'],
      ['output','Güç',v => num(v) + ' MW'],['substation','Tür',v => ({transmission:'İletim', distribution:'Dağıtım', generation:'Üretim'}[v] || v)],
      ['circuits','Devre'],['start_date','Devreye alma'],['frequency','Frekans',v => num(v) + ' Hz']];
    const rows = FIELDS.filter(([k]) => p[k] !== undefined && p[k] !== '' && p[k] !== null)
      .map(([k, lbl, fn]) => `<tr><td>${lbl}</td><td>${fn ? fn(p[k]) : p[k]}</td></tr>`).join('')
      + (p.osm_id ? `<tr><td>OSM</td><td><a href="https://www.openstreetmap.org/${p.is_node ? 'node' : p.osm_id < 0 ? 'relation' : 'way'}/${Math.abs(p.osm_id)}" target="_blank" rel="noopener">kaydı aç</a></td></tr>` : '');
    const tur = f.layer.id === 'oim-plants' ? 'Santral' : f.layer.id === 'oim-subs' ? 'Trafo merkezi' : 'Enerji hattı';
    html = `<div class="pop"><h5>${tur}: ${ad}</h5><table>${rows}</table><small class="muted">Kaynak: OpenStreetMap (gönüllü veri)</small></div>`;
    item = {tip:'osm', baslik:`${tur}: ${ad}`, html};
  }
  const div = document.createElement('div');
  div.innerHTML = html + '<button class="btn primary">+ Rapora ekle</button>';
  div.querySelector('button').onclick = () => { addReport(item); popup.remove(); };
  if (item.tip === 'bolge' && window.ENAREN_MOD){
    const b2 = document.createElement('button'); b2.className = 'btn'; b2.style.marginLeft = '6px'; b2.textContent = '📄 Bölge raporu';
    b2.onclick = () => { popup.remove(); window.ENAREN_MOD.bolgeRaporu(p.edas); };
    div.appendChild(b2);
  }
  const popup = new maplibregl.Popup({maxWidth:'290px'}).setLngLat(e.lngLat).setDOMContent(div).addTo(map);
});
map.on('mousemove', (e) => {
  const l = ['edas-fill','oim-subs','oim-plants'].filter(x => map.getLayer(x) && map.getLayoutProperty(x, 'visibility') !== 'none');
  map.getCanvas().style.cursor = state.mode ? 'crosshair' : (map.queryRenderedFeatures(e.point, {layers:l}).length ? 'pointer' : '');
});

// ---------- Mod bandı ----------
function setMode(m, text){
  state.mode = m;
  $('#modeBanner').textContent = text || '';
  $('#modeBanner').classList.toggle('hidden', !m);
  $('#btnPickPoint').classList.toggle('on', m === 'point');
  $('#btnDraw').classList.toggle('on', m === 'draw');
  $('#btnDrawDone').classList.toggle('hidden', m !== 'draw');
}

// ---------- Çatı GES hesaplayıcı ----------
$('#btnPickPoint').onclick = () => {
  if (state.mode === 'point') return setMode(null);
  setMode('point', 'Haritada GES noktasını seçin');
  minimizeSheet();
};
$('#btnDraw').onclick = () => {
  if (state.mode === 'draw') { setMode(null); return; }
  state.draw = []; updateDraw();
  setMode('draw', 'Çatı köşelerine dokunun, sonra “Bitir”');
  if (currentBm === 'sade' || currentBm === 'osm') setBasemap('uydu');
  if (map.getZoom() < 16) map.flyTo({zoom:18, center: map.getCenter()});
  minimizeSheet();
  showDoneFloating(true);
};
let floatDone;
function showDoneFloating(on){
  if (!floatDone){
    floatDone = document.createElement('button');
    floatDone.className = 'btn primary'; floatDone.textContent = '✓ Çizimi bitir';
    Object.assign(floatDone.style, {position:'fixed', left:'50%', transform:'translateX(-50%)', bottom:'110px', zIndex:16, boxShadow:'0 2px 8px rgba(0,0,0,.25)'});
    floatDone.onclick = finishDraw; document.body.appendChild(floatDone);
  }
  floatDone.classList.toggle('hidden', !on);
}
$('#btnDrawDone').onclick = finishDraw;

function addVertex(ll){ state.draw.push([ll.lng, ll.lat]); updateDraw(); }
function updateDraw(){
  const fs = state.draw.map(c => ({type:'Feature', geometry:{type:'Point', coordinates:c}, properties:{}}));
  if (state.draw.length >= 2) fs.push({type:'Feature', geometry:{type:'LineString', coordinates:state.draw}, properties:{}});
  if (state.draw.length >= 3) fs.push({type:'Feature', geometry:{type:'Polygon', coordinates:[[...state.draw, state.draw[0]]]}, properties:{}});
  map.getSource('draw')?.setData({type:'FeatureCollection', features:fs});
}
// küresel poligon alanı (m²)
function ringArea(c){
  const R = 6378137, rad = Math.PI / 180; let a = 0;
  for (let i = 0; i < c.length; i++){
    const [x1, y1] = c[i], [x2, y2] = c[(i + 1) % c.length];
    a += (x2 - x1) * rad * (2 + Math.sin(y1 * rad) + Math.sin(y2 * rad));
  }
  return Math.abs(a * R * R / 2);
}
function finishDraw(){
  showDoneFloating(false);
  if (state.draw.length < 3){ setMode(null); return alert('En az 3 köşe gerekli.'); }
  const area = ringArea(state.draw);
  $('#gesArea').value = Math.round(area);
  const cx = state.draw.reduce((s, c) => s + c[0], 0) / state.draw.length, cy = state.draw.reduce((s, c) => s + c[1], 0) / state.draw.length;
  setMode(null); openSheet(); goTab('analiz');
  setGesPoint({lng:cx, lat:cy}, true);
}

async function setGesPoint(ll, keepDraw){
  setMode(null); openSheet(); goTab('analiz');
  state.gesPoint = [ll.lng, ll.lat];
  if (!keepDraw){ state.draw = []; map.getSource('draw').setData({type:'FeatureCollection', features:[{type:'Feature', geometry:{type:'Point', coordinates:state.gesPoint}, properties:{}}]}); }
  $('#gesResult').innerHTML = 'NASA POWER’dan güneş ışınımı alınıyor…';
  try {
    const u = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${ll.lng.toFixed(4)}&latitude=${ll.lat.toFixed(4)}&format=JSON`;
    const j = await fetch(u).then(r => r.json());
    state.gesGhi = j.properties.parameter.ALLSKY_SFC_SW_DWN.ANN; // kWh/m²/gün
  } catch (err) {
    // yedek: en yakın il ortalaması
    const pt = state.gesPoint; let best = null, bd = 1e9;
    state.il.features.forEach(f => { const c = centroid(f.geometry); const d = (c[0] - pt[0]) ** 2 + (c[1] - pt[1]) ** 2; if (d < bd){ bd = d; best = f; } });
    state.gesGhi = best ? best.properties.ghi_gun : 4.4;
  }
  calcGes();
}
function centroid(g){
  const c = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates[0][0];
  return [c.reduce((s, p) => s + p[0], 0) / c.length, c.reduce((s, p) => s + p[1], 0) / c.length];
}
function calcGes(){
  if (state.gesGhi == null) return;
  const A = +$('#gesArea').value, use = +$('#gesUse').value / 100, kwpm2 = +$('#gesKwp').value, pr = +$('#gesPr').value, tilt = +$('#gesTilt').value, home = +$('#gesHome').value;
  const ghiYil = state.gesGhi * 365;
  const kwp = A * use * kwpm2;
  const yield1 = ghiYil * tilt * pr; // kWh/kWp
  const kwh = kwp * yield1;
  const il = whichFeature(state.il, state.gesPoint), ed = whichFeature(state.edas, state.gesPoint);
  state.lastGes = {A, kwp, kwh, ghiYil, yield1, homes: kwh / home, co2: kwh * 0.44 / 1000, il: il?.properties.il, edas: ed?.properties.edas};
  const r = state.lastGes;
  $('#gesResult').classList.remove('muted');
  $('#gesResult').innerHTML = `<div class="kpi">
    <div><strong>${fmt(r.kwp, 1)} kWp</strong><span>kurulu güç</span></div>
    <div><strong>${fmt(r.kwh)} kWh</strong><span>yıllık üretim</span></div>
    <div><strong>${fmt(r.homes, 1)}</strong><span>hane eşdeğeri</span></div>
    <div><strong>${fmt(r.co2, 1)} t</strong><span>CO₂ kaçınımı/yıl*</span></div></div>
    Konum: <b>${r.il || '–'}</b> · ${r.edas || ''}<br>Işınım: <b>${fmt(r.ghiYil)} kWh/m²·yıl</b> · Özgül verim: <b>${fmt(r.yield1)} kWh/kWp</b><br>
    <small class="muted">*0,44 kg CO₂/kWh şebeke emisyon faktörü varsayımı. Ön fizibilite tahminidir; gölge, yön ve eğim yerinde doğrulanmalı.</small>`;
  $('#btnGesReport').classList.remove('hidden');
}
['#gesArea','#gesUse','#gesKwp','#gesPr','#gesTilt','#gesHome'].forEach(s => $(s).addEventListener('input', calcGes));
$('#btnGesReport').onclick = () => {
  const r = state.lastGes; if (!r) return;
  addReport({tip:'ges', baslik:`Çatı GES ön değerlendirmesi – ${r.il || ''}`, html:`<table class="t">
    <tr><td>Konum</td><td>${state.gesPoint.map(v => v.toFixed(5)).join(', ')} (${r.il || ''}, ${r.edas || ''})</td></tr>
    <tr><td>Çatı alanı</td><td>${fmt(r.A)} m²</td></tr><tr><td>Kurulu güç</td><td>${fmt(r.kwp, 1)} kWp</td></tr>
    <tr><td>Yıllık ışınım</td><td>${fmt(r.ghiYil)} kWh/m²</td></tr><tr><td>Yıllık üretim</td><td>${fmt(r.kwh)} kWh</td></tr>
    <tr><td>Hane eşdeğeri</td><td>${fmt(r.homes, 1)}</td></tr><tr><td>CO₂ kaçınımı</td><td>${fmt(r.co2, 1)} t/yıl</td></tr></table>`});
};

// nokta-poligon
function inRing(pt, ring){ let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++){ const [xi, yi] = ring[i], [xj, yj] = ring[j]; if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c; } return c; }
function whichFeature(fc, pt){
  if (!fc || !pt) return null;
  return fc.features.find(f => { const g = f.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; return polys.some(p => inRing(pt, p[0])); });
}

// ---------- Görünüm altyapı özeti ----------
function lineLenKm(coords){ let s = 0; for (let i = 1; i < coords.length; i++){ const [x1, y1] = coords[i - 1], [x2, y2] = coords[i]; const dx = (x2 - x1) * Math.cos((y1 + y2) / 2 * Math.PI / 180) * 111.32, dy = (y2 - y1) * 110.57; s += Math.hypot(dx, dy); } return s; }
$('#btnViewStats').onclick = () => {
  ['#lyrLines','#lyrSubs','#lyrPlants'].forEach(s => { if (!$(s).checked){ $(s).checked = true; } });
  syncLayerChecks();
  $('#viewStats').innerHTML = 'Analiz ediliyor…';
  setTimeout(() => {
    const seen = new Set(), lines = {}, plants = {}; let subs = 0, solarMW = 0;
    const key = f => f.layer.id + ':' + (f.id ?? JSON.stringify(f.properties));
    map.queryRenderedFeatures({layers:['oim-subs']}).forEach(f => { const k = key(f); if (!seen.has(k)){ seen.add(k); subs++; } });
    map.queryRenderedFeatures({layers:['oim-plants']}).forEach(f => {
      const k = key(f); if (seen.has(k)) return; seen.add(k);
      const s = f.properties.source || f.properties['plant:source'] || 'diğer';
      plants[s] = (plants[s] || 0) + 1;
      if (s === 'solar'){ const o = parseFloat(String(f.properties.output || '').replace(',', '.')); if (!isNaN(o)) solarMW += o; }
    });
    map.queryRenderedFeatures({layers:['oim-lines']}).forEach(f => {
      const v = +f.properties.voltage || 0; const cls = v >= 300 ? '380–400 kV' : v >= 200 ? '200–300 kV' : v >= 100 ? '154 kV' : v >= 35 ? '35–100 kV' : '<35 kV / bilinmiyor';
      const g = f.geometry; const parts = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
      lines[cls] = (lines[cls] || 0) + parts.reduce((s, c) => s + lineLenKm(c), 0);
    });
    const b = map.getBounds(); const ed = whichFeature(state.edas, [map.getCenter().lng, map.getCenter().lat]);
    const plantTxt = Object.entries(plants).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${VAL_LABEL[k] || k}: ${v}`).join(', ') || '–';
    const lineTxt = Object.entries(lines).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ~${fmt(v)} km`).join('<br>') || '–';
    state.lastView = {html:`<table class="t">
      <tr><td>Merkez</td><td>${map.getCenter().lat.toFixed(3)}, ${map.getCenter().lng.toFixed(3)} · ${ed ? ed.properties.edas : ''} · zoom ${map.getZoom().toFixed(1)}</td></tr>
      <tr><td>Trafo merkezi</td><td>${fmt(subs)}</td></tr><tr><td>Santraller</td><td>${plantTxt}</td></tr>
      <tr><td>Güneş santrali gücü (OSM'de girilmiş)</td><td>${fmt(solarMW, 1)} MW</td></tr><tr><td>Hat uzunluğu</td><td>${lineTxt}</td></tr></table>
      <small class="muted">OpenStreetMap gönüllü verisidir; resmi TEİAŞ/EDAŞ envanteri değildir. Hat uzunlukları görünür karo geometrisinden yaklaşık hesaplanır.</small>`};
    $('#viewStats').classList.remove('muted'); $('#viewStats').innerHTML = state.lastView.html;
    $('#btnViewReport').classList.remove('hidden');
    if (map.getZoom() < 7) $('#viewStats').insertAdjacentHTML('afterbegin', '<p class="hint">⚠ Düşük yakınlaştırmada küçük öğeler gösterilmez; ayrıntı için yakınlaştırın.</p>');
  }, 400);
};
$('#btnViewReport').onclick = () => state.lastView && addReport({tip:'gorunum', baslik:'Görünümdeki enerji altyapısı özeti', html:state.lastView.html});

// ---------- Bölge karşılaştırma ----------
function renderRank(){
  if (!state.edas) return;
  const key = $('#rankMetric').value, m = METRICS[key];
  const rows = state.edas.features.map(f => f.properties).sort((a, b) => b[key] - a[key]);
  const max = rows[0][key];
  $('#rankList').innerHTML = rows.map(p => `<div class="bar" data-e="${p.edas}"><span>${p.edas.replace(' EDAŞ', '')}</span><div class="t"><i style="width:${(p[key] / max * 100).toFixed(1)}%"></i></div><span class="v">${fmt(p[key], m.d)}</span></div>`).join('')
    + `<p class="hint">Birim: ${m.birim || 'adet'}. Kaynak: ELDER Elektrik Dağıtım Sektör Raporu 2024${key === 'ghi' ? '; ışınım NASA POWER' : ''}. İstanbul'daki iki bölge (Boğaziçi, AYEDAŞ) il düzeyinde birleşik gösterilir.</p>`;
}
$('#rankMetric').addEventListener('change', renderRank);
$('#rankList').addEventListener('click', e => {
  const b = e.target.closest('.bar'); if (!b) return;
  const f = state.edas.features.find(x => x.properties.edas === b.dataset.e);
  const bb = bbox(f.geometry); map.fitBounds(bb, {padding:30}); selectEdas(f.id); minimizeSheet();
});
function bbox(g){ let x0 = 180, y0 = 90, x1 = -180, y1 = -90; const walk = a => typeof a[0] === 'number' ? (x0 = Math.min(x0, a[0]), y0 = Math.min(y0, a[1]), x1 = Math.max(x1, a[0]), y1 = Math.max(y1, a[1])) : a.forEach(walk); walk(g.coordinates); return [[x0, y0], [x1, y1]]; }
$('#btnRankReport').onclick = () => {
  const key = $('#rankMetric').value, m = METRICS[key];
  const rows = state.edas.features.map(f => f.properties).sort((a, b) => b[key] - a[key]);
  addReport({tip:'sira', baslik:`Bölge sıralaması – ${m.ad}${m.birim ? ' (' + m.birim + ')' : ''}`, html:`<table class="t">${rows.map((p, i) => `<tr><td>${i + 1}. ${p.edas}</td><td>${fmt(p[key], m.d)}</td></tr>`).join('')}</table>`});
};

// ---------- Rapor ----------
function addReport(item){
  item.zaman = new Date().toLocaleString('tr-TR');
  state.report.push(item); renderReport();
  toast('Rapora eklendi');
}
function renderReport(){
  $('#reportCount').textContent = state.report.length;
  $('#reportCount').classList.toggle('hidden', !state.report.length);
  $('#repItems').innerHTML = state.report.length ? state.report.map((r, i) => `<div class="rep-item"><button class="x" data-i="${i}" aria-label="Kaldır">×</button><h6>${r.baslik}</h6>${r.img ? `<img src="${r.img}" alt="Harita görüntüsü">` : r.html}</div>`).join('')
    : '<p class="muted">Rapor boş. Analiz sekmesinden ya da haritadaki bilgi kutularından öğe ekleyin.</p>';
}
$('#repItems').addEventListener('click', e => { if (e.target.classList.contains('x')){ state.report.splice(+e.target.dataset.i, 1); renderReport(); } });
$('#btnClear').onclick = () => { if (confirm('Rapor temizlensin mi?')){ state.report = []; renderReport(); } };
$('#btnSnap').onclick = () => {
  map.once('render', () => {
    try {
      const img = map.getCanvas().toDataURL('image/jpeg', 0.85);
      const c = map.getCenter();
      addReport({tip:'harita', baslik:`Harita görünümü (${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}, z${map.getZoom().toFixed(1)})`, img});
    } catch (err) { alert('Bu katman kombinasyonunda görüntü alınamadı (servis CORS izni vermiyor). GEPA katmanını kapatıp tekrar deneyin.'); }
  });
  map.triggerRepaint();
};
$('#btnPrint').onclick = () => {
  const lyr = Object.entries(LAYER_MAP).filter(([id]) => $('#' + id).checked).map(([id]) => $(`#${id}`).parentElement.textContent.trim().split('\n')[0].replace(/kontrol ediliyor…|erişilebilir|erişilemiyor/g, '').trim());
  $('#printArea').innerHTML = `<h1>${escapeHtml($('#repTitle').value)}</h1>
    <div class="meta">ENAREN Enerji WebGIS demo · ${new Date().toLocaleString('tr-TR')} · Altlık: ${BASEMAPS[currentBm].ad} · Katmanlar: ${lyr.join(', ')}</div>
    ${$('#repNote').value ? `<div class="rep-item"><h6>Değerlendirme</h6><p>${escapeHtml($('#repNote').value).replace(/\n/g, '<br>')}</p></div>` : ''}
    ${state.report.map(r => `<div class="rep-item"><h6>${r.baslik}</h6>${r.img ? `<img src="${r.img}">` : r.html}</div>`).join('')}
    <div class="foot">Veri kaynakları: ELDER Elektrik Dağıtım Sektör Raporu 2024 (EPDK verisi), NASA POWER (2001–2025 klimatoloji), OpenStreetMap/OpenInfraMap, Copernicus CORINE 2018, Esri / EOX Sentinel-2 cloudless. Bu çıktı demo amaçlı ön değerlendirmedir.</div>`;
  setTimeout(() => window.print(), 100);
};
$('#btnShare').onclick = async () => {
  const url = location.href;
  try { if (navigator.share) await navigator.share({title:'ENAREN Enerji WebGIS', url}); else { await navigator.clipboard.writeText(url); toast('Bağlantı kopyalandı'); } } catch (e) {}
};
function escapeHtml(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c])); }
function toast(t){
  const d = document.createElement('div'); d.textContent = t;
  Object.assign(d.style, {position:'fixed', left:'50%', top:'70px', transform:'translateX(-50%)', background:'#1d2733', color:'#fff', padding:'8px 14px', borderRadius:'18px', zIndex:50, fontSize:'13px'});
  document.body.appendChild(d); setTimeout(() => d.remove(), 1600);
}

// ---------- Enstitü sekmesi ----------
const E = window.ENAREN;
$('#enstituContent').innerHTML = `
  <h4>${E.baslik}</h4><p class="lead">${E.ozet}</p>
  <p class="hint"><b>Başkan:</b> ${E.baskan}</p>
  <h3>Görev tanımı</h3>${E.gorevler.map(([t, d]) => `<div class="duty"><b>${t}</b><span>${d}</span></div>`).join('')}
  <h3>Durum notları</h3><ul class="notes">${E.notlar.map(n => `<li>${n}</li>`).join('')}</ul>
  <h3>Önerilen pilot projeler</h3>${E.pilotlar.map(([t, d]) => `<div class="duty"><b>${t}</b><span>${d}</span></div>`).join('')}
  <p class="hint">Kaynaklar: tenmak.gov.tr/enerji-arastirma-enstitusu · Sayıştay TENMAK 2024 Denetim Raporu · ETKB 2024 Faaliyet Raporu.</p>`;

// ---------- Kaynaklar sekmesi ----------
const ERISIM = {acik:'Açık', kurumsal:'Kurumsal giriş', protokol:'Protokol', bozuk:'Şu an erişilemiyor'};
function renderSources(f = 'hepsi'){
  $('#srcList').innerHTML = E.kaynaklar.filter(s => f === 'hepsi' || s.tip === f).map(s => `<div class="src">
    <div class="h"><b>${s.ad}</b><span class="tag ${s.erisim}" ${s.test ? `data-test="${s.test}"` : ''}>${ERISIM[s.erisim]}</span></div>
    <small>${s.kurum} · ${s.tip === 'ulusal' ? 'Ulusal' : 'Uluslararası'}</small><p>${s.not}</p><a href="${s.url}" target="_blank" rel="noopener">${s.url}</a></div>`).join('');
}
renderSources();
$('#srcFilter').addEventListener('click', e => { const f = e.target.dataset.f; if (!f) return; $$('#srcFilter .chip').forEach(c => c.classList.toggle('active', c === e.target)); renderSources(f); });

const TESTS = {
  gepa: () => testImg(wmsUrl(GEPA_WMS, '0').replace('{bbox-epsg-3857}', '3600000,4700000,3700000,4800000')),
  eox: () => testImg('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/6/24/38.jpg'),
  corine: () => testImg(wmsUrl(CORINE_WMS, '12').replace('{bbox-epsg-3857}', '3600000,4700000,3700000,4800000')),
  oim: () => fetch('https://openinframap.org/tiles/6/38/24.pbf').then(r => r.ok),
  gsa: () => fetch('https://api.globalsolaratlas.info/data/lta?loc=39.92,32.85').then(r => r.ok),
  tkgm: () => fetch('https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/idariYapi/ilceListe/28').then(r => r.status === 200 || r.status === 403),
  power: () => fetch('https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=32.85&latitude=39.93&format=JSON').then(r => r.ok)
};
function testImg(u){ return new Promise(ok => { const i = new Image(); const t = setTimeout(() => ok(false), 12000); i.onload = () => { clearTimeout(t); ok(i.width > 0); }; i.onerror = () => { clearTimeout(t); ok(false); }; i.src = u; }); }
async function runTest(k){ try { return await TESTS[k](); } catch (e) { return false; } }
$('#btnTestAll').onclick = async () => {
  for (const el of $$('[data-test]')){
    el.textContent = 'test…'; el.className = 'tag';
    const ok = await runTest(el.dataset.test);
    el.textContent = ok ? '✓ Çalışıyor' : '✗ Yanıt yok'; el.className = 'tag ' + (ok ? 'acik' : 'bozuk');
  }
};
window.ENAREN_APP = { map, state, addReport, fmt, setVis, goTab, minimizeSheet, openSheet, whichFeature, selectEdas, bbox, applyMetric, renderLegend, syncLayerChecks, METRICS, LAYER_MAP, setBasemap, edasHtml, centroid, ringArea, toast };
async function checkGepa(){
  const ok = await runTest('gepa');
  const s = $('#gepaStatus'); s.textContent = ok ? 'erişilebilir' : 'erişilemiyor'; s.className = 'status ' + (ok ? 'ok' : 'bad');
  if (!ok) s.title = 'TUCBS public API arka uçtaki ETKB sunucusuna ulaşamıyor. Yedek: NASA POWER güneş katmanı.';
}
})();
