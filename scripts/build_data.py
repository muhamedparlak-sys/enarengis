"""ENAREN demo WebGIS veri hazırlama.
Girdi: raw/il.json (il sınırları), raw/p1.json + p2.json (NASA POWER GHI)
Çıktı: enaren-webgis/data/*.geojson
"""
import json, sys
from shapely.geometry import shape, mapping, box, Point
from shapely.ops import unary_union

RAW = sys.argv[1]
OUT = sys.argv[2]

# İl -> dağıtım şirketi (EPDK 21 dağıtım bölgesi, il düzeyinde yaklaşık)
EDAS = {
 "Dicle EDAŞ": ["Diyarbakır","Şanlıurfa","Mardin","Batman","Siirt","Şırnak"],
 "Vangölü EDAŞ": ["Van","Bitlis","Muş","Hakkari"],
 "Aras EDAŞ": ["Erzurum","Ağrı","Ardahan","Bayburt","Erzincan","Iğdır","Kars"],
 "Çoruh EDAŞ": ["Trabzon","Artvin","Giresun","Gümüşhane","Rize"],
 "Fırat EDAŞ": ["Elazığ","Bingöl","Malatya","Tunceli"],
 "Çamlıbel EDAŞ": ["Sivas","Tokat","Yozgat"],
 "Toroslar EDAŞ": ["Adana","Gaziantep","Hatay","Kilis","Mersin","Osmaniye"],
 "Meram EDAŞ": ["Konya","Aksaray","Karaman","Kırşehir","Nevşehir","Niğde"],
 "Başkent EDAŞ": ["Ankara","Bartın","Çankırı","Karabük","Kastamonu","Kırıkkale","Zonguldak"],
 "Akdeniz EDAŞ": ["Antalya","Burdur","Isparta"],
 "GDZ EDAŞ": ["İzmir","Manisa"],
 "Uludağ EDAŞ": ["Bursa","Balıkesir","Çanakkale","Yalova"],
 "Trakya EDAŞ": ["Edirne","Kırklareli","Tekirdağ"],
 "Sakarya EDAŞ": ["Sakarya","Bolu","Düzce","Kocaeli"],
 "Osmangazi EDAŞ": ["Eskişehir","Afyon","Bilecik","Kütahya","Uşak"],
 "KCETAŞ": ["Kayseri"],
 "ADM EDAŞ": ["Aydın","Denizli","Muğla"],
 "Yeşilırmak EDAŞ": ["Samsun","Amasya","Çorum","Ordu","Sinop"],
 "AKEDAŞ": ["Kahramanmaraş","Adıyaman"],
 "Boğaziçi + AYEDAŞ": ["İstanbul"],
}

# ELDER Elektrik Dağıtım Sektör Raporu 2024 (kaynak: EPDK 2024 Gelişim Raporu)
# dagitim_twh, toplam_twh, pay_yuzde, tuketici, kayip_yuzde
ELDER = {
 "ADM EDAŞ": (10.59, 11.78, 4.22, 2356862, 5.51),
 "Akdeniz EDAŞ": (11.43, 12.80, 4.59, 2522766, 8.06),
 "AKEDAŞ": (4.26, 6.09, 2.18, 740939, 3.63),
 "Aras EDAŞ": (2.66, 2.94, 1.05, 1197239, 14.53),
 "AYEDAŞ": (13.40, 14.91, 5.34, 3174361, 4.36),
 "Başkent EDAŞ": (16.98, 22.70, 8.13, 4656421, 5.05),
 "Boğaziçi EDAŞ": (27.33, 29.27, 10.49, 5506776, 6.17),
 "Çamlıbel EDAŞ": (2.67, 3.20, 1.15, 1111805, 7.21),
 "Çoruh EDAŞ": (3.79, 3.98, 1.43, 1603884, 6.35),
 "Dicle EDAŞ": (11.17, 12.51, 4.48, 2318031, 37.62),
 "Fırat EDAŞ": (3.02, 3.90, 1.40, 1105543, 8.82),
 "GDZ EDAŞ": (16.95, 23.32, 8.36, 3900687, 5.41),
 "KCETAŞ": (2.87, 4.37, 1.57, 870023, 5.92),
 "Meram EDAŞ": (11.96, 15.24, 5.46, 2464872, 5.71),
 "Osmangazi EDAŞ": (7.20, 11.57, 4.15, 2081016, 6.98),
 "Sakarya EDAŞ": (10.60, 21.46, 7.69, 2228654, 5.73),
 "Toroslar EDAŞ": (20.06, 36.90, 13.22, 4425873, 9.09),
 "Trakya EDAŞ": (8.00, 11.56, 4.14, 1330800, 4.91),
 "Uludağ EDAŞ": (14.10, 20.52, 7.35, 3733362, 5.02),
 "Vangölü EDAŞ": (2.54, 2.64, 0.95, 857806, 25.04),
 "Yeşilırmak EDAŞ": (5.72, 7.38, 2.65, 2505080, 6.18),
}
# İstanbul iki bölgenin toplamı (il düzeyinde ayrılamadığı için)
b, a = ELDER["Boğaziçi EDAŞ"], ELDER["AYEDAŞ"]
tot_cons = b[3] + a[3]
ELDER["Boğaziçi + AYEDAŞ"] = (
    round(b[0] + a[0], 2), round(b[1] + a[1], 2), round(b[2] + a[2], 2), tot_cons,
    round((b[4] * b[0] + a[4] * a[0]) / (b[0] + a[0]), 2))

# TÜİK Motorlu Kara Taşıtları, Eylül 2026 — il bazında trafiğe kayıtlı toplam taşıt
TASIT = {"İstanbul":6499506,"Ankara":3152567,"İzmir":2185457,"Antalya":1751229,"Bursa":1391832,"Konya":1036228,"Adana":994457,"Mersin":928245,"Manisa":877995,"Muğla":798204,"Gaziantep":792517,"Hatay":731753,"Balıkesir":723947,"Aydın":697479,"Kocaeli":672490,"Denizli":610541,"Samsun":561782,"Kayseri":544346,"Sakarya":454091,"Eskişehir":410828,"Tekirdağ":402798,"Kahramanmaraş":369117,"Çanakkale":355606,"Şanlıurfa":354734,"Afyon":345012,"Trabzon":306759,"Kütahya":295332,"Tokat":264022,"Malatya":260401,"Isparta":257094,"Osmaniye":254170,"Çorum":234451,"Sivas":227049,"Zonguldak":218130,"Edirne":217307,"Ordu":217028,"Diyarbakır":200525,"Uşak":200061,"Burdur":193499,"Aksaray":192796,"Elazığ":186061,"Kırklareli":186039,"Nevşehir":182230,"Kastamonu":179659,"Amasya":170435,"Düzce":169464,"Adıyaman":168627,"Bolu":163525,"Niğde":160045,"Erzurum":159731,"Yozgat":143889,"Giresun":130254,"Karaman":123994,"Mardin":118177,"Rize":113053,"Yalova":105502,"Van":100373,"Bilecik":100281,"Kırşehir":93784,"Kırıkkale":92146,"Karabük":89068,"Sinop":89063,"Erzincan":87410,"Çankırı":78567,"Batman":73219,"Kilis":72644,"Bartın":72485,"Kars":56929,"Artvin":52428,"Muş":44489,"Şırnak":42371,"Iğdır":40637,"Ağrı":39100,"Gümüşhane":34492,"Siirt":32145,"Bitlis":31886,"Bingöl":27295,"Ardahan":23016,"Bayburt":21996,"Tunceli":14902,"Hakkari":12439}
OTO_ORAN = 18115875 / 35065235  # Eylül 2026 ulusal otomobil / toplam taşıt
assert len(TASIT) == 81, len(TASIT)
print("taşıt toplamı", sum(TASIT.values()))

il_to_edas = {il: e for e, ils in EDAS.items() for il in ils}

il = json.load(open(f"{RAW}/il.json"))
assert len(il["features"]) == 81
missing = [f["properties"]["name"] for f in il["features"] if f["properties"]["name"] not in il_to_edas]
assert not missing, missing

# NASA POWER GHI noktaları (1°): kWh/m²/gün yıllık ortalama
pts = {}
for p in ("p1.json", "p2.json"):
    for f in json.load(open(f"{RAW}/{p}"))["features"]:
        lon, lat = f["geometry"]["coordinates"][:2]
        ann = f["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]["ANN"]
        if ann is not None and ann > 0:
            pts[(round(lon, 2), round(lat, 2))] = ann

geoms, il_feats = {}, []
for f in il["features"]:
    name = f["properties"]["name"]
    g = shape(f["geometry"]).buffer(0)
    g_s = g.simplify(0.005, preserve_topology=True)
    geoms[name] = g
    # ilin içindeki ya da en yakın GHI noktalarının ortalaması
    inside = [v for (x, y), v in pts.items() if g.buffer(0.3).contains(Point(x, y))]
    if not inside:
        c = g.centroid
        inside = [min(pts.items(), key=lambda kv: (kv[0][0]-c.x)**2 + (kv[0][1]-c.y)**2)[1]]
    ghi = round(sum(inside) / len(inside), 2)
    il_feats.append({"type": "Feature", "geometry": mapping(g_s), "properties": {
        "il": name if name != "Afyon" else "Afyonkarahisar", "edas": il_to_edas[name],
        "ghi_gun": ghi, "ghi_yil": round(ghi * 365),
        "tasit": TASIT[name], "otomobil": round(TASIT[name] * OTO_ORAN)}})

edas_feats = []
for e, ils in EDAS.items():
    g = unary_union([geoms[i] for i in ils]).simplify(0.01, preserve_topology=True)
    d = ELDER[e]
    edas_feats.append({"type": "Feature", "geometry": mapping(g), "properties": {
        "edas": e, "iller": ", ".join("Afyonkarahisar" if i == "Afyon" else i for i in ils),
        "dagitim_twh": d[0], "toplam_twh": d[1], "pay": d[2], "tuketici": d[3], "kayip": d[4],
        "kwh_kisi": round(d[0] * 1e9 / d[3]),
        "tasit": sum(TASIT[i] for i in ils), "otomobil": round(sum(TASIT[i] for i in ils) * OTO_ORAN)}})

tr = unary_union(list(geoms.values()))
grid = []
for (x, y), v in pts.items():
    cell = box(x - 0.5, y - 0.5, x + 0.5, y + 0.5)
    if cell.intersects(tr):
        grid.append({"type": "Feature", "geometry": mapping(cell),
                     "properties": {"ghi_gun": round(v, 2), "ghi_yil": round(v * 365)}})

def dump(name, feats):
    json.dump({"type": "FeatureCollection", "features": feats},
              open(f"{OUT}/{name}", "w"), ensure_ascii=False, separators=(",", ":"))

def rnd(o):
    if isinstance(o, float): return round(o, 4)
    if isinstance(o, (list, tuple)): return [rnd(i) for i in o]
    if isinstance(o, dict): return {k: rnd(v) for k, v in o.items()}
    return o

dump("iller.geojson", rnd(il_feats))
dump("dagitim_bolgeleri.geojson", rnd(edas_feats))
dump("gunes_grid.geojson", rnd(grid))
print("il", len(il_feats), "edas", len(edas_feats), "grid", len(grid))
print("GHI aralığı", min(f["properties"]["ghi_gun"] for f in il_feats), max(f["properties"]["ghi_gun"] for f in il_feats))

# --- Denizleri de kapsayan güneş (1°) ve rüzgâr (0,5°) ızgaraları: raw/g_<PARAM>_<lon>.json ---
import glob, os
def grid_from(param, half, half_lon=None):
    half_lon = half_lon or half
    feats = []
    seen = set()
    for f in sorted(glob.glob(f"{RAW}/g_{param}_*.json")):
        for ft in json.load(open(f)).get("features", []):
            x, y = [round(c, 3) for c in ft["geometry"]["coordinates"][:2]]
            v = ft["properties"]["parameter"][param]["ANN"]
            if v is None or v < 0 or (x, y) in seen:
                continue
            seen.add((x, y))
            cell = box(x - half_lon, y - half, x + half_lon, y + half)
            kara = cell.intersection(tr).area / cell.area
            props = {"deniz": kara < 0.05, "kara_orani": round(kara, 2)}
            if param == "WS50M":
                props.update({"ws50": round(v, 2), "wpd": round(0.5 * 1.225 * v ** 3 * 1.91)})
            else:
                props.update({"ghi_gun": round(v, 2), "ghi_yil": round(v * 365)})
            feats.append({"type": "Feature", "geometry": mapping(cell), "properties": props})
    return feats

if glob.glob(f"{RAW}/g_ALLSKY_SFC_SW_DWN_*.json"):
    g = grid_from("ALLSKY_SFC_SW_DWN", 0.5)
    dump("gunes_grid.geojson", rnd(g))
    w = grid_from("WS50M", 0.25, 0.3125)  # MERRA-2 ızgarası 0,5° × 0,625°
    dump("ruzgar_grid.geojson", rnd(w))
    print("güneş ızgarası", len(g), "deniz", sum(f["properties"]["deniz"] for f in g),
          "| rüzgâr ızgarası", len(w), "deniz", sum(f["properties"]["deniz"] for f in w),
          "| WS50 aralığı", min(f["properties"]["ws50"] for f in w), max(f["properties"]["ws50"] for f in w))
