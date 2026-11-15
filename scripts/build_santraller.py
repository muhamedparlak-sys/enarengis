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
 ("Gabar Petrol Sahası", "petrol_kaynak", None, 42.35, 37.55, "uretim", "Şırnak; yerli ham petrol üretimi. Konum yaklaşık."),
 ("Silivri Doğal Gaz Depolama", "depolama", None, 28.2, 41.02, "uretim", "Yeraltı gaz depolama (deniz altı tükenmiş saha)."),
 ("Tuz Gölü Doğal Gaz Depolama", "depolama", None, 33.4, 38.6, "uretim", "Tuz mağarası gaz depolama. Konum yaklaşık."),
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
 ("Ilısu Barajı", "hidro", 1200, 41.85, 37.53, "uretim", "Dicle; Türkiye'nin en büyük ikinci HES kurulu güçlerinden."),
]
SF = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [x, y]},
       "properties": {"ad": a, "kaynak": k, "mw": mw, "durum": d, "aciklama": t}} for a, k, mw, x, y, d, t in S]
json.dump({"type": "FeatureCollection", "features": SF}, open(f"{OUT}/stratejik.geojson", "w"), ensure_ascii=False, separators=(",", ":"))
print("stratejik", len(SF))
