/* ENAREN WebGIS – İthalat kırılımı (tür × ülke × kanal) ve enerji arama filosu.
 * Kaynaklar: Ember (Haziran 2026, 2025 verisi), EPDK sektör raporları, Ember enterkonneksiyon notu (Kasım 2026),
 * ETKB ve AA haberleri (filo konumları). */
(() => {
'use strict';
const A = window.ENAREN_APP; const { map, fmt } = A;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const FATURA = 47; // milyar $, 2025 net enerji ithalatı
const TUR = [
  {k:'petrol', ad:'Petrol ve ürünleri', pay:47, renk:'#1a1a1a', ikon:'petrol', bag:'Ham petrolde dışa bağımlılık %83',
   ulke:[['Rusya',46,'Tanker: Novorossiysk → Boğazlar'],['Irak',15,'Boru: Kerkük–Ceyhan'],['Kazakistan',13,'Tanker: CPC / Novorossiysk → Boğazlar'],['Suudi Arabistan',7,'Tanker: Süveyş → Aliağa'],['Diğer',19,'Tanker']], not:'Ülke payları ham petrol ithalatına göredir (2025, yaklaşık 32 milyon ton).'},
  {k:'gaz', ad:'Doğal gaz (boru + LNG)', pay:43, renk:'#d95f02', ikon:'dogalgaz', bag:'Gazın %94,7\'si ithal',
   ulke:[['Rusya',36,'Boru: TürkAkım + Mavi Akım'],['Azerbaycan',20,'Boru: TANAP / Güney Kafkasya'],['ABD',16,'LNG: Marmara Ereğlisi, Aliağa, FSRU\'lar'],['İran',13,'Boru: Doğubayazıt–Ankara'],['Cezayir',8,'LNG: Marmara Ereğlisi, Aliağa'],['Diğer',7,'LNG / Türkmenistan']], not:'2025 tüketimi yaklaşık 59 milyar m³; yerli üretim 3,1 milyar m³ (Sakarya).'},
  {k:'komur', ad:'Kömür', pay:10, renk:'#7a5c3e', ikon:'ithal_komur', bag:'Kömürün %60\'tan fazlası ithal',
   ulke:[['Rusya',85,'Gemi: Karadeniz limanları → Boğazlar'],['Kolombiya',12,'Gemi: Atlantik → Akdeniz → İskenderun'],['Diğer',3,'Gemi']], not:'Ülke payları elektrik üretimi için ithal edilen kömüre göredir.'}
];
// ülke bağımlılığı (milyar $, yaklaşık): tür payı × ülke payı × fatura
const ULKE = {};
TUR.forEach(t => t.ulke.forEach(([u, p]) => { if (u === 'Diğer') return; (ULKE[u] ||= {t:0, kir:{}}); const v = FATURA * t.pay / 100 * p / 100; ULKE[u].t += v; ULKE[u].kir[t.k] = v; }));
const ul = Object.entries(ULKE).sort((a, b) => b[1].t - a[1].t);
const umax = ul[0][1].t;

const pane = document.createElement('div'); pane.className = 'pane'; pane.id = 'pane-ithalat';
document.querySelector('.panes').appendChild(pane);
const tab = document.createElement('button'); tab.className = 'tab'; tab.dataset.tab = 'ithalat'; tab.textContent = 'İthalat';
document.querySelector('.tabs').appendChild(tab);
tab.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === tab)); document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p === pane)); });

pane.innerHTML = `
  <p class="hint">2025'te Türkiye net enerji ithalatına <b>${FATURA} milyar $</b> ödedi. Aşağıda bunun hangi enerji türüne, hangi ülkeye ve hangi kanala gittiği yer alıyor. Bir türe dokununca haritada yalnız onun kanalları görünür.</p>
  <div class="stack" style="height:30px;display:flex;border-radius:8px;overflow:hidden;margin:6px 0 4px">${TUR.map(t => `<i title="${t.ad}" style="flex:${t.pay};background:${t.renk};color:#fff;font-style:normal;font-size:12px;display:flex;align-items:center;justify-content:center">${t.pay}%</i>`).join('')}</div>
  <div class="legend2">${TUR.map(t => `<span><i style="background:${t.renk}"></i>${t.ad} · ≈${fmt(FATURA * t.pay / 100, 1)} mr $</span>`).join('')}</div>
  <div class="chips" id="ithTur" style="margin-top:8px"><button class="chip on" data-k="hepsi">Tüm kanallar</button>${TUR.map(t => `<button class="chip" data-k="${t.k}">${t.ad}</button>`).join('')}<button class="chip" data-k="lng">Yalnız LNG</button><button class="chip" data-k="elektrik">Elektrik</button></div>
  ${TUR.map(t => `<h3 style="display:flex;gap:6px;align-items:center">${window.ICON(t.ikon, 18, t.renk, 2)} ${t.ad} <small style="margin-left:auto;font-weight:400;color:var(--muted)">${t.bag}</small></h3>
    ${t.ulke.map(([u, p, kanal]) => `<div class="bar ev"><span>${u}</span><div class="t"><i style="width:${p}%;background:${t.renk}"></i></div><span class="v">%${p}</span></div><div class="kanal">${esc(kanal)} · ≈${fmt(FATURA * t.pay / 100 * p / 100, 1)} mr $</div>`).join('')}
    <p class="hint">${t.not}</p>`).join('')}
  <h3 style="display:flex;gap:6px;align-items:center">${window.ICON('elektrik', 18, '#7570b3', 2)} Elektrik</h3>
  <p class="hint">Komşularla ara bağlantı: <b>2 GW ithalat</b>, <b>3,2 GW ihracat</b> kapasitesi. Türkiye 2025'te yaklaşık <b>4 TWh</b> elektrik ihraç etti (Irak ve Suriye ağırlıklı) ve 2024'ten bu yana Bulgaristan'la ticarette net ihracatçı. İthalatın büyük bölümü Gürcistan hattından geliyor; 2021–2025'te bu hattan gelen Azerbaycan elektriği yaklaşık 8 TWh.</p>
  <h3>Ülke bazında bağımlılık (yaklaşık)</h3>
  <p class="hint">Her ülkeye 2025'te ödenen tahmini tutar: tür payı × ülke payı × ${FATURA} milyar $.</p>
  ${ul.map(([u, v]) => `<div class="bar ev"><span>${u}</span><div class="t" style="display:flex">${TUR.filter(t => v.kir[t.k]).map(t => `<i style="width:${(v.kir[t.k] / umax * 100).toFixed(1)}%;background:${t.renk};display:block"></i>`).join('')}</div><span class="v">≈${fmt(v.t, 1)} mr $ · %${fmt(v.t / FATURA * 100)}</span></div>`).join('')}
  <p class="hint">Kaynak: Ember, "Hürmüz krizi Türkiye'ye 14 milyar dolara mal olacak" (Haziran 2026, 2025 verileri); EPDK aylık sektör raporları; Ember, enterkonneksiyon notu (Kasım 2026). Petrol tutarı, ham petrol ülke paylarıyla yaklaşık olarak dağıtıldı.</p>`;

function showType(k){
  pane.querySelectorAll('#ithTur .chip').forEach(c => c.classList.toggle('on', c.dataset.k === k));
  const ith = $('#lyrIthal'); if (ith && !ith.checked){ ith.checked = true; ith.dispatchEvent(new Event('change')); }
  const f = k === 'hepsi' ? null : k === 'gaz' ? ['in', ['get', 'tip'], ['literal', ['gaz', 'lng']]] : ['==', ['get', 'tip'], k];
  ['koridor', 'koridor-bg'].forEach(l => map.getLayer(l) && map.setFilter(l, f));
  map.flyTo({center:[33, 39.5], zoom:4.6}); A.minimizeSheet();
}
pane.addEventListener('click', e => { const c = e.target.closest('#ithTur .chip'); if (c) showType(c.dataset.k); });

// ---------- enerji arama filosu ----------
// [ad, tür, lng, lat, görev, son bilgi]
const FILO = [
  ['Fatih', 'Sondaj gemisi', 32.55, 42.1, 'Batı Karadeniz, Eflani-1 keşif kuyusu (Nisan 2026\'da başladı).', 'Nisan 2026'],
  ['Abdülhamid Han', 'Sondaj gemisi', 30.2, 41.38, 'Kocaeli açıkları, Kandıra-2 keşif kuyusu (26 Mart 2026\'da başladı).', 'Mart 2026'],
  ['Yavuz', 'Sondaj gemisi', 31.75, 42.6, 'Sakarya Gaz Sahası; kuyu tamamlama.', '2026'],
  ['Kanuni', 'Sondaj gemisi', 31.35, 42.55, 'Sakarya Gaz Sahası; arama ve tamamlama.', '2026'],
  ['Yıldırım', 'Sondaj gemisi (7. nesil)', 31.95, 42.75, 'Sakarya Gaz Sahası; ilk kuyu tamamlama Mart 2026 sonu. 12.000 m sondaj kapasitesi.', 'Mart 2026'],
  ['Çağrı Bey', 'Sondaj gemisi (7. nesil)', 48.4, 4.8, 'Somali, Curad-1 kuyusu: Türkiye\'nin ilk yurt dışı derin deniz sondajı. 7.500 m hedef derinlik, 288 günlük plan; 10 Nisan 2026\'da Mogadişu\'ya ulaştı.', 'Nisan 2026'],
  ['Oruç Reis', 'Sismik araştırma gemisi', 32.1, 41.65, 'Somali\'de 4.465 km² 3B sismik veri topladı (2024–2025). Karadeniz / Filyos; 2026\'da Pakistan sahalarında sismik çalışma planlanıyor.', '2026'],
  ['Barbaros Hayreddin Paşa', 'Sismik araştırma gemisi', 33.6, 42.35, 'Karadeniz\'de sismik çalışmalar.', '2026'],
  ['Osman Gazi', 'Yüzer üretim platformu', 31.5, 42.7, 'Sakarya Faz-2; 17 Ekim 2026\'da Filyos\'tan uğurlandı. 2026 sonu ilk gaz, 2027 başı üretim.', 'Ekim 2026']
];
const vf = n => `https://www.vesselfinder.com/vessels?name=${encodeURIComponent(n.toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S').replace(/Ö/g, 'O').replace(/Ç/g, 'C'))}`;
function addFleet(){
  if (!map.isStyleLoaded() || !map.getLayer('santral')) return setTimeout(addFleet, 400);
  const fc = {type:'FeatureCollection', features:FILO.map(([ad, tur, x, y, gorev, tarih]) => ({type:'Feature', geometry:{type:'Point', coordinates:[x, y]}, properties:{ad, tur, gorev, tarih}}))};
  map.addSource('filo', {type:'geojson', data:fc});
  map.addLayer({id:'filo-halo', type:'circle', source:'filo', paint:{'circle-radius':11, 'circle-color':'#E8B21C', 'circle-opacity':0.25, 'circle-stroke-color':'#0E3047', 'circle-stroke-width':1.5}});
  map.addLayer({id:'filo', type:'circle', source:'filo', paint:{'circle-radius':5, 'circle-color':['match', ['get', 'tur'], 'Sismik araştırma gemisi', '#1f78b4', 'Yüzer üretim platformu', '#1f8a4c', '#0E3047'], 'circle-stroke-color':'#fff', 'circle-stroke-width':1.5}});
  map.addLayer({id:'filo-lbl', type:'symbol', source:'filo', minzoom:5, layout:{'text-field':['get', 'ad'], 'text-font':['Open Sans Semibold'], 'text-size':12, 'text-offset':[0, 1.3], 'text-anchor':'top'}, paint:{'text-color':'#0E3047', 'text-halo-color':'#fff', 'text-halo-width':1.6}});
  Object.assign(A.LAYER_MAP, {lyrFilo:['filo-halo', 'filo', 'filo-lbl']});
  $('#lyrFilo')?.addEventListener('change', A.syncLayerChecks);
  map.on('click', 'filo', e => {
    const p = e.features[0].properties;
    new maplibregl.Popup({maxWidth:'300px'}).setLngLat(e.lngLat).setHTML(`<b>${esc(p.ad)}</b><br><small>${esc(p.tur)}</small><p style="margin:6px 0">${esc(p.gorev)}</p><small>Konum, son kamuya açık bilgiye göre yaklaşıktır (${esc(p.tarih)}).</small><br><a href="${vf(p.ad)}" target="_blank" rel="noopener">Canlı AIS konumu (VesselFinder)</a>`).addTo(map);
  });
  map.on('mouseenter', 'filo', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'filo', () => map.getCanvas().style.cursor = '');
}
addFleet();
// Deniz panosuna filo listesi
const dz = document.querySelector('#pane-deniz');
if (dz){
  const s = document.createElement('div');
  s.innerHTML = `<h3>Enerji arama filosu</h3><p class="hint">6 sondaj gemisi, 2 sismik araştırma gemisi ve 1 yüzer üretim platformu. Konumlar son kamuya açık bilgiye göre yaklaşıktır; her gemi için canlı AIS bağlantısı var.</p>
    <ul class="flist">${FILO.map(([ad, tur, x, y, gorev, tarih]) => `<li data-c="${x},${y}" title="${esc(gorev)}"><b style="margin-left:0">${esc(ad)}</b><span style="color:var(--muted);font-size:12px">${esc(tur)} · ${esc(gorev.split(';')[0].split('.')[0])}</span></li>`).join('')}</ul>`;
  dz.appendChild(s);
  s.addEventListener('click', e => { const li = e.target.closest('li[data-c]'); if (!li) return; const [x, y] = li.dataset.c.split(',').map(Number); map.flyTo({center:[x, y], zoom: x > 45 ? 4 : 7}); A.minimizeSheet(); });
}
window.ENAREN_BAG = { showType };
})();
