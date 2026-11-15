/* ENAREN WebGIS – Stratejik çerçeve 2027–2031: 3 amaç, 9 hedef, 27 eylem.
 * Her eylem haritada bir yere, bir katmana ya da bir panele bağlanır; panelde infografik olarak özetlenir.
 * Konumlar öneri / aday niteliğindedir; kesin saha seçimi ilgili eylemin çıktısıdır. */
(() => {
'use strict';
const A = window.ENAREN_APP; const { map, state } = A;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const AMAC = [
  {k:1, ad:'Yerli teknoloji', uzun:'İletim, dağıtım ve depolamada yerli teknolojiyle dışa bağımlılığı azaltmak', renk:'#2b6cb0', hedef2031:'2 yerli şebeke ürünü sahada'},
  {k:2, ad:'Verimlilik ve esneklik', uzun:'Enerji sisteminin verimliliğini, esnekliğini ve arz güvenliğini artırmak', renk:'#c8901a', hedef2031:'Ölçülmüş TWh kazanımı'},
  {k:3, ad:'Veri ve politika', uzun:'Veri ve analizle politikaya bilimsel girdi sağlamak, kurumsal kapasiteyi güçlendirmek', renk:'#2f855a', hedef2031:'2 plana girdi, 3 fonlu proje'}
];
const HEDEF = {
  'H1.1':'Şebeke ekipmanında yerli teknoloji', 'H1.2':'Enerji depolama teknolojileri', 'H1.3':'Test, ölçüm ve sertifikasyon',
  'H2.1':'Kayıp-kaçağı azaltmak', 'H2.2':'Şebeke esnekliği', 'H2.3':'Yeni kaynak alanları',
  'H3.1':'Mekânsal veri altyapısı', 'H3.2':'Politika analizi ve modelleme', 'H3.3':'İşbirliği, fon ve insan kaynağı'
};
// Yerler (öneri / aday)
const Y = {
  ankara:['Ankara (ENAREN, kurumlar)', [32.85, 39.93]],
  konya:['Konya: yüksek GES yoğunluğu (aday pilot)', [32.49, 37.87]],
  karapinar:['Karapınar YEKA GES çevresi (aday test sahası)', [33.53, 37.72]],
  bursa:['Bursa: trafo çekirdeği ve ekipman kümesi', [29.06, 40.19]],
  gebze:['Gebze–Kocaeli: elektrik ekipmanı kümesi', [29.43, 40.80]],
  kayseri:['Kayseri: batarya üretimi (ASPİLSAN)', [35.48, 38.72]],
  bandirma:['Bandırma: Eti Maden bor ve lityum tesisleri', [27.97, 40.35]],
  harran:['Harran–Ceylanpınar: sulama kuyuları', [39.6, 36.85]],
  bismil:['Bismil–Silvan: sulama kuyuları', [40.65, 37.85]],
  ege:['Balıkesir–İzmir: RES yoğunluğu', [27.3, 39.4]],
  istanbul:['İstanbul: talep kaydırma pilotu (aday)', [29.0, 41.03]],
  ataturk:['Atatürk Barajı: yüzer GES pilotu (aday)', [38.32, 37.48]],
  keban:['Keban Barajı (aday)', [38.75, 38.80]]
};
// [kod, hedef, eylem, başlangıç, bitiş, bağ, paydaşlar]
// bağ: {y:[yer...]} | {edas:'Dicle EDAŞ'} | {metric:'kayip'} | {katman:'lyrDpot'} | {pane:'canli'} | {} (ulusal)
const E = [
  ['E1.1.1','H1.1','Katı hal transformatörü prototipini dağıtım şebekesinde saha testine taşımak',2027,2029,{y:['ankara','konya']},'Bir EDAŞ, üniversiteler'],
  ['E1.1.2','H1.1','Verimli dağıtım trafosu için yerli üreticiyle ortak geliştirme',2028,2030,{y:['bursa','gebze']},'Yerli trafo üreticileri, TSE'],
  ['E1.1.3','H1.1','Trafo başı ve akıllı ölçüm cihazı için yerli donanım ve veri standardı',2027,2029,{},'EPDK, EDAŞ\'lar, ELDER'],
  ['E1.2.1','H1.2','Batarya yönetim sistemi ve inverterde yerli çözüm',2027,2030,{y:['kayseri']},'ASPİLSAN, inverter üreticileri'],
  ['E1.2.2','H1.2','Yerli lityum ve bor zincirini depolama ürününe bağlamak',2028,2031,{y:['bandirma']},'Eti Maden, TENMAK BOREN'],
  ['E1.2.3','H1.2','Şebeke ölçekli depolama test sahası kurmak',2029,2031,{y:['karapinar']},'TEİAŞ, EÜAŞ'],
  ['E1.3.1','H1.3','Yüksek ve orta gerilim ekipmanı için ulusal test ihtiyacı analizi',2027,2027,{y:['ankara']},'TSE, TÜBİTAK, üreticiler'],
  ['E1.3.2','H1.3','Akredite test laboratuvarı kurmak veya ortak kullanıma açmak',2028,2030,{y:['ankara']},'TÜRKAK, üniversiteler'],
  ['E1.3.3','H1.3','Yerli üreticilere test ve doğrulama hizmeti',2030,2031,{y:['ankara','gebze']},'EMSAD, PİLDER, GENSED'],
  ['E2.1.1','H2.1','Teknik ve teknik olmayan kaybı ayrıştıran yöntem',2027,2028,{metric:'kayip'},'EPDK, ELDER'],
  ['E2.1.2','H2.1','Dicle bölgesinde trafo başı enerji dengesi pilotu',2027,2029,{edas:'Dicle EDAŞ'},'Dicle EDAŞ'],
  ['E2.1.3','H2.1','Sulama kuyularını güneş enerjili pompaya dönüştürme',2028,2031,{y:['harran','bismil']},'DSİ, Tarım Bakanlığı, kalkınma ajansları'],
  ['E2.2.1','H2.2','Kesilen rüzgâr ve güneş üretimini sürekli izlemek',2027,2027,{pane:'canli'},'EPİAŞ, TEİAŞ'],
  ['E2.2.2','H2.2','Batarya ve pompaj depolama için yer seçimi',2027,2029,{y:['ege','karapinar','keban']},'TEİAŞ, DSİ, EÜAŞ'],
  ['E2.2.3','H2.2','Akıllı şarj ve ısı pompasıyla talep kaydırma pilotu',2029,2031,{y:['istanbul','ankara']},'EDAŞ\'lar, belediyeler'],
  ['E2.3.1','H2.3','Deniz üstü RES ve yüzer GES için aday sahalar',2027,2028,{katman:'lyrDpot'},'ETKB YEKA, SHODB, DKMP'],
  ['E2.3.2','H2.3','Baraj gölü yüzer GES pilotu ve HES hibrit analizi',2028,2031,{katman:'lyrBaraj', y:['ataturk','keban']},'DSİ, EÜAŞ'],
  ['E2.3.3','H2.3','Fazla elektriği hidrojen ve ısıya çevirme fizibilitesi',2029,2031,{y:['karapinar','ege']},'TENMAK TEMEN, BOTAŞ'],
  ['E3.1.1','H3.1','Veri paylaşım protokolleri ve ortak veri kataloğu',2027,2027,{pane:'paydas'},'TEİAŞ, EDAŞ\'lar, EPİAŞ, DSİ, BOTAŞ, TKGM'],
  ['E3.1.2','H3.1','Kurumsal CBS portalı ve TUCBS servis entegrasyonu',2027,2028,{y:['ankara']},'CBS Genel Müdürlüğü, TENMAK Bilgi İşlem'],
  ['E3.1.3','H3.1','Politika izleme paneli ve çeyreklik rapor',2027,2031,{pane:'vizyon'},'ETKB Strateji Geliştirme'],
  ['E3.2.1','H3.2','İthal ikame modeli: yatırım başına önlenen ithalat',2028,2029,{pane:'ithalat'},'ETKB, TENMAK TIMES ekibi'],
  ['E3.2.2','H3.2','Yerli ekipman talep projeksiyonu',2028,2030,{},'Sanayi ve Teknoloji Bakanlığı, üretici birlikleri'],
  ['E3.2.3','H3.2','Ulusal Enerji Planı güncellemelerine bölgesel girdi',2027,2030,{metric:'yeterlilik'},'ETKB Enerji İşleri GM'],
  ['E3.3.1','H3.3','Kamu–üniversite–sanayi ortaklık ağı',2027,2031,{},'Üniversiteler, yerli üreticiler'],
  ['E3.3.2','H3.3','Horizon Europe, IPA ve kalkınma ajansı projeleri',2027,2031,{},'AB Başkanlığı, kalkınma ajansları'],
  ['E3.3.3','H3.3','Uzman yetiştirme, çalıştay ve yayın programı',2027,2031,{},'Ulusal Ajans, üniversiteler']
].map(([kod, h, ad, b, s, bag, pd]) => ({kod, h, ad, b, s, bag, pd, a:+kod[1]}));

const PANE_AD = {canli:'Canlı durum', paydas:'Paydaşlar', vizyon:'Göstergeler', ithalat:'İthalat'};
const KATMAN_AD = {lyrDpot:'Deniz RES / yüzer GES', lyrBaraj:'Baraj gölleri'};
const METRIK_AD = {kayip:'Bölge kayıp oranları', yeterlilik:'Bölge enerji dengesi'};
function bagEtiket(e){
  const g = e.bag;
  if (g.edas) return 'Harita: ' + g.edas.replace(' EDAŞ', ' bölgesi');
  if (g.katman) return 'Katman: ' + KATMAN_AD[g.katman];
  if (g.metric) return 'Harita: ' + METRIK_AD[g.metric];
  if (g.pane) return 'Panel: ' + PANE_AD[g.pane];
  if (g.y) return 'Harita: ' + g.y.length + ' konum';
  return 'Ulusal';
}
const konumlu = E.filter(e => !(Object.keys(e.bag).length === 0 || (e.bag.pane && !e.bag.y))).length;

// ---------------- harita katmanı ----------------
function geo(){
  const by = {};
  E.forEach(e => (e.bag.y || []).forEach(k => { (by[k] ||= []).push(e); }));
  return {type:'FeatureCollection', features:Object.entries(by).map(([k, es]) => ({type:'Feature', id:Object.keys(Y).indexOf(k),
    geometry:{type:'Point', coordinates:Y[k][1]},
    properties:{yer:k, ad:Y[k][0], n:es.length, a:es[0].a, kodlar:es.map(e => e.kod).join(','), amaclar:[...new Set(es.map(e => e.a))].join(',')}}))};
}
let hazir = false;
function ekle(){
  if (!map.isStyleLoaded() || !map.getLayer('edas-line')) return setTimeout(ekle, 500);
  map.addSource('eylem', {type:'geojson', data:geo()});
  const renk = ['match', ['get', 'a'], 1, AMAC[0].renk, 2, AMAC[1].renk, AMAC[2].renk];
  map.addLayer({id:'eylem-halo', type:'circle', source:'eylem', layout:{visibility:'none'}, paint:{'circle-radius':['+', 13, ['*', 2, ['get', 'n']]], 'circle-color':renk, 'circle-opacity':0.18}});
  map.addLayer({id:'eylem-pt', type:'circle', source:'eylem', layout:{visibility:'none'}, paint:{'circle-radius':['+', 8, ['get', 'n']], 'circle-color':renk, 'circle-stroke-color':'#fff', 'circle-stroke-width':2}});
  map.addLayer({id:'eylem-n', type:'symbol', source:'eylem', layout:{visibility:'none', 'text-field':['to-string', ['get', 'n']], 'text-font':['Open Sans Semibold'], 'text-size':11, 'text-allow-overlap':true}, paint:{'text-color':'#fff'}});
  map.addLayer({id:'eylem-lbl', type:'symbol', source:'eylem', layout:{visibility:'none', 'text-field':['get', 'kodlar'], 'text-font':['Open Sans Semibold'], 'text-size':10.5, 'text-offset':[0, 1.6], 'text-anchor':'top', 'text-max-width':14}, paint:{'text-color':'#1d2430', 'text-halo-color':'#fff', 'text-halo-width':1.6}});
  A.LAYER_MAP.lyrEylem = ['eylem-halo', 'eylem-pt', 'eylem-n', 'eylem-lbl'];
  map.on('click', 'eylem-pt', e => {
    const p = e.features[0].properties, kod = p.kodlar.split(',');
    const html = `<b>${esc(p.ad)}</b><div class="eyp">${kod.map(k => { const x = E.find(z => z.kod === k); return `<div><i style="background:${AMAC[x.a - 1].renk}"></i><b>${x.kod}</b> ${esc(x.ad)}<br><small>${x.b === x.s ? x.b : x.b + '–' + x.s} · ${esc(x.pd)}</small></div>`; }).join('')}</div><small class="muted">Konum öneri / aday niteliğindedir.</small>`;
    new maplibregl.Popup({maxWidth:'320px'}).setLngLat(e.lngLat).setHTML(html).addTo(map);
  });
  map.on('mouseenter', 'eylem-pt', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'eylem-pt', () => map.getCanvas().style.cursor = '');
  hazir = true;
  const cb = $('#lyrEylem'); if (cb) cb.addEventListener('change', A.syncLayerChecks);
}
ekle();
function goster(on){
  if (!hazir) return setTimeout(() => goster(on), 400);
  const cb = $('#lyrEylem'); if (cb) cb.checked = on;
  const pc = $('#eyHarita'); if (pc) pc.checked = on;
  A.LAYER_MAP.lyrEylem.forEach(l => map.setLayoutProperty(l, 'visibility', on ? 'visible' : 'none'));
}
function filtre(a){
  if (!hazir) return;
  const f = a ? ['in', String(a), ['get', 'amaclar']] : null;
  A.LAYER_MAP.lyrEylem.forEach(l => map.setFilter(l, f));
}

// ---------------- eylem → harita ----------------
function git(e){
  const g = e.bag;
  if (g.pane){ A.goTab(g.pane); A.openSheet(); return; }
  goster(true);
  if (g.katman){
    const m = document.getElementById(g.katman); if (m){ m.checked = true; A.syncLayerChecks(); }
    if (g.katman === 'lyrBaraj'){ const p = $('#lyrBarajP'); if (p) p.checked = true; }
    if (g.katman === 'lyrDpot'){ const p = $('#lyrDpotPanel'); if (p) p.checked = true; }
  }
  if (g.metric){
    const sel = $('#edasMetric'), le = $('#lyrEdas');
    if (le && !le.checked){ le.checked = true; A.syncLayerChecks(); }
    if (sel){ sel.value = g.metric; sel.dispatchEvent(new Event('change')); }
    map.flyTo({center:[35.2, 39.0], zoom:4.9}); A.minimizeSheet(); return;
  }
  if (g.edas && state.edas){
    const f = state.edas.features.find(x => x.properties.edas === g.edas);
    if (f){ A.selectEdas(f.id); map.fitBounds(A.bbox(f.geometry), {padding:50, duration:900}); }
    A.minimizeSheet(); return;
  }
  const pts = (g.y || []).map(k => Y[k][1]);
  if (g.katman && !pts.length){ map.flyTo({center:[31, 38.6], zoom:4.8}); A.minimizeSheet(); return; }
  if (pts.length === 1){ map.flyTo({center:pts[0], zoom:7}); }
  else if (pts.length > 1){
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], {padding:90, maxZoom:7, duration:900});
  }
  A.minimizeSheet();
}

// ---------------- panel ve infografik ----------------
const YIL = [2027, 2028, 2029, 2030, 2031];
const pane = document.createElement('div'); pane.className = 'pane'; pane.id = 'pane-eylem';
document.querySelector('.panes').insertBefore(pane, document.querySelector('#pane-katman'));
const tab = document.createElement('button'); tab.className = 'tab'; tab.dataset.tab = 'eylem'; tab.textContent = 'Eylem planı';
document.querySelector('.tabs').insertBefore(tab, document.querySelector('.tab[data-tab="katman"]'));
tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === tab));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p === pane));
  goster(true);
});

function yilYuk(){ return YIL.map(y => AMAC.map(a => E.filter(e => e.a === a.k && e.b <= y && e.s >= y).length)); }
function yukSvg(){
  const d = yilYuk(), mx = Math.max(...d.map(r => r.reduce((s, v) => s + v, 0))), W = 300, Hh = 92, bw = 40, gap = (W - 5 * bw) / 4;
  return `<svg viewBox="0 0 ${W} ${Hh + 30}" class="ey-yuk" role="img" aria-label="Yıllara göre süren eylem sayısı">${d.map((r, i) => {
    let y = Hh; const x = i * (bw + gap); const tot = r.reduce((s, v) => s + v, 0);
    return r.map((v, j) => { const h = v / mx * (Hh - 14); y -= h; return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="${AMAC[j].renk}"><title>${YIL[i]} · Amaç ${j + 1}: ${v} eylem</title></rect>`; }).join('') +
      `<text x="${x + bw / 2}" y="${y - 4}" text-anchor="middle" class="t-n">${tot}</text><text x="${x + bw / 2}" y="${Hh + 16}" text-anchor="middle" class="t-y">${YIL[i]}</text>`;
  }).join('')}</svg>`;
}
function gantt(af){
  const rows = E.filter(e => !af || e.a === af);
  return `<div class="ey-gantt"><div class="eg-head"><span></span>${YIL.map(y => `<span>${y}</span>`).join('')}</div>${
    AMAC.filter(a => !af || a.k === af).map(a => `<div class="eg-grp" style="--c:${a.renk}">Amaç ${a.k} · ${a.ad}</div>` +
      Object.keys(HEDEF).filter(h => h[1] === String(a.k)).map(h => `<div class="eg-h">${h} ${HEDEF[h]}</div>` +
        rows.filter(e => e.h === h).map(e => `<button class="eg-row" data-k="${e.kod}" title="${esc(e.ad)}"><span class="eg-l"><b>${e.kod}</b> ${esc(e.ad)}<small>${bagEtiket(e)}</small></span><span class="eg-bar" style="grid-column:${e.b - 2027 + 2} / ${e.s - 2027 + 3};background:${a.renk}"></span></button>`).join('')).join('')).join('')
  }</div>`;
}
let af = 0;
function render(){
  pane.innerHTML = `<p class="hint">ENAREN'in 2027–2031 stratejik çerçevesi: <b>3 amaç, 9 hedef, 27 eylem</b>. Bir eyleme dokunun; harita ilgili yere, katmana ya da panele gider. Haritadaki numaralı noktalar o yerdeki eylem sayısını gösterir. Konumlar öneri / aday niteliğindedir.</p>
  <div class="ey-kpi"><div><b>3</b><span>amaç</span></div><div><b>9</b><span>hedef</span></div><div><b>27</b><span>eylem</span></div><div><b>${konumlu}</b><span>haritaya bağlı</span></div></div>
  <div class="ey-amac">${AMAC.map(a => `<button class="ey-card${af === a.k ? ' on' : ''}" data-a="${a.k}" style="--c:${a.renk}"><small>Amaç ${a.k}</small><b>${a.ad}</b><ul>${Object.keys(HEDEF).filter(h => h[1] === String(a.k)).map(h => `<li>${h} ${HEDEF[h]}</li>`).join('')}</ul><em>2031: ${a.hedef2031}</em></button>`).join('')}</div>
  <div class="ey-row2"><div><h4>Yıllara göre süren eylem</h4>${yukSvg()}<div class="legend2">${AMAC.map(a => `<span><i style="background:${a.renk}"></i>Amaç ${a.k}</span>`).join('')}</div></div>
  <div><h4>Eylemler nereye bağlı?</h4>${['Harita', 'Katman', 'Panel', 'Ulusal'].map(t => { const n = E.filter(e => bagEtiket(e).startsWith(t)).length; return `<div class="ey-bag"><span>${t}</span><i style="width:${n / 27 * 100}%"></i><b>${n}</b></div>`; }).join('')}</div></div>
  <label class="row"><input type="checkbox" id="eyHarita" checked> Eylem noktalarını haritada göster</label>
  <div class="chips ey-f"><button class="chip${af ? '' : ' on'}" data-a="0">Tüm eylemler</button>${AMAC.map(a => `<button class="chip${af === a.k ? ' on' : ''}" data-a="${a.k}">Amaç ${a.k}</button>`).join('')}</div>
  ${gantt(af)}
  <p class="hint">Kaynak: ENAREN Stratejik Çerçeve 2027–2031 çalışma belgesi; üst politika belgeleri: On İkinci Kalkınma Planı, ETKB ve TENMAK stratejik planları, Milli Enerji ve Maden Politikası, Ulusal Enerji Planı. Taslaktır; kurumla netleştirilmelidir.</p>`;
}
render();
pane.addEventListener('click', e => {
  const c = e.target.closest('[data-a]');
  if (c){ af = +c.dataset.a === af && c.classList.contains('ey-card') ? 0 : +c.dataset.a; render(); filtre(af); return; }
  const r = e.target.closest('.eg-row'); if (r){ git(E.find(x => x.kod === r.dataset.k)); }
});
pane.addEventListener('change', e => { if (e.target.id === 'eyHarita') goster(e.target.checked); });
window.ENAREN_EYLEM = { E, AMAC, git, goster };
})();
