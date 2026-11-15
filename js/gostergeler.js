/* ENAREN WebGIS – Politika göstergeleri: Genel Bakış'ın başına, her biri ilgili analize bağlanan kartlar. */
(() => {
'use strict';
const A = window.ENAREN_APP; const { fmt, state } = A;
const pane = document.querySelector('#pane-vizyon'); if (!pane) return;
const box = document.createElement('section'); box.className = 'gost';
pane.prepend(box);
// [başlık, değer, birim, ilerleme 0–1 | null, karşılaştırma, ne gösterir, hedef bölüm]
function kartlar(){
  const fd = window.ENAREN_VIZ?.computeFlows?.('tumu');
  const aktar = fd ? fd.flows.reduce((s, f) => s + f.twh, 0) : null;
  const ed = state.edas?.features || [];
  const kayip = ed.length ? ed.reduce((s, f) => s + f.properties.kayip * f.properties.toplam_twh, 0) / ed.reduce((s, f) => s + f.properties.toplam_twh, 0) : null;
  const acik = fd ? [...fd.R].sort((a, b) => a.net - b.net)[0] : null;
  return [
    ['Enerjide dışa bağımlılık', '%68', '', 0.68, '2040 hedefi %48', 'Birincil enerjinin ne kadarının ithal edildiği.', 'vizyon'],
    ['Net enerji ithalatı, 2025', '47', 'milyar $', null, 'Petrol %47 · gaz %43 · kömür %10', 'Cari açığa enerjinin doğrudan katkısı.', 'ithalat'],
    ['Tek ülkeye yoğunlaşma', '%46', 'Rusya, ham petrol', 0.46, 'Doğal gazda Rusya %36, kömürde %85', 'Bir tedarikçinin kesintisinin etkisi.', 'ithalat'],
    ['Elektrikte yerli kaynak payı', '%56', '', 0.56, '2025: 203 / 363 TWh', 'Elektriğin ithal yakıta bağımlılığı.', 'vizyon'],
    ['Güneş + rüzgâr kurulu güç', '43,8', 'GW', 43.8 / 120, '2035 hedefi 120 GW (%37)', 'Resmî hedefe göre ilerleme.', 'vizyon'],
    ['Bölgeler arası aktarım', aktar ? fmt(aktar) : '…', 'TWh/yıl', aktar ? aktar / 363 : null, aktar ? `Üretimin %${fmt(aktar / 363 * 100)}'i bölge sınırını geçiyor` : '', 'İletim şebekesine binen yük (simülasyon).', 'bolge'],
    ['En büyük bölge açığı', acik ? acik.p.edas.replace(' EDAŞ', '') : '…', acik ? fmt(-acik.net) + ' TWh' : '', null, 'Diğer bölgelerden alınan elektrik', 'Yerinde üretimin en çok gerektiği yer.', 'bolge'],
    ['Dağıtım kayıp oranı', kayip ? '%' + fmt(kayip, 1) : '…', 'tüketim ağırlıklı', kayip ? kayip / 20 : null, 'Bölgeler arasında %5–%20+', 'Şebeke yatırımı önceliği.', 'katman'],
    ['Gaz depolama / yıllık tüketim', '%11', '6,3 / 59 milyar m³', 0.107, '2027 hedefi 7,8 milyar m³', 'Kış ve kesinti dayanıklılığı.', 'ithalat'],
    ['Batarya depolama', '850', 'MW', 850 / 2350, '2027 beklentisi 2.350 MW', 'Güneş ve rüzgârın şebekeye entegrasyonu.', 'projeler'],
    ['Elektrikli araç stoku', '486', 'bin', null, 'Eylül 2026; toplam taşıt 35 milyon', 'Dağıtım şebekesine gelecek ek yük.', 'senaryo'],
    ['Yerli gaz üretimi', '9,5', 'milyon m³/gün', 9.5 / 45, '2028 hedefi 45 milyon m³/gün', 'Gaz ithalatını azaltma potansiyeli.', 'projeler']
  ];
}
function render(){
  box.innerHTML = `<div class="gost-h"><h3>Göstergeler</h3><small>Bir karta dokununca ilgili analiz açılır.</small></div>
  <div class="gost-g">${kartlar().map(([t, v, b, p, k, n, hedef]) => `<button class="gk" data-t="${hedef}">
    <span class="gk-t">${t}</span><span class="gk-v">${v}<small>${b}</small></span>
    ${p != null ? `<span class="gk-bar"><i style="width:${Math.min(100, p * 100).toFixed(0)}%"></i></span>` : ''}
    <span class="gk-k">${k}</span><span class="gk-n">${n}</span></button>`).join('')}</div>
  <p class="hint">Kaynaklar: ETKB, EPDK, Ember (2025–2026), ELDER 2024, TÜİK Eylül 2026. Bölgeler arası değerler bu uygulamadaki simülasyondandır.</p>`;
}
render();
const t = setInterval(() => { if (window.ENAREN_VIZ && state.edas && state.santral){ clearInterval(t); render(); } }, 600);
box.addEventListener('click', e => { const b = e.target.closest('.gk'); if (!b) return; A.goTab(b.dataset.t); A.openSheet(); });
})();
/* Sade açılış: tesis ikonları ülke ölçeğinde gizli, yakınlaşınca görünür */
(() => {
  const m = window.ENAREN_APP.map;
  const t = setInterval(() => { if (m.getLayer('santral') && m.getLayer('stratejik')){ clearInterval(t); m.setLayerZoomRange('santral', 5.8, 24); m.setLayerZoomRange('stratejik', 5.3, 24); } }, 500);
})();
