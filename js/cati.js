/* ENAREN WebGIS – Alan tabanlı çatı GES önerisi: seçilen mahalle ve Türkiye geneli.
 * "Çatıların %X'i GES ile kaplanırsa ne olur?" */
(() => {
'use strict';
const A = window.ENAREN_APP, M = window.ENAREN_MOD;
const { map, state, fmt } = A;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TR = {gw: 120, twh: 148, talep: 360.9}; // Ember (2023): 70 il uydu analizi, teknik potansiyel; talep: 2025 (ETKB)

// ---------------- UI ----------------
const box = document.createElement('div');
box.innerHTML = `
  <details open id="catiTR"><summary>🇹🇷 Türkiye çatı GES – "çatıların %X'i kaplanırsa"</summary>
    <div class="slider"><span>Kaplama</span><input type="range" id="trPct" min="5" max="100" step="5" value="25"><b id="trPctL">%25</b></div>
    <div id="trRes" class="result"></div>
    <div id="trBars" class="bars"></div>
    <small class="muted">Taban: Türkiye çatılarının teknik potansiyeli ≥120 GW / 148 TWh (Ember 2023, yüksek çözünürlüklü uydu görüntüsü analizi). Bölge dağılımı tüketici sayısı ve ışınımla yaklaşık.</small>
  </details>
  <details open id="catiMah"><summary>🏘 Mahalle çatı GES önerisi</summary>
    <p class="hint" id="mahHint">☰ → Parsel'den il, ilçe ve <b>mahalle</b> seçin ya da haritada bir mahalleye yakınlaşıp "Bu görünüm"e basın.</p>
    <div class="btnrow"><button id="btnMahCalc" class="btn primary">Seçili mahalle için hesapla</button><button id="btnViewCalc" class="btn">Bu görünüm</button></div>
    <div class="slider"><span>Çatı kaplama</span><input type="range" id="mPct" min="5" max="100" step="5" value="30"><b id="mPctL">%30</b></div>
    <div class="grid2">
      <label>Yapılaşma oranı (bina izi yoksa, %)<input type="number" id="mYap" value="18" step="1"></label>
      <label>Kullanılabilir çatı (%)<input type="number" id="mUse" value="60" step="5"></label>
      <label>Panel yoğunluğu (kWp/m²)<input type="number" id="mKwp" value="0.2" step="0.01"></label>
      <label>Yatırım (USD/kWp)<input type="number" id="mCapex" value="700" step="25"></label>
    </div>
    <div id="mahRes" class="result muted">Henüz hesaplanmadı.</div>
    <div class="btnrow"><button id="btnMahReport" class="btn hidden">+ Rapora ekle</button><button id="btnMahFiz" class="btn hidden">☀ GES fizibilite raporu</button></div>
  </details>`;
const pane = $('#pane-analiz'); pane.prepend(box);
// eski çizerek hesaplayıcıyı "tek çatı (gelişmiş)" olarak küçült
const old = [...pane.querySelectorAll('details')].find(d => d.querySelector('#gesResult'));
if (old){ old.open = false; old.querySelector('summary').textContent = '✏ Tek çatı / nokta hesabı (gelişmiş)'; }
// Parsel sekmesine kısayol
$('#parselResult')?.insertAdjacentHTML('beforebegin', `<button id="btnMahFromParsel" class="btn" style="margin:6px 0">☀ Bu mahallenin çatı GES önerisi</button>`);

// ---------------- Türkiye geneli ----------------
function trCalc(){
  const pct = +$('#trPct').value / 100; $('#trPctL').textContent = '%' + (pct * 100);
  const gw = TR.gw * pct, twh = TR.twh * pct;
  $('#trRes').innerHTML = `<div class="kpi">
    <div><strong>${fmt(gw, 1)} GW</strong><span>çatı GES (bugün tüm güneş 28 GW)</span></div>
    <div><strong>${fmt(twh, 1)} TWh</strong><span>yıllık üretim</span></div>
    <div><strong>%${fmt(twh / TR.talep * 100, 1)}</strong><span>2025 elektrik talebinin</span></div>
    <div><strong>${fmt(twh / 23 * 0.95 * 0.19 * 0.6, 1)} mn $</strong><span>yerine geçen gaz ithalatı*</span></div>
    <div><strong>${fmt(twh * 0.44, 1)} Mt</strong><span>CO₂ kaçınımı/yıl</span></div>
    <div><strong>${fmt(gw * 1e6 * 650 / 1e9, 1)} mlr $</strong><span>yatırım (~650 $/kWp)</span></div></div>
    <small class="muted">*Doğal gaz santrali üretimini ikame ettiği varsayımıyla kaba tahmin (her TWh ≈ 190 milyon m³ gaz).</small>`;
  // gaz ikamesi doğru birimle: 1 TWh ≈ 0,19 milyar m³ gaz; ~350 $/1000 m³ → 66 mn $/TWh
  $('#trRes').querySelector('.kpi div:nth-child(4) strong').textContent = fmt(twh * 66 / 1000, 2) + ' mlr $';
  // bölgeler
  if (!state.edas) return;
  const w = state.edas.features.map(f => ({p: f.properties, w: f.properties.tuketici * (f.properties.ghi / 1650)}));
  const tot = w.reduce((s, x) => s + x.w, 0);
  const rows = w.map(x => ({ad: x.p.edas, gw: gw * x.w / tot, twh: twh * x.w / tot, pay: twh * x.w / tot / (x.p.toplam_twh * TR.talep / 279.04) * 100})).sort((a, b) => b.pay - a.pay);
  const mx = Math.max(...rows.map(r => r.pay));
  $('#trBars').innerHTML = `<p class="hint">Bölge tüketiminin ne kadarı çatılardan karşılanır:</p>` + rows.map(r => `<div class="bar ev"><span>${esc(r.ad.replace(' EDAŞ', ''))}</span><div class="t"><i style="width:${(r.pay / mx * 100).toFixed(0)}%;background:#f2a900"></i></div><span class="v">${fmt(r.gw, 1)} GW · %${fmt(r.pay)}</span></div>`).join('');
}
$('#trPct').addEventListener('input', trCalc);
const iv = setInterval(() => { if (state.edas?.features[0]?.properties.ghi){ clearInterval(iv); trCalc(); } }, 400);

// ---------------- Mahalle ----------------
$('#mPct').addEventListener('input', () => { $('#mPctL').textContent = '%' + $('#mPct').value; if (state.lastMah) render(); });
['#mYap','#mUse','#mKwp','#mCapex'].forEach(s => $(s).addEventListener('input', () => state.lastMah && render()));
function inPoly(pt, g){ const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; return polys.some(p => { let c = false; const r = p[0]; for (let i = 0, j = r.length - 1; i < r.length; j = i++){ const [xi, yi] = r[i], [xj, yj] = r[j]; if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c; } return c; }); }
function polyArea(g){ const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; return polys.reduce((s, p) => s + A.ringArea(p[0].slice(0, -1)), 0); }
function bboxOf(g){ return A.bbox(g); }
async function footprints(geom){
  // bina katmanını aç, mahalleyi 15–16 zoom'da göster, karolar yüklenince içerideki bina parçalarını topla
  $('#lyrBina').checked = true; A.syncLayerChecks();
  map.fitBounds(bboxOf(geom), {padding: 20, maxZoom: 16.5, animate: false});
  if (map.getZoom() < 14.5) map.jumpTo({zoom: 14.5});
  await new Promise(r => { let d = false; const f = () => { if (!d){ d = true; r(); } }; map.once('idle', f); setTimeout(f, 9000); });
  const seen = new Set(); let n = 0, area = 0;
  map.queryRenderedFeatures({layers:['bina']}).forEach(f => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
    polys.forEach(p => { const ring = p[0].slice(0, -1); if (ring.length < 3) return; const c = [ring.reduce((s, q) => s + q[0], 0) / ring.length, ring.reduce((s, q) => s + q[1], 0) / ring.length]; const k = c.map(v => v.toFixed(6)).join(); if (seen.has(k) || !inPoly(c, geom)) return; seen.add(k); n++; area += A.ringArea(ring); });
  });
  // görünür alan mahallenin tamamını kapsamıyorsa ölçekle
  const vb = map.getBounds(), bb = bboxOf(geom);
  const cov = Math.min(1, ((Math.min(vb.getEast(), bb[1][0]) - Math.max(vb.getWest(), bb[0][0])) * (Math.min(vb.getNorth(), bb[1][1]) - Math.max(vb.getSouth(), bb[0][1]))) / ((bb[1][0] - bb[0][0]) * (bb[1][1] - bb[0][1])));
  return {n, area, cov: Math.max(cov, 0.01)};
}
async function calcFor(ad, geom){
  $('#mahRes').className = 'result'; $('#mahRes').innerHTML = '⏳ Mahalle sınırı, bina izleri ve güneş verisi alınıyor…';
  A.goTab('analiz'); A.minimizeSheet();
  const alan = polyArea(geom);
  const fp = await footprints(geom);
  const c = A.centroid(geom.type === 'Polygon' ? geom : {type:'Polygon', coordinates: geom.coordinates[0]});
  let pv = null; try { const j = await fetch(`https://api.globalsolaratlas.info/data/lta?loc=${c[1].toFixed(5)},${c[0].toFixed(5)}`).then(r => r.json()); pv = j?.annual?.data?.PVOUT_csi; } catch (e) {}
  const ed = A.whichFeature(state.edas, c), il = A.whichFeature(state.il, c);
  state.lastMah = {ad, geom, alan, fp, pv: pv || (ed ? ed.properties.ghi * 0.92 : 1450), c, ed: ed?.properties.edas, il: il?.properties.il};
  A.openSheet(); render();
  showOutline(geom);
}
function render(){
  const L = state.lastMah, pct = +$('#mPct').value / 100, use = +$('#mUse').value / 100, kd = +$('#mKwp').value, capex = +$('#mCapex').value, yap = +$('#mYap').value / 100;
  const osmOk = L.fp.n >= 15 && L.fp.area / L.fp.cov > L.alan * 0.02;
  const cati = osmOk ? L.fp.area / L.fp.cov : L.alan * yap;
  const kwp = cati * use * pct * kd, mwh = kwp * L.pv / 1000;
  const homes = mwh * 1000 / 2600, evs = mwh * 1000 / 2244, inv = kwp * capex;
  const payback = inv / (mwh * 1000 * 0.08);
  L.res = {cati, kwp, mwh, homes, evs, inv, payback, osmOk, pct};
  $('#mahRes').innerHTML = `<b>${esc(L.ad)}</b>${L.il ? ' · ' + esc(L.il) : ''}${L.ed ? ' · ' + esc(L.ed) : ''}
    <div class="kpi" style="margin-top:6px">
      <div><strong>${fmt(L.alan / 1e4, 1)} ha</strong><span>mahalle alanı</span></div>
      <div><strong>${fmt(cati / 1000, 1)} bin m²</strong><span>çatı izi ${osmOk ? `(OSM, ${fmt(L.fp.n)} bina${L.fp.cov < 0.95 ? ', ölçekli' : ''})` : `(alanın %${fmt(yap * 100)}'i varsayım)`}</span></div>
      <div><strong>${fmt(kwp / 1000, 2)} MWp</strong><span>çatıların %${fmt(pct * 100)}'i kaplanırsa</span></div>
      <div><strong>${fmt(mwh)} MWh</strong><span>yıllık üretim (${fmt(L.pv)} kWh/kWp)</span></div>
      <div><strong>${fmt(homes)}</strong><span>hanenin yıllık elektriği</span></div>
      <div><strong>${fmt(evs)}</strong><span>EV'nin yıllık şarjı</span></div>
      <div><strong>${fmt(inv / 1e6, 2)} mn $</strong><span>yatırım (~${fmt(capex)} $/kWp)</span></div>
      <div><strong>${fmt(payback, 1)} yıl</strong><span>basit geri ödeme (0,08 $/kWh)</span></div></div>
    <small class="muted">Kaydırıcıyla kaplama oranını değiştirin. Bina izleri OpenStreetMap'ten; eksikse yapılaşma oranı kullanılır. Kesin sonuç için TUCBS İHA ortofotosu ile çatı tipi/eğim analizi gerekir.</small>`;
  $('#btnMahReport').classList.remove('hidden'); $('#btnMahFiz').classList.remove('hidden');
}
function showOutline(geom){
  if (!map.getSource('mahsel')){ map.addSource('mahsel', {type:'geojson', data:{type:'FeatureCollection', features:[]}}); map.addLayer({id:'mahsel', type:'line', source:'mahsel', paint:{'line-color':'#f2a900','line-width':3}}); }
  map.getSource('mahsel').setData({type:'Feature', geometry:geom, properties:{}});
}
async function selectedMahalle(){
  const il = $('#pIl').selectedOptions[0]?.textContent, ilce = $('#pIlce').selectedOptions[0]?.textContent, mah = $('#pMah').selectedOptions[0]?.textContent;
  if (!$('#pMah').value){ A.toast('Önce Parsel bölümünden il, ilçe ve mahalle seçin'); A.goTab('parsel'); A.openSheet(); return; }
  const q = `${mah}, ${ilce}, ${il}, Türkiye`;
  const g = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=tr&polygon_geojson=1`).then(r => r.json()).catch(() => []);
  let geom = g[0]?.geojson;
  if (!geom || !/Polygon/.test(geom.type)){
    // sınır yoksa merkezden 600 m yarıçaplı yaklaşık alan
    const lat = +(g[0]?.lat || map.getCenter().lat), lng = +(g[0]?.lon || map.getCenter().lng), r = 0.0054;
    geom = {type:'Polygon', coordinates:[Array.from({length: 33}, (_, i) => [lng + r / Math.cos(lat * Math.PI / 180) * Math.cos(i / 32 * 2 * Math.PI), lat + r * Math.sin(i / 32 * 2 * Math.PI)])]};
    A.toast('Mahalle sınırı bulunamadı; 600 m yarıçaplı yaklaşık alan kullanıldı');
  }
  calcFor(`${mah} (${ilce})`, geom);
}
$('#btnMahCalc').onclick = selectedMahalle;
$('#btnMahFromParsel')?.addEventListener('click', selectedMahalle);
$('#btnViewCalc').onclick = () => {
  if (map.getZoom() < 13.5){ A.toast('Bir mahalleye yakınlaşın (zoom ≥ 14)'); return; }
  const b = map.getBounds();
  const geom = {type:'Polygon', coordinates:[[[b.getWest(), b.getSouth()], [b.getEast(), b.getSouth()], [b.getEast(), b.getNorth()], [b.getWest(), b.getNorth()], [b.getWest(), b.getSouth()]]]};
  calcFor('Görünür alan', geom);
};
$('#btnMahReport').onclick = () => { const L = state.lastMah; if (!L) return; A.addReport({tip:'mahalle', baslik:`Mahalle çatı GES önerisi – ${L.ad}`, html: $('#mahRes').innerHTML}); };
$('#btnMahFiz').onclick = () => {
  const L = state.lastMah; if (!L) return;
  state.gesPoint = L.c; state.lastGes = {kwp: Math.round(L.res.kwp)};
  A.goTab('rapor'); A.openSheet(); document.querySelector('.rtype[data-r="ges"]').click();
  setTimeout(() => { $('#rgTip').value = 'cati'; $('#rgTip').dispatchEvent(new Event('change')); $('#rgKwp').value = Math.round(L.res.kwp); }, 50);
};
window.ENAREN_CATI = { calcFor, trCalc };
})();
