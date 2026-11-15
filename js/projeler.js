/* ENAREN WebGIS – Türkiye enerji projeleri ve beklentiler (zaman çizelgesi). Kaynak: ETKB ve kamu açıklamaları, Kasım 2026. */
(() => {
'use strict';
const A = window.ENAREN_APP;
const { map } = A;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// [yıl, başlık, ikon, durum, açıklama, [lng,lat] | null]
const P = [
  [2026, 'Akkuyu NGS – 1. ünitede ilk elektrik', 'nukleer', 'insa', '4 × 1.200 MW VVER-1200. İlk elektrik 2026 sonu hedefi; basına göre ticari işletme 2027\'ye kayabilir.', [33.531, 36.144]],
  [2026, 'YEKA RES-2026 tahsisi: 1.500 MW', 'ruzgar', 'ihale', 'Sivas 320, Balıkesir 685 (4 saha), Manisa 235, Kütahya 260 MW. 2 Kasım 2026\'da tahsis edildi.', [27.88, 39.65]],
  [2026, 'YEKA GES-2026: 900 MW, 14 saha', 'gunes', 'ihale', 'Ankara, Batman, Denizli, Konya, Malatya, Mardin, Diyarbakır, Elazığ, Kahramanmaraş.', [40.23, 37.91]],
  [2026, 'Batarya depolama 850 MW', 'batarya', 'uretim', 'Şebeke esnekliği; depolamalı rüzgâr/güneş proje stoku 33 GW.', null],
  [2027, 'Sakarya Faz-2: Osman Gazi platformu', 'dogalgaz', 'insa', 'Platform Ekim 2026\'da sahaya uğurlandı; 2027 başı üretim. Günlük 9,5 → 20 milyon m³ (≈ 8 milyon hane).', [31.5, 42.7]],
  [2027, 'Kurulu güç 140 GW, YEK payı %52', 'genel', 'plan', 'Elektrik kurulu gücünün 140.047 MW\'a, yenilenebilir üretim payının %52\'ye ulaşması bekleniyor.', null],
  [2027, 'Batarya 2.350 MW; gaz depolama 7,8 milyar m³', 'depolama', 'plan', 'Tuz Gölü\'nde +1 milyar m³; yer altı depolama 6,8 → 7,8 milyar m³.', [33.4, 38.6]],
  [2027, 'Sinop ve Trakya NGS: teknoloji ve finansman kararı', 'nukleer', 'plan', 'Teknoloji seçimi ve finansman paketlerinin 2027\'de netleşmesi hedefleniyor; SMR görüşmeleri sürüyor.', [34.95, 42.05]],
  [2027, 'İlk deniz üstü rüzgâr YEKA yarışması (1.000 MW)', 'deniz', 'ihale', 'Saros, Gökçeada, Bozcaada, Edremit. Tavan 11,00 / taban 7,00 $-cent/kWh (taslak). Yarışma 2027 ilk yarı beklentisi.', [26.0, 40.0]],
  [2027, 'Gabar: günlük 100 bin varil üzeri', 'petrol_kaynak', 'uretim', 'Bugün 84–85 bin varil; yeni keşiflerle 100 bin varilin üzerine çıkması hedefleniyor.', [42.35, 37.55]],
  [2028, 'Akkuyu: 4 ünite tam kapasite', 'nukleer', 'insa', '4.800 MW, yılda 35–40 TWh — elektrik talebinin yaklaşık %10\'u.', [33.531, 36.144]],
  [2028, 'Sakarya Faz-3: günlük 45 milyon m³', 'dogalgaz', 'plan', 'İkinci yüzer üretim platformu; toplam 54 kuyu. Karadeniz rezervi 785 milyar m³.', [31.2, 42.8]],
  [2035, 'Güneş + rüzgâr 120 GW', 'gunes', 'plan', '76,9 GW güneş + 43,1 GW rüzgâr; deniz üstü rüzgârda 5 GW. 2035\'e kadar 200 milyar $ enerji dönüşümü yatırımı.', null],
  [2035, 'Sinop NGS ilk elektrik (öngörü)', 'nukleer', 'plan', 'Sinop\'tan 2035 öncesi, Trakya\'dan 2035 sonrası ilk elektrik öngörüsü.', [34.95, 42.05]],
  [2035, 'Elektrifikasyon %35', 'elektrik', 'plan', 'Nihai enerjide elektriğin payı; 10 yılda şebekeye 30 milyar $ yatırım.', null],
  [2040, 'Dışa bağımlılık %68 → %48', 'genel', 'plan', 'ETKB 2040 enerji yol haritası.', null],
  [2050, 'Nükleer 20 GW', 'nukleer', 'plan', 'Akkuyu, Sinop, Trakya (12 reaktör) ve SMR\'ler; elektrik üretiminin %15\'i.', null],
  [2053, 'Net sıfır emisyon', 'genel', 'plan', 'Uzun vadeli iklim hedefi.', null]
];
const DUR = {uretim:['Üretimde','#1f8a4c'], insa:['İnşa / devreye alma','#E8B21C'], plan:['Plan / hedef','#7570b3'], ihale:['YEKA ihalesi','#d95f02']};
const pane = document.createElement('div'); pane.className = 'pane'; pane.id = 'pane-projeler';
document.querySelector('.panes').insertBefore(pane, document.querySelector('#pane-katman'));
const tab = document.createElement('button'); tab.className = 'tab'; tab.dataset.tab = 'projeler'; tab.textContent = 'Projeler';
document.querySelector('.tabs').insertBefore(tab, document.querySelector('.tab[data-tab="katman"]'));
tab.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === tab)); document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p === pane)); });
const years = [...new Set(P.map(p => p[0]))];
pane.innerHTML = `<p class="hint">Türkiye'nin süren ve planlanan enerji projeleri, açıklanmış takvim ve beklentileriyle. Konumu olan projeye dokununca harita oraya gider; haritadaki "Stratejik projeler" katmanında aynı projeler durum halkasıyla gösterilir.</p>
  <div class="legend2" style="margin-bottom:8px">${Object.values(DUR).map(([l, c]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>
  <div class="timeline">${years.map(y => `<div class="ty"><div class="tyl">${y}</div><div class="tyi">${P.filter(p => p[0] === y).map((p, i) => `<div class="tp" ${p[5] ? `data-c="${p[5].join(',')}"` : ''} style="border-left-color:${DUR[p[3]][1]}"><b>${window.ICON(p[2], 18, DUR[p[3]][1], 2)}<span>${esc(p[1])}</span></b><span>${esc(p[4])}</span><small>${DUR[p[3]][0]}${p[5] ? ' · haritada göster' : ''}</small></div>`).join('')}</div></div>`).join('')}</div>
  <p class="hint">Kaynaklar: Enerji ve Tabii Kaynaklar Bakanlığı açıklamaları ve yarışma şartnameleri; AA, Ember ve sektör basını (Kasım 2026). Tarihler hedef/öngörüdür, değişebilir.</p>`;
pane.addEventListener('click', e => { const t = e.target.closest('.tp[data-c]'); if (!t) return; const [x, y] = t.dataset.c.split(',').map(Number); map.flyTo({center:[x, y], zoom:7}); A.minimizeSheet(); });
})();
