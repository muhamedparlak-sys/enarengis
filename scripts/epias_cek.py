"""EPİAŞ Şeffaflık Platformu'ndan güncel elektrik ve doğal gaz verisini çeker, data/canli/ altına yazar.
GitHub Actions'ta çalışır; kullanıcı adı ve şifre depo sırlarından (EPIAS_KULLANICI, EPIAS_SIFRE) okunur.
Yalnız veri okur; hiçbir yere yazmaz."""
import json, os, sys, datetime as dt, urllib.request, urllib.parse, urllib.error

KUL, SIF = os.environ.get('EPIAS_KULLANICI'), os.environ.get('EPIAS_SIFRE')
if not KUL or not SIF:
    sys.exit('EPIAS_KULLANICI / EPIAS_SIFRE tanımlı değil')
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'canli')
os.makedirs(OUT, exist_ok=True)
TR = dt.timezone(dt.timedelta(hours=3))
now = dt.datetime.now(TR)
bugun = now.replace(hour=0, minute=0, second=0, microsecond=0)
iso = lambda d: d.strftime('%Y-%m-%dT%H:%M:%S+03:00')


def tgt():
    req = urllib.request.Request(
        'https://giris.epias.com.tr/cas/v1/tickets',
        data=urllib.parse.urlencode({'username': KUL, 'password': SIF}).encode(),
        headers={'Accept': 'text/plain', 'Content-Type': 'application/x-www-form-urlencoded'}, method='POST')
    return urllib.request.urlopen(req, timeout=60).read().decode().strip()


T = tgt()


def post(base, path, body):
    req = urllib.request.Request(
        f'https://seffaflik.epias.com.tr/{base}/{path}', data=json.dumps(body).encode(),
        headers={'TGT': T, 'Content-Type': 'application/json', 'Accept': 'application/json', 'Accept-Language': 'tr'},
        method='POST')
    return json.loads(urllib.request.urlopen(req, timeout=90).read())


dun, yarin = bugun - dt.timedelta(days=1), bugun + dt.timedelta(days=1)
hafta = bugun - dt.timedelta(days=7)
gun = lambda a, b: {'startDate': iso(a), 'endDate': iso(b)}
ISLER = {
    'elektrik_uretim':  ('electricity-service', 'v1/generation/data/realtime-generation', gun(dun, bugun)),
    'elektrik_tuketim': ('electricity-service', 'v1/consumption/data/realtime-consumption', gun(dun, bugun)),
    'elektrik_tahmin':  ('electricity-service', 'v1/consumption/data/load-estimation-plan', gun(bugun, yarin)),
    'elektrik_ptf':     ('electricity-service', 'v1/markets/dam/data/mcp', gun(bugun, yarin)),
    'gaz_giris_gercek': ('natural-gas-service', 'v1/transmission/data/realization-entry-amount', gun(hafta, dun)),
    'gaz_cikis_gercek': ('natural-gas-service', 'v1/transmission/data/realization-exit-amount', gun(hafta, dun)),
    'gaz_max_giris':    ('natural-gas-service', 'v1/transmission/data/max-entry-amount', gun(hafta, dun)),
    'gaz_depo_aktarim': ('natural-gas-service', 'v1/transmission/data/daily-actualization-amount', gun(hafta, dun)),
    'gaz_sistem_stok':  ('natural-gas-service', 'v1/transmission/data/stock-amount', gun(hafta, dun)),
}
ozet = {'guncelleme': now.isoformat(), 'durum': {}}
for ad, (base, path, body) in ISLER.items():
    try:
        j = post(base, path, body)
        with open(os.path.join(OUT, ad + '.json'), 'w') as f:
            json.dump(j, f, ensure_ascii=False)
        n = len(j.get('items', [])) if isinstance(j, dict) else None
        ozet['durum'][ad] = {'ok': True, 'kayit': n}
    except urllib.error.HTTPError as e:
        ozet['durum'][ad] = {'ok': False, 'hata': f'{e.code} {e.read()[:300].decode(errors="ignore")}'}
    except Exception as e:
        ozet['durum'][ad] = {'ok': False, 'hata': str(e)[:300]}
with open(os.path.join(OUT, 'ozet.json'), 'w') as f:
    json.dump(ozet, f, ensure_ascii=False, indent=1)
print(json.dumps(ozet, ensure_ascii=False, indent=1))
