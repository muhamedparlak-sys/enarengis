# ENAREN Enerji WebGIS – Demo

TENMAK Enerji Araştırma Enstitüsü (ENAREN) için hazırlanmış, telefondan açılabilen, sunucu gerektirmeyen demo WebGIS.
Amaç: enstitünün **iletim, dağıtım, depolama ve verimlilik** görevlerine yönelik analiz ve raporlamayı açık servislerle göstermek.

**Canlı:** GitHub Pages bağlantısı (Settings → Pages → `main` / root)

## Özellikler

| Sekme | İçerik |
|---|---|
| Katmanlar | 4 altlık (sade, OSM, yüksek çözünürlüklü uydu, Sentinel-2 2023) · 21 dağıtım bölgesi tematik haritası (tüketim, kayıp, tüketici, tüketici başına tüketim) · il sınırları · güneş ışınımı · OSM iletim/dağıtım hatları (gerilime göre), trafo merkezleri, santraller, güneş kurulum yoğunluğu · CORINE ve GEPA WMS |
| Analiz | Çatı GES hesaplayıcı (nokta seç / çatıyı çiz → NASA POWER ışınımı → kWp, kWh, hane eşdeğeri, CO₂) · ekrandaki altyapı özeti · 21 bölge karşılaştırma |
| Rapor | Bilgi kutularından, analizlerden ve harita görüntülerinden rapor derleme → PDF/yazdır · görünüm bağlantısı paylaşma |
| Enstitü | Görev tanımı, durum notları, önerilen pilot projeler |
| Kaynaklar | Ulusal ve uluslararası servis kataloğu, erişim durumu, canlı servis testi |

## Veri kaynakları

- **Dağıtım bölgeleri:** ELDER Elektrik Dağıtım Sektör Raporu 2024 (EPDK 2024 Elektrik Piyasası Gelişim Raporu verisi) — faturalanan tüketim, tüketici sayısı, gerçekleşen kayıp oranı. Bölge sınırları il düzeyinde yaklaşıktır; İstanbul'daki Boğaziçi EDAŞ ve AYEDAŞ birleşik gösterilir.
- **İl sınırları:** [cihadturhan/tr-geojson](https://github.com/cihadturhan/tr-geojson)
- **Güneş ışınımı:** NASA POWER, ALLSKY_SFC_SW_DWN, 2001–2025 klimatolojisi (1° ızgara; nokta sorgusu hesaplayıcıda canlı)
- **Enerji altyapısı:** OpenStreetMap / OpenInfraMap vektör karoları (gönüllü veri, resmi envanter değildir)
- **WMS:** Copernicus CORINE 2018 (EEA), ETKB GEPA (TUCBS Public API — 15.11.2026 itibarıyla arka uç hatası veriyor; uygulama canlı kontrol eder)
- **Altlıklar:** CARTO, OpenStreetMap, Esri World Imagery, EOX Sentinel-2 cloudless 2023 (CC BY 4.0, ticari olmayan kullanım)

## Yapı

```
index.html            arayüz
css/style.css         mobil öncelikli stil (≥900 px'te yan panel)
js/content.js         enstitü bilgileri + kaynak kataloğu (buradan güncellenir)
js/app.js             harita, analiz ve rapor mantığı (MapLibre GL 4.7)
data/*.geojson        bölge, il ve güneş ızgarası katmanları
scripts/build_data.py veri hazırlama betiği
```

## Veriyi güncelleme

`scripts/build_data.py` içindeki `ELDER` tablosunu yeni yılın değerleriyle değiştirip çalıştırın:

```bash
python3 scripts/build_data.py raw data   # raw/: il.json, p1.json, p2.json (NASA POWER bölgesel sorgu)
```

## Sınırlamalar

Demo amaçlıdır. Hesaplayıcı ön fizibilite tahminidir (gölge, yön, eğim yerinde doğrulanmalı). TKGM/HGM ortofoto ve TUCBS kurumsal katmanları protokolle eklenebilir; uygulama WMS eklemeye hazırdır (`wmsUrl()` fonksiyonu).
