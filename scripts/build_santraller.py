"""Santral ve stratejik proje katmanları.
Girdi: raw/gppd.csv (WRI Global Power Plant Database v1.3) — Türkiye büyük santralleri.
Çıktı: data/santraller.geojson, data/stratejik.geojson"""
import csv, json, re, sys
RAW, OUT = sys.argv[1], sys.argv[2]
YERLI_KOMUR = re.compile(r"Afşin|Afsin|Elbistan|Soma|Yatağan|Yatagan|Kemerköy|Kemerkoy|Yeniköy|Yenikoy|Seyitömer|Seyitomer|Tunçbilek|Tuncbilek|Kangal|Orhaneli|Çan |Can |Çan$|Tufanbeyli|Polat|Göynük|Goynuk|Çayırhan|Cayirhan|Silopi|Çatalağzı|Catalagzi|Kardemir|Bolu|Adularya|Eti Soda|Şırnak|Sirnak|Kahramanmaraş|Çan-|Can-|Yunus Emre|Kütahya", re.I)
FUEL = {"Coal": "komur", "Gas": "dogalgaz", "Hydro": "hidro", "Wind": "ruzgar", "Solar": "gunes", "Geothermal": "jeotermal", "Oil": "petrol", "Biomass": "biyokutle", "Nuclear": "nukleer"}
feats = []
for r in csv.DictReader(open(f"{RAW}/gppd.csv", encoding="utf-8")):
    if r["country"] != "TUR":
        continue
    k = FUEL.get(r["primary_fuel"], "diger")
    if k == "komur":
        k = "linyit" if YERLI_KOMUR.search(r["name"]) else "ithal_komur"
    mw = float(r["capacity_mw"] or 0)
    gen = r.get("estimated_generation_gwh_2017") or ""
    feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(float(r["longitude"]), 4), round(float(r["latitude"]), 4)]},
                  "properties": {"ad": r["name"], "kaynak": k, "mw": round(mw, 1), "sahip": r["owner"], "uretim_gwh": round(float(gen)) if gen else None, "veri": "WRI GPPD v1.3"}})
feats.sort(key=lambda f: -f["properties"]["mw"])
json.dump({"type": "FeatureCollection", "features": feats}, open(f"{OUT}/santraller.geojson", "w"), ensure_ascii=False, separators=(",", ":"))
from collections import Counter
c = Counter(); m = Counter()
for f in feats: c[f["properties"]["kaynak"]] += 1; m[f["properties"]["kaynak"]] += f["properties"]["mw"]
print("santral", len(feats), dict(c), {k: round(v) for k, v in m.items()})

# Stratejik projeler ve ulusal kaynaklar (konumlar yaklaşık; durumlar Kasım 2026 kamu açıklamalarına göre)
S = [
 ("Akkuyu NGS", "nukleer", 4800, 33.531, 36.144, "insa", "4×1.200 MW VVER-1200. 1. ünitede ilk elektrik 2026 sonu hedefi, tam kapasite ~2028; yılda ~35–40 TWh (talebin ~%10'u)."),
 ("Sinop NGS (planlanan)", "nukleer", 4800, 34.95, 42.05, "plan", "Saha etütleri tamamlandı; 2035 öncesi ilk elektrik öngörüsü. Konum yaklaşık (İnceburun)."),
 ("Trakya NGS (planlanan)", "nukleer", 4800, 28.12, 41.60, "plan", "Kıyıköy–Kışlacık mevkii; yer seçimi tamamlandı, 2035 sonrası ilk elektrik öngörüsü. Güç planlama varsayımı."),
 ("Sakarya Gaz Sahası (Karadeniz)", "dogalgaz_kaynak", None, 31.4, 42.6, "uretim", "Yerli doğal gaz; Filyos tesisine boru hattıyla taşınıyor. Konum yaklaşık."),
 ("Filyos Doğal Gaz İşleme Tesisi", "dogalgaz_kaynak", None, 32.04, 41.56, "uretim", "Karadeniz gazının karaya çıktığı işleme tesisi."),
 ("Gabar Petrol Sahası", "petrol_kaynak", None, 42.35, 37.55, "uretim", "Şırnak; günlük 84–85 bin varil, yeni keşiflerle 100 bin varil üzeri hedef. Konum yaklaşık."),
 ("Silivri Doğal Gaz Depolama", "depolama", None, 28.2, 41.02, "uretim", "Yeraltı gaz depolama (deniz altı tükenmiş saha)."),
 ("Tuz Gölü Doğal Gaz Depolama", "depolama", None, 33.4, 38.6, "insa", "Tuz mağarası; 2027'de +1 milyar m³ kapasite devreye alınacak. Konum yaklaşık."),
 ("TürkAkım karaya çıkış", "boru", None, 28.1, 41.63, "uretim", "Kıyıköy; Rusya'dan doğal gaz."),
 ("TANAP giriş (Posof)", "boru", None, 42.7, 41.5, "uretim", "Azerbaycan gazı. Konum yaklaşık."),
 ("Afşin-Elbistan linyit havzası", "linyit_kaynak", None, 36.95, 38.25, "uretim", "Türkiye'nin en büyük linyit rezervi."),
 ("Soma linyit havzası", "linyit_kaynak", None, 27.61, 39.19, "uretim", "Manisa; yerli kömür."),
 ("Zonguldak taşkömürü havzası", "linyit_kaynak", None, 31.79, 41.45, "uretim", "Türkiye'nin tek taşkömürü havzası."),
 ("Karapınar YEKA GES", "gunes", 1350, 33.55, 37.72, "uretim", "Konya; Türkiye'nin en büyük GES sahalarından. Konum ve güç yaklaşık."),
 ("YEKA GES-2026 Ankara 1 (Beypazarı)", "gunes", 140, 31.92, 40.17, "ihale", "YEKA GES-2026 yarışması sahası. Konum ilçe merkezi."),
 ("YEKA GES-2026 Ankara 2 (Polatlı)", "gunes", 230, 32.15, 39.58, "ihale", "YEKA GES-2026 yarışması sahası. Konum ilçe merkezi."),
 ("Kızıldere jeotermal sahası", "jeotermal", None, 28.84, 37.95, "uretim", "Denizli; Türkiye jeotermal elektriğinin çekirdeği."),
 ("Germencik jeotermal sahası", "jeotermal", None, 27.6, 37.85, "uretim", "Aydın. Konum yaklaşık."),
 ("Kırka bor madeni", "bor", None, 30.53, 39.29, "uretim", "Eskişehir; bor — hidrojen depolama ve batarya malzemeleri."),
 ("Bigadiç bor madeni", "bor", None, 28.13, 39.40, "uretim", "Balıkesir."),
 ("BOREN Bandırma – lityum", "bor", None, 27.97, 40.35, "uretim", "TENMAK BOREN lityum borat tuzları üretim tesisi (2026). Konum yaklaşık."),
 ("Beylikova toryum + nadir toprak", "toryum", None, 31.2, 39.68, "plan", "Eskişehir; toryum ve nadir toprak elementleri — TENMAK NATEN. Konum yaklaşık."),
 ("Yusufeli Barajı", "hidro", 558, 41.54, 40.82, "uretim", "Çoruh; 2022'de devreye alındı."),
 ("Osman Gazi yüzer üretim platformu (Sakarya Faz-2)", "dogalgaz_kaynak", None, 31.5, 42.7, "insa", "Platform 17 Ekim 2026'da Filyos'tan uğurlandı; 2026 sonu ilk gaz, 2027 başı üretim. Günlük 9,5 → 20 milyon m³. Konum yaklaşık."),
 ("Sakarya Faz-3 (2. yüzer platform)", "dogalgaz_kaynak", None, 31.2, 42.8, "plan", "2028'de devreye alınması; günlük üretimin 45 milyon m³'e çıkması hedefleniyor. Konum yaklaşık."),
 ("YEKA DÜRES-2026: Saros Körfezi", "ruzgar", None, 26.55, 40.55, "ihale", "Deniz üstü rüzgâr sahası; toplam 1.000 MW YEKA (şartname taslağı). Yarışma 2027 ilk yarı beklentisi. Konum yaklaşık."),
 ("YEKA DÜRES-2026: Gökçeada açıkları", "ruzgar", None, 25.55, 40.25, "ihale", "Deniz üstü rüzgâr sahası. Konum yaklaşık."),
 ("YEKA DÜRES-2026: Bozcaada açıkları", "ruzgar", None, 25.85, 39.8, "ihale", "Deniz üstü rüzgâr sahası. Konum yaklaşık."),
 ("YEKA DÜRES-2026: Edremit açıkları", "ruzgar", None, 26.65, 39.5, "ihale", "Deniz üstü rüzgâr sahası. Konum yaklaşık."),
 ("YEKA RES-2026 Sivas", "ruzgar", 320, 37.02, 39.75, "ihale", "1.500 MW'lık YEKA RES-2026'da tahsis edildi (Kasım 2026). Konum il merkezi."),
 ("YEKA RES-2026 Balıkesir 1–4", "ruzgar", 685, 27.88, 39.65, "ihale", "Balıkesir 1-2-3-4: 140 + 235 + 170 + 140 MW. Konum il merkezi."),
 ("YEKA RES-2026 Manisa", "ruzgar", 235, 27.43, 38.61, "ihale", "Konum il merkezi."),
 ("YEKA RES-2026 Kütahya", "ruzgar", 260, 29.98, 39.42, "ihale", "Konum il merkezi."),
 ("YEKA GES-2026 Diyarbakır", "gunes", 200, 40.23, 37.91, "ihale", "YEKA GES-2026 (toplam 900 MW, 14 saha). Konum il merkezi."),
 ("YEKA GES-2026 Mardin", "gunes", 150, 40.74, 37.31, "ihale", "Konum il merkezi."),
 ("YEKA GES-2026 Konya", "gunes", 110, 32.49, 37.87, "ihale", "Konum il merkezi."),
 ("Diyarbakır alışılmadık petrol araması", "petrol_kaynak", None, 40.4, 38.1, "plan", "Bakanlık açıklamasına göre Gabar'ın 2–3 katı üretim potansiyeli araştırılıyor. Konum yaklaşık."),
 ("Ilısu Barajı", "hidro", 1200, 41.85, 37.53, "uretim", "Dicle; Türkiye'nin en büyük ikinci HES kurulu güçlerinden."),
]
SF = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [x, y]},
       "properties": {"ad": a, "kaynak": k, "mw": mw, "durum": d, "aciklama": t}} for a, k, mw, x, y, d, t in S]
json.dump({"type": "FeatureCollection", "features": SF}, open(f"{OUT}/stratejik.geojson", "w"), ensure_ascii=False, separators=(",", ":"))
print("stratejik", len(SF))
