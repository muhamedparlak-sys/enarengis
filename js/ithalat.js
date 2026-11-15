/* ENAREN WebGIS – İthalat koridorları, LNG terminalleri, ara bağlantılar, depolama; kara sınırı;
 * enerji türüne göre filtre. Güzergâhlar temsilîdir (giriş noktaları yaklaşık). */
(() => {
'use strict';
const A = window.ENAREN_APP;
const { map, state, fmt } = A;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// tip: gaz | petrol | lng | elektrik ; yön: yurtdışı → giriş noktası
const KORIDOR = [
  ['TürkAkım', 'gaz', [[30.6, 43.1], [29.4, 42.3], [28.1, 41.63]], 'Rusya → Kıyıköy (Kırklareli). 31,5 milyar m³/yıl kapasite (2 hat).'],
  ['Mavi Akım', 'gaz', [[37.6, 43.4], [36.9, 42.4], [36.2, 41.31]], 'Rusya → Durusu (Samsun), Karadeniz geçişi.'],
  ['TANAP / Güney Kafkasya', 'gaz', [[43.6, 41.75], [43.0, 41.62], [42.75, 41.55]], 'Azerbaycan (Şah Deniz) → Türkgözü (Ardahan) → Eskişehir → Avrupa.'],
  ['İran–Türkiye gaz hattı', 'gaz', [[45.4, 39.3], [44.8, 39.5], [44.35, 39.6]], 'İran → Gürbulak (Ağrı) → Ankara.'],
  ['Bakü–Tiflis–Ceyhan (BTC)', 'petrol', [[43.6, 41.85], [43.1, 41.65], [42.78, 41.5]], 'Azerbaycan ham petrolü → Ceyhan terminali (geçiş/ihracat).'],
  ['Irak–Türkiye ham petrol hattı', 'petrol', [[43.4, 36.7], [42.8, 37.0], [42.36, 37.13]], 'Kerkük → Habur (Silopi) → Ceyhan.'],
  ['LNG: Marmara Ereğlisi', 'lng', [[25.4, 39.6], [26.2, 40.05], [27.0, 40.6], [27.95, 40.96]], 'BOTAŞ LNG terminali (Çanakkale Boğazı üzerinden gemiyle).'],
  ['LNG: Aliağa (Egegaz) + FSRU', 'lng', [[25.2, 38.6], [26.2, 38.75], [26.94, 38.79]], 'Ege üzerinden LNG gemileri.'],
  ['LNG FSRU: Dörtyol', 'lng', [[34.8, 35.6], [35.7, 36.4], [36.2, 36.83]], 'Yüzer depolama ve gazlaştırma ünitesi (Hatay).'],
  ['LNG FSRU: Saros', 'lng', [[25.3, 40.2], [26.0, 40.45], [26.6, 40.6]], 'Yüzer depolama ve gazlaştırma ünitesi (Saros Körfezi). Konum yaklaşık.'],
  ['Elektrik: Bulgaristan ara bağlantısı', 'elektrik', [[26.2, 42.35], [26.6, 42.05], [26.95, 41.85]], 'ENTSO-E senkron bağlantısı (Avrupa şebekesi). Çift yönlü.'],
  ['Elektrik: Yunanistan ara bağlantısı', 'elektrik', [[25.95, 41.25], [26.3, 41.35], [26.65, 41.45]], 'ENTSO-E senkron bağlantısı. Çift yönlü.'],
  ['Elektrik: Gürcistan (Borçka)', 'elektrik', [[42.2, 41.75], [41.9, 41.55], [41.68, 41.36]], 'Asenkron (back-to-back) bağlantı. Çift yönlü.']
];
const DEPO = [
  ['Silivri yeraltı gaz depolama', 'gaz', 28.2, 41.02, 'Tükenmiş deniz altı gaz sahası.'],
  ['Tuz Gölü gaz depolama', 'gaz', 33.4, 38.6, 'Tuz mağarası depolama. Konum yaklaşık.'],
  ['Marmara Ereğlisi LNG depolama', 'lng', 27.95, 40.96, 'LNG tankları.'],
  ['Aliağa LNG depolama', 'lng', 26.94, 38.79, 'LNG tankları.'],
  ['Ceyhan petrol terminali', 'petrol', 35.93, 36.88, 'BTC ve Irak hatlarının deniz terminali, depolama.'],
  ['Batarya depolama (OSM\'de kayıtlı tesisler)', 'batarya', null, null, 'Depolamalı GES/RES projeleri — Türkiye\'de 33 GW depolamalı proje stoku (Ember).']
];
const RENK = {gaz:'#d95f02', petrol:'#1a1a1a', lng:'#1b9e77', elektrik:'#7570b3', batarya:'#e7298a'};
const AD = {gaz:'Doğal gaz boru hattı', petrol:'Ham petrol boru hattı', lng:'LNG (gemi rotası)', elektrik:'Elektrik ara bağlantısı', batarya:'Batarya depolama'};

function waitReady(fn){ const t = setInterval(() => { if (state.edas && map.isStyleLoaded() && map.getLayer('santral')){ clearInterval(t); fn(); } }, 300); }
const DASH = [[0,4,3],[0.5,4,2.5],[1,4,2],[1.5,4,1.5],[2,4,1],[2.5,4,0.5],[3,4,0],[0,0.5,3,3.5],[0,1,3,3],[0,1.5,3,2.5],[0,2,3,2],[0,2.5,3,1.5],[0,3,3,1],[0,3.5,3,0.5]];
let timer = null;
waitReady(async () => {
  // kara sınırı
  const sinir = await fetch('data/tr_sinir.geojson?v=18').then(r => r.json());
  map.addSource('trsinir', {type:'geojson', data:sinir});
  map.addLayer({id:'trsinir', type:'line', source:'trsinir', layout:{visibility:'none'}, paint:{'line-color':'#0f3d5e','line-width':2.2}}, 'dyetki');
  // OSM boru hatları (OpenInfraMap)
  map.addLayer({id:'boru-osm', type:'line', source:'oim', 'source-layer':'petroleum_pipeline', layout:{visibility:'none'}, paint:{
    'line-color':['match',['get','substance'],'gas','#d95f02','oil','#1a1a1a','#8a5a00'], 'line-width':['interpolate',['linear'],['zoom'],5,1,10,2.5], 'line-opacity':0.8}}, 'santral');
  // koridorlar
  const kf = KORIDOR.map(([ad, tip, coords, not]) => ({type:'Feature', geometry:{type:'LineString', coordinates:coords}, properties:{ad, tip, not}}));
  map.addSource('koridor', {type:'geojson', data:{type:'FeatureCollection', features:kf}});
  map.addLayer({id:'koridor-bg', type:'line', source:'koridor', layout:{visibility:'none','line-cap':'round'}, paint:{'line-color':['match',['get','tip'],'gaz',RENK.gaz,'petrol',RENK.petrol,'lng',RENK.lng,RENK.elektrik],'line-width':7,'line-opacity':0.18}}, 'santral');
  map.addLayer({id:'koridor', type:'line', source:'koridor', layout:{visibility:'none'}, paint:{'line-color':['match',['get','tip'],'gaz',RENK.gaz,'petrol',RENK.petrol,'lng',RENK.lng,RENK.elektrik],'line-width':3.5,'line-dasharray':[0,4,3]}}, 'santral');
  const ends = kf.map(f => ({type:'Feature', geometry:{type:'Point', coordinates:f.geometry.coordinates.at(-1)}, properties:f.properties}));
  const depo = DEPO.filter(d => d[2] != null).map(([ad, tip, x, y, not]) => ({type:'Feature', geometry:{type:'Point', coordinates:[x, y]}, properties:{ad, tip, not, depo:true}}));
  map.addSource('giris', {type:'geojson', data:{type:'FeatureCollection', features:[...ends, ...depo]}});
  map.addLayer({id:'giris', type:'circle', source:'giris', layout:{visibility:'none'}, paint:{'circle-radius':['case',['get','depo'],8,6],'circle-color':['case',['get','depo'],'#ffffff',['match',['get','tip'],'gaz',RENK.gaz,'petrol',RENK.petrol,'lng',RENK.lng,RENK.elektrik]],'circle-stroke-color':['match',['get','tip'],'gaz',RENK.gaz,'petrol',RENK.petrol,'lng',RENK.lng,RENK.elektrik],'circle-stroke-width':['case',['get','depo'],4,2]}});
  map.addLayer({id:'giris-lbl', type:'symbol', source:'giris', minzoom:5.5, layout:{visibility:'none','text-field':['get','ad'],'text-size':10.5,'text-font':['Open Sans Semibold'],'text-offset':[0,1.3],'text-anchor':'top','text-optional':true}, paint:{'text-color':'#1d2733','text-halo-color':'#fff','text-halo-width':1.4}});
  // batarya depolama: OSM santralleri içinde source=battery
  map.addLayer({id:'batarya', type:'circle', source:'oim', 'source-layer':'power_plant_point', filter:['==',['get','source'],'battery'], layout:{visibility:'none'}, paint:{'circle-radius':6,'circle-color':RENK.batarya,'circle-stroke-color':'#fff','circle-stroke-width':1.5}});
  Object.assign(A.LAYER_MAP, {lyrIthal:['koridor','koridor-bg','giris','giris-lbl','boru-osm','batarya']});
  const old = A.LAYER_MAP.lyrDyetki || []; if (!old.includes('trsinir')) A.LAYER_MAP.lyrDyetki = [...old, 'trsinir'];
  $('#lyrIthal').addEventListener('change', () => { A.syncLayerChecks(); anim($('#lyrIthal').checked); });
  ['koridor','giris'].forEach(l => map.on('click', l, e => {
    if (state.mode) return; const p = e.features[0].properties;
    new maplibregl.Popup({maxWidth:'280px'}).setLngLat(e.lngLat).setHTML(`<div class="pop"><h5>${esc(p.ad)}</h5><p style="margin:0;font-size:12.5px">${esc(AD[p.tip] || p.tip)}${p.depo ? ' · depolama' : ''}</p><p style="margin:6px 0 0;font-size:12.5px">${esc(p.not)}</p><small class="muted">Güzergâh temsilîdir; gerçek hatlar "OSM boru hatları" çizgileridir.</small></div>`).addTo(map);
  }));
  A.syncLayerChecks();
});
function anim(on){
  clearInterval(timer); if (!on) return; let i = 0;
  timer = setInterval(() => { i = (i + 1) % DASH.length; map.getLayer('koridor') && map.setPaintProperty('koridor', 'line-dasharray', DASH[i]); }, 90);
}

// ---------------- UI: katman satırı + lejant + enerji türü filtresi ----------------
const kat = $('#pane-katman');
const h3 = [...kat.querySelectorAll('h3')].find(h => /Deniz/.test(h.textContent));
h3.insertAdjacentHTML('beforebegin', `
  <h3>Enerji türüne göre filtre (santraller ve projeler)</h3>
  <div class="chips" id="kFiltre"></div>
  <h3>İthalat ve depolama</h3>
  <label class="row"><input type="checkbox" id="lyrIthal"> İthalat koridorları, LNG terminalleri, ara bağlantılar, depolama</label>
  <div class="legend2" style="margin:2px 0 8px">${Object.entries(AD).map(([k, v]) => `<span><i style="background:${RENK[k]}"></i>${v}</span>`).join('')}<span><i style="background:#fff;border:3px solid #555"></i>Depolama tesisi</span></div>`);
// Deniz yetki alanı satırına not
const dy = $('#lyrDyetki')?.parentElement; if (dy) dy.lastChild.textContent = ' Türkiye deniz yetki alanı sınırları + kara sınırı (resmî koordinatlar)';

const FILTRE = [['hepsi','Tümü'],['hidro','Hidro'],['gunes','Güneş'],['ruzgar','Rüzgâr'],['jeotermal','Jeotermal'],['biyokutle','Biyokütle'],['linyit','Yerli kömür'],['ithal_komur','İthal kömür'],['dogalgaz','Doğal gaz'],['nukleer','Nükleer'],['petrol','Petrol'],['maden','Bor / toryum']];
$('#kFiltre').innerHTML = FILTRE.map(([k, l]) => `<button class="chip ${k === 'hepsi' ? 'active' : ''}" data-k="${k}">${l}</button>`).join('');
const secili = new Set();
$('#kFiltre').addEventListener('click', e => {
  const k = e.target.dataset.k; if (!k) return;
  if (k === 'hepsi') secili.clear(); else secili.has(k) ? secili.delete(k) : secili.add(k);
  $$('#kFiltre .chip').forEach(c => c.classList.toggle('active', c.dataset.k === 'hepsi' ? secili.size === 0 : secili.has(c.dataset.k)));
  applyFilter();
});
function applyFilter(){
  if (!map.getLayer('santral')) return;
  if (!secili.size){ map.setFilter('santral', null); map.setFilter('stratejik', null); return; }
  const keys = [...secili].flatMap(k => k === 'maden' ? ['bor','toryum'] : k === 'dogalgaz' ? ['dogalgaz','dogalgaz_kaynak','depolama','boru'] : k === 'petrol' ? ['petrol','petrol_kaynak'] : k === 'linyit' ? ['linyit','linyit_kaynak'] : [k]);
  const f = ['in', ['get', 'kaynak'], ['literal', keys]];
  map.setFilter('santral', f); map.setFilter('stratejik', f);
  $('#lyrSantral') && ($('#lyrSantral').checked = true); $('#lyrStrat') && ($('#lyrStrat').checked = true); A.syncLayerChecks();
}
window.ENAREN_ITHAL = { applyFilter };
})();
