/* ENAREN WebGIS – hamburger menü ve ilk açılış rehberi (tutorial) */
(() => {
'use strict';
const A = window.ENAREN_APP;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// ---------------- Hamburger menü ----------------
const MENU = [
  ['vizyon','genel','Genel Bakış','Enerji dengesi, resmî hedefler, kaynaklar'],
  ['bolge','parsel','Bölge gezgini','Bölge → il → ilçe → mahalle, tesisler ve akış'],
  ['ithalat','akis','İthalat ve bağımlılık','Tür, ülke ve kanal kırılımı'],
  ['projeler','rapor','Projeler','Süren ve gelecek projeler, beklentiler'],
  ['katman','katman','Katmanlar','Altlıklar, tematik ve deniz katmanları'],
  ['analiz','analiz','Analiz','Çatı GES, karşılaştırma, bölge sıralaması'],
  ['senaryo','ev','EV Senaryo','Elektrikli araç dönüşümü, timelapse'],
  ['parsel','parsel','Parsel','İl → ilçe → mahalle → ada/parsel'],
  ['deniz','deniz','Deniz','Mavi Vatan, açık deniz RES, yüzer GES'],
  ['rapor','rapor','Raporlar','Tip raporlar ve rapor sepeti'],
  ['enstitu','enstitu','Enstitü','ENAREN görevleri ve altlık faydası'],
  ['kaynak','kaynak','Kaynaklar','Veri servisleri ve canlı test']
];
const drawer = document.createElement('aside');
drawer.id = 'drawer'; drawer.className = 'drawer'; drawer.setAttribute('aria-hidden', 'true');
drawer.innerHTML = `<div class="drawer-head"><b>ENAREN Enerji WebGIS</b><button class="dclose" aria-label="Menüyü kapat">✕</button></div>
  <nav>${MENU.map(([k, i, t, d]) => `<button class="ditem" data-k="${k}"><span class="di">${window.ICON(i, 22)}</span><span><b>${t}</b><small>${d}</small></span></button>`).join('')}
  <hr><button class="ditem" data-k="__tur"><span class="di">${window.ICON('rehber', 22)}</span><span><b>Rehber / tur</b><small>Uygulamayı adım adım tanıt</small></span></button></nav>`;
const scrim = document.createElement('div'); scrim.className = 'scrim hidden';
document.body.append(scrim, drawer);
const ham = document.createElement('button'); ham.id = 'btnMenu'; ham.className = 'icon'; ham.setAttribute('aria-label', 'Menü'); ham.innerHTML = window.ICON('menu', 22);
$('.topbar').prepend(ham);
$('#btnLocate').innerHTML = window.ICON('konum', 20);
$('#btnParselTop').innerHTML = window.ICON('ara', 17, 'currentColor', 2) + '<span>Parsel</span>';

function openDrawer(){ drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); scrim.classList.remove('hidden'); markActive(); }
function closeDrawer(){ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); scrim.classList.add('hidden'); }
function markActive(){ const cur = $('.tab.active')?.dataset.tab; $$('.ditem').forEach(b => b.classList.toggle('active', b.dataset.k === cur)); }
ham.onclick = openDrawer; scrim.onclick = closeDrawer; drawer.querySelector('.dclose').onclick = closeDrawer;
drawer.addEventListener('click', e => {
  const b = e.target.closest('.ditem'); if (!b) return;
  closeDrawer();
  if (b.dataset.k === '__tur') return startTour();
  A.goTab(b.dataset.k); A.openSheet(); setTitle();
});
// panel başlığı (sekme şeridi yerine)
const head = document.createElement('div'); head.className = 'sheet-head';
head.innerHTML = `<button class="sh-menu" aria-label="Bölüm seç">${window.ICON('menu', 18)}</button><b id="sheetTitle"></b><button class="sh-toggle" aria-label="Paneli küçült/büyüt">▾</button>`;
$('.tabs').before(head);
head.querySelector('.sh-menu').onclick = openDrawer;
head.querySelector('.sh-toggle').onclick = () => {
  if (innerWidth >= 900){ document.body.classList.toggle('panel-hidden'); setTimeout(() => A.map.resize(), 260); }
  else $('#sheetHandle').click();
};
// masaüstünde panel kapalıyken açma düğmesi
const reopen = document.createElement('button'); reopen.className = 'panel-reopen'; reopen.textContent = 'Paneli aç'; reopen.onclick = () => { document.body.classList.remove('panel-hidden'); setTimeout(() => A.map.resize(), 260); };
document.body.appendChild(reopen);
const _open = A.openSheet; A.openSheet = () => { document.body.classList.remove('panel-hidden'); _open(); };
function setTitle(){ const k = $('.tab.active')?.dataset.tab; const m = MENU.find(x => x[0] === k); $('#sheetTitle').innerHTML = m ? `${window.ICON(m[1], 20)}<span>${m[2]}</span>` : ''; }
$$('.tab').forEach(t => t.addEventListener('click', () => setTimeout(setTitle, 0)));
// goTab başka modüllerden çağrıldığında da başlığı güncelle
const _goTab = A.goTab; A.goTab = (n) => { _goTab(n); setTitle(); };
setTitle();

// ---------------- Rehber (tur) ----------------
const STEPS = [
  {sel:null, t:'Hoş geldiniz ', d:'Bu uygulama TENMAK ENAREN için hazırlanmış bir demo: Türkiye\'nin enerji kaynaklarını, şebekesini, verilerini ve resmî hedeflerini tek haritada gösterir.'},
  {sel:'#btnMenu', t:'Menü', d:'Tüm bölümler buradadır: Vizyon, Katmanlar, Analiz, EV Senaryo, Parsel, Deniz, Raporlar… Bu rehberi de menünün en altından tekrar açabilirsiniz.'},
  {sel:'#map', t:'Harita', d:'Her santral kaynağının rengi ve simgesiyle gösterilir; <b>simge büyüklüğü kurulu güçle orantılıdır</b>. Katmanlar bölümünden enerji türüne göre süzebilirsiniz. Bir ikona ya da bölgeye dokunarak bilgi alın.'},
  {sel:'#pane-vizyon .stack', tab:'vizyon', t:'Enerji dengesi', d:'Türkiye\'nin elektriği hangi kaynaktan geliyor, ne kadarı yerli, ne kadarı ithal? Resmî hedeflere göre ilerleme ve senaryo aracı aşağıda.'},
  {sel:'#btnParselTop', t:'Parsel ve mahalle', d:'İl → ilçe → mahalle seçin; harita oraya gider. Mahalle için çatı GES önerisi ve ada/parsel sorgusu buradan yapılır.'},
  {sel:'#sheet', tab:'rapor', t:'Raporlar', d:'GES fizibilite, bölge fırsat ve deniz enerjisi raporları; harita ve infografikleriyle otomatik oluşturulur, PDF olarak indirilebilir.'},
  {sel:'#btnLocate', t:'Konumunuz', d:'Bulunduğunuz yere gitmek için. Hazırsınız — iyi keşifler!'}
];
let si = 0, tour = null;
function startTour(){
  si = 0;
  if (!tour){
    tour = document.createElement('div'); tour.className = 'tour';
    tour.innerHTML = `<div class="spot"></div><div class="tcard"><b class="tt"></b><p class="td"></p><div class="tnav"><span class="tc"></span><button class="btn ghost tskip">Geç</button><button class="btn tprev">‹ Geri</button><button class="btn primary tnext">İleri ›</button></div></div>`;
    document.body.appendChild(tour);
    tour.querySelector('.tskip').onclick = endTour;
    tour.querySelector('.tprev').onclick = () => { si = Math.max(0, si - 1); showStep(); };
    tour.querySelector('.tnext').onclick = () => { if (si >= STEPS.length - 1) endTour(); else { si++; showStep(); } };
  }
  tour.classList.remove('hidden'); showStep();
}
function showStep(){
  const s = STEPS[si];
  if (s.tab){ A.goTab(s.tab); A.openSheet(); }
  setTimeout(() => {
    const el = s.sel ? $(s.sel) : null, spot = tour.querySelector('.spot'), card = tour.querySelector('.tcard');
    if (el){
      el.scrollIntoView?.({block:'nearest'});
      const r = el.getBoundingClientRect(), p = 6;
      Object.assign(spot.style, {display:'block', left:(r.left - p) + 'px', top:(r.top - p) + 'px', width:(r.width + 2 * p) + 'px', height:(Math.min(r.height, innerHeight * 0.6) + 2 * p) + 'px'});
      const below = r.top + Math.min(r.height, innerHeight * 0.6) + 16;
      card.style.top = (below + 170 < innerHeight ? below : Math.max(12, r.top - 190)) + 'px';
    } else { spot.style.display = 'none'; card.style.top = '30%'; }
    tour.querySelector('.tt').innerHTML = s.t; tour.querySelector('.td').innerHTML = s.d;
    tour.querySelector('.tc').textContent = `${si + 1}/${STEPS.length}`;
    tour.querySelector('.tprev').disabled = si === 0;
    tour.querySelector('.tnext').textContent = si === STEPS.length - 1 ? 'Bitir ✓' : 'İleri ›';
  }, s.tab ? 320 : 30);
}
function endTour(){ tour?.classList.add('hidden'); A.goTab('vizyon'); try { localStorage.setItem('enaren_tur_v1', 'goruldu'); } catch (e) {} }

// İlk açılış: bu cihazda daha önce sorulmadıysa sor
function firstRun(){
  let seen = null; try { seen = localStorage.getItem('enaren_tur_v1'); } catch (e) {}
  if (seen) return;
  const m = document.createElement('div'); m.className = 'welcome';
  m.innerHTML = `<div class="wcard"><div class="wlogo">${window.ICON('elektrik', 40, '#E8B21C', 1.6)}</div><b>ENAREN Enerji WebGIS'e hoş geldiniz</b>
    <p>Türkiye'nin enerji kaynakları, şebekesi, verileri ve resmî hedefleri tek haritada.</p>
    <p>Kısa bir tanıtım turu ister misiniz? (1 dakika)</p>
    <div class="btnrow"><button class="btn primary wyes">Evet, turu başlat</button><button class="btn wno">Şimdilik geç</button></div>
    <small class="muted">Turu daha sonra menüdeki Rehber'den açabilirsiniz.</small></div>`;
  document.body.appendChild(m);
  m.querySelector('.wyes').onclick = () => { m.remove(); startTour(); };
  m.querySelector('.wno').onclick = () => { m.remove(); try { localStorage.setItem('enaren_tur_v1', 'gecildi'); } catch (e) {} A.toast('Rehberi menüden açabilirsiniz'); };
}
setTimeout(firstRun, 1200);
window.ENAREN_UI = { startTour, openDrawer };
})();
