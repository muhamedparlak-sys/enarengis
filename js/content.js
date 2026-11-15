// Enstitü bilgileri ve veri kaynakları kataloğu (içerik ayrı tutuldu ki kolay güncellensin)
window.ENAREN = {
  baslik: "TENMAK Enerji Araştırma Enstitüsü (ENAREN)",
  ozet: "Türkiye Enerji, Nükleer ve Maden Araştırma Kurumu (TENMAK) bünyesindeki beş enstitüden biri. 57 sayılı Cumhurbaşkanlığı Kararnamesi ile 2020'de kuruldu, Ankara'da. Odak: enerji üretildikten sonraki süreçler — iletim, dağıtım, depolama ve verimli kullanım.",
  baskan: "Çağlayan Yıldız (Kasım 2026 ataması) — Ankara Üni. Enerji ve Tahkim Hukuku YL; ETKB'de 14 yıl uzman yardımcısı / uzman.",
  gorevler: [
    ["Yerli enerji teknolojileri", "Üretim, iletim, dağıtım ve enerji depolama için yerli ve milli ürün/teknoloji tasarımı ve geliştirilmesi."],
    ["Ar-Ge ve inovasyon", "Enerji teknolojilerinde dışa bağımlılığı azaltacak projeler yürütmek."],
    ["İşbirliği", "Kamu – üniversite – sanayi ortaklıkları kurmak."],
    ["Verimlilik ve dönüşüm", "Mevcut enerji sistemlerinin verimliliğini artırmak, sürdürülebilir dönüşümü desteklemek."],
    ["Politikaya veri", "Ulusal enerji politikalarına veri, analiz ve raporlarla katkı sunmak."],
    ["Test altyapısı", "Test, ölçüm, analiz ve deney ortamları kurmak ve geliştirmek."],
    ["Eğitim ve yayın", "Seminer, çalıştay, yayın ve eğitim programları düzenlemek."],
    ["Uluslararası", "Uluslararası Ar-Ge projelerinde yer almak, Türkiye'yi temsil etmek."]
  ],
  notlar: [
    "Sayıştay 2024 raporuna göre ENAREN Başkanlığında 5 personel görevli — dış ortaklık ve proje bazlı çalışma ihtiyacı yüksek.",
    "TENMAK'ın kendi açık CBS portalı bulunmuyor; CBS ile bağlantısı ETKB'nin CBS tabanlı Biyokütle Enerjisi Potansiyel Atlası (BEPA) çalışmasına verdiği destekle sınırlı görünüyor.",
    "Görev tanımı operasyonel bir ulusal CBS işletmekten çok, araştırma amaçlı mekânsal analiz ve karar destek aracına uygun."
  ],
  pilotlar: [
    ["Bölge enerji paneli", "21 dağıtım bölgesinde tüketim, kayıp ve tüketici yoğunluğunu güneş potansiyeli ve şebeke altyapısıyla aynı ekranda gösterme (bu demo)."],
    ["Çatı GES yaygınlık haritası", "Ortofoto + makine öğrenmesi ile PV paneli / sıcak su kolektörü / boş uygun çatı ayrımı; EDAŞ bağlantı kayıtlarıyla karşılaştırma."],
    ["Depolama yer seçimi", "Yenilenebilir bolluğu + tüketim yoğunluğu + trafo bağlanabilir kapasitesi ile batarya depolama aday alanları."],
    ["Kayıp-kaçak mekânsal analizi", "Bölge düzeyindeki kayıp oranını il/ilçe ölçeğine indirip hedefli verimlilik önerileri."]
  ],
  kaynaklar: [
    // tip: ulusal | uluslararasi ; erisim: acik | kurumsal | protokol | bozuk
    {ad:"GEPA – Güneş Enerjisi Potansiyel Atlası (WMS)", kurum:"ETKB / TUCBS Public API", tip:"ulusal", erisim:"bozuk", url:"https://tucbs-public-api.csb.gov.tr/trk_eigm_gepa_2010_yillik_toplam_radyasyon_wms", not:"Yıllık toplam/direkt/difüz radyasyon ve güneşlenme süresi katmanları. 15.11.2026 testinde arka uç sunucusuna (mcbssrv.enerji.gov.tr) yönlendirme hatası verdi; uygulamada canlı kontrol ediliyor.", test:"gepa"},
    {ad:"REPA – Rüzgâr Enerjisi Potansiyel Atlası (WMS)", kurum:"ETKB / TUCBS Public API", tip:"ulusal", erisim:"bozuk", url:"https://tucbs-public-api.csb.gov.tr/trk_eigm_repa_2007_yillik_ortalama_hiz_wms", not:"50 m ortalama rüzgâr hızı, yön, basınç, sıcaklık. GEPA ile aynı altyapı."},
    {ad:"BEPA – Biyokütle Enerjisi Potansiyel Atlası", kurum:"ETKB (TENMAK destekli)", tip:"ulusal", erisim:"kurumsal", url:"https://enerji.gov.tr", not:"CBS tabanlı biyokütle potansiyeli; servis erişimi için ETKB ile görüşme."},
    {ad:"Ulusal Coğrafi Bilgi Platformu (TUCBS)", kurum:"ÇŞİDB CBS Genel Müdürlüğü", tip:"ulusal", erisim:"kurumsal", url:"https://www.tucbs.gov.tr", not:"630+ katman; kamu personeli girişiyle daha fazla katman. ENAREN ürettiği katmanları da buraya verebilir."},
    {ad:"TKGM Parsel / MEGSİS ve ortofoto", kurum:"Tapu ve Kadastro GM", tip:"ulusal", erisim:"protokol", url:"https://parselsorgu.tkgm.gov.tr", not:"Parsel ve güncel ortofoto servisleri kurumlar arası protokolle WMS olarak alınabiliyor."},
    {ad:"HGM ortofoto ve sayısal yükseklik modeli", kurum:"Harita Genel Müdürlüğü", tip:"ulusal", erisim:"protokol", url:"https://www.harita.gov.tr", not:"30 cm ortofoto, SYM; çatı GES ve makine öğrenmesi için temel altlık."},
    {ad:"EPDK / ELDER dağıtım istatistikleri", kurum:"EPDK, ELDER", tip:"ulusal", erisim:"acik", url:"https://www.elder.org.tr", not:"Bölge bazında tüketim, tüketici sayısı, kayıp oranı. Bu demodaki bölge verileri ELDER 2024 Sektör Raporu'ndan."},
    {ad:"EPİAŞ Şeffaflık Platformu", kurum:"EPİAŞ", tip:"ulusal", erisim:"acik", url:"https://seffaflik.epias.com.tr", not:"Saatlik tüketim, üretim, kurulu güç; API ile."},
    {ad:"TEİAŞ bağlanabilir kapasite", kurum:"TEİAŞ", tip:"ulusal", erisim:"acik", url:"https://www.teias.gov.tr", not:"Trafo merkezi bazında bağlanabilir YEK kapasitesi tabloları; koordinatlandırılıp katmana dönüştürülebilir."},
    {ad:"Sentinel-2 cloudless (WMTS)", kurum:"EOX / Copernicus", tip:"uluslararasi", erisim:"acik", url:"https://s2maps.eu", not:"10 m bulutsuz uydu mozaiği; ticari olmayan kullanımda atıfla ücretsiz.", test:"eox"},
    {ad:"Esri World Imagery", kurum:"Esri", tip:"uluslararasi", erisim:"acik", url:"https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9", not:"Yüksek çözünürlüklü görüntü altlığı (ortofoto benzeri görsel kontrol)."},
    {ad:"CORINE Arazi Örtüsü 2018 (WMS)", kurum:"Copernicus / EEA", tip:"uluslararasi", erisim:"acik", url:"https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer", not:"GES/RES yer seçiminde arazi kısıtı.", test:"corine"},
    {ad:"OpenStreetMap / OpenInfraMap", kurum:"OSM topluluğu", tip:"uluslararasi", erisim:"acik", url:"https://openinframap.org", not:"Enerji hatları, trafo merkezleri, santraller ve güneş kurulum yoğunluğu (vektör karo). Gönüllü veri — resmi değil.", test:"oim"},
    {ad:"NASA POWER API", kurum:"NASA", tip:"uluslararasi", erisim:"acik", url:"https://power.larc.nasa.gov", not:"Nokta/bölge bazında güneş ışınımı (2001–2025 klimatoloji). Demodaki güneş katmanı ve çatı GES hesaplayıcı bunu kullanıyor.", test:"power"},
    {ad:"Global Solar Atlas", kurum:"Dünya Bankası / ESMAP", tip:"uluslararasi", erisim:"acik", url:"https://globalsolaratlas.info", not:"250 m GHI/PVOUT GeoTIFF indirme; GEPA erişilemezse yedek."},
    {ad:"Global Wind Atlas", kurum:"DTU / Dünya Bankası", tip:"uluslararasi", erisim:"acik", url:"https://globalwindatlas.info", not:"250 m rüzgâr hızı/güç yoğunluğu GeoTIFF."},
    {ad:"PVGIS", kurum:"AB JRC", tip:"uluslararasi", erisim:"acik", url:"https://re.jrc.ec.europa.eu/pvg_tools/", not:"Ayrıntılı PV üretim simülasyonu (API tarayıcıdan doğrudan çağrılamaz; sunucu tarafında kullanılmalı)."},
    {ad:"Google / Microsoft açık bina izleri", kurum:"Google, Microsoft", tip:"uluslararasi", erisim:"acik", url:"https://sites.research.google/open-buildings/", not:"Bina poligonları; çatı alanı ve potansiyel hesabı için."}
  ]
};
