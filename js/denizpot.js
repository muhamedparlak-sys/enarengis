/* ENAREN WebGIS – Mavi Vatan'da deniz enerjisi potansiyeli: deniz üstü RES (sabit/yüzer), yüzer GES, boğaz akıntısı.
 * Ön eleme: EMODnet batimetri (2,5 km), MERRA-2 rüzgâr (NASA POWER), GHI ızgarası, kıyı mesafesi. Saha çalışmasının yerini tutmaz. */
(() => {
'use strict';
const A = window.ENAREN_APP; const { map, fmt } = A;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RENK = {res_sabit:'#2166ac', res_yuzer:'#7b3294', ges_yuzer:'#E8B21C'};
// boğaz akıntısı adayları: [ad, lng, lat, hız (m/s, üst akıntı en yüksek), not]
const AKINTI = [
  ['Çanakkale Boğazı – Nara geçidi', 26.405, 40.19, 2.0, 'Nara önlerinde yüzey akıntısı yaklaşık 4 knot (≈2 m/s); boğazın en dar ve en hızlı kesimi. Yoğun gemi trafiği nedeniyle seyir koridoru dışı kıyı şeridi düşünülmeli.'],
  ['Çanakkale Boğazı – Kilitbahir', 26.385, 40.145, 2.0, 'Kilitbahir önlerinde zaman zaman 4 knot. Ölçümlerde boğazın bazı yerlerinde 2,5 m/s\'ye kadar akıntı kaydedilmiştir.'],
  ['Çanakkale Boğazı – Kepez Burnu', 26.37, 40.105, 2.5, 'Trafik hattı dışında, akıntının en hızlı olduğu noktalardan biri; özel sektör Ar-Ge sahası (akıntı türbini denemeleri).'],
  ['Çanakkale Boğazı – Gelibolu önleri', 26.67, 40.41, 1.0, 'Gelibolu önlerinde yaklaşık 2 knot (≈1 m/s).'],
  ['İstanbul Boğazı – Akıntıburnu (Arnavutköy)', 29.045, 41.07, null, 'Boğazın en güçlü yüzey akıntısının görüldüğü kesim. Ölçüme dayalı hız verisi bu demoya eklenmedi.']
];
const pd = v => 0.5 * 1025 * v ** 3 / 1000; // kW/m²
function ekle(){
  if (!map.isStyleLoaded() || !map.getLayer('mavivatan-fill')) return setTimeout(ekle, 500);
  fetch('data/deniz_potansiyel.geojson?v=1').then(r => r.json()).then(fc => {
    window.ENAREN_DPOT = fc;
    map.addSource('dpot', {type:'geojson', data:fc});
    map.addLayer({id:'dpot', type:'fill', source:'dpot', layout:{visibility:'none'}, paint:{'fill-color':['match', ['get', 'tur'], 'res_sabit', RENK.res_sabit, 'res_yuzer', RENK.res_yuzer, RENK.ges_yuzer], 'fill-opacity':['match', ['get', 'tur'], 'res_yuzer', 0.28, 0.55]}}, 'mavivatan-line');
    const ak = {type:'FeatureCollection', features:AKINTI.map(([ad, x, y, v, n]) => ({type:'Feature', geometry:{type:'Point', coordinates:[x, y]}, properties:{ad, v: v ?? 0, n}}))};
    map.addSource('akinti', {type:'geojson', data:ak});
    map.addLayer({id:'akinti', type:'circle', source:'akinti', layout:{visibility:'none'}, paint:{'circle-radius':['interpolate', ['linear'], ['zoom'], 5, 5, 10, 10], 'circle-color':'#1b9e77', 'circle-stroke-color':'#fff', 'circle-stroke-width':2}});
    map.addLayer({id:'akinti-lbl', type:'symbol', source:'akinti', minzoom:7.5, layout:{visibility:'none', 'text-field':['get', 'ad'], 'text-font':['Open Sans Semibold'], 'text-size':11.5, 'text-offset':[0, 1.3], 'text-anchor':'top'}, paint:{'text-color':'#0b5d45', 'text-halo-color':'#fff', 'text-halo-width':1.6}});
    Object.assign(A.LAYER_MAP, {lyrDpot:['dpot', 'akinti', 'akinti-lbl']});
    document.querySelector('#lyrDpot')?.addEventListener('change', A.syncLayerChecks);
    map.on('click', 'dpot', e => { const p = e.features[0].properties; new maplibregl.Popup({maxWidth:'300px'}).setLngLat(e.lngLat).setHTML(`<b>${esc(p.ad)}</b><br>Mavi Vatan içindeki toplam alan: <b>${fmt(p.km2)} km²</b><br>Kaba kapasite: <b>≈${fmt(p.gw, 1)} GW</b> (${p.yogunluk} MW/km²)<br><small>Ön eleme; seyir yolları, askerî alanlar, kablolar, koruma alanları ve zemin etüdü dikkate alınmadı.</small>`).addTo(map); });
    map.on('click', 'akinti', e => { const p = e.features[0].properties; new maplibregl.Popup({maxWidth:'300px'}).setLngLat(e.lngLat).setHTML(`<b>${esc(p.ad)}</b><br>${p.v ? `En yüksek yüzey akıntısı ≈${fmt(p.v, 1)} m/s → güç yoğunluğu ≈<b>${fmt(pd(p.v), 1)} kW/m²</b> (P = ½ρv³)<br>` : ''}${esc(p.n)}`).addTo(map); });
    panel(fc);
  });
}
function panel(fc){
  const dz = document.querySelector('#pane-deniz'); if (!dz) return;
  const s = document.createElement('section');
  const f = k => fc.features.find(x => x.properties.tur === k)?.properties || {km2:0, gw:0};
  s.innerHTML = `<h3>Mavi Vatan'da enerji potansiyeli</h3>
    <label class="row"><input type="checkbox" id="lyrDpotPanel"> Haritada göster</label>
    <div class="kpi">
      <div><strong style="color:${RENK.res_sabit}">≈${fmt(f('res_sabit').gw)} GW</strong><span>Deniz üstü RES, sabit temelli · ${fmt(f('res_sabit').km2)} km²</span></div>
      <div><strong style="color:${RENK.res_yuzer}">≈${fmt(f('res_yuzer').gw)} GW</strong><span>Deniz üstü RES, yüzer · ${fmt(f('res_yuzer').km2)} km²</span></div>
      <div><strong style="color:#a07a00">≈${fmt(f('ges_yuzer').gw)} GW</strong><span>Yüzer GES (kıyıya yakın) · ${fmt(f('ges_yuzer').km2)} km²</span></div>
      <div><strong style="color:#1b9e77">${pd(2).toFixed(1)}–${pd(2.5).toFixed(1)} kW/m²</strong><span>Çanakkale Boğazı akıntı gücü (2–2,5 m/s)</span></div></div>
    <p class="hint"><b>Ölçütler.</b> Sabit temelli RES: 100 m rüzgâr ≥7 m/s, derinlik 5–60 m, kıyıya 3–60 km. Yüzer RES: rüzgâr ≥7 m/s, derinlik 60–1.000 m. Yüzer GES: kıyıya ≤8 km, derinlik ≤50 m, ışınım ≥1.650 kWh/m²·yıl (Karadeniz hariç). Boğazların seyir koridorları dışarıda bırakıldı. Kapasite: RES 4–5 MW/km², GES 20 MW/km² varsayımı.</p>
    <p class="hint"><b>Neden boğazlar?</b> Çanakkale ve İstanbul boğazlarında akıntı gel-git değil, Karadeniz'den Ege'ye tek yönlü ve süreklidir; bu, akıntı türbinleri için öngörülebilir üretim demektir. Kısıt, dünyanın en yoğun seyir koridorlarından biri olmasıdır.</p>
    <p class="hint">Kaynak: EMODnet Bathymetry (2,5 km'ye örneklenmiş), NASA POWER / MERRA-2 rüzgârı, Çanakkale Boğazı akıntı ölçümleri (Türk Boğazları Seyir Güvenliği 2000; Yücel ve Tarhan 2019). Ön elemedir; Copernicus Marine akıntı ve dalga verisiyle derinleştirilebilir.</p>`;
  dz.prepend(s);
  const cb = s.querySelector('#lyrDpotPanel'), main = document.querySelector('#lyrDpot');
  cb.addEventListener('change', () => { if (main){ main.checked = cb.checked; } ['dpot', 'akinti', 'akinti-lbl'].forEach(l => map.setLayoutProperty(l, 'visibility', cb.checked ? 'visible' : 'none')); if (cb.checked){ map.flyTo({center:[30.5, 38.5], zoom:4.8}); A.minimizeSheet(); } });
}
ekle();
})();
