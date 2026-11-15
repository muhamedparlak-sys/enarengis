/* ENAREN WebGIS – Baraj göllerinde yüzer GES: 47 büyük baraj gölü (OSM alanları), %5 ve %10 kaplama senaryosu,
 * mevcut HES bağlantı gücüyle hibrit kullanım. */
(() => {
'use strict';
const A = window.ENAREN_APP; const { map, fmt } = A;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let D = null, oran = 5;
function ekle(){
  if (!map.isStyleLoaded() || !map.getLayer('santral')) return setTimeout(ekle, 500);
  fetch('data/baraj_ges.json?v=1').then(r => r.json()).then(d => {
    D = d;
    const fc = {type:'FeatureCollection', features:d.baraj.map(b => ({type:'Feature', geometry:{type:'Point', coordinates:[b.x, b.y]}, properties:b}))};
    map.addSource('baraj', {type:'geojson', data:fc});
    map.addLayer({id:'baraj', type:'circle', source:'baraj', layout:{visibility:'none'}, paint:{'circle-radius':['interpolate', ['linear'], ['sqrt', ['get', 'km2']], 2, 4, 28, 22], 'circle-color':['case', ['get', 'icme'], '#9aa5ad', '#E8B21C'], 'circle-opacity':0.8, 'circle-stroke-color':'#0E3047', 'circle-stroke-width':1.5}});
    map.addLayer({id:'baraj-lbl', type:'symbol', source:'baraj', minzoom:6, layout:{visibility:'none', 'text-field':['concat', ['get', 'ad'], '\n', ['to-string', ['get', 'mw5']], ' MW (%5)'], 'text-font':['Open Sans Semibold'], 'text-size':11, 'text-offset':[0, 1.6], 'text-anchor':'top'}, paint:{'text-color':'#5b4500', 'text-halo-color':'#fff', 'text-halo-width':1.6}});
    A.LAYER_MAP.lyrBaraj = ['baraj', 'baraj-lbl'];
    document.querySelector('#lyrBaraj')?.addEventListener('change', A.syncLayerChecks);
    map.on('click', 'baraj', e => pop(e.features[0].properties, e.lngLat));
    panel();
  });
}
function pop(b, ll){
  const mw = b['mw' + oran], twh = b['twh' + oran];
  new maplibregl.Popup({maxWidth:'300px'}).setLngLat(ll).setHTML(`<b>${esc(b.ad)}</b><br>Göl alanı ${fmt(b.km2, 1)} km² · ışınım ${fmt(b.ghi)} kWh/m²<br>%${oran} kaplama: <b>${fmt(mw)} MWp</b>, yılda ≈<b>${fmt(twh, 2)} TWh</b>${b.hidro_mw ? `<br>Mevcut HES: ${esc(b.hidro)} ${fmt(b.hidro_mw)} MW → aynı şalt sahası ve iletim hattı ile hibrit çalışma` : ''}${b.icme === true || b.icme === 'true' ? '<br><b>İçme suyu kaynağı:</b> su kalitesi değerlendirmesi önce gerekir.' : ''}`).addTo(map);
}
function panel(){
  const dz = document.querySelector('#pane-deniz'); if (!dz) return;
  const s = document.createElement('section'); s.id = 'barajSec';
  dz.insertBefore(s, dz.firstChild?.nextSibling || null);
  const ciz = () => {
    const t = D.toplam, gw = t['gw' + oran], twh = t['twh' + oran];
    s.innerHTML = `<h3>Su üstü GES: baraj gölleri</h3>
      <label class="row"><input type="checkbox" id="lyrBarajP" ${map.getLayoutProperty('baraj', 'visibility') === 'visible' ? 'checked' : ''}> Haritada göster</label>
      <div class="seg3" id="barajOran" style="margin:6px 0"><button data-o="5" class="${oran === 5 ? 'active' : ''}">%5 kaplama</button><button data-o="10" class="${oran === 10 ? 'active' : ''}">%10 kaplama</button></div>
      <div class="kpi"><div><strong>≈${fmt(gw, 1)} GW</strong><span>kurulu güç · 47 büyük baraj gölü</span></div><div><strong>≈${fmt(twh, 1)} TWh/yıl</strong><span>2025 talebinin %${fmt(twh / D.talep_twh * 100, 1)}'i</span></div>
      <div><strong>${fmt(t.hidro / 1000, 1)} GW</strong><span>bu göllerdeki HES bağlantı gücü (hibrit için hazır şebeke)</span></div><div><strong>≈${fmt(gw / 120 * 100)}%</strong><span>2035 güneş + rüzgâr hedefine (120 GW) katkı</span></div></div>
      <ol class="hlist">${D.baraj.slice(0, 12).map((b, i) => `<li data-i="${i}"><span class="hn" style="background:${b.icme ? '#9aa5ad' : '#a07a00'}">${i + 1}</span><span><b>${esc(b.ad)}</b><small>${fmt(b.km2, 1)} km² · %${oran}: ${fmt(b['mw' + oran])} MWp · ${fmt(b['twh' + oran], 2)} TWh/yıl${b.hidro_mw ? ` · HES ${fmt(b.hidro_mw)} MW` : ''}</small></span></li>`).join('')}</ol>
      <p class="hint"><b>Neden baraj gölleri?</b> Dalga yok, kıyıya ve şebekeye yakın; HES'in şalt sahası ve iletim hattı kullanılabilir. GES gündüz üretirken HES suyunu akşam puantına saklayabilir. Panel gölgesi buharlaşmayı azaltır; su yüzeyi panelleri serinletir.</p>
      <p class="hint">Hesap: göl alanları OpenStreetMap'ten; kaplanan alanda 80 MWp/km², yıllık üretim ışınımın %86'sı (kWh/kWp). Uluslararası uygulamada barajlarda %1–10 kaplama oranları kullanılıyor. İçme suyu barajları (gri) toplama dahil edilmedi. Göl seviyesi değişimi, ekoloji ve su hakları saha bazında incelenmelidir.</p>`;
    s.querySelector('#lyrBarajP').addEventListener('change', e => { ['baraj', 'baraj-lbl'].forEach(l => map.setLayoutProperty(l, 'visibility', e.target.checked ? 'visible' : 'none')); if (e.target.checked){ map.flyTo({center:[36.5, 38.8], zoom:5.2}); A.minimizeSheet(); } });
    s.querySelector('#barajOran').addEventListener('click', e => { const o = e.target.dataset.o; if (o){ oran = +o; ciz(); } });
    s.querySelector('.hlist').addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return; const b = D.baraj[+li.dataset.i]; ['baraj', 'baraj-lbl'].forEach(l => map.setLayoutProperty(l, 'visibility', 'visible')); map.flyTo({center:[b.x, b.y], zoom:9}); A.minimizeSheet(); setTimeout(() => pop(b, [b.x, b.y]), 1200); });
  };
  ciz();
}
ekle();
})();
