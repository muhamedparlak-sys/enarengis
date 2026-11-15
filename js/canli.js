/* ENAREN WebGIS – Canlı durum (EPİAŞ Şeffaflık Platformu, saatlik GitHub Actions ile güncellenir).
 * 24 saatlik tüketim ve kaynak karışımı, yarının tahmini puantı, doğal gaz giriş/kapasite ve depo çekişi. */
(() => {
'use strict';
const A = window.ENAREN_APP; const { fmt } = A;
const KAY = [['naturalGas','Doğal gaz','#d95f02'],['importCoal','İthal kömür','#444'],['lignite','Linyit','#8c6d31'],['blackCoal','Taş kömürü','#5b4636'],['asphaltiteCoal','Asfaltit','#6b5a45'],['dammedHydro','Barajlı hidro','#1f78b4'],['river','Akarsu','#6baed6'],['wind','Rüzgâr','#41b6c4'],['sun','Güneş','#f2a900'],['geothermal','Jeotermal','#e7298a'],['biomass','Biyokütle','#33a02c'],['fueloil','Fuel-oil','#1a1a1a'],['wasteheat','Atık ısı','#999'],['lng','LNG','#1b9e77'],['naphta','Nafta','#777']];
const YERLI = new Set(['lignite','asphaltiteCoal','dammedHydro','river','wind','sun','geothermal','biomass','wasteheat']);
const pane = document.createElement('div'); pane.className = 'pane'; pane.id = 'pane-canli';
document.querySelector('.panes').appendChild(pane);
const tab = document.createElement('button'); tab.className = 'tab'; tab.dataset.tab = 'canli'; tab.textContent = 'Canlı';
document.querySelector('.tabs').appendChild(tab);
tab.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === tab)); document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p === pane)); });
pane.innerHTML = '<p class="hint">Canlı veri yükleniyor…</p>';
const J = n => fetch(`data/canli/${n}.json?t=${Date.now()}`, {cache:'no-store'}).then(r => r.ok ? r.json() : null).catch(() => null);
const saat = d => (d.time || d.hour || d.date.slice(11, 16));
const gunu = d => d.date.slice(0, 10);

function cizgi(seriler, W = 340, H = 150){
  const all = seriler.flatMap(s => s.v.filter(x => x != null));
  const mx = Math.max(...all) * 1.05, mn = Math.min(...all) * 0.9;
  const X = i => 30 + i / 23 * (W - 40), Y = v => H - 20 - (v - mn) / (mx - mn) * (H - 34);
  const yl = [mn, (mn + mx) / 2, mx].map(v => `<text x="2" y="${Y(v) + 4}" font-size="10" fill="#5E6E7A">${fmt(v / 1000, 0)}</text><line x1="28" x2="${W - 8}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E3E8EC"/>`).join('');
  const xl = [0, 6, 12, 18, 23].map(h => `<text x="${X(h) - 8}" y="${H - 4}" font-size="10" fill="#5E6E7A">${String(h).padStart(2, '0')}:00</text>`).join('');
  const p = seriler.map(s => `<polyline fill="none" stroke="${s.c}" stroke-width="${s.w || 2}" ${s.d ? 'stroke-dasharray="5 4"' : ''} points="${s.v.map((v, i) => v == null ? '' : `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="24 saatlik tüketim eğrisi">${yl}${xl}${p}<text x="2" y="10" font-size="10" fill="#5E6E7A">GW</text></svg>`;
}

async function yukle(){
  const [oz, ur, tk, th, pt, gg, gm, gd, gs] = await Promise.all(['ozet','elektrik_uretim','elektrik_tuketim','elektrik_tahmin','elektrik_ptf','gaz_giris_gercek','gaz_max_giris','gaz_depo_aktarim','gaz_sistem_stok'].map(J));
  if (!oz || !ur){ pane.innerHTML = '<p class="hint">Canlı veri henüz yok. EPİAŞ verisi saatte bir güncellenir.</p>'; return; }
  const guncel = new Date(oz.guncelleme);
  // tüketim: dün ve bugün; tahmin: bugün ve yarın
  const tkI = tk?.items || [], thI = th?.items || [], urI = ur.items || [];
  const gunler = [...new Set(tkI.map(gunu))];
  const dunG = gunler[0], bugG = gunler[1];
  const seri = (arr, g, k) => { const v = Array(24).fill(null); arr.filter(d => gunu(d) === g).forEach(d => { v[+saat(d).slice(0, 2)] = d[k]; }); return v; };
  const tDun = seri(tkI, dunG, 'consumption'), tBug = seri(tkI, bugG, 'consumption');
  const tahG = [...new Set(thI.map(gunu))];
  const hBug = seri(thI, tahG[0], 'lep'), hYar = seri(thI, tahG[1], 'lep');
  const yarPuant = Math.max(...hYar.filter(x => x != null)), yarPuantS = hYar.indexOf(yarPuant);
  const dunPuant = Math.max(...tDun.filter(x => x != null));
  // kaynak karışımı: son tam gün (dün)
  const dunU = urI.filter(d => gunu(d) === dunG);
  const top = {}; dunU.forEach(d => KAY.forEach(([k]) => { top[k] = (top[k] || 0) + (d[k] || 0); }));
  const toplam = Object.values(top).reduce((a, b) => a + b, 0) || 1;
  const yerli = Object.entries(top).filter(([k]) => YERLI.has(k)).reduce((s, [, v]) => s + v, 0);
  const sirali = KAY.filter(([k]) => top[k] > toplam * 0.004).sort((a, b) => top[b[0]] - top[a[0]]);
  const sonU = urI[urI.length - 1];
  // gaz (son gün)
  const son = a => (a?.items || []).slice(-1)[0];
  const gGir = son(gg)?.entryAmount, gMax = son(gm)?.maxEntryAmount, gCek = son(gd)?.reproduction, gEnj = son(gd)?.injection, gStok = son(gs)?.stockAmount;
  const kul = gGir && gMax ? gGir / gMax : null;
  const gTar = son(gg)?.date?.slice(0, 10);
  const ptfI = pt?.items || []; const ptf = ptfI.length ? ptfI.reduce((s, d) => s + (d.price || 0), 0) / ptfI.length : null;
  const durum = (v, a, b) => v == null ? '' : v >= b ? 'kritik' : v >= a ? 'dikkat' : 'normal';
  const ROZ = {normal:['Olağan','#1f8a4c'], dikkat:['Dikkat','#b07800'], kritik:['Yüksek','#b3001b']};
  const roz = d => d ? `<em class="roz" style="background:${ROZ[d][1]}">${ROZ[d][0]}</em>` : '';
  const kulD = durum(kul, 0.75, 0.9);
  const puantArtis = yarPuant / dunPuant - 1;
  pane.innerHTML = `
    <p class="hint">EPİAŞ Şeffaflık Platformu verisi; saatte bir otomatik güncellenir. Son güncelleme: <b>${guncel.toLocaleString('tr-TR', {dateStyle:'medium', timeStyle:'short'})}</b>.</p>
    <h3>Elektrik tüketimi, 24 saat</h3>
    ${cizgi([{v:tDun, c:'#9fb6c4', w:1.6}, {v:tBug, c:'#0E3047', w:2.4}, {v:hYar, c:'#E8B21C', w:2.2, d:true}])}
    <div class="legend2"><span><i style="background:#9fb6c4"></i>Dün (${dunG?.slice(5)})</span><span><i style="background:#0E3047"></i>Bugün, gerçekleşen</span><span><i style="background:#E8B21C"></i>Yarın, EPİAŞ tahmini</span></div>
    <div class="kpi">
      <div><strong>${fmt(yarPuant / 1000, 1)} GW</strong><span>yarının tahmini puantı, saat ${String(yarPuantS).padStart(2, '0')}:00</span></div>
      <div><strong>${puantArtis >= 0 ? '+' : ''}${fmt(puantArtis * 100, 1)}%</strong><span>dünkü puanta (${fmt(dunPuant / 1000, 1)} GW) göre ${roz(durum(puantArtis, 0.05, 0.1))}</span></div>
      <div><strong>%${fmt(yerli / toplam * 100)}</strong><span>dünkü üretimde yerli kaynak payı</span></div>
      <div><strong>${ptf != null ? fmt(ptf) + ' ₺' : '–'}</strong><span>ortalama piyasa takas fiyatı (MWh)</span></div></div>
    <h3>Dünkü üretim, kaynaklara göre</h3>
    <div class="stack" style="display:flex;height:22px;border-radius:6px;overflow:hidden">${sirali.map(([k, ad, c]) => `<i title="${ad}" style="flex:${top[k]};background:${c}"></i>`).join('')}</div>
    ${sirali.slice(0, 8).map(([k, ad, c]) => `<div class="bar ev"><span>${ad}${YERLI.has(k) ? '' : ' <small>(ithal yakıt)</small>'}</span><div class="t"><i style="width:${(top[k] / top[sirali[0][0]] * 100).toFixed(0)}%;background:${c}"></i></div><span class="v">%${fmt(top[k] / toplam * 100, 1)}</span></div>`).join('')}
    ${sonU ? `<p class="hint">Son saat (${saat(sonU)}): ${fmt(sonU.total / 1000, 1)} GW üretim; komşularla net ${sonU.importExport < 0 ? 'ihracat' : 'ithalat'} ${fmt(Math.abs(sonU.importExport))} MW.</p>` : ''}
    <h3>Doğal gaz şebekesi (${gTar || ''})</h3>
    <div class="kpi">
      <div><strong>${gGir ? fmt(gGir / 1e6, 1) : '–'}</strong><span>milyon Sm³/gün sisteme giriş</span></div>
      <div><strong>${kul != null ? '%' + fmt(kul * 100) : '–'}</strong><span>giriş kapasitesi kullanımı ${roz(kulD)}</span></div>
      <div><strong>${gCek != null ? fmt(gCek / 1e6, 1) : '–'}</strong><span>milyon Sm³/gün depodan çekiş${gEnj ? ` · depoya basma ${fmt(gEnj / 1e6, 1)}` : ''}</span></div>
      <div><strong>${gStok ? fmt(gStok / 1e6) : '–'}</strong><span>milyon Sm³ boru hattı stoku (line-pack)</span></div></div>
    <p class="hint"><b>Nasıl okunur?</b> Giriş kapasitesi kullanımı %90'ı aşarsa ek talep yalnız depodan karşılanabilir; kışın depodan çekiş arttıkça bu oran kritikleşir. Puant artışı %10'u aşarsa yedek kapasite ve gazlı santrallerin yakıt ihtiyacı izlenmelidir. Bunlar uyarı göstergeleridir, tahmin modeli değildir.</p>
    <p class="hint">Kaynak: EPİAŞ Şeffaflık Platformu (gerçek zamanlı üretim ve tüketim, yük tahmin planı, PTF, doğal gaz iletim verileri).</p>`;
}
yukle();
setInterval(yukle, 15 * 60 * 1000);
})();
