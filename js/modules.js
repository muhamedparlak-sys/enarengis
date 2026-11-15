/* ENAREN WebGIS – ek modüller: EV dönüşüm senaryosu, TKGM parsel sorgusu,
 * nokta/parsel karşılaştırma (Global Solar Atlas + NASA POWER rüzgâr), bölge raporu. */
(() => {
'use strict';
const A = window.ENAREN_APP;
const { map, state, addReport, fmt } = A;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// =====================================================================
// 1) EV DÖNÜŞÜM SENARYOSU
// =====================================================================
const EV0 = {yil: 2026.7, pay: 486359 / 18115875}; // Eylül 2026 (TÜİK)
const PRESETS = {
  dusuk:  {2030: 5,  2035: 10,  2040: 18},
  orta:   {2030: 8,  2035: 18,  2040: 32},
  yuksek: {2030: 12, 2035: 30,  2040: 50},
  tam:    {2030: 100, 2035: 100, 2040: 100}
};
let preset = 'orta';
function evShare(y){
  if (preset === 'tam') return 1;
  const pts = [[EV0.yil, EV0.pay * 100], [2030, +$('#ev2030').value], [2035, +$('#ev2035').value], [2040, +$('#ev2040').value]];
  if (y <= pts[0][0]) return pts[0][1] / 100;
  for (let i = 1; i < pts.length; i++){
    if (y <= pts[i][0]){ const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return (y0 + (y1 - y0) * (y - x0) / (x1 - x0)) / 100; }
  }
  return pts[pts.length - 1][1] / 100;
}
function evCalc(year){
  const g = +$('#evGrowth').value / 100, km = +$('#evKm').value, cons = +$('#evCons').value / 100, loss = +$('#evLoss').value / 100;
  const kw = $('#evSmart').checked ? +$('#evSmartKw').value : +$('#evPeakKw').value, lf = +$('#evLf').value;
  const share = evShare(year), growth = Math.pow(1 + g, Math.max(0, year - 2026));
  const kwhPerEv = km * cons * (1 + loss);
  const rows = state.edas.features.map(f => {
    const p = f.properties;
    const ev = p.otomobil * growth * share;
    const twh = ev * kwhPerEv / 1e9;
    const mw = ev * kw / 1000;
    const puant = p.toplam_twh * 1e6 / 8760 / lf; // MW (tahmini)
    // yerinde üretim: bu ek enerjiyi çatı GES ile karşılamak için gereken güç
    const mwp = twh * 1e6 / (p.ghi * 1.12 * 0.8);
    return {f, edas: p.edas, ev, twh, mw, ev_pct: twh / p.toplam_twh * 100, ev_puant_pct: mw / puant * 100, puant, mwp};
  });
  const nat = rows.reduce((s, r) => ({ev: s.ev + r.ev, twh: s.twh + r.twh, mw: s.mw + r.mw, mwp: s.mwp + r.mwp}), {ev: 0, twh: 0, mw: 0, mwp: 0});
  return {year, share, kwhPerEv, rows, nat};
}
let lastEv = null;
function evRender(){
  if (!state.edas) return;
  const y = +$('#evYear').value; $('#evYearLbl').textContent = y;
  const r = lastEv = evCalc(y);
  // haritaya yaz
  r.rows.forEach(x => { x.f.properties.ev_pct = +x.ev_pct.toFixed(2); x.f.properties.ev_puant_pct = +x.ev_puant_pct.toFixed(2); x.f.properties.ev_twh = +x.twh.toFixed(3); x.f.properties.ev_mw = Math.round(x.mw); });
  map.getSource('edas')?.setData(state.edas);
  if (/^ev_/.test($('#edasMetric').value)){ A.applyMetric(); A.renderLegend(); }
  const tot = 279.04;
  $('#evNat').innerHTML = `<div class="kpi">
    <div><strong>${fmt(r.nat.ev / 1e6, 2)} mn</strong><span>elektrikli otomobil (%${fmt(r.share * 100, 1)})</span></div>
    <div><strong>${fmt(r.nat.twh, 1)} TWh</strong><span>ek tüketim (bugünün %${fmt(r.nat.twh / tot * 100, 1)}'i)</span></div>
    <div><strong>${fmt(r.nat.mw / 1000, 1)} GW</strong><span>ek akşam puantı${$('#evSmart').checked ? ' (akıllı şarj)' : ''}</span></div>
    <div><strong>${fmt(r.nat.mwp / 1000, 1)} GWp</strong><span>karşılamak için gereken çatı GES</span></div></div>
    <small class="muted">EV başına ${fmt(r.kwhPerEv)} kWh/yıl. Karşılaştırma tabanı: 2024 faturalanan tüketim 279 TWh (ELDER).</small>`;
  const sorted = [...r.rows].sort((a, b) => b.ev_puant_pct - a.ev_puant_pct);
  const max = Math.max(...sorted.map(x => x.ev_puant_pct), 1);
  $('#evTable').innerHTML = `<p class="hint">Sıralama: ek puantın tahmini mevcut puanta oranı. Turuncu ≥ %10, kırmızı ≥ %20 (şebeke yatırımı gerektirebilir).</p>` +
    sorted.map(x => `<div class="bar ev" data-e="${esc(x.edas)}"><span>${esc(x.edas.replace(' EDAŞ', ''))}</span><div class="t"><i class="${x.ev_puant_pct >= 20 ? 'bad' : x.ev_puant_pct >= 10 ? 'warn' : ''}" style="width:${(x.ev_puant_pct / max * 100).toFixed(1)}%"></i></div><span class="v">${fmt(x.mw)} MW · %${fmt(x.ev_puant_pct, 1)}</span></div>`).join('');
}
$('#evPreset').addEventListener('click', e => {
  const k = e.target.dataset.p; if (!k) return; preset = k;
  $$('#evPreset .chip').forEach(c => c.classList.toggle('active', c === e.target));
  if (k !== 'tam'){ $('#ev2030').value = PRESETS[k][2030]; $('#ev2035').value = PRESETS[k][2035]; $('#ev2040').value = PRESETS[k][2040]; }
  evRender();
});
['#evYear','#ev2030','#ev2035','#ev2040','#evGrowth','#evKm','#evCons','#evLoss','#evPeakKw','#evSmartKw','#evLf','#evSmart'].forEach(s => $(s).addEventListener('input', evRender));
let playTimer = null;
$('#evPlay').onclick = () => {
  if (playTimer){ clearInterval(playTimer); playTimer = null; $('#evPlay').textContent = '▶'; return; }
  // haritada EV puant katmanını göster
  $('#lyrEdas').checked = true; $('#edasMetric').value = 'ev_puant_pct'; A.syncLayerChecks(); A.applyMetric(); A.renderLegend();
  $('#evYear').value = 2026; evRender(); $('#evPlay').textContent = '⏸';
  playTimer = setInterval(() => {
    const y = +$('#evYear').value + 1;
    if (y > 2040){ clearInterval(playTimer); playTimer = null; $('#evPlay').textContent = '▶'; return; }
    $('#evYear').value = y; evRender();
  }, 900);
};
$('#evTable').addEventListener('click', e => {
  const b = e.target.closest('.bar'); if (!b) return;
  const f = state.edas.features.find(x => x.properties.edas === b.dataset.e);
  map.fitBounds(A.bbox(f.geometry), {padding: 30}); A.selectEdas(f.id); A.minimizeSheet();
});
function evTableHtml(r, filter){
  const rows = r.rows.filter(x => !filter || x.edas === filter).sort((a, b) => b.ev_puant_pct - a.ev_puant_pct);
  return `<table class="t"><tr><td><b>Bölge</b></td><td><b>EV (bin)</b></td><td><b>Ek TWh</b></td><td><b>Ek MW · %puant</b></td><td><b>Gerekli çatı GES</b></td></tr>` +
    rows.map(x => `<tr><td>${esc(x.edas)}</td><td>${fmt(x.ev / 1000)}</td><td>${fmt(x.twh, 2)} (%${fmt(x.ev_pct, 1)})</td><td>${fmt(x.mw)} · %${fmt(x.ev_puant_pct, 1)}</td><td>${fmt(x.mwp)} MWp</td></tr>`).join('') + '</table>';
}
$('#btnEvReport').onclick = () => {
  if (!lastEv) return;
  const r = lastEv;
  addReport({tip:'ev', baslik:`EV dönüşüm senaryosu – ${r.year} (${$('#evPreset .chip.active').textContent}, EV payı %${fmt(r.share * 100, 1)})`,
    html:`<p>Türkiye: ${fmt(r.nat.ev / 1e6, 2)} mn EV · ek ${fmt(r.nat.twh, 1)} TWh · ek akşam puantı ${fmt(r.nat.mw / 1000, 1)} GW · gereken çatı GES ${fmt(r.nat.mwp / 1000, 1)} GWp</p>${evTableHtml(r)}
    <small class="muted">Varsayımlar: ${$('#evKm').value} km/yıl, ${$('#evCons').value} kWh/100 km, %${$('#evLoss').value} şarj kaybı, ${$('#evSmart').checked ? $('#evSmartKw').value + ' kW/EV (akıllı şarj)' : $('#evPeakKw').value + ' kW/EV akşam eşzamanlı yük'}, otomobil parkı +%${$('#evGrowth').value}/yıl. EV payı ülke geneli tek oran.</small>`});
};

// =====================================================================
// 2) NOKTA / PARSEL KARŞILAŞTIRMA (Global Solar Atlas + NASA POWER rüzgâr)
// =====================================================================
const cmp = [];
async function siteData(lng, lat){
  const out = {lng, lat};
  const [gsa, pw] = await Promise.allSettled([
    fetch(`https://api.globalsolaratlas.info/data/lta?loc=${lat.toFixed(5)},${lng.toFixed(5)}`).then(r => r.ok ? r.json() : null),
    fetch(`https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=WS50M&community=RE&longitude=${lng.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`).then(r => r.ok ? r.json() : null)
  ]);
  const a = gsa.value?.annual?.data;
  if (a){ out.ghi = a.GHI; out.pvout = a.PVOUT_csi; out.opta = a.OPTA; out.temp = a.TEMP; out.ele = a.ELE; }
  const ws = pw.value?.properties?.parameter?.WS50M?.ANN;
  if (ws != null && ws >= 0){ out.ws50 = ws; out.ws100 = ws * Math.pow(100 / 50, 0.14); out.wpd = 0.5 * 1.225 * Math.pow(out.ws100, 3) * 1.91; }
  // en yakın denizde/karada? il, bölge
  const il = A.whichFeature(state.il, [lng, lat]), ed = A.whichFeature(state.edas, [lng, lat]);
  out.il = il?.properties.il; out.edas = ed?.properties.edas; out.deniz = !il;
  return out;
}
function nearestSubstation(lng, lat){
  // Görünür karolardaki OSM trafo merkezlerinden en yakını (yaklaşık)
  const fs = map.querySourceFeatures('oim', {sourceLayer: 'power_substation_point'});
  let best = null, bd = Infinity;
  fs.forEach(f => {
    const [x, y] = f.geometry.coordinates;
    const d = Math.hypot((x - lng) * Math.cos(lat * Math.PI / 180) * 111.32, (y - lat) * 110.57);
    if (d < bd){ bd = d; best = f; }
  });
  return best ? {km: bd, ad: best.properties.name || '(adsız)', kv: parseFloat(best.properties.voltage) || null} : null;
}
function cmpRender(){
  $('#btnCmpReport').classList.toggle('hidden', !cmp.length); $('#btnCmpClear').classList.toggle('hidden', !cmp.length);
  if (!cmp.length){ $('#cmpTable').className = 'result muted'; $('#cmpTable').textContent = 'Henüz nokta yok.'; return; }
  $('#cmpTable').className = 'result';
  $('#cmpTable').innerHTML = cmpTableHtml();
  map.getSource('cmp')?.setData({type:'FeatureCollection', features: cmp.map((c, i) => ({type:'Feature', geometry:{type:'Point', coordinates:[c.lng, c.lat]}, properties:{n: String(i + 1)}}))});
}
function cmpTableHtml(){
  const best = k => Math.max(...cmp.map(c => c[k] ?? -Infinity));
  const bG = best('pvout'), bW = best('wpd');
  return `<div style="overflow-x:auto"><table class="t"><tr><td><b>#</b></td><td><b>Yer</b></td><td><b>GHI</b><br><small>kWh/m²</small></td><td><b>PV verimi</b><br><small>kWh/kWp</small></td><td><b>Rüzgâr 100 m</b><br><small>m/s · W/m²</small></td><td><b>Trafo</b><br><small>km</small></td></tr>` +
    cmp.map((c, i) => `<tr><td>${i + 1}</td><td style="text-align:left;font-weight:400">${esc(c.etiket)}<br><small class="muted">${c.deniz ? 'deniz' : esc(c.il || '')}${c.edas ? ' · ' + esc(c.edas) : ''}</small></td>
      <td>${c.ghi != null ? fmt(c.ghi) : (c.deniz ? 'kıyı dışı' : '–')}</td><td>${c.pvout != null ? (c.pvout === bG ? '★ ' : '') + fmt(c.pvout) : '–'}</td>
      <td>${c.ws100 != null ? fmt(c.ws100, 1) + ' · ' + (c.wpd === bW ? '★ ' : '') + fmt(c.wpd) : '–'}</td><td>${c.trafo ? fmt(c.trafo.km, 1) : '–'}</td></tr>`).join('') +
    `</table></div><small class="muted">GHI/PV: Global Solar Atlas (Solargis, ≈250 m). Rüzgâr: NASA POWER 50 m (0,5°) → 100 m'ye üstel profil (α=0,14). Trafo: görünür OSM trafo merkezlerine kuş uçuşu. Rüzgâr verisi kaba çözünürlüklüdür; mahalle ölçeğinde fark güneşte belirgindir, rüzgâr için Global Wind Atlas / ölçüm direği gerekir.</small>`;
}
async function addCmp(lng, lat, etiket, extra){
  $('#cmpTable').className = 'result'; $('#cmpTable').innerHTML = (cmp.length ? cmpTableHtml() : '') + '<p class="hint">Veri alınıyor…</p>';
  const d = await siteData(lng, lat);
  d.etiket = etiket || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  d.trafo = nearestSubstation(lng, lat);
  Object.assign(d, extra || {});
  cmp.push(d); cmpRender();
  return d;
}
map.on('load', () => {
  const add = () => {
    if (map.getSource('cmp')) return;
    map.addSource('cmp', {type:'geojson', data:{type:'FeatureCollection', features:[]}});
    map.addLayer({id:'cmp-pt', type:'circle', source:'cmp', paint:{'circle-radius':10,'circle-color':'#0f3d5e','circle-stroke-color':'#f2a900','circle-stroke-width':2}});
    map.addLayer({id:'cmp-lbl', type:'symbol', source:'cmp', layout:{'text-field':['get','n'],'text-size':12,'text-font':['Open Sans Semibold'],'text-allow-overlap':true}, paint:{'text-color':'#fff'}});
    map.addSource('parsel', {type:'geojson', data:{type:'FeatureCollection', features:[]}});
    map.addLayer({id:'parsel-fill', type:'fill', source:'parsel', paint:{'fill-color':'#f2a900','fill-opacity':0.3}});
    map.addLayer({id:'parsel-line', type:'line', source:'parsel', paint:{'line-color':'#c0392b','line-width':2.5}});
  };
  if (map.getSource('edas')) add(); else map.once('idle', add);
  const iv = setInterval(() => { if (state.edas && state.edas.features[0].properties.ghi){ clearInterval(iv); evRender(); } }, 300);
});
$('#btnCmpPick').onclick = () => {
  if (state.mode === 'cmp'){ setModeLocal(null); return; }
  setModeLocal('cmp', 'Karşılaştırılacak noktaya dokunun (deniz de olur)'); A.minimizeSheet();
};
function setModeLocal(m, text){
  state.mode = m;
  $('#modeBanner').textContent = text || ''; $('#modeBanner').classList.toggle('hidden', !m);
  $('#btnCmpPick').classList.toggle('on', m === 'cmp');
}
map.on('click', async e => {
  if (state.mode !== 'cmp') return;
  setModeLocal(null); A.openSheet(); A.goTab('analiz');
  $$('#pane-analiz details').forEach(d => { d.open = d.querySelector('#cmpTable') != null; });
  await addCmp(e.lngLat.lng, e.lngLat.lat);
});
$('#btnCmpClear').onclick = () => { cmp.length = 0; cmpRender(); map.getSource('cmp')?.setData({type:'FeatureCollection', features:[]}); };
$('#btnCmpReport').onclick = () => addReport({tip:'cmp', baslik:`Nokta / parsel karşılaştırması (${cmp.length} yer)`, html: cmpTableHtml()});

// =====================================================================
// 3) TKGM PARSEL SORGUSU
// =====================================================================
const TKGM = 'https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api';
let ilceData = [], lastParsel = null;
try { $('#pProxy').value = localStorage.getItem('enaren_tkgm_proxy') || ''; } catch (e) {}
$('#pProxy').addEventListener('change', () => { try { localStorage.setItem('enaren_tkgm_proxy', $('#pProxy').value.trim()); } catch (e) {} });

fetch('data/tkgm/iller.json').then(r => r.json()).then(list => {
  $('#pIl').innerHTML = '<option value="">— İl seçin —</option>' + list.map(([id, ad]) => `<option value="${id}">${esc(ad)}</option>`).join('');
});
$('#pIl').onchange = async () => {
  $('#pIlce').innerHTML = '<option value="">— İlçe seçin —</option>'; $('#pMah').innerHTML = '<option value="">— Mahalle seçin —</option>';
  $('#pIlce').disabled = $('#pMah').disabled = true;
  if (!$('#pIl').value) return;
  ilceData = await fetch(`data/tkgm/${$('#pIl').value}.json`).then(r => r.json());
  $('#pIlce').innerHTML += ilceData.map(([id, ad]) => `<option value="${id}">${esc(ad)}</option>`).join(''); $('#pIlce').disabled = false;
};
$('#pIlce').onchange = () => {
  const c = ilceData.find(x => String(x[0]) === $('#pIlce').value);
  $('#pMah').innerHTML = '<option value="">— Mahalle seçin —</option>' + (c ? c[2].map(([k, ad]) => `<option value="${k}">${esc(ad)}</option>`).join('') : '');
  $('#pMah').disabled = !c;
};
async function tkgmFetch(url){
  const proxy = $('#pProxy').value.trim();
  const r = proxy
    ? await fetch(proxy, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({url})})
    : await fetch(url, {headers:{Accept:'application/json'}});
  const t = await r.text();
  if (/sorgu limit|Günlük/i.test(t)) throw new Error('TKGM günlük sorgu limiti aşıldı (bu IP için). Yarın tekrar deneyin, başka bir ağdan (ör. mobil veri) deneyin ya da Gelişmiş bölümünden proxy girin.');
  if (!r.ok) throw new Error(`TKGM yanıtı: HTTP ${r.status}`);
  if (t.trim().startsWith('<')) throw new Error('TKGM beklenmeyen yanıt döndü.');
  return JSON.parse(t);
}
$('#btnParsel').onclick = async () => {
  const mah = $('#pMah').value, ada = $('#pAda').value.trim(), parsel = $('#pParsel').value.trim();
  if (!mah || !parsel){ $('#parselResult').className = 'result'; $('#parselResult').textContent = 'Mahalle ve parsel numarasını girin (ada yoksa 0).'; return; }
  $('#parselResult').className = 'result'; $('#parselResult').textContent = 'TKGM sorgulanıyor…';
  $('#btnParselReport').classList.add('hidden'); $('#btnParselGes').classList.add('hidden');
  try {
    const data = await tkgmFetch(`${TKGM}/parsel/${mah}/${ada || 0}/${parsel}`);
    const f = data.type === 'FeatureCollection' ? data.features[0] : data;
    if (!f?.geometry) throw new Error('Parsel bulunamadı.');
    const p = f.properties || {};
    map.getSource('parsel').setData({type:'FeatureCollection', features:[f]});
    map.fitBounds(A.bbox(f.geometry), {padding: 60, maxZoom: 18});
    const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
    const alan = parseFloat(String(p.Alan ?? p.alan ?? '').replace(/\./g, '').replace(',', '.')) || A.ringArea(ring.slice(0, -1));
    const [cx, cy] = A.centroid(f.geometry);
    const mahAdi = $('#pMah').selectedOptions[0].textContent, ilceAdi = $('#pIlce').selectedOptions[0].textContent, ilAdi = $('#pIl').selectedOptions[0].textContent;
    $('#parselResult').innerHTML = `<b>${esc(ilAdi)} / ${esc(ilceAdi)} / ${esc(mahAdi)}</b> – Ada ${esc(p.AdaNo ?? ada)} Parsel ${esc(p.ParselNo ?? parsel)}<br>Alan: <b>${fmt(alan)} m²</b> · Nitelik: ${esc(p.Nitelik ?? '–')} · Mevkii: ${esc(p.Mevkii ?? '–')}<p class="hint">Güneş/rüzgâr verisi alınıyor…</p>`;
    // arazi GES: ~17 m²/kWp (sıra aralıklı sabit montaj)
    await new Promise(r => setTimeout(r, 1200)); // karoların yüklenmesi için (trafo mesafesi)
    const d = await addCmp(cx, cy, `${mahAdi} ${p.AdaNo ?? ada}/${p.ParselNo ?? parsel}`, {alan});
    const kwp = alan / 17, mwh = d.pvout ? kwp * d.pvout / 1000 : null;
    lastParsel = {f, p, alan, d, kwp, mwh, etiket: `${ilAdi} / ${ilceAdi} / ${mahAdi} – ${p.AdaNo ?? ada}/${p.ParselNo ?? parsel}`};
    $('#parselResult').innerHTML = `<b>${esc(lastParsel.etiket)}</b><br>Alan: <b>${fmt(alan)} m²</b> · Nitelik: ${esc(p.Nitelik ?? '–')} · Mevkii: ${esc(p.Mevkii ?? '–')}
      <div class="kpi" style="margin-top:8px">
        <div><strong>${d.ghi ? fmt(d.ghi) : '–'}</strong><span>GHI kWh/m²·yıl</span></div>
        <div><strong>${d.pvout ? fmt(d.pvout) : '–'}</strong><span>PV verimi kWh/kWp</span></div>
        <div><strong>${fmt(kwp)} kWp</strong><span>arazi GES kapasitesi*</span></div>
        <div><strong>${mwh ? fmt(mwh) : '–'} MWh</strong><span>yıllık üretim*</span></div>
        <div><strong>${d.ws100 ? fmt(d.ws100, 1) : '–'} m/s</strong><span>rüzgâr 100 m (kaba)</span></div>
        <div><strong>${d.trafo ? fmt(d.trafo.km, 1) + ' km' : '–'}</strong><span>en yakın trafo (OSM)${d.trafo ? ': ' + esc(d.trafo.ad) : ''}</span></div></div>
      <small class="muted">*~17 m²/kWp yerleşim, imar/nitelik uygunluğu ayrıca kontrol edilmeli. Bölge: ${esc(d.edas || '–')}. Parsel karşılaştırma tablosuna eklendi (Analiz sekmesi).</small>`;
    $('#btnParselReport').classList.remove('hidden'); $('#btnParselGes').classList.remove('hidden');
  } catch (err) {
    $('#parselResult').innerHTML = `<b>Sorgu başarısız.</b> ${esc(err.message === 'Failed to fetch' ? 'TKGM servisine ulaşılamadı (ağ / tarayıcı engeli).' : err.message)}<br><a href="https://parselsorgu.tkgm.gov.tr" target="_blank" rel="noopener">parselsorgu.tkgm.gov.tr</a>`;
  }
};
$('#btnParselReport').onclick = () => {
  const L = lastParsel; if (!L) return;
  const d = L.d;
  addReport({tip:'parsel', baslik:`Parsel: ${L.etiket}`, html:`<table class="t">
    <tr><td>Alan</td><td>${fmt(L.alan)} m²</td></tr><tr><td>Nitelik / Mevkii</td><td>${esc(L.p.Nitelik ?? '–')} / ${esc(L.p.Mevkii ?? '–')}</td></tr>
    <tr><td>Dağıtım bölgesi</td><td>${esc(d.edas || '–')}</td></tr>
    <tr><td>GHI (GSA)</td><td>${d.ghi ? fmt(d.ghi) : '–'} kWh/m²·yıl</td></tr><tr><td>PV özgül verim</td><td>${d.pvout ? fmt(d.pvout) : '–'} kWh/kWp</td></tr>
    <tr><td>Optimum eğim</td><td>${d.opta ?? '–'}°</td></tr>
    <tr><td>Arazi GES kapasitesi / üretim</td><td>${fmt(L.kwp)} kWp / ${L.mwh ? fmt(L.mwh) : '–'} MWh·yıl</td></tr>
    <tr><td>Rüzgâr 100 m (NASA POWER, kaba)</td><td>${d.ws100 ? fmt(d.ws100, 1) + ' m/s · ' + fmt(d.wpd) + ' W/m²' : '–'}</td></tr>
    <tr><td>En yakın trafo (OSM)</td><td>${d.trafo ? esc(d.trafo.ad) + ' · ' + fmt(d.trafo.km, 1) + ' km' + (d.trafo.kv ? ' · ' + fmt(d.trafo.kv) + ' kV' : '') : '–'}</td></tr></table>`});
};
$('#btnParselGes').onclick = () => {
  const L = lastParsel; if (!L) return;
  $('#gesArea').value = Math.round(L.alan); $('#gesUse').value = 100; $('#gesKwp').value = (1 / 17).toFixed(3);
  A.goTab('analiz'); $$('#pane-analiz details').forEach(d => { d.open = !!d.querySelector('#gesResult'); });
  state.gesPoint = [L.d.lng, L.d.lat]; state.gesGhi = (L.d.ghi || 1700) / 365;
  $('#gesArea').dispatchEvent(new Event('input'));
};

// =====================================================================
// 4) HAZIR BÖLGE RAPORU
// =====================================================================
function bolgeRaporu(edas){
  const f = state.edas.features.find(x => x.properties.edas === edas); if (!f) return;
  const p = f.properties;
  const rank = k => 1 + state.edas.features.filter(x => x.properties[k] > p[k]).length;
  const yil = +$('#evYear').value, r = evCalc(yil), ev = r.rows.find(x => x.edas === edas);
  const ev35 = evCalc(2035).rows.find(x => x.edas === edas), ev40 = evCalc(2040).rows.find(x => x.edas === edas);
  const iller = state.il.features.filter(x => x.properties.edas === edas).map(x => x.properties).sort((a, b) => b.otomobil - a.otomobil);
  addReport({tip:'bolge-rapor', baslik:`Bölge raporu – ${edas}`, html:`
    <p><b>İller:</b> ${esc(p.iller)}</p>
    <table class="t">
      <tr><td>Faturalanan tüketim 2024</td><td>${fmt(p.toplam_twh, 2)} TWh (${rank('toplam_twh')}./20, Türkiye payı %${fmt(p.pay, 2)})</td></tr>
      <tr><td>Tüketici sayısı</td><td>${fmt(p.tuketici)} (${rank('tuketici')}./20)</td></tr>
      <tr><td>Gerçekleşen kayıp oranı</td><td>%${fmt(p.kayip, 2)} (${rank('kayip')}./20)</td></tr>
      <tr><td>Tüketici başına dağıtım tüketimi</td><td>${fmt(p.kwh_kisi)} kWh</td></tr>
      <tr><td>Tahmini mevcut puant</td><td>~${fmt(ev.puant)} MW</td></tr>
      <tr><td>Ortalama güneş ışınımı</td><td>${fmt(p.ghi)} kWh/m²·yıl</td></tr>
      <tr><td>Otomobil sayısı (Eyl. 2026)</td><td>${fmt(p.otomobil)}</td></tr>
    </table>
    <h6 style="margin-top:10px">EV dönüşüm senaryosu (${$('#evPreset .chip.active').textContent})</h6>
    <table class="t"><tr><td><b>Yıl</b></td><td><b>EV</b></td><td><b>Ek tüketim</b></td><td><b>Ek akşam puantı</b></td><td><b>Gereken çatı GES</b></td></tr>
    ${[[yil, ev], [2035, ev35], [2040, ev40]].filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i).map(([y, e]) => `<tr><td>${y}</td><td>${fmt(e.ev)}</td><td>${fmt(e.twh, 2)} TWh (%${fmt(e.ev_pct, 1)})</td><td>${fmt(e.mw)} MW (%${fmt(e.ev_puant_pct, 1)})</td><td>${fmt(e.mwp)} MWp</td></tr>`).join('')}</table>
    <h6 style="margin-top:10px">İl kırılımı</h6>
    <table class="t"><tr><td><b>İl</b></td><td><b>Taşıt</b></td><td><b>Otomobil</b></td><td><b>GHI</b></td></tr>
    ${iller.map(i => `<tr><td>${esc(i.il)}</td><td>${fmt(i.tasit)}</td><td>${fmt(i.otomobil)}</td><td>${fmt(i.ghi_yil)}</td></tr>`).join('')}</table>
    <small class="muted">Kaynak: ELDER 2024 (EPDK), TÜİK Motorlu Kara Taşıtları Eyl. 2026, NASA POWER. Puant tahmini yük faktörüne dayalıdır; EV senaryosu varsayımları EV Senaryo sekmesinde.</small>`});
  A.goTab('rapor');
}
window.ENAREN_MOD = { bolgeRaporu, addCmp, evRender };
})();
