/* ENAREN WebGIS – Kısıt katmanı: koruma alanları (milli park, tabiat parkı, tabiat koruma alanı, ÖÇKB, sulak alan).
 * Kaynak: OpenStreetMap (OpenFreeMap "park" katmanı). Kültürel ve arkeolojik sit alanlarının resmî verisi Kültür ve Turizm
 * Bakanlığı / TUCBS'dedir; bu katman yalnız doğal koruma alanlarını gösterir. */
(() => {
'use strict';
const A = window.ENAREN_APP; const { map } = A;
function ekle(){
  if (!map.isStyleLoaded() || !map.getSource('ofm') || !map.getLayer('edas-line')) return setTimeout(ekle, 500);
  const once = map.getLayer('akis-bg') ? 'akis-bg' : undefined;
  map.addLayer({id:'koruma-fill', type:'fill', source:'ofm', 'source-layer':'park', layout:{visibility:'none'}, paint:{'fill-color':'#2e7d32', 'fill-opacity':['interpolate', ['linear'], ['zoom'], 5, 0.35, 10, 0.2]}}, once);
  map.addLayer({id:'koruma-line', type:'line', source:'ofm', 'source-layer':'park', layout:{visibility:'none'}, paint:{'line-color':'#1b5e20', 'line-width':['interpolate', ['linear'], ['zoom'], 5, 0.6, 10, 1.6], 'line-dasharray':[2, 1]}}, once);
  map.addLayer({id:'koruma-lbl', type:'symbol', source:'ofm', 'source-layer':'park', minzoom:8, layout:{visibility:'none', 'text-field':['coalesce', ['get', 'name:tr'], ['get', 'name']], 'text-font':['Open Sans Semibold'], 'text-size':11}, paint:{'text-color':'#1b5e20', 'text-halo-color':'#fff', 'text-halo-width':1.5}});
  A.LAYER_MAP.lyrKoruma = ['koruma-fill', 'koruma-line', 'koruma-lbl'];
  document.querySelector('#lyrKoruma')?.addEventListener('change', A.syncLayerChecks);
  map.on('click', 'koruma-fill', e => {
    const p = e.features[0].properties, ad = p['name:tr'] || p.name || 'Koruma alanı';
    const sinif = {national_park:'Milli park', nature_reserve:'Tabiat koruma alanı', protected_area:'Koruma alanı'}[p.class] || 'Koruma alanı';
    new maplibregl.Popup({maxWidth:'280px'}).setLngLat(e.lngLat).setHTML(`<b>${ad}</b><br>${sinif}<br><small>Enerji tesisi için kısıt: izin ve ÇED süreci ilgili kurumla yürütülür. Kaynak: OpenStreetMap.</small>`).addTo(map);
  });
}
ekle();
})();
