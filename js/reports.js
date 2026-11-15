/* ENAREN WebGIS – Tip raporlar: GES fizibilite, bölge fırsat raporu, deniz enerjisi saha raporu.
 * Otomatik harita görüntüsü + SVG infografikler, PDF için yazdırma. */
(() => {
'use strict';
const A = window.ENAREN_APP, M = window.ENAREN_MOD;
const { map, state, fmt } = A;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AY = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const today = () => new Date().toLocaleDateString('tr-TR', {day:'numeric', month:'long', year:'numeric'});

// ---------------- SVG grafik yardımcıları ----------------
function barChart(vals, labels, {w = 640, h = 200, color = '#0f3d5e', unit = '', d = 0, hl = -1, hlColor = '#f2a900'} = {}){
  const pad = {l: 44, r: 8, t: 14, b: 26}, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const max = Math.max(...vals, 0) * 1.1 || 1, min = Math.min(0, ...vals) * 1.1, rng = max - min;
  const bw = iw / vals.length, y = v => pad.t + ih * (max - v) / rng, y0 = y(0);
  const ticks = [min, (min + max) / 2, max].map(v => `<text x="${pad.l - 4}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#6b7785">${fmt(v, d)}</text><line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e8ee"/>`).join('');
  const bars = vals.map((v, i) => `<rect x="${pad.l + i * bw + bw * 0.12}" y="${Math.min(y(v), y0)}" width="${bw * 0.76}" height="${Math.abs(y(v) - y0)}" rx="2" fill="${i === hl ? hlColor : (v < 0 ? '#c0392b' : color)}"/>` +
    (vals.length <= 14 ? `<text x="${pad.l + i * bw + bw / 2}" y="${(v >= 0 ? y(v) - 3 : y(v) + 11)}" text-anchor="middle" font-size="9.5" fill="#1d2733">${fmt(v, d)}</text>` : '') +
    `<text x="${pad.l + i * bw + bw / 2}" y="${h - 8}" text-anchor="middle" font-size="9.5" fill="#6b7785">${esc(labels[i])}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${ticks}${bars}<text x="4" y="10" font-size="10" fill="#6b7785">${esc(unit)}</text></svg>`;
}
function lineChart(series, labels, {w = 640, h = 210, unit = '', d = 0} = {}){
  const pad = {l: 50, r: 10, t: 16, b: 26}, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const all = series.flatMap(s => s.v), max = Math.max(...all) * 1.1 || 1, min = Math.min(0, ...all);
  const x = i => pad.l + iw * i / (labels.length - 1), y = v => pad.t + ih * (max - v) / (max - min);
  const grid = [min, (min + max) / 2, max].map(v => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e8ee"/><text x="${pad.l - 4}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#6b7785">${fmt(v, d)}</text>`).join('');
  const zero = min < 0 ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(0)}" y2="${y(0)}" stroke="#1d2733" stroke-width="1"/>` : '';
  const lines = series.map(s => `<polyline fill="none" stroke="${s.c}" stroke-width="2.5" points="${s.v.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>` + `<text x="${w - pad.r}" y="${y(s.v[s.v.length - 1]) - 5}" text-anchor="end" font-size="10.5" fill="${s.c}" font-weight="600">${esc(s.n)}</text>`).join('');
  const step = Math.ceil(labels.length / 10);
  const xl = labels.map((l, i) => i % step === 0 || i === labels.length - 1 ? `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" font-size="9.5" fill="#6b7785">${esc(l)}</text>` : '').join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${grid}${zero}${lines}${xl}<text x="4" y="11" font-size="10" fill="#6b7785">${esc(unit)}</text></svg>`;
}
function donut(parts, {size = 150} = {}){
  const tot = parts.reduce((s, p) => s + p.v, 0) || 1, r = size / 2 - 12, c = size / 2; let a = -Math.PI / 2;
  const arcs = parts.map(p => { const da = 2 * Math.PI * p.v / tot, x1 = c + r * Math.cos(a), y1 = c + r * Math.sin(a); a += da; const x2 = c + r * Math.cos(a), y2 = c + r * Math.sin(a);
    return `<path d="M${x1},${y1} A${r},${r} 0 ${da > Math.PI ? 1 : 0} 1 ${x2},${y2}" stroke="${p.c}" stroke-width="20" fill="none"/>`; }).join('');
  const leg = parts.map((p, i) => `<g transform="translate(${size + 10},${16 + i * 20})"><rect width="12" height="12" rx="2" fill="${p.c}"/><text x="18" y="10" font-size="11" fill="#1d2733">${esc(p.n)}: ${fmt(p.v / tot * 100, 0)}%</text></g>`).join('');
  return `<svg class="chart" viewBox="0 0 ${size + 230} ${Math.max(size, 20 * parts.length + 20)}" xmlns="http://www.w3.org/2000/svg" style="max-width:420px">${arcs}${leg}</svg>`;
}
const tile = (v, l, cls = '') => `<div class="tile ${cls}"><strong>${v}</strong><span>${l}</span></div>`;

// ---------------- Otomatik harita görüntüsü ----------------
async function snapshot({bounds, center, zoom, show = [], hide = [], basemap, marker}){
  const prev = {c: map.getCenter(), z: map.getZoom(), vis: {}};
  const ids = [...show, ...hide];
  ids.forEach(id => { if (map.getLayer(id)) prev.vis[id] = map.getLayoutProperty(id, 'visibility'); });
  show.forEach(id => A.setVis(id, true)); hide.forEach(id => A.setVis(id, false));
  const prevBm = $$('#basemaps .chip').find(c => c.classList.contains('active'))?.dataset.k;
  if (basemap) A.setBasemap(basemap);
  if (marker){
    if (!map.getSource('rmark')){ map.addSource('rmark', {type:'geojson', data:{type:'FeatureCollection', features:[]}}); map.addLayer({id:'rmark', type:'circle', source:'rmark', paint:{'circle-radius':9,'circle-color':'#f2a900','circle-stroke-color':'#c0392b','circle-stroke-width':3}}); }
    map.getSource('rmark').setData({type:'Feature', geometry:{type:'Point', coordinates:marker}, properties:{}});
  }
  if (bounds) map.fitBounds(bounds, {padding: 30, animate: false, maxZoom: 15}); else map.jumpTo({center, zoom});
  await new Promise(res => { let done = false; const fin = () => { if (!done){ done = true; res(); } }; map.once('idle', fin); setTimeout(fin, 9000); });
  await new Promise(r => setTimeout(r, 250));
  let img = null; try { img = map.getCanvas().toDataURL('image/jpeg', 0.85); } catch (e) {}
  // geri al
  Object.entries(prev.vis).forEach(([id, v]) => map.setLayoutProperty(id, 'visibility', v || 'visible'));
  if (basemap && prevBm) A.setBasemap(prevBm);
  if (marker) map.getSource('rmark').setData({type:'FeatureCollection', features:[]});
  map.jumpTo({center: prev.c, zoom: prev.z});
  return img;
}

// ---------------- Rapor görüntüleyici ----------------
let current = null;
function openReport(r){
  current = r;
  $('#rvBody').innerHTML = r.html;
  $('#rView').classList.remove('hidden'); $('#rView').scrollTop = 0;
}
$('#rvClose').onclick = () => $('#rView').classList.add('hidden');
$('#rvPrint').onclick = () => { $('#printArea').innerHTML = `<div class="rdoc">${current.html}</div>`; setTimeout(() => window.print(), 150); };
$('#rvAdd').onclick = () => { A.addReport({tip:'tip-rapor', baslik:current.title, html:current.html}); };
const header = (title, sub) => `<div class="hdr"><small>TENMAK · Enerji Araştırma Enstitüsü (ENAREN) · Demo WebGIS · ${today()}</small><h1>${esc(title)}</h1><small>${esc(sub)}</small></div>`;
const footer = (src) => `<div class="foot">Kaynaklar: ${src}. Bu rapor otomatik üretilmiş ön değerlendirmedir; yatırım kararı için saha ölçümü, izin ve detaylı mühendislik çalışması gerekir.</div>`;

// ---------------- Form / tip seçimi ----------------
let rtype = null;
$$('.rtype').forEach(el => el.addEventListener('click', () => { rtype = el.dataset.r; $$('.rtype').forEach(x => x.classList.toggle('active', x === el)); renderForm(); }));
function lastPoint(){
  const L = state.lastParselRef, c = (window.ENAREN_CMP || [])[0];
  if (state.lastDenizData && rtype === 'deniz') return {lng: state.lastDenizData.lng, lat: state.lastDenizData.lat, ad: 'Son deniz noktası'};
  if (state.gesPoint) return {lng: state.gesPoint[0], lat: state.gesPoint[1], ad: 'Son GES noktası'};
  return null;
}
function renderForm(){
  const f = $('#rForm'); f.classList.remove('hidden');
  if (rtype === 'ges'){
    const p = lastPoint();
    f.innerHTML = `<b>☀ GES Fizibilite – konum</b>
      <p class="hint">${p ? `Kullanılacak konum: <b>${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</b> (${esc(p.ad)}).` : 'Konum yok.'} Farklı bir yer için haritadan seçin.</p>
      <div class="btnrow"><button class="btn" id="rgPick">📍 Haritadan seç</button></div>
      <div class="grid2">
        <label>Tip<select id="rgTip"><option value="arazi">Arazi GES</option><option value="cati">Çatı GES</option></select></label>
        <label>Kurulu güç (kWp)<input type="number" id="rgKwp" value="${Math.round(state.lastGes?.kwp || 1000)}"></label>
        <label>Yatırım (USD/kWp)<input type="number" id="rgCapex" value="500"></label>
        <label>İşletme gideri (%/yıl)<input type="number" id="rgOpex" value="1.5" step="0.1"></label>
        <label>Elektrik değeri (USD/kWh)<input type="number" id="rgPrice" value="0.08" step="0.005"></label>
        <label>Fiyat artışı (%/yıl)<input type="number" id="rgEsc" value="2" step="0.5"></label>
        <label>İskonto oranı (%)<input type="number" id="rgDisc" value="10" step="0.5"></label>
        <label>Ömür (yıl)<input type="number" id="rgLife" value="25"></label>
      </div>
      <p class="hint">Varsayılanlar: arazi GES ~400–600 bin USD/MW (2026 sektör aralığı), çatıda daha yüksek birim maliyet. Değerleri düzenleyebilirsiniz.</p>
      <button class="btn primary" id="rgGo" ${p ? '' : 'disabled'}>Raporu oluştur</button>`;
    $('#rgTip').onchange = () => { $('#rgCapex').value = $('#rgTip').value === 'cati' ? 700 : 500; };
    $('#rgPick').onclick = () => pickPoint(ll => { state.gesPoint = [ll.lng, ll.lat]; renderForm(); });
    $('#rgGo').onclick = () => gesReport(lastPoint());
  } else if (rtype === 'bolge'){
    const sel = state.edas.features.map(x => x.properties.edas).sort((a, b) => a.localeCompare(b, 'tr'));
    f.innerHTML = `<b>🗺 Bölge seçin</b><label class="block"><select id="rbEdas">${sel.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
      <p class="hint">EV senaryosu sekmesindeki ön ayar ve varsayımlar kullanılır (şu an: ${esc($('#evPreset .chip.active')?.textContent || 'Orta')}).</p>
      <button class="btn primary" id="rbGo">Raporu oluştur</button>`;
    const ed = A.whichFeature(state.edas, [map.getCenter().lng, map.getCenter().lat]); if (ed) $('#rbEdas').value = ed.properties.edas;
    $('#rbGo').onclick = () => bolgeReport($('#rbEdas').value);
  } else if (rtype === 'deniz'){
    const d = state.lastDenizData;
    f.innerHTML = `<b>🌊 Deniz sahası</b><p class="hint">${d ? `Son analiz edilen nokta: <b>${d.lat.toFixed(3)}, ${d.lng.toFixed(3)}</b>.` : 'Önce bir deniz noktası seçin.'}</p>
      <div class="btnrow"><button class="btn" id="rdPick">🌊 Denizde nokta seç</button><button class="btn primary" id="rdGo" ${d && !d.kara ? '' : 'disabled'}>Raporu oluştur</button></div>`;
    $('#rdPick').onclick = () => pickPoint(async ll => { await window.ENAREN_DENIZ.denizAnaliz(ll.lng, ll.lat); A.goTab('rapor'); renderForm(); });
    $('#rdGo').onclick = () => denizReport(state.lastDenizData);
  }
}
function pickPoint(cb){
  state.mode = 'rpick'; $('#modeBanner').textContent = 'Rapor için haritada bir nokta seçin'; $('#modeBanner').classList.remove('hidden'); A.minimizeSheet();
  map.once('click', e => { state.mode = null; $('#modeBanner').classList.add('hidden'); A.openSheet(); A.goTab('rapor'); cb(e.lngLat); });
}
function busy(t){ $('#rForm').insertAdjacentHTML('beforeend', `<p class="hint" id="rBusy">⏳ ${esc(t)}</p>`); }
function unbusy(){ $('#rBusy')?.remove(); }

// ---------------- 1) GES FİZİBİLİTE ----------------
async function gsaFull(lat, lng){
  try { return await fetch(`https://api.globalsolaratlas.info/data/lta?loc=${lat.toFixed(5)},${lng.toFixed(5)}`).then(r => r.ok ? r.json() : null); } catch (e) { return null; }
}
function monthly(gsa, key){
  const m = gsa?.monthly?.data?.[key]; if (!m) return null;
  return Array.isArray(m) ? m : Object.values(m);
}
function finance({kwp, yieldY, capex, opexPct, price, esc: e, disc, life, deg = 0.005}){
  const inv = kwp * capex, cf = [-inv], prod = [];
  for (let t = 1; t <= life; t++){
    const kwh = kwp * yieldY * Math.pow(1 - deg, t - 1); prod.push(kwh);
    cf.push(kwh * price * Math.pow(1 + e, t - 1) - inv * opexPct);
  }
  const npv = r => cf.reduce((s, v, t) => s + v / Math.pow(1 + r, t), 0);
  let lo = -0.5, hi = 1, irr = null;
  if (npv(lo) * npv(hi) < 0){ for (let i = 0; i < 80; i++){ const mid = (lo + hi) / 2; if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid; } irr = (lo + hi) / 2; }
  let cum = 0, payback = null; const cumArr = cf.map((v, t) => { cum += v; if (payback == null && cum >= 0 && t > 0) payback = t - 1 + (-(cum - v)) / v; return cum; });
  const pvCost = inv + Array.from({length: life}, (_, t) => inv * opexPct / Math.pow(1 + disc, t + 1)).reduce((s, v) => s + v, 0);
  const pvE = prod.reduce((s, v, t) => s + v / Math.pow(1 + disc, t + 1), 0);
  return {inv, cf, cumArr, npv: npv(disc), irr, payback, lcoe: pvCost / pvE, prod};
}
async function gesReport(p){
  if (!p) return; busy('Güneş verisi ve harita hazırlanıyor…');
  const v = id => +$('#' + id).value;
  const tip = $('#rgTip').value, kwp = v('rgKwp');
  const gsa = await gsaFull(p.lat, p.lng);
  const a = gsa?.annual?.data || {};
  let yieldY = a.PVOUT_csi;
  if (!yieldY){ const s = await M.addCmp(p.lng, p.lat, 'Rapor noktası'); yieldY = (s.ghi || 1650) * 0.95; }
  if (tip === 'cati') yieldY *= 0.95; // daha düşük eğim / gölge payı
  const mPv = monthly(gsa, 'PVOUT_csi') || AY.map((_, i) => yieldY / 12 * (1 + 0.45 * Math.sin((i - 2.5) / 12 * 2 * Math.PI)));
  const mScale = tip === 'cati' ? 0.95 : 1;
  const fin = finance({kwp, yieldY, capex: v('rgCapex'), opexPct: v('rgOpex') / 100, price: v('rgPrice'), esc: v('rgEsc') / 100, disc: v('rgDisc') / 100, life: v('rgLife')});
  const il = A.whichFeature(state.il, [p.lng, p.lat]), ed = A.whichFeature(state.edas, [p.lng, p.lat]);
  const mwh1 = kwp * yieldY / 1000, co2 = mwh1 * 0.44, homes = mwh1 * 1000 / 2600, evs = mwh1 * 1000 / 2244;
  const area = tip === 'cati' ? kwp / 0.2 : kwp * 15;
  const img = await snapshot({center:[p.lng, p.lat], zoom: tip === 'cati' ? 17 : 14, basemap:'uydu', marker:[p.lng, p.lat], show: ['oim-lines','oim-subs'], hide: ['edas-fill','edas-line','edas-label','wind','solar']});
  const ctx = await snapshot({center:[p.lng, p.lat], zoom: 6.2, marker:[p.lng, p.lat], show:['solar'], hide:['edas-fill','edas-label','wind','oim-lines','oim-subs']});
  unbusy();
  const verdict = fin.irr != null && fin.irr > v('rgDisc') / 100 + 0.03 ? ['g', `Yatırım cazip: IRR %${fmt(fin.irr * 100, 1)}, geri ödeme ~${fmt(fin.payback, 1)} yıl.`]
    : fin.npv > 0 ? ['o', `Sınırda ekonomik: NPV pozitif ancak marj dar (IRR %${fmt((fin.irr || 0) * 100, 1)}).`]
    : ['r', `Mevcut varsayımlarla ekonomik değil (NPV ${fmt(fin.npv / 1000)} bin USD). Elektrik değeri veya maliyet varsayımlarını gözden geçirin.`];
  const yrs = fin.cumArr.map((_, i) => String(i));
  const title = `GES Fizibilite Raporu – ${il ? il.properties.il : 'Seçilen konum'}`;
  const html = header(title, `${tip === 'cati' ? 'Çatı' : 'Arazi'} GES · ${fmt(kwp)} kWp · ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}${ed ? ' · ' + ed.properties.edas : ''}`) + `
    <div class="verdict ${verdict[0]}">${verdict[1]}</div>
    <div class="tiles">
      ${tile(fmt(mwh1) + ' MWh', 'yıllık üretim (1. yıl)', 'g')}
      ${tile(fmt(yieldY) + ' kWh/kWp', 'özgül verim', 'o')}
      ${tile(fmt(fin.inv / 1e6, 2) + ' mn $', 'yatırım')}
      ${tile(fmt(fin.lcoe * 1000, 1) + ' $/MWh', 'LCOE (seviyelendirilmiş maliyet)', 'o')}
      ${tile(fin.payback != null ? fmt(fin.payback, 1) + ' yıl' : '>' + v('rgLife'), 'basit geri ödeme', fin.payback && fin.payback < 8 ? 'g' : 'r')}
      ${tile(fin.irr != null ? '%' + fmt(fin.irr * 100, 1) : '–', 'iç verim oranı (IRR)', 'g')}
      ${tile(fmt(fin.npv / 1e6, 2) + ' mn $', `NPV (%${v('rgDisc')})`, fin.npv > 0 ? 'g' : 'r')}
      ${tile(fmt(co2) + ' t', 'yıllık CO₂ kaçınımı', 'g')}
    </div>
    <h2>Konum</h2>${img ? `<img class="map" src="${img}" alt="Saha haritası">` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">${ctx ? `<img class="map" src="${ctx}" alt="Bölgesel ışınım">` : ''}<table class="t">
      <tr><td>İl / bölge</td><td>${esc(il?.properties.il || '–')} / ${esc(ed?.properties.edas || '–')}</td></tr>
      <tr><td>GHI</td><td>${a.GHI ? fmt(a.GHI) : '–'} kWh/m²·yıl</td></tr><tr><td>DNI</td><td>${a.DNI ? fmt(a.DNI) : '–'} kWh/m²·yıl</td></tr>
      <tr><td>Optimum eğim</td><td>${a.OPTA ?? '–'}°</td></tr><tr><td>Ortalama sıcaklık</td><td>${a.TEMP != null ? fmt(a.TEMP, 1) + ' °C' : '–'}</td></tr>
      <tr><td>Rakım</td><td>${a.ELE != null ? fmt(a.ELE) + ' m' : '–'}</td></tr><tr><td>Gerekli alan</td><td>~${fmt(area)} m²</td></tr></table></div>
    <h2>Aylık üretim profili</h2>${barChart(mPv.map(x => x * kwp * mScale / 1000), AY, {unit:'MWh', color:'#f2a900', d:0})}
    <h2>Kümülatif nakit akışı (USD)</h2>${lineChart([{n:'Kümülatif', c:'#0f3d5e', v: fin.cumArr.map(x => x / 1000)}], yrs, {unit:'bin USD', d:0})}
    <h2>Topluma katkı</h2><div class="tiles">${tile(fmt(homes), 'hanenin yıllık tüketimi', 'g')}${tile(fmt(evs), 'elektrikli aracın yıllık şarjı', 'g')}${tile(fmt(co2 * v('rgLife') * 0.94), `ton CO₂ (${v('rgLife')} yıl)`, 'g')}</div>
    <h2>Varsayımlar</h2><table class="t">
      <tr><td>Yatırım maliyeti</td><td>${v('rgCapex')} USD/kWp</td></tr><tr><td>İşletme gideri</td><td>%${v('rgOpex')} / yıl</td></tr>
      <tr><td>Elektrik değeri</td><td>${v('rgPrice')} USD/kWh, +%${v('rgEsc')}/yıl</td></tr><tr><td>İskonto · ömür · panel yaşlanması</td><td>%${v('rgDisc')} · ${v('rgLife')} yıl · %0,5/yıl</td></tr>
      <tr><td>Şebeke emisyon faktörü</td><td>0,44 kg CO₂/kWh</td></tr></table>
    <h2>Öneriler</h2>
    <div class="rec"><b>Bağlantı:</b> en yakın trafo merkezi ve bağlanabilir kapasite TEİAŞ / ${esc(ed?.properties.edas || 'ilgili EDAŞ')} tablolarından teyit edilmeli.</div>
    <div class="rec"><b>Arazi:</b> ${tip === 'cati' ? 'statik dayanım ve iskân durumu kontrol edilmeli.' : 'tarım dışı nitelik, ÇED eşiği (≥10 MW) ve TUCBS lisanssız GES sahaları ile çakışma kontrol edilmeli.'}</div>
    <div class="rec"><b>Depolama:</b> akşam puantı ve EV şarjıyla eşleşme için %20–30 batarya senaryosu ayrıca değerlendirilebilir.</div>
    ${footer('Global Solar Atlas (Solargis) / NASA POWER, OpenStreetMap, Esri görüntü, ELDER 2024, sektör maliyet aralıkları 2026')}`;
  openReport({title, html});
}

// ---------------- 2) BÖLGE FIRSAT RAPORU ----------------
function regionStats(f){
  const inRegion = (x, y) => !!A.whichFeature({features:[f]}, [x, y]);
  const src = map.getSource('wind'); const wind = (src?.serialize?.().data?.features) || src?._data?.features || [];
  const ws = wind.filter(c => { const g = c.geometry.coordinates[0]; const cx = (g[0][0] + g[2][0]) / 2, cy = (g[0][1] + g[2][1]) / 2; return inRegion(cx, cy); }).map(c => c.properties.ws50);
  return {ws50: ws.length ? ws.reduce((s, v) => s + v, 0) / ws.length : null, ws50max: ws.length ? Math.max(...ws) : null};
}
async function bolgeReport(edas){
  busy('Bölge verileri ve harita hazırlanıyor…');
  const f = state.edas.features.find(x => x.properties.edas === edas), p = f.properties;
  const all = state.edas.features.map(x => x.properties);
  const rank = k => 1 + all.filter(x => x[k] > p[k]).length;
  const avg = k => all.reduce((s, x) => s + x[k], 0) / all.length;
  const st = regionStats(f);
  const years = Array.from({length: 15}, (_, i) => 2026 + i);
  const evSeries = years.map(y => M.evCalc(y).rows.find(r => r.edas === edas));
  const e35 = evSeries[9], e40 = evSeries[14];
  const iller = state.il.features.filter(x => x.properties.edas === edas).map(x => x.properties);
  const ghiMax = Math.max(...iller.map(i => i.ghi_yil)), ghiBest = iller.find(i => i.ghi_yil === ghiMax);
  const kiyi = /Akdeniz|ADM|GDZ|Uludağ|Trakya|Boğaziçi|Sakarya|Başkent|Yeşilırmak|Çoruh|Toroslar/.test(edas);
  // öneriler (kural tabanlı, önceliklendirilmiş)
  const recs = [];
  if (p.ghi >= 1650) recs.push([1, '☀ Arazi ve tarımsal GES (agrivoltaik)', `Ortalama ışınım ${fmt(p.ghi)} kWh/m² ile Türkiye ortalamasının (${fmt(avg('ghi'))}) üzerinde; en yüksek il ${esc(ghiBest.il)} (${fmt(ghiMax)}). YEKA ve lisanssız saha havuzu oluşturulabilir.`]);
  else recs.push([3, '☀ Çatı ve sanayi GES', `Işınım ${fmt(p.ghi)} kWh/m²; büyük arazi GES yerine OSB çatıları ve kamu binaları öncelikli.`]);
  if (st.ws50max != null && st.ws50max >= 5.5) recs.push([1, '🌬 RES', `Bölgedeki 50 m rüzgâr hızı kaba ızgarada en yüksek ${fmt(st.ws50max, 1)} m/s (ortalama ${fmt(st.ws50, 1)}). Global Wind Atlas / ölçüm direğiyle mikro-saha seçimi önerilir.`]);
  if (p.kayip >= 10) recs.push([1, '⚡ Kayıp-kaçak ve akıllı şebeke', `Gerçekleşen kayıp oranı %${fmt(p.kayip, 1)} (Türkiye sıralaması ${rank('kayip')}./20). Akıllı sayaç, mekânsal kayıp analizi ve şebeke yenileme en yüksek getirili yatırım.`]);
  if (e35.ev_puant_pct >= 8) recs.push([2, '🔌 Akıllı şarj ve depolama', `2035'te EV kaynaklı akşam puantı ~${fmt(e35.mw)} MW (tahmini mevcut puantın %${fmt(e35.ev_puant_pct, 1)}'i). Zaman tarifeli/akıllı şarj ve dağıtım trafosu seviyesinde batarya ile ertelenebilir.`]);
  recs.push([2, '🏘 Yerinde üretim', `EV ek talebini karşılamak için 2035'e kadar ~${fmt(e35.mwp)} MWp, 2040'a kadar ~${fmt(e40.mwp)} MWp çatı GES gerekir.`]);
  if (kiyi) recs.push([3, '🌊 Deniz enerjisi', 'Kıyı bölgesi: açık deniz RES ve korunaklı koylarda yüzer GES için Deniz sekmesinden saha taraması yapılabilir.']);
  recs.push([3, '🧭 Veri', 'TUCBS lisanssız GES/RES santral sahaları, YEKA alanları ve EDAŞ bağlantı kayıtlarıyla katman zenginleştirme.']);
  recs.sort((a, b) => a[0] - b[0]);
  const img = await snapshot({bounds: A.bbox(f.geometry), show:['edas-fill','edas-line','oim-lines'], hide:['wind','solar']});
  A.selectEdas(null);
  unbusy();
  const sorted = [...all].sort((a, b) => b.toplam_twh - a.toplam_twh);
  const title = `Bölge Yeni Nesil Enerji Fırsat Raporu – ${edas}`;
  const html = header(title, `İller: ${p.iller}`) + `
    <div class="tiles">
      ${tile(fmt(p.toplam_twh, 2) + ' TWh', `faturalanan tüketim (${rank('toplam_twh')}./20)`)}
      ${tile(fmt(p.tuketici / 1e6, 2) + ' mn', 'tüketici')}
      ${tile('%' + fmt(p.kayip, 1), `kayıp oranı (Türkiye ort. %${fmt(avg('kayip'), 1)})`, p.kayip >= 10 ? 'r' : 'g')}
      ${tile(fmt(p.ghi), 'güneş ışınımı kWh/m²·yıl', 'o')}
      ${tile(st.ws50 != null ? fmt(st.ws50, 1) + ' m/s' : '–', 'ort. rüzgâr 50 m (kaba)')}
      ${tile(fmt(p.otomobil / 1000) + ' bin', 'otomobil (Eyl. 2026)')}
      ${tile(fmt(e35.mw) + ' MW', `2035 EV akşam puantı (%${fmt(e35.ev_puant_pct, 1)})`, e35.ev_puant_pct >= 10 ? 'r' : 'o')}
      ${tile(fmt(e40.mwp) + ' MWp', '2040 EV talebi için çatı GES', 'g')}
    </div>
    <h2>Bölge haritası</h2>${img ? `<img class="map" src="${img}" alt="Bölge haritası">` : ''}
    <h2>Öncelikli öneriler</h2>${recs.map(([pr, t, d]) => `<div class="rec"><b>${pr === 1 ? 'Yüksek' : pr === 2 ? 'Orta' : 'Destekleyici'} öncelik · ${t}</b><br>${d}</div>`).join('')}
    <h2>EV dönüşümü: ek akşam puantı (MW) ve ek tüketim (GWh)</h2>
    ${lineChart([{n:'Puant MW', c:'#c0392b', v: evSeries.map(r => r.mw)}, {n:'Tüketim GWh', c:'#0f3d5e', v: evSeries.map(r => r.twh * 1000)}], years.map(String), {unit:'MW / GWh'})}
    <h2>Tüketimde bölgenin yeri (TWh, 2024)</h2>${barChart(sorted.map(x => x.toplam_twh), sorted.map(x => x.edas.replace(' EDAŞ', '').replace('Boğaziçi + AYEDAŞ', 'İst.').slice(0, 6)), {unit:'TWh', d:0, hl: sorted.findIndex(x => x.edas === edas), color:'#9ecae1', hlColor:'#0f3d5e'})}
    <h2>Kayıp oranı karşılaştırması (%)</h2>${barChart([...all].sort((a, b) => b.kayip - a.kayip).map(x => x.kayip), [...all].sort((a, b) => b.kayip - a.kayip).map(x => x.edas.replace(' EDAŞ', '').replace('Boğaziçi + AYEDAŞ', 'İst.').slice(0, 6)), {unit:'%', d:0, hl: [...all].sort((a, b) => b.kayip - a.kayip).findIndex(x => x.edas === edas), color:'#fdd0a2', hlColor:'#c0392b'})}
    <h2>İl kırılımı</h2><table class="t"><tr><td><b>İl</b></td><td><b>Taşıt</b></td><td><b>Otomobil</b></td><td><b>GHI</b></td><td><b>2035 EV</b></td></tr>
      ${iller.sort((a, b) => b.otomobil - a.otomobil).map(i => `<tr><td>${esc(i.il)}</td><td>${fmt(i.tasit)}</td><td>${fmt(i.otomobil)}</td><td>${fmt(i.ghi_yil)}</td><td>${fmt(i.otomobil * e35.ev / p.otomobil)}</td></tr>`).join('')}</table>
    ${footer('ELDER Elektrik Dağıtım Sektör Raporu 2024 (EPDK), TÜİK Motorlu Kara Taşıtları Eyl. 2026, NASA POWER, OpenStreetMap/OpenInfraMap; EV senaryosu varsayımları uygulama içinde')}`;
  openReport({title, html});
}

// ---------------- 3) DENİZ ENERJİSİ SAHA RAPORU ----------------
async function denizReport(d){
  if (!d) return; busy('Saha haritası hazırlanıyor…');
  const ws = d.site.ws100 || 0, depth = d.depth;
  const cf = Math.max(0.12, Math.min(0.55, 0.087 * ws - 0.25));
  const floating = depth != null && depth > 50;
  const capexW = floating ? 4500 : 3200; // USD/kW, 2026 aralık ortası
  const mw = 100, aep = mw * cf * 8760; // MWh
  const finW = finance({kwp: mw * 1000, yieldY: cf * 8760, capex: capexW, opexPct: 0.03, price: 0.08, esc: 0.02, disc: 0.09, life: 25, deg: 0.003});
  const pv = d.site.pvout || 1550, fpv = finance({kwp: 10000, yieldY: pv * 1.07, capex: 750, opexPct: 0.02, price: 0.08, esc: 0.02, disc: 0.09, life: 25});
  const mon = AY.map((_, i) => 1 + 0.25 * Math.cos((i - 0.5) / 12 * 2 * Math.PI)); // kış rüzgârı yüksek
  const img = await snapshot({center:[d.lng, d.lat], zoom: 7.5, marker:[d.lng, d.lat], show:['bathy','dyetki','dyetki-lbl','wind'], hide:['edas-fill','edas-label','solar']});
  const det = await snapshot({center:[d.lng, d.lat], zoom: 10, marker:[d.lng, d.lat], basemap:'s2', show:['oim-lines','oim-subs'], hide:['edas-fill','edas-line','edas-label','wind','bathy']});
  unbusy();
  const title = `Deniz Enerjisi Saha Raporu – ${d.lat.toFixed(3)}°K, ${d.lng.toFixed(3)}°D`;
  const html = header(title, `Kıyıya ${fmt(d.kiyi, 1)} km · derinlik ${depth != null ? fmt(depth) + ' m' : 'bilinmiyor'}${d.strait ? ' · ' + d.strait.ad : ''}`) + `
    <div class="tiles">
      ${tile(depth != null ? fmt(depth) + ' m' : '–', 'derinlik (EMODnet)', depth != null && depth <= 50 ? 'g' : 'o')}
      ${tile(fmt(ws, 1) + ' m/s', 'rüzgâr 100 m (kaba)', ws >= 7 ? 'g' : ws >= 6 ? 'o' : 'r')}
      ${tile(fmt(d.site.wpd) + ' W/m²', 'rüzgâr güç yoğunluğu')}
      ${tile('%' + fmt(cf * 100, 0), 'tahmini RES kapasite faktörü', cf >= 0.35 ? 'g' : 'o')}
      ${tile(fmt(d.kiyi, 1) + ' km', 'kıyıya uzaklık', d.kiyi < 30 ? 'g' : 'o')}
      ${tile(fmt(pv) + ' kWh/kWp', 'PV verimi (GSA)', 'o')}
    </div>
    <h2>Saha ve deniz yetki alanı</h2>${img ? `<img class="map" src="${img}" alt="Saha haritası">` : ''}
    <p class="hint" style="font-size:11px;color:#6b7785">Kırmızı hat: Türkiye'nin BM'ye bildirdiği ve anlaşmalarla belirlediği resmî koordinatlar (komşu ülkelerce itiraz edilmektedir). Renkler: rüzgâr hızı ve batimetri.</p>
    ${det ? `<h2>Kıyı bağlantısı</h2><img class="map" src="${det}" alt="Kıyı ve şebeke">` : ''}
    <h2>Teknoloji değerlendirmesi</h2>${d.rec.map(([i, t, x]) => `<div class="rec"><b>${i} ${t}</b><br>${x}</div>`).join('')}
    <h2>Örnek proje ekonomisi</h2>
    <table class="t"><tr><td></td><td><b>${mw} MW ${floating ? 'yüzer' : 'sabit tabanlı'} RES</b></td><td><b>10 MWp yüzer GES</b></td></tr>
      <tr><td>Yatırım</td><td>${fmt(finW.inv / 1e6)} mn $ (${fmt(capexW)} $/kW)</td><td>${fmt(fpv.inv / 1e6, 1)} mn $ (750 $/kWp)</td></tr>
      <tr><td>Yıllık üretim</td><td>${fmt(aep / 1000)} GWh</td><td>${fmt(10000 * pv * 1.07 / 1e6, 1)} GWh</td></tr>
      <tr><td>LCOE</td><td>${fmt(finW.lcoe * 1000)} $/MWh</td><td>${fmt(fpv.lcoe * 1000)} $/MWh</td></tr>
      <tr><td>IRR (0,08 $/kWh satış)</td><td>${finW.irr != null ? '%' + fmt(finW.irr * 100, 1) : '–'}</td><td>${fpv.irr != null ? '%' + fmt(fpv.irr * 100, 1) : '–'}</td></tr>
      <tr><td>Konut eşdeğeri</td><td>${fmt(aep * 1000 / 2600)}</td><td>${fmt(10000 * pv * 1.07 / 2600)}</td></tr></table>
    <h2>Aylık RES üretim profili (tipik, GWh)</h2>${barChart(mon.map(x => aep / 12 * x / 1000), AY, {unit:'GWh', color:'#2171b5', d:1})}
    <h2>Üretim karışımı (hibrit saha, yıllık)</h2>${donut([{n:'RES', v: aep, c:'#2171b5'}, {n:'Yüzer GES', v: 10000 * pv * 1.07 / 1000, c:'#f2a900'}])}
    <h2>Sonraki adımlar</h2>
    <div class="rec"><b>1.</b> LiDAR şamandırasıyla en az 12 ay rüzgâr ölçümü; jeoteknik ve batimetri etüdü.</div>
    <div class="rec"><b>2.</b> Deniz trafiği, askerî alanlar, kablo/boru hatları, balıkçılık ve koruma alanlarıyla (TUCBS: Akdeniz foku, deniz kaplumbağası, ÖÇK) çakışma analizi.</div>
    <div class="rec"><b>3.</b> TEİAŞ kıyı trafo kapasitesi ve deniz kablosu güzergâhı; liman ve montaj lojistiği.</div>
    ${footer('EMODnet Bathymetry, NASA POWER (MERRA-2), Global Solar Atlas, Marine Regions, BM A/74/550 – TR-KKTC 2011 – TR-LY 2019 koordinatları (imer.av.tr derlemesi), OpenStreetMap; maliyetler 2026 uluslararası aralık ortalamaları')}`;
  openReport({title, html});
}
window.ENAREN_REP = { gesReport, bolgeReport, denizReport, snapshot };
})();
