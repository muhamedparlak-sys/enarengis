"""Türkiye kara sınırı (il poligonlarının birleşimi) – çizgi olarak."""
import json, sys
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
il = json.load(open(sys.argv[1]))
u = unary_union([shape(f["geometry"]).buffer(0) for f in il["features"]]).buffer(0.002).buffer(-0.002)
u = u.simplify(0.01, preserve_topology=True)
polys = list(u.geoms) if u.geom_type == "MultiPolygon" else [u]
big = [p for p in polys if p.area > 0.05]  # ana kara + büyük adalar
line = {"type": "Feature", "geometry": mapping(unary_union([p.exterior for p in big])), "properties": {"ad": "Türkiye kara sınırı ve kıyı çizgisi"}}
json.dump({"type": "FeatureCollection", "features": [line]}, open(sys.argv[2], "w"), separators=(",", ":"))
print(len(big), "parça")
