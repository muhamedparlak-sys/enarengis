"""Türkiye'nin Doğu Akdeniz'de resmî belgelerde yer alan deniz yetki alanı sınır noktaları.
Kaynak derleme: imer.av.tr/dogu-akdeniz-deniz-yetki-alanlari (BM A/74/550, TR–KKTC 2011, TR–LY 2019)."""
import json, re, sys
def dms(s):
    n = [float(x) for x in re.findall(r"[\d.]+", s)]
    return n[0] + n[1] / 60 + n[2] / 3600
KKTC = """35-33-09.584N 32-16-18.000E;35-33-41.913N 32-21-12.349E;35-33-47.278N 32-31-50.801E;35-35-38.364N 32-37-51.980E;35-37-58.043N 32-46-34.195E;35-39-53.677N 32-56-36.616E;35-40-59.868N 33-02-50.096E;35-40-55.189N 33-10-19.709E;35-41-19.465N 33-19-40.157E;35-40-58.546N 33-23-18.544E;35-41-14.617N 33-32-33.838E;35-41-45.874N 33-38-16.025E;35-42-04.417N 33-45-08.528E;35-42-29.670N 33-53-00.873E;35-43-50.531N 34-02-48.043E;35-45-06.627N 34-06-06.897E;35-45-44.498N 34-10-13.085E;35-48-11.903N 34-14-21.393E;35-49-46.780N 34-18-51.643E;35-51-41.517N 34-24-51.492E;35-52-57.081N 34-28-43.550E;35-54-25.608N 34-33-30.506E;35-54-42.208N 34-36-28.498E;35-54-06.978N 34-40-56.920E;35-52-55.052N 34-44-01.021E;35-51-19.934N 34-46-40.603E;35-49-09.889N 34-48-51.634E"""
BM2019 = """33 53 03.700 28 00 00.000;33 46 37.982 28 22 32.752;33 42 10.738 28 41 14.431;33 40 51.422 28 46 24.339;33 44 42.734 29 20 18.089;33 49 51.799 30 14 28.443;33 50 40.770 30 18 34.016;33 54 00.509 30 53 29.646;33 54 58.407 31 04 19.857;33 56 42.089 31 21 27.702;33 51 54.050 31 43 52.936;33 51 18.290 31 46 24.013;33 50 21.651 31 53 04.910;33 47 04.112 32 16 18.000"""
TRLY = [("34 16 13.720", "26 19 11.640"), ("34 09 07.9", "26 39 06.3")]
kktc = [[round(dms(p.split()[1]), 6), round(dms(p.split()[0]), 6)] for p in KKTC.split(";")]
bm = []
for p in BM2019.split(";"):
    v = p.split(); bm.append([round(dms(" ".join(v[3:6])), 6), round(dms(" ".join(v[0:3])), 6)])
trly = [[round(dms(b), 6), round(dms(a), 6)] for a, b in TRLY]
F = lambda coords, **p: {"type": "Feature", "geometry": {"type": "LineString", "coordinates": coords}, "properties": p}
feats = [
    F(list(reversed(kktc)), ad="Türkiye–KKTC kıta sahanlığı sınırı", belge="Türkiye–KKTC Kıta Sahanlığı Sınırlandırma Anlaşması (2011), 27 nokta", nitelik="resmi"),
    F([kktc[0], bm[-1]], ad="32°16′18″D meridyeni (bildirim Bölüm C)", belge="BM A/74/550 (13.11.2019)", nitelik="resmi"),
    F(list(reversed(bm)), ad="Türkiye kıta sahanlığı dış sınırı (Doğu Akdeniz)", belge="BM A/74/550 (13.11.2019), A–N 14 nokta", nitelik="resmi"),
    F([bm[0], trly[1]], ad="Libya mutabakatı hattına bağlantı", belge="BM A/74/757 (18.3.2020) Türkiye–Libya noktalarını ekler; ara güzergâh şematik", nitelik="sematik"),
    F([trly[1], trly[0]], ad="Türkiye–Libya deniz yetki alanları sınırı", belge="Türkiye–Libya Mutabakat Muhtırası (27.11.2019), 2 nokta, WGS84", nitelik="resmi"),
]
json.dump({"type": "FeatureCollection", "features": feats}, open(sys.argv[1], "w"), ensure_ascii=False)
print(len(feats), "hat;", "KKTC", kktc[0], kktc[-1], "BM", bm[0], bm[-1], "LY", trly)
