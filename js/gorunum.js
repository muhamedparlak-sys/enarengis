/* ENAREN WebGIS – Hazır görünümler: haritayı tek dokunuşla bir soruya göre sadeleştirir.
 * Her görünüm yalnız o soruya gereken katmanları açar; geri kalanı kapatır. Sınırlar, bölgeler ve yer adları hep açık. */
(() => {
'use strict';
const A = window.ENAREN_APP;
const YONETILEN = ['lyrLines', 'lyrSubs', 'lyrFilo', 'lyrSantral', 'lyrStrat', 'lyrAkis', 'lyrIthal', 'lyrDpot', 'lyrBaraj', 'lyrKoruma', 'lyrEylem'];
const G = {
  denge:  {ad:'Denge',   acik:['lyrAkis'], akis:'tumu', not:'Bölgeler arası elektrik akışı ve hangi bölgenin verici, hangisinin alıcı olduğu.'},
  sebeke: {ad:'Şebeke',  acik:['lyrLines', 'lyrSubs', 'lyrSantral'], not:'İletim hatları, trafo merkezleri ve santraller (gerçek güzergâhlar, OSM).'},
  ithalat:{ad:'İthalat', acik:['lyrAkis', 'lyrIthal'], akis:'ithal', not:'İthal yakıtla üretilen elektriğin akışı; boru hatları, LNG, tanker ve kömür rotaları.'},
  deniz:  {ad:'Deniz',   acik:['lyrDpot', 'lyrFilo', 'lyrBaraj'], not:'Mavi Vatan\'da RES ve yüzer GES alanları, hedef sahalar, baraj gölleri ve arama filosu.'},
  proje:  {ad:'Projeler', acik:['lyrStrat', 'lyrSantral'], not:'Mevcut santraller ve süren/planlanan stratejik projeler.'},
  eylem:  {ad:'Eylem planı taslağı', acik:['lyrEylem'], not:'ENAREN 2027–2031 eylem planı taslağı (öneri): 27 eylemin bağlı olduğu yerler. Ayrıntı ve infografik sol paneldeki Eylem planı taslağı bölümünde.'},
  kisit:  {ad:'Kısıtlar', acik:['lyrKoruma', 'lyrLines', 'lyrDpot'], not:'Koruma alanları (yeşil) ile şebeke ve deniz potansiyelinin çakıştığı yerler. Kültürel sit alanları resmî veriyle eklenmeli.'}
};
let aktif = 'denge';
function uygula(k){
  const g = G[k]; aktif = k;
  YONETILEN.forEach(id => { const c = document.getElementById(id); if (c) c.checked = g.acik.includes(id); });
  // panel içi eş kutucuklar
  const dp = document.getElementById('lyrDpotPanel'); if (dp) dp.checked = g.acik.includes('lyrDpot');
  const bp = document.getElementById('lyrBarajP'); if (bp) bp.checked = g.acik.includes('lyrBaraj');
  const ep = document.getElementById('eyHarita'); if (ep) ep.checked = g.acik.includes('lyrEylem');
  A.syncLayerChecks();
  const V = window.ENAREN_VIZ;
  if (g.akis && V?.setFlowMode) V.setFlowMode(g.akis); else if (V?.toggleFlow) V.toggleFlow(false);
  if (k === 'eylem'){ A.goTab('eylem'); A.openSheet(); A.map.flyTo({center:[34.5, 38.9], zoom:5}); }
  else if (k === 'deniz') A.map.flyTo({center:[31.5, 38.6], zoom:4.8});
  else if (A.map.getZoom() > 6.5) A.map.flyTo({center:[35.2, 39], zoom:5});
  ciz();
}
const kutu = document.createElement('div'); kutu.className = 'gorunum';
function ciz(){
  kutu.innerHTML = `<b>Görünüm</b><div class="gr-btn">${Object.entries(G).map(([k, g]) => `<button data-g="${k}" class="${k === aktif ? 'active' : ''}" aria-pressed="${k === aktif}">${g.ad}</button>`).join('')}</div><small>${G[aktif].not}</small>`;
}
kutu.addEventListener('click', e => { const b = e.target.closest('button[data-g]'); if (b) uygula(b.dataset.g); });
function yerlestir(){
  const fc = document.querySelector('.flowctl');
  if (!fc || !A.map.getLayer('santral') || !A.map.getLayer('filo') || !window.ENAREN_VIZ?.setFlowMode) return setTimeout(yerlestir, 400);
  fc.prepend(kutu);
  fc.querySelector('.fc-ic')?.remove(); // tesis ikonları artık görünümle yönetiliyor
  uygula('denge');
}
yerlestir();
window.ENAREN_GORUNUM = { uygula };
})();
