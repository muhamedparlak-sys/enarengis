/* ENAREN ikon seti — 24×24 ızgara, 1,75 çizgi, yuvarlak uçlar. Proje için çizildi (telifsiz).
 * window.ICON(ad, boyut, renk) → satır içi SVG; haritada disk + beyaz glif olarak kullanılır. */
(() => {
'use strict';
const P = {
  // enerji kaynakları
  hidro:      '<path d="M4 5v14h16"/><path d="M8 5l2 14"/><path d="M12 10c1.5 1 3 1 4.5 0s3-1 3.5 0"/><path d="M12 14c1.5 1 3 1 4.5 0s3-1 3.5 0"/>',
  gunes:      '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  ruzgar:     '<path d="M12 11v10.5M9.5 21.5h5"/><circle cx="12" cy="9" r="1.3"/><path d="M12 7.7V2.5c1.6 1.4 1.8 3.6 0 5.2"/><path d="M13.1 9.6l4.5 2.6c-2 .6-4 .1-4.5-2.6"/><path d="M10.9 9.6l-4.5 2.6c.4-2 2-3.3 4.5-2.6"/>',
  jeotermal:  '<path d="M3 19h18"/><path d="M5 22h14"/><path d="M8 16c-1.5-2 1.5-3.5 0-6s1.5-4 0-6"/><path d="M12 16c-1.5-2 1.5-3.5 0-6s1.5-4 0-6"/><path d="M16 16c-1.5-2 1.5-3.5 0-6s1.5-4 0-6"/>',
  biyokutle:  '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19l8-8"/>',
  linyit:     '<path d="M4 17l3-7 5-2 6 2 2 6-4 4H8z"/><path d="M7 10l4 3 7-3M11 13l-1 7"/>',
  ithal_komur:'<path d="M3 15l2.5-5 4-1.5 4.5 1.5 1.5 4-3 3H6z"/><path d="M15 6h6M18 3l3 3-3 3"/>',
  dogalgaz:   '<path d="M12 21.5c-3.9 0-6.5-2.6-6.5-6 0-3.6 3-5.6 3.6-9.5 2 1.4 3.2 3.4 3.2 5.3 1-.9 1.6-2.2 1.6-3.6 2.6 2 4.6 4.6 4.6 7.8 0 3.4-2.6 6-6.5 6z"/><path d="M12 21.5c-1.6 0-2.7-1.1-2.7-2.6 0-1.6 1.4-2.6 2.7-4.3 1.3 1.7 2.7 2.7 2.7 4.3 0 1.5-1.1 2.6-2.7 2.6z"/>',
  nukleer:    '<path d="M6 21.5c1.4-4.3 1.4-9.7 0-14 4 .9 8 .9 12 0-1.4 4.3-1.4 9.7 0 14z"/><path d="M4 21.5h16"/><path d="M9 4.5c.6-1 1.8-1.5 3-1 1.2-.5 2.4 0 3 1"/>',
  petrol:     '<path d="M12 3c3 4.2 5.5 7.4 5.5 10.6a5.5 5.5 0 0 1-11 0C6.5 10.4 9 7.2 12 3z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  // kaynak/altyapı
  dogalgaz_kaynak:'<path d="M12 3l-4 18M12 3l4 18M9.2 15h5.6M10.2 10h3.6"/><path d="M5 21h14"/><path d="M18.5 8.5c-1.2-.8-1.2-2.4 0-3.5.3 1 1.3 1.4 1.3 2.4"/>',
  petrol_kaynak:  '<path d="M3 21h18"/><path d="M7 21l4-12 4 12"/><path d="M8.5 16.5h5"/><path d="M5 8l14-4"/><path d="M15 5l1.8 5.5"/><circle cx="17.5" cy="12" r="1.3"/>',
  linyit_kaynak:  '<path d="M4 20L14.5 9.5"/><path d="M11 6c3.5-2.5 7.5-2 10 0-3-.5-5.5.5-7 3"/><path d="M14.5 9.5l2 2"/>',
  depolama:   '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13"/><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  boru:       '<path d="M2.5 9h7v6h-7M21.5 9h-7v6h7"/><path d="M9.5 10.5h5M9.5 13.5h5"/><path d="M5 9V6.5M19 9V6.5"/>',
  bor:        '<path d="M12 2.5l8 4.6v9.8l-8 4.6-8-4.6V7.1z"/><path d="M12 2.5v19M4 7.1l16 9.8M20 7.1L4 16.9"/>',
  toryum:     '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)"/>',
  batarya:    '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10.5v3"/><path d="M10 9.5l-2 3h4l-2 3"/>',
  // arayüz
  genel:      '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  katman:     '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  analiz:     '<path d="M3 17L17 3l4 4L7 21H3z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  ev:         '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v4.5"/>',
  parsel:     '<path d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z"/><path d="M9 3v16M15 5v16"/>',
  deniz:      '<path d="M2 9c2.5-2 5-2 7.5 0s5 2 7.5 0 3.5-1.5 5 0"/><path d="M2 14c2.5-2 5-2 7.5 0s5 2 7.5 0 3.5-1.5 5 0"/><path d="M2 19c2.5-2 5-2 7.5 0s5 2 7.5 0 3.5-1.5 5 0"/>',
  rapor:      '<path d="M6 2.5h8l4 4v15H6z"/><path d="M14 2.5v4h4"/><path d="M9 17v-3M12 17v-6M15 17v-4"/>',
  enstitu:    '<path d="M3 9.5L12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20.5h18"/>',
  kaynak:     '<path d="M4 4.5h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4.5h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  rehber:     '<circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><circle cx="12" cy="17.2" r=".6"/>',
  konum:      '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>',
  ara:        '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l5 5"/>',
  menu:       '<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/>',
  kapat:      '<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>',
  akis:       '<path d="M3 8h13M12 4l4 4-4 4"/><path d="M21 16H8M12 12l-4 4 4 4"/>',
  sanayi:     '<path d="M3 21V11l5 3v-3l5 3v-3l5 3V4h3v17z"/>',
  tarim:      '<path d="M12 21V9"/><path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5zM12 10c0-3 2-5 5-5 0 3-2 5-5 5z"/><path d="M5 21h14"/>',
  elektrik:   '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  lng:        '<path d="M3 15h18l-2 5H5z"/><path d="M7 15V9h10v6"/><circle cx="10" cy="12" r="1.5"/><circle cx="14" cy="12" r="1.5"/>',
  gaz:        '<path d="M12 21.5c-3.9 0-6.5-2.6-6.5-6 0-3.6 3-5.6 3.6-9.5 2 1.4 3.2 3.4 3.2 5.3 1-.9 1.6-2.2 1.6-3.6 2.6 2 4.6 4.6 4.6 7.8 0 3.4-2.6 6-6.5 6z"/>'
};
function ICON(name, size = 20, color = 'currentColor', sw = 1.75){
  const g = P[name] || P.genel;
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${g}</svg>`;
}
// Harita işareti: renkli disk + beyaz glif (+ durum halkası)
function markerSVG(name, fill, ring){
  const g = P[name] || P.genel;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    ${ring ? `<circle cx="32" cy="32" r="30" fill="none" stroke="${ring}" stroke-width="4"/>` : ''}
    <circle cx="32" cy="32" r="${ring ? 25 : 28}" fill="${fill}" stroke="#ffffff" stroke-width="3"/>
    <g transform="translate(17 17) scale(1.25)" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${g}</g></svg>`;
}
function addMarker(map, id, name, fill, ring){
  return new Promise(res => {
    if (map.hasImage(id)) return res();
    const img = new Image(64, 64);
    img.onload = () => { if (!map.hasImage(id)) map.addImage(id, img, {pixelRatio: 2}); res(); };
    img.onerror = () => res();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markerSVG(name, fill, ring));
  });
}
window.ICON = ICON; window.ICON_MARKER = addMarker; window.ICON_NAMES = Object.keys(P);
})();
