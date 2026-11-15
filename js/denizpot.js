/* ENAREN WebGIS – Mavi Vatan'da deniz enerjisi potansiyeli: deniz üstü RES (sabit/yüzer), yüzer GES, boğaz akıntısı.
 * Ön eleme: EMODnet batimetri (2,5 km), MERRA-2 rüzgâr (NASA POWER), GHI ızgarası, kıyı mesafesi. Saha çalışmasının yerini tutmaz. */
(() => {
'use strict';
const A = window.ENAREN_APP; const { map, fmt } = A;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RENK = {res_sabit:'#2166ac', res_yuzer:'#7b3294', ges_yuzer:'#E8B21C', res_orta:'#4fa3c7'};
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
  fetch('data/deniz_potansiyel.geojson?v=2').then(r => r.json()).then(fc => {
    window.ENAREN_DPOT = fc;
    map.addSource('dpot', {type:'geojson', data:fc});
    map.addLayer({id:'dpot', type:'fill', source:'dpot', layout:{visibility:'none'}, paint:{'fill-color':['match', ['get', 'tur'], 'res_sabit', RENK.res_sabit, 'res_yuzer', RENK.res_yuzer, 'res_orta', RENK.res_orta, RENK.ges_yuzer], 'fill-opacity':['match', ['get', 'tur'], 'res_yuzer', 0.4, 'res_orta', 0.35, 0.55]}}, 'mavivatan-line');
    const ak = {type:'FeatureCollection', features:AKINTI.map(([ad, x, y, v, n]) => ({type:'Feature', geometry:{type:'Point', coordinates:[x, y]}, properties:{ad, v: v ?? 0, n}}))};
    map.addSource('akinti', {type:'geojson', data:ak});
    map.addLayer({id:'akinti', type:'circle', source:'akinti', layout:{visibility:'none'}, paint:{'circle-radius':['interpolate', ['linear'], ['zoom'], 5, 5, 10, 10], 'circle-color':'#1b9e77', 'circle-stroke-color':'#fff', 'circle-stroke-width':2}});
    map.addLayer({id:'akinti-lbl', type:'symbol', source:'akinti', minzoom:7.5, layout:{visibility:'none', 'text-field':['get', 'ad'], 'text-font':['Open Sans Semibold'], 'text-size':11.5, 'text-offset':[0, 1.3], 'text-anchor':'top'}, paint:{'text-color':'#0b5d45', 'text-halo-color':'#fff', 'text-halo-width':1.6}});
    Object.assign(A.LAYER_MAP, {lyrDpot:['dpot', 'akinti', 'akinti-lbl']});
    document.querySelector('#lyrDpot')?.addEventListener('change', A.syncLayerChecks);
    map.on('click', 'dpot', e => { const p = e.features[0].properties; new maplibregl.Popup({maxWidth:'300px'}).setLngLat(e.lngLat).setHTML(`<b>${esc(p.ad)}</b><br>Mavi Vatan içindeki toplam alan: <b>${fmt(p.km2)} km²</b><br>Kaba kapasite: <b>≈${fmt(p.gw, 1)} GW</b> (${p.yogunluk} MW/km²)<br><small>Ön eleme; seyir yolları, askerî alanlar, kablolar, koruma alanları ve zemin etüdü dikkate alınmadı.</small>`).addTo(map); });
    map.on('click', 'akinti', e => { const p = e.features[0].properties; new maplibregl.Popup({maxWidth:'300px'}).setLngLat(e.lngLat).setHTML(`<b>${esc(p.ad)}</b><br>${p.v ? `En yüksek yüzey akıntısı ≈${fmt(p.v, 1)} m/s → güç yoğunluğu ≈<b>${fmt(pd(p.v), 1)} kW/m²</b> (P = ½ρv³)<br>` : ''}${esc(p.n)}`).addTo(map); });
    panel(fc);
    return fetch('data/hedef_sahalar.geojson?v=3').then(r => r.json());
  }).then(hs => { if (hs) hedefler(hs); });
}
const TURAD = {res_sabit:'Deniz üstü RES · sabit temelli', res_yuzer:'Deniz üstü RES · yüzer', ges_yuzer:'Yüzer GES', res_orta:'Deniz üstü RES · orta rüzgâr'};
function hedefler(hs){
  window.ENAREN_HEDEF = hs;
  map.addSource('hedef', {type:'geojson', data:hs});
  const pts = {type:'FeatureCollection', features:hs.features.map(f => ({type:'Feature', geometry:{type:'Point', coordinates:[f.properties.x, f.properties.y]}, properties:f.properties}))};
  map.addSource('hedef-pt', {type:'geojson', data:pts});
  map.addLayer({id:'hedef-line', type:'line', source:'hedef', layout:{visibility:'none'}, paint:{'line-color':['match', ['get', 'tur'], 'res_sabit', RENK.res_sabit, 'res_yuzer', RENK.res_yuzer, 'res_orta', RENK.res_orta, '#a07a00'], 'line-width':2}});
  map.addLayer({id:'hedef-no', type:'circle', source:'hedef-pt', layout:{visibility:'none'}, paint:{'circle-radius':11, 'circle-color':['match', ['get', 'tur'], 'res_sabit', RENK.res_sabit, 'res_yuzer', RENK.res_yuzer, 'res_orta', RENK.res_orta, '#a07a00'], 'circle-stroke-color':'#fff', 'circle-stroke-width':2}});
  map.addLayer({id:'hedef-no-lbl', type:'symbol', source:'hedef-pt', layout:{visibility:'none', 'text-field':['to-string', ['get', 'sira']], 'text-font':['Open Sans Semibold'], 'text-size':12, 'text-allow-overlap':true}, paint:{'text-color':'#fff'}});
  A.LAYER_MAP.lyrDpot = [...A.LAYER_MAP.lyrDpot, 'hedef-line', 'hedef-no', 'hedef-no-lbl'];
  map.on('click', 'hedef-no', e => popHedef(e.features[0].properties, e.lngLat));
  const s = document.querySelector('#pane-deniz section'); if (!s) return;
  const div = document.createElement('div');
  div.innerHTML = `<h3>Hedef sahalar (öncelik sırasıyla)</h3>
    <p class="hint">Uygun hücreler bitişik alanlara gruplandı; Yalnız bugün ticari olarak uygulanabilir aralıktaki (derinlik ≤300 m, kıyıya ≤50 km) ve en az 120 km²'lik alanlar listelendi; RES sahaları rüzgâr, sığlık ve kıyıya yakınlığa, yüzer GES sahaları ışınıma göre sıralandı. Bakanlığın YEKA DÜRES-2026 sahalarıyla örtüşenler işaretli.</p>
    <ol class="hlist">${hs.features.map(f => { const p = f.properties; return `<li data-i="${p.sira}"><span class="hn" style="background:${RENK[p.tur] === RENK.ges_yuzer ? '#a07a00' : RENK[p.tur]}">${p.sira}</span><span><b>${esc(p.ad)}</b>${p.yeka ? ` <em class="roz" style="background:#1f8a4c">YEKA: ${esc(p.yeka)}</em>` : ''}${p.sematik ? ` <em class="roz" style="background:#8a6d3b">Ege şematik sınır</em>` : ''}<small>${TURAD[p.tur]} · ${esc(p.il)} · ${fmt(p.km2)} km² · ≈${fmt(p.gw, 1)} GW · ${p.tur === 'ges_yuzer' ? 'ışınım ' + fmt(p.ghi) + ' kWh/m²' : 'rüzgâr ' + fmt(p.ws, 1) + ' m/s'} · derinlik ${p.dmin}–${p.dmax} m · kıyıya ~${p.dist} km</small></span></li>`; }).join('')}
</ol>`;
  s.appendChild(div);
  div.addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return;
    const cb = document.querySelector('#lyrDpotPanel'); if (cb && !cb.checked){ cb.checked = true; cb.dispatchEvent(new Event('change')); }
    if (li.dataset.ak){ map.flyTo({center:[26.39, 40.15], zoom:10}); A.minimizeSheet(); return; }
    const p = hs.features.find(f => String(f.properties.sira) === li.dataset.i).properties;
    map.flyTo({center:[p.x, p.y], zoom: p.km2 > 5000 ? 6 : 8.5}); A.minimizeSheet(); setTimeout(() => popHedef(p, [p.x, p.y]), 1200); });
}
function popHedef(p, ll){
  new maplibregl.Popup({maxWidth:'310px'}).setLngLat(ll).setHTML(`<b>${p.sira}. ${esc(p.ad)}</b><br><small>${TURAD[p.tur]} · ${esc(p.il)} açıkları</small><br>Alan ${fmt(p.km2)} km² · kaba kapasite ≈<b>${fmt(p.gw, 1)} GW</b><br>${p.tur === 'ges_yuzer' ? 'Işınım ' + fmt(p.ghi) + ' kWh/m²·yıl' : '100 m rüzgâr ≈' + fmt(p.ws, 1) + ' m/s'} · derinlik ${p.dmin}–${p.dmax} m · kıyıya ~${p.dist} km${p.yeka ? `<br><b style="color:#1f8a4c">YEKA DÜRES-2026 sahasıyla örtüşüyor: ${esc(p.yeka)}</b>` : ''}<br><small>Ön eleme; seyir, askerî alan, kablo, koruma ve zemin etüdü ayrıca gerekir.</small>`).addTo(map);
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
      <div><strong style="color:${RENK.res_orta}">≈${fmt(f('res_orta').gw)} GW</strong><span>Karadeniz RES, orta rüzgâr (6,5–7 m/s) · ${fmt(f('res_orta').km2)} km²</span></div></div>
    <p class="hint"><b>Ölçütler.</b> Sabit temelli RES: 100 m rüzgâr ≥7 m/s, derinlik 5–60 m, kıyıya 3–60 km. Yüzer RES: rüzgâr ≥7 m/s, derinlik 60–300 m (bugün ticari olarak kurulan yüzer santrallerin aralığı), kıyıya ≤50 km. Karadeniz için ikinci öncelik: 6,5–7 m/s. Yüzer GES: kıyıya ≤8 km, derinlik ≤50 m, ışınım ≥1.650 kWh/m²·yıl (Karadeniz hariç). Boğazların seyir koridorları dışarıda bırakıldı. Kapasite: RES 4–5 MW/km², GES 20 MW/km² varsayımı.</p>
    <p class="hint"><b>Akdeniz ve Karadeniz.</b> Akdeniz kıyımızda 100 m rüzgâr ortalama ~5 m/s ve kıta sahanlığı çok dar; deniz üstü RES için uygun değil, ama korunaklı körfezler (Mersin, İskenderun, Yumurtalık, Taşucu) yüzer GES için en iyi adaylar. Karadeniz'de rüzgâr 7 m/s'yi geçmiyor; yalnız İstanbul–Kıyıköy açıkları orta rüzgârla ikinci öncelik. Karadeniz'in dalga ve fırtına koşulları yüzer GES'i zorlaştırır; yüzer GES için baraj gölleri daha gerçekçidir.</p>
    <p class="hint"><b>Boğaz akıntısı.</b> Akıntı tek yönlü ve sürekli, ama Nara kesitinin tamamından geçen güç bile en fazla onlarca MW; şebeke ölçeğinde değil, Ar-Ge pilotu ölçeğinde. Haritada bilgi amaçlı noktalar olarak duruyor.</p>
    <div class="lit"><b>Mevcut çalışmalar ve resmî adımlar</b>
      <ul>
        <li><b>Dünya Bankası – ETKB, Türkiye Deniz Üstü Rüzgâr Yol Haritası:</b> karasularında ~75 GW teknik potansiyel, büyük bölümü Ege ve Marmara'da; 2035'e kadar ~5 GW senaryosu.</li>
        <li><b>YEKA DÜRES-2026:</b> Türkiye'nin ilk deniz üstü rüzgâr yarışması, 1.000 MW; sahalar Saros, Gökçeada, Bozcaada ve Edremit açıkları. Tavan 11, taban 7 $-cent/kWh (taslak).</li>
        <li><b>Çanakkale Boğazı akıntısı:</b> Kepez Burnu'nda özel sektör Ar-Ge sahası; Yücel ve Tarhan (2019) 5 kW'lık türbin denemesi, 2,5 m/s'ye kadar akıntı ölçümü.</li>
      </ul>
      <span>Bu sayfanın ilk sıradaki sabit temelli RES sahaları YEKA DÜRES-2026 alanlarıyla örtüşüyor. Bulunan toplamın Dünya Bankası rakamından yüksek olmasının nedeni, karasularıyla sınırlı kalmayıp Mavi Vatan'ın tamamına bakılması ve seyir, askerî alan gibi dışlamaların yapılmamasıdır.</span></div>
    <p class="hint">Kaynak: EMODnet Bathymetry (2,5 km'ye örneklenmiş), NASA POWER / MERRA-2 rüzgârı, Çanakkale Boğazı akıntı ölçümleri (Türk Boğazları Seyir Güvenliği 2000; Yücel ve Tarhan 2019). Ön elemedir; Copernicus Marine akıntı ve dalga verisiyle derinleştirilebilir.</p>`;
  dz.prepend(s);
  fetch('data/mavi_vatan_tavan.json?v=1').then(r => r.json()).then(t => {
    const T = t.talep_twh, K = [['bugun_res_sabit','RES sabit',RENK.res_sabit],['bugun_res_yuzer','RES yüzer (≤300 m)',RENK.res_yuzer],['bugun_res_orta','RES Karadeniz',RENK.res_orta],['bugun_ges_kiyi','Yüzer GES, kıyı',RENK.ges_yuzer],['tavan_res_derin','RES yüzer, derin (300–1.000 m)','#c2a5cf'],['tavan_ges_acik','Yüzer GES, açık deniz','#f6dc8a']];
    const bug = K.slice(0, 4).reduce((a, [k]) => a + t[k].twh, 0), tav = K.reduce((a, [k]) => a + t[k].twh, 0);
    const mx = Math.max(tav, T);
    const box = document.createElement('div');
    box.innerHTML = `<h3>Tavan: Mavi Vatan Türkiye'nin ihtiyacının ne kadarını üretebilir?</h3>
      <div class="kpi"><div><strong>${fmt(bug)} TWh/yıl</strong><span>bugünkü teknolojiyle · 2025 talebinin <b>%${fmt(bug / T * 100)}</b>'i</span></div><div><strong>${fmt(tav)} TWh/yıl</strong><span>teknik tavan · talebin <b>${fmt(tav / T, 1)} katı</b></span></div></div>
      <div style="position:relative;margin:10px 0 4px"><div class="stack" style="display:flex;height:26px;border-radius:6px;overflow:hidden;width:${(tav / mx * 100).toFixed(1)}%">${K.map(([k, ad, c]) => `<i title="${ad}: ${fmt(t[k].twh)} TWh" style="flex:${t[k].twh};background:${c}"></i>`).join('')}</div>
      <div style="position:absolute;top:-4px;bottom:-4px;left:${(T / mx * 100).toFixed(1)}%;border-left:2px dashed #b3001b"></div></div>
      <div class="hint" style="margin-top:2px">Kesikli çizgi: 2025 elektrik talebi (${fmt(T, 1)} TWh)</div>
      ${K.map(([k, ad, c], i) => `<div class="bar ev"><span>${ad}${i > 3 ? ' <small>(gelecek teknoloji)</small>' : ''}</span><div class="t"><i style="width:${(t[k].twh / t.tavan_res_derin.twh * 100).toFixed(0)}%;background:${c}"></i></div><span class="v">${fmt(t[k].twh)} TWh · ${fmt(t[k].gw)} GW</span></div>`).join('')}
      <p class="hint">Hesap: her 2,5–5 km'lik deniz hücresi tek kullanıma atandı (önce rüzgâr, sonra güneş). RES kapasite faktörü rüzgâr hızından (7 m/s'de ~%29, 8 m/s'de ~%38), yüzer GES üretimi ışınımın %84'ü (kWh/kWp) olarak alındı. Seyir yolları, askerî alanlar, kablolar, balıkçılık ve koruma alanları düşülmedi; bunlar düşüldüğünde gerçekçi pay bunun bir bölümü olur. Ege'deki sahaların bir kısmı şematik sınıra dayanır.</p>`;
    s.insertBefore(box, s.querySelector('.hint'));
  });
  const cb = s.querySelector('#lyrDpotPanel'), main = document.querySelector('#lyrDpot');
  cb.addEventListener('change', () => { if (main){ main.checked = cb.checked; } A.LAYER_MAP.lyrDpot.forEach(l => map.getLayer(l) && map.setLayoutProperty(l, 'visibility', cb.checked ? 'visible' : 'none')); if (cb.checked){ map.flyTo({center:[30.5, 38.5], zoom:4.8}); A.minimizeSheet(); } });
}
ekle();
})();
