/* ENAREN WebGIS – Paydaşlar: kim hangi veriyi tutuyor, ENAREN onlarla hangi konuda çalışmalı.
 * Her panelin başında ilgili paydaşlar etiket olarak durur; ayrıntı "Paydaşlar" bölümünde. */
(() => {
'use strict';
const A = window.ENAREN_APP;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// [kısa ad, tam ad, grup, elindeki veri / yetki, ENAREN ile işbirliği konusu]
const P = {
  // Politika ve düzenleme
  ETKB:   ['ETKB (EİGM)', 'Enerji ve Tabii Kaynaklar Bakanlığı, Enerji İşleri GM', 'Politika ve düzenleme', 'Enerji politikası, hedefler, YEKA yarışmaları, enerji istatistikleri', 'Hedef ve senaryo varsayımları; YEKA saha ön elemesine bilimsel destek'],
  EPDK:   ['EPDK', 'Enerji Piyasası Düzenleme Kurumu', 'Politika ve düzenleme', 'Lisans ve önlisanslar, piyasa raporları, kayıp-kaçak verisi', 'Lisanslı tesis konumları; il ve bölge bazında sektörel tüketim'],
  SBB:    ['SBB / Kalkınma ajansları', 'Strateji ve Bütçe Başkanlığı, 26 kalkınma ajansı', 'Politika ve düzenleme', 'Bölgesel plan ve destek programları', 'Bölgesel enerji projelerine finansman; il ölçeğinde pilotlar'],
  // Piyasa ve şebeke
  EPIAS:  ['EPİAŞ', 'Enerji Piyasaları İşletme A.Ş.', 'Piyasa ve iletim', 'Gerçek zamanlı üretim ve tüketim, fiyatlar, gaz iletim verisi', 'Canlı veri bağlantısı (kuruldu); santral bazında üretim'],
  TEIAS:  ['TEİAŞ', 'Türkiye Elektrik İletim A.Ş.', 'Piyasa ve iletim', 'İletim hatları, trafo merkezleri, bağlantı kapasiteleri, yük akışı', 'Gerçek şebeke modeliyle akış; yeni RES ve GES için bağlantı noktası'],
  BOTAS:  ['BOTAŞ', 'Boru Hatları ile Petrol Taşıma A.Ş.', 'Piyasa ve iletim', 'Gaz iletim şebekesi, LNG, yer altı depolama, ithalat sözleşmeleri', 'Gaz arz güvenliği göstergeleri; depolama ve LNG senaryoları'],
  // Dağıtıcılar
  EDAS:   ['TEDAŞ ve 21 EDAŞ', 'TEDAŞ ve elektrik dağıtım şirketleri', 'Dağıtıcılar', 'Dağıtım şebekesi (OG/AG), abone ve tüketim, kayıp oranları', 'İl/ilçe/mahalle tüketimi; çatı GES ve EV şarj yükü; katı hal transformatörü pilot sahası'],
  GDZ:    ['Gaz dağıtım şirketleri', 'Şehir içi doğal gaz dağıtıcıları (İGDAŞ, Başkentgaz vb.)', 'Dağıtıcılar', 'Şehir içi gaz şebekesi ve abone tüketimi', 'Isınmada elektrifikasyon ve ısı pompası senaryoları'],
  // Üreticiler
  EUAS:   ['EÜAŞ', 'Elektrik Üretim A.Ş.', 'Üreticiler', 'Kamu santralleri; Atatürk, Keban, Karakaya, Ilısu, Birecik HES\'leri', 'HES + yüzer GES hibrit pilotu; redoks akış bataryası çalışması'],
  NUK:    ['Akkuyu / NGS', 'Akkuyu Nükleer A.Ş. ve nükleer projeler', 'Üreticiler', 'Akkuyu, Sinop, Trakya, SMR planları', 'Nükleer kapasitenin şebeke ve senaryo modellerine dahil edilmesi'],
  TKI:    ['TKİ', 'Türkiye Kömür İşletmeleri', 'Üreticiler', 'Linyit sahaları ve üretimi', 'Kömür sahalarının dönüşümü; maden sahalarında GES ve depolama'],
  URD:    ['Üretici birlikleri', 'EÜD, TÜREB, GÜNDER, GENSED, JESDER', 'Üreticiler', 'Özel santral portföyü, sektör verisi, yatırım planları', 'Yatırımcı ihtiyacına göre saha ve bağlantı analizleri'],
  TPAO:   ['TPAO', 'Türkiye Petrolleri A.O.', 'Üreticiler', 'Sondaj ve sismik filo, Sakarya gazı, Gabar petrolü', 'Deniz alanı çakışmaları; platform altyapısının deniz üstü RES ile ortak kullanımı'],
  // Büyük tüketiciler
  OSB:    ['OSB\'ler (OSBÜK)', 'Organize sanayi bölgeleri ve üst kuruluşu', 'Büyük tüketiciler', 'Sanayi tüketimi, çatı ve arazi alanları; bazıları dağıtım lisanslı', 'OSB çatı GES ve depolama pilotları; sanayi yük profilleri'],
  AGIR:   ['Ağır sanayi', 'Demir-çelik, çimento (TÇMB), kimya, cam üreticileri', 'Büyük tüketiciler', 'Yoğun ve sürekli elektrik ile gaz tüketimi', 'Verimlilik, atık ısı ve elektrifikasyon; karbon düzenlemesine uyum'],
  TCDD:   ['TCDD ve raylı sistemler', 'TCDD, metro işletmeleri', 'Büyük tüketiciler', 'Elektrikli hat ve cer gücü tüketimi', 'Ray güzergâhında GES; şebeke yükü'],
  DSIS:   ['Sulama birlikleri ve DSİ pompajı', 'Tarımsal sulama pompaj istasyonları', 'Büyük tüketiciler', 'Yaz puantında yüksek tarımsal tüketim', 'Sulama GES\'i ve yüzer GES (Kuzova örneği)'],
  // Yerli araç-gereç üreticileri
  TEMSAN: ['TEMSAN', 'Türkiye Elektromekanik Sanayi A.Ş. (ETKB ilgili kuruluşu)', 'Yerli ekipman üreticileri', 'Türbin, jeneratör, HES elektromekanik ekipmanı', 'Yerli türbin ve jeneratör; test altyapısı ortaklığı'],
  ASEL:   ['ASELSAN ve ASPİLSAN', 'Yerli rüzgâr türbini (%80 yerlilik) ve batarya hücresi', 'Yerli ekipman üreticileri', 'Rüzgâr türbini ve güç elektroniği; LFP hücre üretim yatırımı', 'Batarya ve güç elektroniğinde dışa bağımlılığı azaltan ortak Ar-Ge'],
  EMSAD:  ['EMSAD', 'Elektromekanik Sanayicileri Derneği (transformatör, kablo, şalt)', 'Yerli ekipman üreticileri', 'Transformatör ve şalt üretimi; güçlü ihracatçı sektör', 'Katı hal transformatörü projesinde sanayi ortağı ve test'],
  PILDER: ['PİLDER ve GENSED üreticileri', 'Pil/batarya ve güneş paneli üreticileri', 'Yerli ekipman üreticileri', 'Batarya paketleme ve hücre; panel montajı ve hücre yatırımları', 'Hücre ve wafer gibi en çok ithal edilen kalemlerde yerlileştirme'],
  ETI:    ['Eti Maden', 'Eti Maden İşletmeleri (bor, lityum)', 'Yerli ekipman üreticileri', 'Bor rezervleri, Bandırma lityum üretimi, kritik mineraller', 'Batarya hammaddesi; yerli depolama değer zinciri'],
  // Kaynak ve yer bilimleri
  MTA:    ['MTA', 'Maden Tetkik ve Arama GM', 'Kaynak ve yer bilimleri', 'Jeotermal envanter, maden ve kömür sahaları, jeoloji, Oruç Reis sismik gemisi', 'Jeotermal potansiyel katmanı; deniz tabanı jeolojisi'],
  DSI:    ['DSİ', 'Devlet Su İşleri GM', 'Kaynak ve yer bilimleri', 'Baraj gölleri, su seviyeleri, yüzer GES kiralama yetkisi', 'Baraj göllerinde yüzer GES saha seçimi; buharlaşma verisi'],
  MGM:    ['MGM', 'Meteoroloji GM', 'Kaynak ve yer bilimleri', 'Rüzgâr ve ışınım ölçümleri, iklim projeksiyonları', 'Uydu verisinin yer ölçümleriyle doğrulanması'],
  SHODB:  ['SHODB', 'Seyir, Hidrografi ve Oşinografi Dairesi', 'Kaynak ve yer bilimleri', 'Resmî batimetri ve deniz haritaları', 'Deniz üstü RES ve yüzer GES için yüksek çözünürlüklü derinlik'],
  // Sınırlılıklar: koruma ve izin
  KVMGM:  ['Kültür Varlıkları ve Müzeler GM', 'Kültür ve Turizm Bakanlığı', 'Sınırlılıklar (koruma ve izin)', 'Kültürel ve arkeolojik sit alanları, tescilli yapılar', 'Sit alanlarının kısıt katmanı; tesis yer seçiminde erken eleme'],
  TVKGM:  ['Tabiat Varlıklarını Koruma GM', 'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı', 'Sınırlılıklar (koruma ve izin)', 'Doğal sit alanları, Özel Çevre Koruma Bölgeleri (Saros, Gökova, Marmara vb.)', 'ÖÇKB sınırları; deniz üstü RES ve yüzer GES dışlama alanları'],
  DKMP:   ['Doğa Koruma ve Milli Parklar GM', 'Tarım ve Orman Bakanlığı', 'Sınırlılıklar (koruma ve izin)', 'Milli parklar, tabiat parkları, sulak alanlar, yaban hayatı sahaları', 'Resmî koruma sınırları; kuş göç yolları (RES için kritik)'],
  OGM:    ['Orman GM', 'Tarım ve Orman Bakanlığı', 'Sınırlılıklar (koruma ve izin)', 'Orman alanları ve izinleri', 'RES ve iletim hattı güzergâhlarında orman izni ön değerlendirmesi'],
  CED:    ['ÇED ve Mekânsal Planlama', 'ÇŞİDB ÇED İzin ve Denetim GM; Mekânsal Planlama GM', 'Sınırlılıklar (koruma ve izin)', 'ÇED kararları, çevre düzeni planları', 'Planlı alanlarla çakışma; ÇED süreçlerinin hızlandırılması'],
  MSB:    ['MSB ve hava/deniz otoriteleri', 'MSB, SHGM, Kıyı Emniyeti GM (UAB)', 'Sınırlılıklar (koruma ve izin)', 'Askerî alanlar, radar ve hava sahası kısıtları, seyir koridorları', 'RES türbinlerinin radar/uçuş etkisi; deniz sahalarında seyir ve tatbikat dışlaması'],
  // Mekânsal veri ve istatistik
  CSB:    ['TUCBS', 'ÇŞİDB Coğrafi Bilgi Sistemleri GM', 'Mekânsal veri ve istatistik', 'YEKA, lisanssız sahalar, İHA ortofotoları, koruma alanları katmanları', 'Kapalı katmanların servis olarak bağlanması; ortofotodan çatı GES tespiti'],
  TKGM:   ['TKGM', 'Tapu ve Kadastro GM', 'Mekânsal veri ve istatistik', 'Parsel ve kadastro, MEGSİS', 'Parsel bazında saha uygunluğu (bağlı)'],
  TUIK:   ['TÜİK', 'Türkiye İstatistik Kurumu', 'Mekânsal veri ve istatistik', 'Nüfus, taşıt, sanayi, dış ticaret (GTİP) istatistikleri', 'Talep tahmini; ekipman ithalatı ve dışa bağımlılık analizi'],
  // Araştırma
  TENMAK: ['TENMAK enstitüleri', 'NÜKEN, BOREN, NATEN, TEMEN', 'Araştırma', 'Nükleer, bor, nadir toprak, temiz enerji (hidrojen, geri dönüşüm)', 'Batarya geri dönüşümü, bor tabanlı depolama, hidrojen; kurum içi ortak projeler'],
  TUBITAK:['TÜBİTAK MAM Enerji', 'TÜBİTAK Marmara Araştırma Merkezi Enerji Enstitüsü', 'Araştırma', 'Enerji teknolojileri Ar-Ge ve test altyapısı', 'Ortak test ve doğrulama; proje çağrıları'],
  AKAD:   ['Üniversiteler', 'İTÜ, ODTÜ, ÇOMÜ, Uludağ ve diğerleri', 'Araştırma', 'Akıntı, rüzgâr, yüzer GES ve şebeke çalışmaları', 'Ortak proje ve tez'],
  YEREL:  ['Belediyeler', 'Büyükşehir ve il belediyeleri', 'Araştırma', 'Kamu binaları, gölet ve kanal yüzeyleri', 'Çatı ve yüzer GES pilotları (DSİ yönetmeliği belediyelere izin veriyor)'],
  ULUS:   ['Uluslararası', 'Dünya Bankası, Ember, IEA, ENTSO-E, IRENA', 'Araştırma', 'Yol haritaları, bağımsız analizler, Avrupa şebeke verisi', 'Yöntem karşılaştırması, finansman, komşu ülke bağlantıları']
};
const PANE = {
  vizyon:['ETKB','EPDK','EPIAS','TUIK'], canli:['EPIAS','TEIAS','BOTAS'], ithalat:['BOTAS','ETKB','EPDK','TPAO','TUIK','PILDER'],
  katman:['TEIAS','CSB','KVMGM','TVKGM','DKMP','MTA','EDAS'], bolge:['EDAS','TEIAS','TUIK'], parsel:['TKGM','YEREL'], analiz:['YEREL','OSB','MGM','EDAS','CSB'],
  deniz:['SHODB','MSB','TVKGM','DKMP','TPAO','MTA','DSI','EUAS'], senaryo:['EDAS','EPDK','TUIK'], projeler:['ETKB','EUAS','NUK','TPAO','BOTAS','ETI','TEMSAN','ASEL'],
  rapor:['ETKB','EDAS'], enstitu:['TENMAK','TUBITAK','AKAD','EMSAD','TEMSAN']
};
// Paydaşlar bölümü
const pane = document.createElement('div'); pane.className = 'pane'; pane.id = 'pane-paydas';
document.querySelector('.panes').appendChild(pane);
const tab = document.createElement('button'); tab.className = 'tab'; tab.dataset.tab = 'paydas'; tab.textContent = 'Paydaşlar';
document.querySelector('.tabs').appendChild(tab);
tab.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === tab)); document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p === pane)); });
const gruplar = [...new Set(Object.values(P).map(p => p[2]))];
const bolumAd = {vizyon:'Genel bakış', canli:'Canlı', ithalat:'İthalat', katman:'Katmanlar', bolge:'Bölge', parsel:'Parsel', analiz:'Saha analizi', deniz:'Deniz', senaryo:'EV', projeler:'Projeler', rapor:'Raporlar', enstitu:'Enstitü'};
const bolumleri = k => Object.entries(PANE).filter(([, ks]) => ks.includes(k)).map(([b]) => bolumAd[b]).join(', ');
let filtre = 'Tümü';
function ciz(){
  const satir = Object.entries(P).filter(([, p]) => filtre === 'Tümü' || p[2] === filtre);
  pane.innerHTML = `<p class="hint">ENAREN'in birlikte çalışması gereken kurumlar: kimde hangi veri ya da yetki var, hangi konuda işbirliği yapılabilir. Her bölümün başında o bölümle ilgili paydaşlar etiket olarak durur. ${Object.keys(P).length} paydaş, ${gruplar.length} grup.</p>
  <div class="chips pdf">${['Tümü', ...gruplar].map(g => `<button class="chip ${g === filtre ? 'on' : ''}" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div>
  <table class="pdt"><thead><tr><th>Paydaş</th><th>Grup</th><th>Veri / yetki</th><th>ENAREN ile işbirliği</th><th>İlgili bölüm</th></tr></thead>
  <tbody>${satir.map(([k, p]) => `<tr id="pd-${k}"><td data-l="Paydaş"><b>${esc(p[0])}</b><small>${esc(p[1])}</small></td><td data-l="Grup">${esc(p[2])}</td><td data-l="Veri / yetki">${esc(p[3])}</td><td data-l="İşbirliği">${esc(p[4])}</td><td data-l="Bölüm">${esc(bolumleri(k)) || '–'}</td></tr>`).join('')}</tbody></table>`;
}
ciz();
pane.addEventListener('click', e => { const b = e.target.closest('.pdf button'); if (b){ filtre = b.dataset.g; ciz(); } });
function ac(k){ if (filtre !== 'Tümü'){ filtre = 'Tümü'; ciz(); } A.goTab('paydas'); A.openSheet(); setTimeout(() => { const el = document.getElementById('pd-' + k); if (el){ el.scrollIntoView({block:'center'}); el.classList.add('vurgu'); setTimeout(() => el.classList.remove('vurgu'), 1800); } }, 250); }
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
