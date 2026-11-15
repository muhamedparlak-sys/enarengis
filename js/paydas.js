/* ENAREN WebGIS – Paydaşlar: kim hangi veriyi tutuyor, ENAREN onlarla hangi konuda çalışmalı.
 * Her panelin başında ilgili paydaşlar etiket olarak durur; ayrıntı "Paydaşlar" bölümünde. */
(() => {
'use strict';
const A = window.ENAREN_APP;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// [kısa ad, tam ad, grup, elindeki veri / yetki, ENAREN ile işbirliği konusu]
const P = {
  ETKB:   ['ETKB', 'Enerji ve Tabii Kaynaklar Bakanlığı (EİGM)', 'Politika', 'Enerji politikası, hedefler, YEKA yarışmaları, enerji istatistikleri', 'Hedef ve senaryo varsayımlarının doğrulanması; YEKA saha ön elemesine bilimsel destek'],
  EPDK:   ['EPDK', 'Enerji Piyasası Düzenleme Kurumu', 'Düzenleyici', 'Lisans ve önlisanslar, piyasa raporları, dağıtım kayıp-kaçak verisi', 'Lisanslı tesis konumları; il ve bölge bazında sektörel tüketim'],
  EPIAS:  ['EPİAŞ', 'Enerji Piyasaları İşletme A.Ş.', 'Piyasa', 'Gerçek zamanlı üretim ve tüketim, fiyatlar, doğal gaz iletim verisi', 'Canlı veri bağlantısı (kuruldu); santral bazında üretim verisine erişim'],
  TEIAS:  ['TEİAŞ', 'Türkiye Elektrik İletim A.Ş.', 'Şebeke', 'İletim hatları, trafo merkezleri, bağlantı kapasiteleri, yük akışı', 'Gerçek şebeke modeliyle bölgeler arası akış; yeni RES ve GES için bağlantı noktası analizi'],
  EDAS:   ['TEDAŞ / EDAŞ\'lar', 'TEDAŞ ve 21 elektrik dağıtım şirketi', 'Şebeke', 'Dağıtım şebekesi (OG/AG), abone ve tüketim, kayıp oranları', 'İl, ilçe ve mahalle bazında tüketim; çatı GES ve EV şarj yükü analizi'],
  EUAS:   ['EÜAŞ', 'Elektrik Üretim A.Ş.', 'Üretim', 'Kamu santralleri; Atatürk, Keban, Karakaya, Ilısu, Birecik HES\'leri', 'HES + yüzer GES hibrit pilotu; işletme verisiyle üretim tamamlayıcılığı'],
  DSI:    ['DSİ', 'Devlet Su İşleri Genel Müdürlüğü', 'Su', 'Baraj gölleri, su seviyeleri, yüzer GES kiralama yetkisi, Kuzova Yüzer GES', 'Baraj göllerinde yüzer GES saha seçimi; su seviyesi ve buharlaşma verisi'],
  BOTAS:  ['BOTAŞ', 'Boru Hatları ile Petrol Taşıma A.Ş.', 'Doğal gaz', 'Doğal gaz iletim şebekesi, LNG terminalleri, yer altı depolama, ithalat sözleşmeleri', 'Gaz arz güvenliği göstergeleri; depolama ve LNG kapasite senaryoları'],
  TPAO:   ['TPAO', 'Türkiye Petrolleri A.O.', 'Arama-üretim', 'Sondaj ve sismik filo, Sakarya gaz sahası, Gabar petrolü', 'Deniz alanı kullanım çakışmaları; deniz üstü RES ile platform altyapısının ortak kullanımı'],
  MTA:    ['MTA', 'Maden Tetkik ve Arama Genel Müdürlüğü', 'Yer bilimleri', 'Jeotermal kaynak envanteri, maden ve kömür sahaları, jeoloji haritaları, Oruç Reis sismik gemisi', 'Jeotermal potansiyel katmanı; deniz tabanı jeolojisi ve zemin verisi'],
  ETI:    ['Eti Maden', 'Eti Maden İşletmeleri (bor, lityum)', 'Hammadde', 'Bor rezervleri, Bandırma lityum üretimi, kritik mineraller', 'Batarya ve depolama hammaddesi; yerli depolama değer zinciri'],
  TKI:    ['TKİ', 'Türkiye Kömür İşletmeleri', 'Üretim', 'Linyit sahaları ve üretimi', 'Kömür sahalarının dönüşümü; maden sahalarında GES ve depolama'],
  NUK:    ['Akkuyu / NGS', 'Akkuyu Nükleer A.Ş. ve Nükleer Enerji Proje Uygulama', 'Üretim', 'Nükleer santral projeleri (Akkuyu, Sinop, Trakya), SMR', 'Nükleer kapasitenin şebeke ve senaryo modellerine dahil edilmesi'],
  TENMAK: ['TENMAK enstitüleri', 'TENMAK (NÜKEN, BOREN, NATEN ve diğerleri)', 'Araştırma', 'Nükleer, bor ve nadir toprak elementleri araştırmaları', 'Kurum içi ortak projeler; bor tabanlı depolama, nükleer senaryolar'],
  SHODB:  ['SHODB', 'Seyir, Hidrografi ve Oşinografi Dairesi', 'Deniz', 'Resmî batimetri, deniz haritaları, askerî ve tatbikat alanları', 'Deniz üstü RES ve yüzer GES için kesin dışlama alanları ve yüksek çözünürlüklü derinlik'],
  UAB:    ['UAB / Kıyı Emniyeti', 'Ulaştırma ve Altyapı Bakanlığı, Kıyı Emniyeti GM', 'Deniz', 'Seyir koridorları, Türk Boğazları trafik verisi, limanlar', 'Seyir yollarının dışlanması; boğaz akıntısı pilotu için izin süreci'],
  MGM:    ['MGM', 'Meteoroloji Genel Müdürlüğü', 'İklim', 'Rüzgâr ve ışınım ölçümleri, iklim projeksiyonları', 'Uydu verisinin yer ölçümleriyle doğrulanması'],
  CSB:    ['ÇŞİDB / TUCBS', 'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı (CBS GM)', 'Mekânsal veri', 'TUCBS katmanları: YEKA, lisanssız sahalar, İHA ortofotoları, koruma alanları', 'Kapalı katmanların servis olarak bağlanması; ortofotodan çatı GES tespiti'],
  TKGM:   ['TKGM', 'Tapu ve Kadastro Genel Müdürlüğü', 'Mekânsal veri', 'Parsel ve kadastro, MEGSİS', 'Parsel bazında saha uygunluğu (bağlı, günlük sorgu limitli)'],
  TUIK:   ['TÜİK', 'Türkiye İstatistik Kurumu', 'İstatistik', 'Nüfus, taşıt, sanayi ve enerji istatistikleri', 'İl ve ilçe bazında talep tahmini girdileri'],
  YEREL:  ['Belediyeler ve sulama birlikleri', 'Yerel yönetimler, OSB\'ler, sulama birlikleri', 'Yerel', 'Kamu binaları, OSB çatıları, gölet ve kanal yüzeyleri', 'Çatı ve yüzer GES pilotları; mahalle ölçeğinde uygulama'],
  AKAD:   ['Üniversiteler', 'İTÜ, ODTÜ, ÇOMÜ, Uludağ ve diğerleri', 'Araştırma', 'Akıntı, rüzgâr, yüzer GES ve şebeke çalışmaları', 'Ortak proje ve tez; boğaz akıntısı ve yüzer GES literatürü'],
  ULUS:   ['Uluslararası', 'Dünya Bankası, Ember, IEA, ENTSO-E', 'Uluslararası', 'Deniz üstü rüzgâr yol haritası, bağımsız analizler, Avrupa şebeke verisi', 'Yöntem karşılaştırması ve finansman; komşu ülke ve Avrupa bağlantıları']
};
const PANE = {
  vizyon:['ETKB','EPDK','EPIAS','TUIK'], canli:['EPIAS','TEIAS','BOTAS'], ithalat:['BOTAS','ETKB','EPDK','TPAO'],
  katman:['TEIAS','CSB','MTA','EDAS'], bolge:['EDAS','TEIAS','TUIK'], parsel:['TKGM','YEREL'], analiz:['YEREL','MGM','EDAS','CSB'],
  deniz:['SHODB','UAB','TPAO','MTA','DSI','EUAS','MGM'], senaryo:['EDAS','EPDK','TUIK'], projeler:['ETKB','EUAS','NUK','TPAO','BOTAS','ETI'],
  rapor:['ETKB','EDAS'], enstitu:['TENMAK','AKAD']
};
// Paydaşlar bölümü
const pane = document.createElement('div'); pane.className = 'pane'; pane.id = 'pane-paydas';
document.querySelector('.panes').appendChild(pane);
const tab = document.createElement('button'); tab.className = 'tab'; tab.dataset.tab = 'paydas'; tab.textContent = 'Paydaşlar';
document.querySelector('.tabs').appendChild(tab);
tab.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === tab)); document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p === pane)); });
const gruplar = [...new Set(Object.values(P).map(p => p[2]))];
pane.innerHTML = `<p class="hint">ENAREN'in bu sistemi gerçek bir karar destek aracına dönüştürmesi için birlikte çalışması gereken kurumlar: kimde hangi veri var ve hangi konuda işbirliği yapılabilir. Her bölümün başında o bölümle ilgili paydaşlar etiket olarak durur.</p>
  ${gruplar.map(g => `<h3>${g}</h3>${Object.entries(P).filter(([, p]) => p[2] === g).map(([k, p]) => `<div class="pd" id="pd-${k}"><b>${esc(p[0])}</b><small>${esc(p[1])}</small><span><em>Veri / yetki:</em> ${esc(p[3])}</span><span><em>İşbirliği:</em> ${esc(p[4])}</span></div>`).join('')}`).join('')}`;
function ac(k){ A.goTab('paydas'); A.openSheet(); setTimeout(() => { const el = document.getElementById('pd-' + k); if (el){ el.scrollIntoView({block:'center'}); el.classList.add('vurgu'); setTimeout(() => el.classList.remove('vurgu'), 1800); } }, 250); }
// Her panelin başına paydaş etiketleri
function etiketle(){
  Object.entries(PANE).forEach(([id, ks]) => {
    const p = document.getElementById('pane-' + id); if (!p) return;
    let bar = p.querySelector(':scope > .pdbar');
    if (bar && p.firstElementChild === bar) return;
    if (!bar){ bar = document.createElement('div'); bar.className = 'pdbar'; bar.innerHTML = `<span>İlgili paydaşlar</span>${ks.map(k => `<button data-pd="${k}">${esc(P[k][0])}</button>`).join('')}`; bar.addEventListener('click', e => { const b = e.target.closest('button'); if (b) ac(b.dataset.pd); }); }
    p.prepend(bar);
  });
}
etiketle();
const mo = new MutationObserver(() => etiketle());
Object.keys(PANE).forEach(id => { const el = document.getElementById('pane-' + id); if (el) mo.observe(el, {childList:true}); });
setTimeout(() => { Object.keys(PANE).forEach(id => { const el = document.getElementById('pane-' + id); if (el) mo.observe(el, {childList:true}); }); etiketle(); }, 3000);
window.ENAREN_PAYDAS = { ac, P };
})();
