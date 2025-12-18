/**
 * Główny skrypt mapy ZOO.
 * Struktura pliku została uporządkowana sekcjami tematycznymi, a komentarze
 * objaśniają, które fragmenty za co odpowiadają.
 */

// ============================================================================
// 1. Konfiguracja mapy i warstw bazowych
// ============================================================================
const MAP_CENTER = [52.39970, 17.00500];
const DEFAULT_ZOOM = 16;
const MIN_ZOOM = 16;
const MAX_ZOOM = 22;
const MAP_BOUNDS = L.latLngBounds(
  [52.38845, 16.98250], // południowo-zachodni narożnik 
  [52.41095, 17.02750]  // północno-wschodni narożnik 
);

const map = L.map('map', {
  center: MAP_CENTER,
  zoom: DEFAULT_ZOOM,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  maxBounds: MAP_BOUNDS,
  maxBoundsViscosity: 1.0
});
window.map = map;

// Aktualny język interfejsu (domyślnie polski)
let currentLang = 'pl';
window.currentLang = currentLang;

// Warstwy bazowe udostępniane w panelu
const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: MAX_ZOOM,
  minZoom: MIN_ZOOM
});

const arcgisLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri'
});

const qtilesLayer = L.tileLayer('http://127.0.0.1:5501/wektor/{z}/{x}/{y}.png', {
  maxZoom: 21,
  attribution: 'Mapa: QTiles'
});

// Grupowa warstwa danych wygenerowanych w QGIS
const qgisLayer = L.layerGroup();
/**
 * Ładuje wektorowe warstwy wygenerowane w QGIS i dodaje je do grupy `qgisLayer`.
 * Każda warstwa otrzymuje zdefiniowany styl w zależności od nazwy pliku.
 */
async function zaladujQGIS() {
  var warstwy = ['las','trawa','woda4','rzeki1','cieki1','piasek','fort','plot','bud1','place',
    'drogandu1','drogandu','sciezkiu1','sciezki1','sciezki','kolejka', 'grani'];
  function stylWarstwy(nazwa) {
    switch(nazwa) {
      case 'grani': return { color: 'black', weight: 3, fillOpacity: 0};
      case 'las': return { color: "#aed1a0", weight: 1, fillColor: "#aed1a0", fillOpacity: 1 };
      case 'trawa': return { color: '#cdebb0', fillColor: '#cdebb0', fillOpacity: 1 };
      case 'woda4': return { color: '#6498d2', weight: 0.26, fillColor: '#a8d6dd', fillOpacity: 1 };
      case 'rzeki1': return { color: '#6498d2', weight: 0.46 };
      case 'cieki1': return { color: '#6498d2', weight: 0.46 };
      case 'piasek': return {color: '#000', weight: 0.2 ,fillColor: '#e5ca84', fillOpacity: 1 };
      case 'fort': return {color: '#e7e7e7', weight: 4.6, fillColor: '#d9d0c9', fillOpacity: 1 };
      case 'plot': return { color: '#000', weight: 0.26}; 
      case 'bud1': return {color: 'black', weight: 0.2, fillColor: '#d9d0c9', fillOpacity: 1 };
      case 'place': return { color: '#cccccc', weight: 0.5, fillColor: '#dddddd', fillOpacity: 1 };
      case 'drogandu1': return { color: '#000', weight: 8};
      case 'drogandu': return { color: '#8c8c8c', weight: 7}; 
      case 'sciezkiu1': return { color: '#f48c0c', weight: 3, dashArray: 8};
      case 'sciezki1': return { color: '#000', weight: 8};
      case 'sciezki': return { color: '#fff', weight: 7};
      case 'kolejka': return { color: '#ff0000', weight: 1, dashArray: 7 };
    }
  }

  for (var nazwa of warstwy) {
    try {
      var res = await fetch(`${nazwa}.geojson`);
      if (!res.ok) continue;
      var data = await res.json();
      L.geoJSON(data, { style: () => stylWarstwy(nazwa) }).addTo(qgisLayer);
    } catch(e) { console.error(e); }
  }
}
const qgisLoadingPromise = zaladujQGIS();
// Ustaw QGIS jako domyślną warstwę bazową
qgisLayer.addTo(map);

const mapInitPromise = new Promise(resolve => map.whenReady(resolve));
Promise.all([mapInitPromise, qgisLoadingPromise.catch(() => {})]).then(() => {
  document.dispatchEvent(new Event('mapReady'));
});

// ============================================================================
// 2. Legenda mapy - widoczna tylko dla wybranych warstw
// ============================================================================
const legenda = L.control({ position: 'bottomright' });
legenda.onAdd = function(map) {
  var div = L.DomUtil.create('div', 'info legend');
  div.style.background = '#ffff9fff';
  div.style.padding = '8px';
  div.style.borderRadius = '6px';
  div.style.boxShadow = '0 0 6px rgba(0,0,0,0.3)';

  var tytul = currentLang === 'pl' ? 'Legenda' : 'Legend';
  div.innerHTML = `<h4 style="margin:0 0 6px 0;">${tytul}</h4>`;

  var elementy = currentLang === 'pl'
    ? [
        { nazwa: 'Obszar Zadrzewiony', color: '#aed1a0' },
        { nazwa: 'Trawa', color: '#cdebb0' },
        { nazwa: 'Woda', color: '#6498d2' },
        { nazwa: 'Piasek', color: '#e5ca84' },
        { nazwa: 'Place', color: '#dddddd' },
        { nazwa: 'Budynki', color: '#d9d0c9' },
        { nazwa: 'Cieki', color: '#6498d2', type: 'line', width: 4 },
        { nazwa: 'Drogi Piesze', color: '#ffffff', type: 'line', width: 5 },
        { nazwa: 'Drogi Służbowe', color: '#8c8c8c', type: 'line', width: 5 },
        { nazwa: 'Ścieżki', color: '#f48c0c', type: 'line', width: 4, style: 'dashed' },
        { nazwa: 'Trasa Kolejki', color: '#db1e2aff', type: 'line', width: 4, style: 'dashed' }
      ]
    : [
        { nazwa: 'Wooded Area', color: '#aed1a0' },
        { nazwa: 'Grass', color: '#cdebb0' },
        { nazwa: 'Water', color: '#6498d2' },
        { nazwa: 'Sand', color: '#e5ca84' },
        { nazwa: 'Places', color: '#dddddd' },
        { nazwa: 'Buildings', color: '#d9d0c9' },
        { nazwa: 'Streams', color: '#6498d2', type: 'line', width: 4 },
        { nazwa: 'Pedestrian Roads', color: '#ffffff', type: 'line', width: 5 },
        { nazwa: 'Service Roads', color: '#8c8c8c', type: 'line', width: 5 },
        { nazwa: 'Paths', color: '#f48c0c', type: 'line', width: 4, style: 'dashed' },
        { nazwa: 'Railway Route', color: '#db1e2aff', type: 'line', width: 4, style: 'dashed' }
];

  elementy.forEach(el => {
  const isLine = el.type === 'line';
  const symbolHTML = isLine
    ? `<div style="
         width: 30px;
         height: 0;
         border-top: ${el.width || 3}px ${el.style || 'solid'} ${el.color};
         margin-right: 6px;
       "></div>`
    : `<div style="
         width: 20px;
         height: 10px;
         background: ${el.color};
         border: 1px solid #000;
         margin-right: 6px;
       "></div>`;

  div.innerHTML += `
    <div style="display:flex;align-items:center;margin-bottom:4px">
      ${symbolHTML}
      ${el.nazwa}
    </div>`;
});

  return div;
};

let legendaDodana = false;

/**
 * Pokazuje lub ukrywa legendę w zależności od aktywnych warstw.
 * Legenda ma sens jedynie dla danych rastrowych QTiles lub wektorowych QGIS.
 */
function updateLegendaVisibility() {
  if ((map.hasLayer(qtilesLayer) || map.hasLayer(qgisLayer)) && !legendaDodana) {
    legenda.addTo(map);
    legendaDodana = true;
  } else if (!map.hasLayer(qtilesLayer) && !map.hasLayer(qgisLayer) && legendaDodana) {
    map.removeControl(legenda);
    legendaDodana = false;
  }
}

// ▪️ Sprawdź przy starcie i przy zmianie warstw
updateLegendaVisibility();
map.on('baselayerchange', updateLegendaVisibility);
map.on('overlayadd', updateLegendaVisibility);
map.on('overlayremove', updateLegendaVisibility);

// Re-render legendy po zmianie języka interfejsu
document.addEventListener('langChanged', () => {
  if (legendaDodana) {
    map.removeControl(legenda);
    legenda.addTo(map);
  }
});

// ============================================================================
// 3. Rejestr warstw bazowych - wykorzystywany przez panel boczny
// ============================================================================
const baseMaps = {
  "OpenStreetMap": osmLayer,
  "ArcGIS": arcgisLayer,
  "QTiles lokalna": qtilesLayer,
  "QGIS": qgisLayer
};
// Warstwy będą sterowane z panelu bocznego

// ============================================================================
// 4. Obsługa języka interfejsu
// ============================================================================
function setLanguage(lang) {
  if (!lang || currentLang === lang) return;
  currentLang = lang;
  window.currentLang = lang;
  // Zamknij ewentualnie otwarty popup, aby po ponownym otwarciu przeładować treść
  if (map && map.closePopup) {
    map.closePopup();
  }
  document.dispatchEvent(new Event('langChanged'));
}

// ============================================================================
// 5. Funkcje pomocnicze do obsługi warstw tematycznych
// ============================================================================
/**
 * Dodaje markery i etykiety dla wskazanego gatunku na podstawie pliku GeoJSON.
 * Widoczność markera oraz etykiety zależy od powiększenia mapy i wybranego języka.
 * Warstwy są grupowane, aby można było je filtrować w panelu.
 */
const animalsLayerGroup = L.layerGroup();
const toiletsLayerGroup = L.layerGroup();
const restaurantsLayerGroup = L.layerGroup();

// Pomocnicza funkcja ustawiająca opacity dla całego drzewa warstw (geoJSON, grupy, markery)
function setLayerTreeOpacity(layer, opacity) {
  if (!layer) return;
  // markery
  if (typeof layer.setOpacity === 'function') {
    layer.setOpacity(opacity);
    // schowaj ewentualny tooltip, jeśli warstwa jest ukrywana
    if (opacity === 0 && typeof layer.closeTooltip === 'function') {
      try { layer.closeTooltip(); } catch(e) {}
    }
  }
  // obiekty wektorowe
  if (typeof layer.setStyle === 'function') {
    try {
      layer.setStyle({ opacity: opacity, fillOpacity: opacity });
    } catch(e) {}
  }
  // zagnieżdżone grupy / geoJSON
  if (typeof layer.eachLayer === 'function') {
    layer.eachLayer(function (child) {
      setLayerTreeOpacity(child, opacity);
    });
  }
}

function setGroupOpacity(group, opacity) {
  if (!group) return;
  group.eachLayer(function (layer) {
    setLayerTreeOpacity(layer, opacity);
  });
}

function showAnimal(nazwa, ikona, minZoomLabel = 19, minZoomMarker = 14, maxZoomMarker = 23) {
  fetch("zwierzęta.geojson")
    .then(r => r.json())
    .then(data => {
      L.geoJSON(data, {
        filter: f => f.properties.nazwa === nazwa,
        pointToLayer: (f, latlng) => {
          let marker = L.marker(latlng, { icon: ikona });
          setMarkerVisibility(marker, minZoomMarker, maxZoomMarker);

          let getLabelText = () => f.properties[`nazwa_${currentLang}`] || f.properties.nazwa;

          let tooltipVisible = false;

          function updateLabel() {
            // jeśli marker jest "wyfiltrowany" (opacity 0), nie pokazuj etykiety
            if (marker.options && marker.options.opacity === 0) {
              if (tooltipVisible && typeof marker.closeTooltip === 'function') {
                try { marker.closeTooltip(); } catch(e) {}
              }
              tooltipVisible = false;
              return;
            }

            if (map.getZoom() >= minZoomLabel) {
              if (!tooltipVisible) {
                marker.bindTooltip(getLabelText(), {
                  permanent: true,
                  direction: 'top',
                  offset: [0, -30],
                  className: 'custom-label-tooltip'
                }).openTooltip();
                tooltipVisible = true;
              } else {
                // jeśli tooltip już jest, tylko aktualizujemy tekst
                marker.setTooltipContent(getLabelText());
              }
            } else {
              if (tooltipVisible) {
                marker.unbindTooltip();
                tooltipVisible = false;
              }
            }
          }

          // wywołanie od razu i przy zmianie zoomu/języka
          updateLabel();
          map.on('zoomend', updateLabel);
          document.addEventListener('langChanged', updateLabel);

          return marker;
        },
        onEachFeature: (f, layer) => {
          function loadOpis() {
            let key = `opis_${currentLang}`;
            let opis = f.properties[key] || f.properties[`opis_pl`] || "Brak opisu";
            let opisPromise = opis && opis.endsWith(".txt") ? fetch(opis).then(r => r.text()) : Promise.resolve(opis);

            opisPromise.then(t => {
              let img = Array.isArray(f.properties.img)
                ? f.properties.img.map(i => `<img src="${i}" width="180">`).join("<br>")
                : f.properties.img ? `<img src="${f.properties.img}" width="250">` : "";

              let img1 = Array.isArray(f.properties.img1)
                ? f.properties.img1.map(i => `<img src="${i}" width="150">`).join("<br>")
                : f.properties.img1 ? `<img src="${f.properties.img1}" width="150">` : "";

              let img2 = Array.isArray(f.properties.img2)
                ? f.properties.img2.map(i => `<img src="${i}" width="150">`).join("<br>")
                : f.properties.img2 ? `<img src="${f.properties.img2}" width="150">` : "";

              let nazwaKey = currentLang === "pl" ? "nazwa" : `nazwa_${currentLang}`;
              let nazwaWybrana = f.properties[nazwaKey] || f.properties.nazwa;

              let opis1Key = `opis1_${currentLang}`;
              let opis1 = f.properties[opis1Key] || f.properties.opis1 || "";

              layer.bindPopup(`
                <b>${nazwaWybrana}</b><br>
                ${opis1}<br>
                ${img1}<br>
                ${img2}<br>
                ${t}<br>
                ${img}
              `);
            });
          }

          loadOpis();
          layer.on("popupopen", loadOpis);
        }
      }).addTo(animalsLayerGroup);
    });
}

/**
 * Steruje widocznością markera w zależności od aktualnego poziomu powiększenia.
 */
function setMarkerVisibility(marker, minZoom, maxZoom) {
  function updateVisibility() {
    var zoom = map.getZoom();
    if (zoom >= minZoom && zoom <= maxZoom) {
      if (!map.hasLayer(marker)) map.addLayer(marker);
    } else {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    }
  }

  // wywołanie przy starcie
  updateVisibility();

  // reagowanie na zmiany zoomu
  map.on('zoomend', updateVisibility);
}

/**
 * Dodaje do mapy pojedynczy punkt sanitarny ze zbioru `toalety.geojson`.
 */
function showToilet(id, ikona) {
  fetch('toalety.geojson')
    .then(r => r.json())
    .then(data => {
      L.geoJSON(data, {
        filter: f => f.properties.id === id,
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: ikona }),
        onEachFeature: (feature, layer) => {
          // wybór nazwy w zależności od języka
          let nazwaKey = currentLang === "pl" ? "nazwa" : `nazwa_${currentLang}`;
          let nazwaWybrana = feature.properties[nazwaKey] || feature.properties.nazwa;

          layer.bindPopup(
            `<b>${nazwaWybrana}</b>`,
            {
              className: "leaflet-popup-toilet"
            }
          );

          // opcjonalnie: przeładowanie przy zmianie języka
          layer.on("popupopen", () => {
            let nameKey = currentLang === "pl" ? "nazwa" : `nazwa_${currentLang}`;
            let nameChoose = feature.properties[nameKey] || feature.properties.nazwa;
            layer.setPopupContent(`<b>${nameChoose}</b>`);
          });
        }
      }).addTo(toiletsLayerGroup);
    });
}


/**
 * Renderuje obiekty specjalne (np. kolejka, fort) z pliku `objects.geojson`.
 */
function showObjects(id, ikona) {
  fetch('objects.geojson')
    .then(r => r.json())
    .then(data => {
      L.geoJSON(data, {
        filter: f => f.properties.id === id,
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: ikona }),
        onEachFeature: (feature, layer) => {
          // wybór nazwy w zależności od języka
          let nazwaKey = currentLang === "pl" ? "nazwa" : `nazwa_${currentLang}`;
          let nazwaWybrana = feature.properties[nazwaKey] || feature.properties.nazwa;

          if (feature.properties.typ === "kolejka") {
            // treść popupu zależna od języka
            let popupContent =
              currentLang === "pl"
                ? `
                  <div class="kolejka-popup">
                    ${nazwaWybrana}<br>
                    <img src="img/kolejka.jpg" alt="Kolejka" style="width:200px; border-radius:8px; margin-top:5px;"><br>
                    <b>Godziny kursowania:</b><br>
                    kwiecień–wrzesień 9:30 – 18:30<br>
                    W kwietniu kolejka na terenie Nowego Zoo kursuje tylko w weekendy, 
                    a w okresie od maja do sierpnia – codziennie.
                  </div>
                `
                : `
                  <div class="kolejka-popup">
                    ${nazwaWybrana}<br>
                    <img src="img/kolejka.jpg" alt="Zoo Train" style="width:200px; border-radius:8px; margin-top:5px;"><br>
                    <b>Operating hours:</b><br>
                    April–September 9:30 AM – 6:30 PM<br>
                    In April, the zoo train operates only on weekends, 
                    while from May to August it runs daily.
                  </div>
                `;

            layer.bindPopup(popupContent, { className: "leaflet-popup-railway" });
          } else {
            // standardowy popup
            layer.bindPopup(`<b>${nazwaWybrana}</b>`, { className: "leaflet-popup-objects" });
          }

          // aktualizacja przy zmianie języka
          layer.on("popupopen", () => {
            let nameChoose = feature.properties[nazwaKey] || feature.properties.nazwa;
            if (feature.properties.typ === "kolejka") {
              let updatedContent =
                currentLang === "pl"
                  ? `
                    <div class="kolejka-popup">
                      ${nameChoose}<br>
                      <img src="opisy/kolejka.jpg" alt="Kolejka" style="width:200px; border-radius:8px; margin-top:5px;"><br>
                      <b>Godziny kursowania:</b><br>
                      kwiecień–wrzesień 9:30 – 18:30<br>
                      W kwietniu kolejka na terenie Nowego Zoo kursuje tylko w weekendy, 
                      a w okresie od maja do sierpnia – codziennie.
                    </div>
                  `
                  : `
                    <div class="kolejka-popup">
                      ${nameChoose}<br>
                      <img src="opisy/kolejka.jpg" alt="Zoo Train" style="width:200px; border-radius:8px; margin-top:5px;"><br>
                      <b>Operating hours:</b><br>
                      April–September 9:30 AM – 6:30 PM<br>
                      In April, the zoo train operates only on weekends, 
                      while from May to August it runs daily.
                    </div>
                  `;
              layer.setPopupContent(updatedContent);
            } else {
              layer.setPopupContent(`<b>${nameChoose}</b>`);
            }
          });
        }
      }).addTo(toiletsLayerGroup);
    });
}

/**
 * Ładuje punkty gastronomiczne i buduje pop-up ze zdjęciem jeśli dostępne.
 */
function showRestaurant(id, ikona) {
  fetch('gastro.geojson')
    .then(r => r.json())
    .then(data => {
      L.geoJSON(data, {
        filter: f => f.properties.id === id,
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: ikona }),
        onEachFeature: (feature, layer) => {
          // wybór nazwy w zależności od języka
          let nameKey = currentLang === "pl" ? "nazwa" : `nazwa_${currentLang}`;
          let nameChoose = feature.properties[nameKey] || feature.properties.nazwa;

          // jedno zdjęcie (jeśli istnieje)
          let imgrest = feature.properties.zdj
            ? `<br><img src="${feature.properties.zdj}" width="200">`
            : "";

          // popup z nazwą i zdjęciem
          layer.bindPopup(
            `<b>${nameChoose}</b>${imgrest}`,
            { className: "leaflet-popup-restaurant" }
          );

          
          // aktualizacja po otwarciu popupu (np. po zmianie języka)
          layer.on("popupopen", () => {
            let nameKey = currentLang === "pl" ? "nazwa" : `nazwa_${currentLang}`;
            let nameChoose = feature.properties[nameKey] || feature.properties.nazwa;

            let img = feature.properties.zdj
              ? `<br><img src="${feature.properties.zdj}" width="200">`
              : "";

            layer.setPopupContent(`<b>${nameChoose}</b>${img}`);
          });
        }
      }).addTo(restaurantsLayerGroup);
    });
}

// Funkcja dostępowa wykorzystywana przez inne skrypty
function changeLanguage(newLang) {
  setLanguage(newLang);
}

// Wsteczna kompatybilność - alternatywna nazwa do zmiany języka
function toggleLanguage(lang) {
  setLanguage(lang);
}

// ============================================================================
// 6. Kontrolki interfejsu (zmiana języka, panel boczny, itp.)
// ============================================================================
// --- kontrolka do zmiany języka ---
L.Control.LangControl = L.Control.extend({
  onAdd: function(map) {
    var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.style.background = 'white';
    div.style.padding = '5px';

    var btnPl = L.DomUtil.create('button', '', div);
    btnPl.innerText = 'PL';
    btnPl.style.margin = '2px';

    var btnEn = L.DomUtil.create('button', '', div);
    btnEn.innerText = 'EN';
    btnEn.style.margin = '2px';

    // zabezpieczenie przed przesuwaniem mapy przy klikaniu
    L.DomEvent.disableClickPropagation(div);

    // obsługa kliknięć
    btnPl.addEventListener('click', () => {
      setLanguage('pl');
    });

    btnEn.addEventListener('click', () => {
      setLanguage('eng');
    });

    return div;
  },

  onRemove: function(map) {
    // tu nic nie trzeba
  }
});

// dodajemy kontrolkę do mapy
L.control.langControl = function(opts) {
  return new L.Control.LangControl(opts);
};
L.control.langControl({ position: 'topright' }).addTo(map);

// ============================================================================
// 7. Warstwy z trasami tematycznymi oraz informacje opisowe
// ============================================================================
const trasaWszystkoLayer = L.layerGroup();
const dzieciLayer = L.layerGroup();
const dziadkiLayer = L.layerGroup();

// Informacje o trasach
const routeInfo = {
  'wszystko': {
    namePl: 'Trasa ogólna',
    nameEn: 'All route',
    descPl: 'Kompletna trasa zwiedzania zoo, obejmująca wszystkie główne atrakcje i wybiegi zwierząt. Idealna dla osób, które chcą zobaczyć wszystko podczas jednej wizyty.',
    descEn: 'Complete zoo tour route covering all main attractions and animal exhibits. Perfect for visitors who want to see everything during one visit.',
    dlugPl: 'Długość: około 7 km',
    dlugEn: 'Length: approximately 7 km',
    czasPl: 'Szacowany czas przejścia: 3-4 godziny',
    czasEn: 'Estimated walking time: 3-4 hours'
  },
  'dzieci': {
    namePl: 'Trasa dla dzieci',
    nameEn: 'Children route',
    descPl: 'Specjalna trasa przygotowana z myślą o najmłodszych zwiedzających. Obejmuje najbardziej atrakcyjne dla dzieci wybiegi, place zabaw i interaktywne ekspozycje.',
    descEn: 'Special route designed for young visitors. Includes the most attractive exhibits for children, playgrounds and interactive displays.',
    dlugPl: 'Długość: około 4 km',
    dlugEn: 'Length: approximately 4 km',
    czasPl: 'Szacowany czas przejścia: 2-3 godziny',
    czasEn: 'Estimated walking time: 2-3 hours'
  },
  'seniorzy': {
    namePl: 'Trasa dla osób starszych',
    nameEn: 'Seniors route',
    descPl: 'Trasa dostosowana do potrzeb osób starszych - krótsza, z mniejszymi przewyższeniami, prowadząca przez najciekawsze wybiegi. Wygodna nawierzchnia i miejsca do odpoczynku.',
    descEn: 'Route adapted for seniors - shorter, with less elevation, leading through the most interesting exhibits. Comfortable surface and rest areas.',
    dlugPl: 'Długość: około 3 km',
    dlugEn: 'Length: approximately 3 km',
    czasPl: 'Szacowany czas przejścia: 1.5-2 godziny',
    czasEn: 'Estimated walking time: 1.5-2 hours'
  }
};

// Ładowanie tras
fetch('trasawszystko.geojson')
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      style: {color: '#0066cc', weight: 4, opacity: 0.8}
    }).addTo(trasaWszystkoLayer);
  })
  .catch(err => console.error('Błąd ładowania trasawszystko.geojson:', err));

fetch('dzieci.geojson')
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      style: {color: '#ff6600', weight: 4, opacity: 0.8}
    }).addTo(dzieciLayer);
  })
  .catch(err => console.error('Błąd ładowania dzieci.geojson:', err));

fetch('dziadki.geojson')
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      style: {color: '#9900cc', weight: 4, opacity: 0.8}
    }).addTo(dziadkiLayer);
  })
  .catch(err => console.error('Błąd ładowania dziadki.geojson:', err));

// ============================================================================
// 8. Panel boczny (lista warstw, wyszukiwarka, trasy)
// ============================================================================
(function() {
  var mapContainer = map.getContainer();
  var animalsModal = null;
  var animalsModalTitle = null;
  var animalsModalDesc = null;
  var animalsModalList = null;
  var animalsModalCloseBtn = null;
  var animalsListBtn = null;
  var isAnimalsModalOpen = false;
  var poiFilterRadioName = 'poi-filter';
  var poiFilterCurrent = 'all';

  // style dla panelu dodane dynamicznie, by nie wymagać osobnego CSS
  var styleEl = document.createElement('style');
  styleEl.textContent = `
    .side-panel {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 300px;
      max-width: 86vw;
      background: #ffffff;
      box-shadow: 0 0 12px rgba(0,0,0,0.25);
      transform: translateX(-100%);
      transition: transform 240ms ease-in-out;
      z-index: 1000; /* nad mapą, poniżej kontrolek leaflet (1000-1001) */
      overflow-y: auto;
    }
    .side-panel.open {
      transform: translateX(0);
    }
    .side-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid #e6e6e6;
      font-weight: 600;
    }
    .side-panel-content { padding: 12px; }
    .leaflet-control-sidebar-toggle {
      background: #fff;
      width: 34px;
      height: 34px;
      line-height: 34px;
      text-align: center;
      font-size: 18px;
      cursor: pointer;
      user-select: none;
    }
    .leaflet-control-sidebar-toggle:hover { background: #f5f5f5; }
    .animals-list-btn {
      margin-top: 10px;
      width: 100%;
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid #ddd;
      background: #fff8ed;
      cursor: pointer;
      font-weight: 600;
      transition: background 160ms ease;
    }
    .animals-list-btn:hover { background: #ffe3ba; }
    .animals-modal {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0, 0, 0, 0.45);
      z-index: 1500;
    }
    .animals-modal.open { display: flex; }
    .animals-modal__dialog {
      width: min(640px, 92vw);
      max-height: 80vh;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .animals-modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #eee;
    }
    .animals-modal__title {
      margin: 0;
      font-size: 1.2rem;
    }
    .animals-modal__close {
      border: none;
      background: transparent;
      font-size: 1.4rem;
      cursor: pointer;
      line-height: 1;
    }
    .animals-modal__body {
      padding: 0 20px 20px;
      overflow-y: auto;
    }
    .animals-modal__desc {
      margin: 16px 0;
      color: #555;
      font-size: 0.95rem;
    }
    .animals-modal__group {
      margin-bottom: 18px;
    }
    .animals-modal__group-title {
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .animals-modal__group-list {
      list-style: none;
      margin: 0;
      padding: 0;
      border: 1px solid #eee;
      border-radius: 8px;
      overflow: hidden;
    }
    .animals-modal__item {
      width: 100%;
      text-align: left;
      padding: 10px 12px;
      background: #fff;
      border: none;
      border-bottom: 1px solid #eee;
      cursor: pointer;
    }
    .animals-modal__item:last-child { border-bottom: none; }
    .animals-modal__item:hover { background: #f7f7f7; }
    .animals-modal__empty {
      text-align: center;
      padding: 40px 0;
      color: #777;
    }
  `;
  document.head.appendChild(styleEl);

  function getCreditsContent() {
    return `
      <div style="font-size:13px;line-height:1.5;color:#555;">
        <div><strong>${currentLang === 'pl' ? 'Autor:' : 'Author:'}</strong> Szymon Woźniak</div>
        <div style="margin-top:10px;font-weight:600;font-size:12px;color:#444;">
          ${currentLang === 'pl' ? 'Źródła ikon:' : 'Icons sources:'}
        </div>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;font-size:12px;">
          <a href="https://www.flaticon.com/free-icons/train" title="train icons" target="_blank" rel="noopener">Train icons created by Muhammad_Usman - Flaticon</a>
          <a href="https://www.flaticon.com/free-icons/rope-park" title="rope park icons" target="_blank" rel="noopener">Rope park icons created by Freepik - Flaticon</a>
          <a href="https://www.flaticon.com/free-icons/bug" title="bug icons" target="_blank" rel="noopener">Bug icons created by Freepik - Flaticon</a>
          <a href="https://www.flaticon.com/free-icons/halloween" title="halloween icons" target="_blank" rel="noopener">Halloween icons created by Freepik - Flaticon</a>
          <a href="https://www.flaticon.com/free-icons/rat" title="rat icons" target="_blank" rel="noopener">Rat icons created by G-CAT - Flaticon</a>
          <a href="https://www.flaticon.com/free-icons/fort" title="fort icons" target="_blank" rel="noopener">Fort icons created by smashingstocks - Flaticon</a>
          <a href="https://www.flaticon.com/free-icons/shelter" title="shelter icons" target="_blank" rel="noopener">Shelter icons created by Ahmad Roaayala - Flaticon</a>
        </div>
      </div>
    `;
  }

  // element panelu
  var panel = document.createElement('div');
  panel.className = 'side-panel';
  panel.innerHTML = `
    <div class="side-panel-header">
      <span>${currentLang === 'pl' ? 'Menu główne' : 'Main menu'}</span>
      <button type="button" aria-label="Zamknij" style="border:none;background:transparent;font-size:20px;cursor:pointer">×</button>D
    </div>
    <div class="side-panel-content">
      <div class="layers-section">
        <div style="font-weight:600;margin-bottom:6px;">
          ${currentLang === 'pl' ? 'Warstwy mapy' : 'Base layers'}
        </div>
        <div id="sidebar-basemaps"></div>
      </div>

      <div class="search-section" style="margin-top:14px;">
        <div id="animal-search-title" style="font-weight:600;margin-bottom:6px;">
          ${currentLang === 'pl' ? 'Wyszukiwarka zwierząt' : 'Animal search'}
        </div>
        <input id="animal-search-input" type="text" placeholder="${currentLang === 'pl' ? 'Wpisz literę...' : 'Type a letter...'}" style="width:90%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;">
        <div id="animal-search-results" style="margin-top:8px;"></div>
        <button type="button" id="animals-list-btn" class="animals-list-btn">
          ${currentLang === 'pl' ? 'Lista zwierząt' : 'Animal list'}
        </button>
      </div>

      <div class="poi-filter-section" style="margin-top:16px;">
        <div style="font-weight:600;margin-bottom:6px;">
          ${currentLang === 'pl' ? 'Filtr punktów na mapie' : 'Points of interest filter'}
        </div>
        <div id="sidebar-poi-filter" style="display:flex;flex-direction:column;gap:4px;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="${poiFilterRadioName}" value="all" checked>
            <span>${currentLang === 'pl' ? 'Wszystkie' : 'All'}</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="${poiFilterRadioName}" value="animals">
            <span>${currentLang === 'pl' ? 'Zwierzęta' : 'Animals'}</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="${poiFilterRadioName}" value="toilets">
            <span>${currentLang === 'pl' ? 'Toalety' : 'Toilets'}</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="${poiFilterRadioName}" value="restaurants">
            <span>${currentLang === 'pl' ? 'Gastronomia' : 'Food & drinks'}</span>
          </label>
        </div>
      </div>

      <div class="routes-section" style="margin-top:14px;">
        <div style="font-weight:600;margin-bottom:6px;">
          ${currentLang === 'pl' ? 'Trasy' : 'Routes'}
        </div>
        <div id="sidebar-routes"></div>
        <div id="sidebar-route-info" style="margin-top:12px;padding-top:12px;border-top:1px solid #e6e6e6;"></div>
      </div>

      <div class="credits-section" style="margin-top:16px;">
        <button type="button" id="sidebar-credits-toggle" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;background:#f3f3f3;cursor:pointer;font-weight:600;">
          ${currentLang === 'pl' ? 'Informacje o autorze' : 'Credits'}
        </button>
        <div id="sidebar-credits-content" style="display:none;margin-top:10px;">${getCreditsContent()}</div>
      </div>
    </div>
  `;
  mapContainer.appendChild(panel);

  animalsModal = document.createElement('div');
  animalsModal.className = 'animals-modal';
  animalsModal.innerHTML = `
    <div class="animals-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="animals-modal-title">
      <div class="animals-modal__header">
        <h3 class="animals-modal__title" id="animals-modal-title">${currentLang === 'pl' ? 'Lista zwierząt' : 'Animal list'}</h3>
        <button type="button" class="animals-modal__close" aria-label="${currentLang === 'pl' ? 'Zamknij' : 'Close'}">×</button>
      </div>
      <div class="animals-modal__body">
        <p class="animals-modal__desc" id="animals-modal-desc">
          ${currentLang === 'pl' ? 'Kliknij gatunek na liście, aby przybliżyć mapę do jego wybiegu.' : 'Click a species to zoom to its enclosure.'}
        </p>
        <div id="animals-modal-list" class="animals-modal__list">
          <div class="animals-modal__empty">${currentLang === 'pl' ? 'Lista jest pusta.' : 'List is empty.'}</div>
        </div>
      </div>
    </div>
  `;
  mapContainer.appendChild(animalsModal);

  animalsModalTitle = animalsModal.querySelector('#animals-modal-title');
  animalsModalDesc = animalsModal.querySelector('#animals-modal-desc');
  animalsModalList = animalsModal.querySelector('#animals-modal-list');
  animalsModalCloseBtn = animalsModal.querySelector('.animals-modal__close');

  if (animalsModal) {
    animalsModal.addEventListener('click', function(e) {
      if (e.target === animalsModal) {
        closeAnimalsModal();
      }
    });
  }
  if (animalsModalCloseBtn) {
    animalsModalCloseBtn.addEventListener('click', closeAnimalsModal);
  }
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isAnimalsModalOpen) {
      closeAnimalsModal();
    }
  });

  // zamknięcie z nagłówka
  var closeBtn = panel.querySelector('button');
  closeBtn.addEventListener('click', function() { panel.classList.remove('open'); });

  var creditsToggleBtn = panel.querySelector('#sidebar-credits-toggle');
  var creditsContent = panel.querySelector('#sidebar-credits-content');
  if (creditsToggleBtn && creditsContent) {
    creditsToggleBtn.addEventListener('click', function() {
      var isOpen = creditsContent.style.display === 'block';
      creditsContent.style.display = isOpen ? 'none' : 'block';
    });
  }
  animalsListBtn = panel.querySelector('#animals-list-btn');

  function updatePoiFilterVisibility() {
    //wszystkie grupy są podpięte do mapy (opacity steruje widocznością)
    if (!map.hasLayer(animalsLayerGroup)) animalsLayerGroup.addTo(map);
    if (!map.hasLayer(toiletsLayerGroup)) toiletsLayerGroup.addTo(map);
    if (!map.hasLayer(restaurantsLayerGroup)) restaurantsLayerGroup.addTo(map);

    // domyślnie wszystko ukryte
    var animalsOpacity = 0;
    var toiletsOpacity = 0;
    var restaurantsOpacity = 0;

    if (poiFilterCurrent === 'animals') {
      animalsOpacity = 1;
    } else if (poiFilterCurrent === 'toilets') {
      toiletsOpacity = 1;
    } else if (poiFilterCurrent === 'restaurants') {
      restaurantsOpacity = 1;
    } else { // all
      animalsOpacity = 1;
      toiletsOpacity = 1;
      restaurantsOpacity = 1;
    }

    setGroupOpacity(animalsLayerGroup, animalsOpacity);
    setGroupOpacity(toiletsLayerGroup, toiletsOpacity);
    setGroupOpacity(restaurantsLayerGroup, restaurantsOpacity);
  }

  var poiFilterContainer = panel.querySelector('#sidebar-poi-filter');
  if (poiFilterContainer) {
    poiFilterContainer.addEventListener('change', function(e) {
      if (e.target && e.target.name === poiFilterRadioName) {
        poiFilterCurrent = e.target.value || 'all';
        updatePoiFilterVisibility();
      }
    });
    // domyślnie pokaż wszystkie po pierwszym uruchomieniu
    updatePoiFilterVisibility();
  }

  // nie przesuwaj mapy przy interakcji z panelem
  L.DomEvent.disableClickPropagation(panel);

  // kontrolka z ikonką hamburgera
  var SidebarToggle = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function() {
      var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      var btn = L.DomUtil.create('a', 'leaflet-control-sidebar-toggle', container);
      btn.href = '#';
      btn.title = 'Panel boczny';
      btn.innerHTML = '&#9776;'; // hamburger

      L.DomEvent.on(btn, 'click', function(e) {
        L.DomEvent.stop(e);
        panel.classList.toggle('open');
      });

      // wyłączenie propagacji, by mapy nie przeciągać podczas klikania
      L.DomEvent.disableClickPropagation(container);
      return container;
    }
  });

  map.addControl(new SidebarToggle());

  // aktualizacja statycznej treści po zmianie języka
  document.addEventListener('langChanged', function() {
    var header = panel.querySelector('.side-panel-header span');
    header.textContent = currentLang === 'pl' ? 'Menu główne' : 'Main menu';
    renderBaseLayerList();
    renderRoutesList();
    renderRouteInfo(); // Aktualizuj informacje o trasach
    // aktualizacja nagłówka sekcji tras
    var routesTitle = panel.querySelector('.routes-section > div');
    if (routesTitle) routesTitle.textContent = currentLang === 'pl' ? 'Trasy' : 'Routes';
    // aktualizacja etykiet wyszukiwarki
    var t = panel.querySelector('#animal-search-title');
    var inp = panel.querySelector('#animal-search-input');
    if (t) t.textContent = currentLang === 'pl' ? 'Wyszukiwarka zwierząt' : 'Animal search';
    if (inp) {
      inp.placeholder = currentLang === 'pl' ? 'Wpisz literę...' : 'Type a letter...';
      performAnimalSearch(inp.value || '');
    }
    var poiFilterSectionTitle = panel.querySelector('.poi-filter-section > div');
    if (poiFilterSectionTitle) {
      poiFilterSectionTitle.textContent = currentLang === 'pl' ? 'Filtr punktów na mapie' : 'Points of interest filter';
    }
    var poiFilterLabels = panel.querySelectorAll('#sidebar-poi-filter span');
    if (poiFilterLabels && poiFilterLabels.length === 4) {
      poiFilterLabels[0].textContent = currentLang === 'pl' ? 'Wszystkie' : 'All';
      poiFilterLabels[1].textContent = currentLang === 'pl' ? 'Zwierzęta' : 'Animals';
      poiFilterLabels[2].textContent = currentLang === 'pl' ? 'Toalety, kolejka, przystanki' : 'Toilets, train, bus stops';
      poiFilterLabels[3].textContent = currentLang === 'pl' ? 'Gastronomia' : 'Food & drinks';
    }
    if (animalsIndex && animalsIndex.length > 0) {
      animalsIndex.sort(function(a, b) {
        var an = getLocalizedAnimalNameFromIndexEntry(a);
        var bn = getLocalizedAnimalNameFromIndexEntry(b);
        return an.localeCompare(bn, 'pl', { sensitivity: 'base' });
      });
    }
    updateAnimalsModalTexts();
    if (isAnimalsModalOpen) {
      renderAnimalsModalList();
    }
    var creditsButton = panel.querySelector('#sidebar-credits-toggle');
    if (creditsButton) {
      creditsButton.textContent = currentLang === 'pl' ? 'Informacje o autorze' : 'Credits';
    }
    var creditsContentEl = panel.querySelector('#sidebar-credits-content');
    if (creditsContentEl) {
      var wasVisible = creditsContentEl.style.display === 'block';
      creditsContentEl.innerHTML = getCreditsContent();
      creditsContentEl.style.display = wasVisible ? 'block' : 'none';
    }
  });
  
  // --- logika listy warstw bazowych w panelu ---
  var baseLayerEntries = [
    { key: 'osm', labelPl: 'Mapa referencyjna (OpenStreetMap)', labelEn: 'Reference map (OpenStreetMap)', layer: osmLayer },
    { key: 'arcgis', labelPl: 'Ortofotomapa (ArcGIS)', labelEn: 'Orthophoto (ArcGIS)', layer: arcgisLayer },
    { key: 'qtiles', labelPl: 'Mapa offline (QTiles)', labelEn: 'Offline map (QTiles)', layer: qtilesLayer },
    { key: 'qgis', labelPl: 'Mapa wektorowa (QGIS)', labelEn: 'Vector map (QGIS)', layer: qgisLayer }
  ];

  function setBaseLayer(targetLayer) {
    baseLayerEntries.forEach(e => {
      if (map.hasLayer(e.layer) && e.layer !== targetLayer) {
        map.removeLayer(e.layer);
      }
    });
    if (!map.hasLayer(targetLayer)) {
      targetLayer.addTo(map);
    }
    updateLegendaVisibility();
  }

  function renderBaseLayerList() {
    var container = panel.querySelector('#sidebar-basemaps');
    if (!container) return;
    var html = '';
    baseLayerEntries.forEach((e, idx) => {
      var id = 'basemap-' + e.key;
      var isActive = map.hasLayer(e.layer);
      var label = currentLang === 'pl' ? e.labelPl : e.labelEn;
      html += `
        <div style="display:flex;align-items:center;margin:6px 0;">
          <input type="radio" name="basemap" id="${id}" ${isActive ? 'checked' : ''} />
          <label for="${id}" style="margin-left:8px;cursor:pointer;">${label}</label>
        </div>
      `;
    });
    container.innerHTML = html;

    // podpinamy zdarzenia
    baseLayerEntries.forEach(e => {
      var id = 'basemap-' + e.key;
      var input = panel.querySelector('#' + id);
      if (input) {
        input.addEventListener('change', function() {
          if (this.checked) setBaseLayer(e.layer);
        });
      }
    });
  }

  // początkowy render
  renderBaseLayerList();

  // --- logika przycisków tras ---
  var routeEntries = [
    { 
      key: 'wszystko', 
      labelPl: 'Trasa ogólna', 
      labelEn: 'All route', 
      layer: trasaWszystkoLayer 
    },
    { 
      key: 'dzieci', 
      labelPl: 'Trasa dla dzieci', 
      labelEn: 'Children route', 
      layer: dzieciLayer 
    },
    { 
      key: 'seniorzy', 
      labelPl: 'Trasa dla osób starszych', 
      labelEn: 'Seniors route', 
      layer: dziadkiLayer 
    }
  ];

  function toggleRoute(routeLayer) {
    if (map.hasLayer(routeLayer)) {
      map.removeLayer(routeLayer);
    } else {
      routeLayer.addTo(map);
    }
    renderRoutesList();
    renderRouteInfo();
  }

  function renderRoutesList() {
    var container = panel.querySelector('#sidebar-routes');
    if (!container) return;
    var html = '';
    routeEntries.forEach(function(e) {
      var id = 'route-' + e.key;
      var isActive = map.hasLayer(e.layer);
      var label = currentLang === 'pl' ? e.labelPl : e.labelEn;
      html += `
        <div style="display:flex;align-items:center;margin:6px 0;">
          <input type="checkbox" id="${id}" ${isActive ? 'checked' : ''} style="cursor:pointer;" />
          <label for="${id}" style="margin-left:8px;cursor:pointer;flex:1;">${label}</label>
        </div>
      `;
    });
    container.innerHTML = html;

    // podpinamy zdarzenia
    routeEntries.forEach(function(e) {
      var id = 'route-' + e.key;
      var input = panel.querySelector('#' + id);
      if (input) {
        input.addEventListener('change', function() {
          toggleRoute(e.layer);
        });
      }
    });
  }

  // Funkcja renderująca informacje o zaznaczonych trasach
  function renderRouteInfo() {
    var container = panel.querySelector('#sidebar-route-info');
    if (!container) return;
    
    // Znajdź wszystkie aktywne trasy
    var activeRoutes = routeEntries.filter(function(e) {
      return map.hasLayer(e.layer);
    });
    
    if (activeRoutes.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    var html = '';
    activeRoutes.forEach(function(routeEntry) {
      var info = routeInfo[routeEntry.key];
      if (!info) return;
      
      var name = currentLang === 'pl' ? info.namePl : info.nameEn;
      var desc = currentLang === 'pl' ? info.descPl : info.descEn;
      var dlug = currentLang === 'pl' ? info.dlugPl : info.dlugEn;
      var czas = currentLang === 'pl' ? info.czasPl : info.czasEn;
      
      // Wybierz kolor w zależności od trasy
      var color = routeEntry.key === 'wszystko' ? '#0066cc' : (routeEntry.key === 'dzieci' ? '#ff6600' : '#9900cc');
      
      html += `
        <div style="margin-bottom:15px;padding:10px;background:#f9f9f9;border-radius:6px;border-left:4px solid ${color};">
          <h4 style="margin:0 0 8px 0;color:${color};font-size:16px;font-weight:600;">${name}</h4>
          <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#555;">${desc}</p>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e0e0e0;">
            <p style="margin:4px 0;font-size:12px;font-weight:600;color:#333;">${dlug}</p>
            <p style="margin:4px 0;font-size:12px;color:#666;">${czas}</p>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }

  // początkowy render tras
  renderRoutesList();
  renderRouteInfo();

  // --- indeks nazw zwierząt z GeoJSON do wyszukiwarki ---
  let animalsIndex = null; // wczytamy lazy
  const animalsListBlacklist = ['zoolandia', 'zoolandia - park linowy'];

  function normalizeStr(s) {
    return (s || '').toString().trim();
  }

  function getAnimalNameForCurrentLang(props) {
    var key = currentLang === 'pl' ? 'nazwa' : ('nazwa_' + currentLang);
    return props[key] || props['nazwa'] || '';
  }

  function isAnimalBlacklisted(name) {
    var normalized = normalizeStr(name).toLowerCase();
    return normalized && animalsListBlacklist.indexOf(normalized) !== -1;
  }

  function buildAnimalsIndex(geojson) {
    var dict = {};
    if (!geojson || !geojson.features) return [];
    geojson.features.forEach(function(f) {
      var pl = normalizeStr(f.properties && f.properties['nazwa']);
      if (isAnimalBlacklisted(pl)) return;
      var key = (pl || '').toLowerCase();
      if (!key) return;
      var localized = {};
      Object.keys(f.properties || {}).forEach(function(k){
        if (k.indexOf('nazwa_') === 0) localized[k] = normalizeStr(f.properties[k]);
      });
      var fbounds = null;
      try {
        var fl = L.geoJSON(f);
        if (fl && fl.getBounds) fbounds = fl.getBounds();
      } catch(e) { fbounds = null; }
      if (!dict[key]) {
        dict[key] = { key: key, pl: pl, localized: localized, bounds: fbounds };
      } else {
        Object.keys(localized).forEach(function(k){ dict[key].localized[k] = localized[k]; });
        if (fbounds && dict[key].bounds) dict[key].bounds.extend(fbounds);
        else if (fbounds && !dict[key].bounds) dict[key].bounds = fbounds;
      }
    });
    var list = Object.keys(dict).map(function(k){ return dict[k]; });
    list.sort(function(a, b){
      var an = normalizeStr(currentLang === 'pl' ? a.pl : (a.localized['nazwa_' + currentLang] || a.pl));
      var bn = normalizeStr(currentLang === 'pl' ? b.pl : (b.localized['nazwa_' + currentLang] || b.pl));
      return an.localeCompare(bn, 'pl', { sensitivity: 'base' });
    });
    return list;
  }

  function getLocalizedAnimalNameFromIndexEntry(entry) {
    if (!entry) return '';
    return normalizeStr(currentLang === 'pl' ? entry.pl : (entry.localized['nazwa_' + currentLang] || entry.pl));
  }

  function getAnimalsListStrings() {
    return {
      title: currentLang === 'pl' ? 'Lista zwierząt' : 'Animal list',
      description: currentLang === 'pl'
        ? 'Kliknij gatunek na liście, aby przybliżyć mapę do jego wybiegu.'
        : 'Click a species in the list to zoom to its enclosure.',
      empty: currentLang === 'pl' ? 'Lista jest pusta.' : 'List is empty.',
      loading: currentLang === 'pl' ? 'Ładowanie listy...' : 'Loading list...',
      closeLabel: currentLang === 'pl' ? 'Zamknij' : 'Close'
    };
  }

  function updateAnimalsModalTexts() {
    var strings = getAnimalsListStrings();
    if (animalsModalTitle) animalsModalTitle.textContent = strings.title;
    if (animalsModalDesc) animalsModalDesc.textContent = strings.description;
    if (animalsModalCloseBtn) animalsModalCloseBtn.setAttribute('aria-label', strings.closeLabel);
    if (animalsListBtn) animalsListBtn.textContent = strings.title;
  }

  function renderAnimalsModalList() {
    if (!animalsModalList) return;
    var strings = getAnimalsListStrings();
    if (!animalsIndex) {
      animalsModalList.innerHTML = `<div class="animals-modal__empty">${strings.loading}</div>`;
      return;
    }
    if (animalsIndex.length === 0) {
      animalsModalList.innerHTML = `<div class="animals-modal__empty">${strings.empty}</div>`;
      return;
    }
    var html = '';
    var lastLetter = null;
    animalsIndex.forEach(function(entry) {
      var name = getLocalizedAnimalNameFromIndexEntry(entry);
      if (!name) return;
      var letter = name.charAt(0).toLocaleUpperCase('pl-PL') || '#';
      if (letter !== lastLetter) {
        if (lastLetter !== null) html += '</ul></div>';
        html += `<div class="animals-modal__group"><div class="animals-modal__group-title">${letter}</div><ul class="animals-modal__group-list">`;
        lastLetter = letter;
      }
      html += `<li><button type="button" class="animals-modal__item" data-key="${entry.key}">${name}</button></li>`;
    });
    if (lastLetter !== null) html += '</ul></div>';
    animalsModalList.innerHTML = html || `<div class="animals-modal__empty">${strings.empty}</div>`;
    var buttons = animalsModalList.querySelectorAll('button[data-key]');
    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var key = this.getAttribute('data-key');
        if (!key || !animalsIndex) return;
        var found = animalsIndex.find(function(x) { return x.key === key; });
        if (found && found.bounds) {
          try { map.fitBounds(found.bounds.pad(0.2), { maxZoom: 20 }); } catch(e) {}
          closeAnimalsModal();
        }
      });
    });
  }

  function openAnimalsModal() {
    if (!animalsModal) return;
    animalsModal.classList.add('open');
    isAnimalsModalOpen = true;
  }

  function closeAnimalsModal() {
    if (!animalsModal) return;
    animalsModal.classList.remove('open');
    isAnimalsModalOpen = false;
  }

  function ensureAnimalsIndex(cb) {
    if (animalsIndex) { cb && cb(); return; }
    fetch('zwierzęta.geojson')
      .then(function(r){ return r.json(); })
      .then(function(data){ animalsIndex = buildAnimalsIndex(data); cb && cb(); })
      .catch(function(){ animalsIndex = []; cb && cb(); });
  }

  function performAnimalSearch(query) {
    var resultsEl = panel.querySelector('#animal-search-results');
    if (!resultsEl) return;
    var q = normalizeStr(query);
    if (!animalsIndex) { resultsEl.innerHTML = ''; return; }
    if (q.length === 0) { resultsEl.innerHTML = ''; return; }

    var upper = q.toLocaleUpperCase('pl-PL');
    var filtered = animalsIndex.filter(function(it){
      var name = getLocalizedAnimalNameFromIndexEntry(it);
      var first = name.slice(0, q.length).toLocaleUpperCase('pl-PL');
      return first === upper;
    }).slice(0, 100);

    if (filtered.length === 0) {
      resultsEl.innerHTML = `<div style="color:#777;">${currentLang === 'pl' ? 'Brak wyników' : 'No results'}</div>`;
      return;
    }

    var html = '<ul style="list-style:none;padding:0;margin:0;">' +
      filtered.map(function(it){
        var name = getLocalizedAnimalNameFromIndexEntry(it);
        return `<li style=\"padding:0;border-bottom:1px solid #eee;\">\
          <button data-key=\"${it.key}\" style=\"display:block;width:100%;text-align:left;padding:8px 6px;background:#fff;border:none;cursor:pointer;\">${name}</button>\
        </li>`;
      }).join('') + '</ul>';
    resultsEl.innerHTML = html;

    // obsługa kliknięcia w wynik
    var buttons = resultsEl.querySelectorAll('button[data-key]');
    buttons.forEach(function(btn){
      btn.addEventListener('click', function(){
        var key = this.getAttribute('data-key');
        if (!key || !animalsIndex) return;
        var found = animalsIndex.find(function(x){ return x.key === key; });
        if (found && found.bounds) {
          try { map.fitBounds(found.bounds.pad(0.2), { maxZoom: 20 }); } catch(e) {}
        }
      });
    });
  }

  // podłącz input
  var searchInput = panel.querySelector('#animal-search-input');
  if (searchInput) {
    ensureAnimalsIndex(function(){ /* gotowe do użycia */ });
    searchInput.addEventListener('input', function(){ performAnimalSearch(this.value); });
  }

  if (animalsListBtn) {
    animalsListBtn.addEventListener('click', function() {
      renderAnimalsModalList();
      openAnimalsModal();
      ensureAnimalsIndex(function() {
        renderAnimalsModalList();
      });
    });
  }
})();

fetch('kolejka.geojson')
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {style: {color: '#db1e2a',weight: 4,dashArray: '5'}
    }).addTo(map);
  });

// ============================================================================
// 9. Definicje ikon i tworzenie instancji markerów
// ============================================================================
const iconDefinitions = [
  { name: 'kolejkaIcon', iconUrl: 'ikony/kolejka.svg', iconSize: [150, 150], iconAnchor: [75, 75], popupAnchor: [0, -40] },
  { name: 'busIcon', iconUrl: 'ikony/bus.svg', iconSize: [100, 100], iconAnchor: [50, 50], popupAnchor: [0, -40] },
  { name: 'dyrIcon', iconUrl: 'ikony/dyr_pl.svg', iconSize: [50, 50], iconAnchor: [25, 25], popupAnchor: [0, -40] },
  { name: 'fortIcon', iconUrl: 'ikony/fort.svg', iconSize: [65, 65], iconAnchor: [32, 32], popupAnchor: [0, -40] },
  { name: 'miceIcon', iconUrl: 'ikony/mice.svg', iconSize: [100, 100], iconAnchor: [50, 50], popupAnchor: [0, -40] },
  { name: 'bugIcon', iconUrl: 'ikony/bug.svg', iconSize: [75, 75], iconAnchor: [35, 35], popupAnchor: [0, -40] },
  { name: 'batIcon', iconUrl: 'ikony/bat.svg', iconSize: [150, 150], iconAnchor: [75, 75], popupAnchor: [0, -40] },
  { name: 'parkIcon', iconUrl: 'ikony/parklinowy.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'restIcon', iconUrl: 'ikony/restaurant.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'iceIcon', iconUrl: 'ikony/ice.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'ToiletIcon', iconUrl: 'ikony/toilets.svg', iconSize: [25, 25], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'pustypingwinyIcon', iconUrl: null, iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'papugipatagonskaIcon', iconUrl: 'ikony/papugaptagonska.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'pawilonzwierzatnocnychIcon', iconUrl: null, iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'leniuchowiecdwupalczastyIcon', iconUrl: 'ikony/leniwiec.svg', iconSize: [55, 55], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'bolitapoudniowaIcon', iconUrl: 'ikony/pancernik.svg', iconSize: [55, 55], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'lemurczerwonobrzuchyIcon', iconUrl: 'ikony/lemurczerwony.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'lispolarnyIcon', iconUrl: 'ikony/lispolarny.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'lemurkattaIcon', iconUrl: 'ikony/lemurkatta.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'warirudyIcon', iconUrl: 'ikony/warirudyi.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'orosepbrodatyIcon', iconUrl: 'ikony/orłosęp.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'flamingibrakIcon', iconUrl: null, iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'strusIcon', iconUrl: 'ikony/strus.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'zebrapregowanaIcon', iconUrl: 'ikony/zebra.svg', iconSize: [45, 45], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'gnubrunatneIcon', iconUrl: 'ikony/gnu.svg', iconSize: [45, 45], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kobsniadyIcon', iconUrl: 'ikony/gnob.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'adamapustynnyIcon', iconUrl: 'ikony/adaks.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'nanduszareIcon', iconUrl: 'ikony/nandu.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kapibarawielkaIcon', iconUrl: 'ikony/kapibara.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'tapirantaIcon', iconUrl: 'ikony/tapir.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'wikuniaandyjskaIcon', iconUrl: 'ikony/wikunia.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'marapatagonskaIcon', iconUrl: 'ikony/mara.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'czepiakczarnorekiIcon', iconUrl: 'ikony/czepiak.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'ostronosbiaonosyIcon', iconUrl: 'ikony/ostronos.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'niedzwiedzbrunatnyIcon', iconUrl: 'ikony/niedzwiedz.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'wilkszaryIcon', iconUrl: 'ikony/wilk.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'tygryssyberyjskiIcon', iconUrl: 'ikony/tygyrs.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'sonafrykanskiIcon', iconUrl: 'ikony/slon.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'sonindyjskiIcon', iconUrl: 'ikony/slonind.svg', iconSize: [100, 100], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'nosorozecczarnyIcon', iconUrl: 'ikony/nosorozec.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'zyrafaponocaIcon', iconUrl: 'ikony/zyrafa.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'susemoregowanyIcon', iconUrl: 'ikony/susel.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'orykspoudniowyIcon', iconUrl: 'ikony/oryks.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'tamanduapoludniowaIcon', iconUrl: 'ikony/tamandua.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'mrowkojadwielkiIcon', iconUrl: 'ikony/mrowkojad.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'wielbaddwugarbnyIcon', iconUrl: 'ikony/wielblad.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'lewIcon', iconUrl: 'ikony/lew.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'ursonamerykanskiIcon', iconUrl: 'ikony/urson.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'bizonlesnyIcon', iconUrl: 'ikony/bizon.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'makakjaponskiIcon', iconUrl: 'ikony/maka.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'pelikanrozowyIcon', iconUrl: 'ikony/pelikan.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'pelikankedzierzawyIcon', iconUrl: 'ikony/pelikankędz.svg', iconSize: [45, 45], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'puchoczubIcon', iconUrl: 'ikony/puchoczub.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kacykochrowyIcon', iconUrl: 'ikony/kacyk.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'karaczanolbrzymiIcon', iconUrl: 'ikony/karaczan.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'karaczanmadagaskarskiIcon', iconUrl: 'ikony/karaczanmadagaskar.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'straszykolbrzymiIcon', iconUrl: 'ikony/straszyk.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'patyczakistraszykiIcon', iconUrl: null, iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'zukafrykanskiIcon', iconUrl: 'ikony/zukafryka.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'lisciecIcon', iconUrl: 'ikony/liściec.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'modliszkapatyczakowataIcon', iconUrl: 'ikony/modliszkapatyk.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'szaranczafioletowaIcon', iconUrl: 'ikony/szaranczafiolet.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'skorpionIcon', iconUrl: 'ikony/skorpion.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'pajakptasznikIcon', iconUrl: 'ikony/ptasznik.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'ptasznikczerwonokolanowyIcon', iconUrl: 'ikony/ptasznikczerwony.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'wijeIcon', iconUrl: 'ikony/wij.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kolczakseszelskiIcon', iconUrl: 'ikony/kolczak.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'modliszkalisciogowaIcon', iconUrl: 'ikony/modliszkaliść.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'modliszkaIcon', iconUrl: 'ikony/modliszka.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'slimakolbrzymiIcon', iconUrl: 'ikony/ślmiakolbrz.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'pachnicadebowaIcon', iconUrl: 'ikony/pachnica.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kruszczyceIcon', iconUrl: 'ikony/kruszczyce.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'pawindyjskiIcon', iconUrl: 'ikony/paw.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'uszyksiwyIcon', iconUrl: 'ikony/uszak.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'zurawbiaoszyiIcon', iconUrl: 'ikony/żuraw.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'puszczyjuralskiIcon', iconUrl: 'ikony/puszyczykural.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'puszczykmszarnyIcon', iconUrl: 'ikony/puszyczykmszarny.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'zubreuropejskiIcon', iconUrl: 'ikony/żubr.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'bielikolbrzymiIcon', iconUrl: 'ikony/bielikolbrz.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'bielikamerykanskiIcon', iconUrl: 'ikony/bielikameryk.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kondorwielkiIcon', iconUrl: 'ikony/kondor.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'bielikIcon', iconUrl: 'ikony/bielik.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'puchaczIcon', iconUrl: 'ikony/puchacz.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'pustukazwyczajnaIcon', iconUrl: 'ikony/pustułka.svg', iconSize: [45, 45], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'syczkizimowiskoIcon', iconUrl: 'ikony/syczek.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'karakarafalklandzkaIcon', iconUrl: 'ikony/karakara.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'zbikeuropejskiIcon', iconUrl: 'ikony/żbik.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'manulIcon', iconUrl: 'ikony/manul.svg', iconSize: [55, 55], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'surykatkaIcon', iconUrl: 'ikony/surykatka.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kotekamurskiIcon', iconUrl: 'ikony/kotamurski.svg', iconSize: [45, 45], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'badylarkapospolitaIcon', iconUrl: 'ikony/badylarka.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'nornikwschodniIcon', iconUrl: 'ikony/nornikwschodni.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'myszkarowataIcon', iconUrl: 'ikony/myszkarłowata.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'myszakkaktusowyIcon', iconUrl: 'ikony/myszkaktus.svg', iconSize: [55, 55], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'suwakmongolskiIcon', iconUrl: 'ikony/suwakmongol.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kolomyszarabskaIcon', iconUrl: 'ikony/kolcomysz.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'myszoskoczokazayIcon', iconUrl: 'ikony/myszoskocz.svg', iconSize: [45, 45], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kururoniebieskawyIcon', iconUrl: 'ikony/kururo.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'karakalstepowyIcon', iconUrl: 'ikony/karakal.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'jaugarundiIcon', iconUrl: 'ikony/jaguarundi.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'otocjonwielkouchyIcon', iconUrl: 'ikony/otocjon.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'binturongorientalnyIcon', iconUrl: 'ikony/binturong.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'zanetatygrysiaIcon', iconUrl: 'ikony/żaneta.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'mangustakarowataIcon', iconUrl: 'ikony/mangusta.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'asicasyberyjskaIcon', iconUrl: 'ikony/lasicasyberysjka.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'takinzotyIcon', iconUrl: 'ikony/takin.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'ocelotnadrzewnyIcon', iconUrl: 'ikony/ocelot.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'nandiniapalmowaIcon', iconUrl: 'ikony/nandinia.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'gerezabiaobrodaIcon', iconUrl: 'ikony/gereza.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'koziorozecnubijskiIcon', iconUrl: 'ikony/koziorozec.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'pandkarudaIcon', iconUrl: 'ikony/pandkaruda.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'nilgauindyjskiIcon', iconUrl: 'ikony/nilgau.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'antylopowiecszablorogiIcon', iconUrl: 'ikony/atylopoweic.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'wydraeuropejskaIcon', iconUrl: 'ikony/wydraeuropejska.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'nosorozecbiayIcon', iconUrl: 'ikony/nosorozecbialy.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'ryseuropejskiIcon', iconUrl: 'ikony/rys.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'miluchinskiIcon', iconUrl: 'ikony/milu.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'sitatungasawannowaIcon', iconUrl: 'ikony/sitatunga.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'jelenwietnamskiIcon', iconUrl: 'ikony/jelenwietnamski.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'dzioborozecbiaodziobyIcon', iconUrl: 'ikony/dzioborożec.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'sambarsundajskiIcon', iconUrl: 'ikony/sambar.svg', iconSize: [55, 55], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'jezatkaafrykanskaIcon', iconUrl: 'ikony/jezatka.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'lorimayIcon', iconUrl: 'ikony/lori.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kanczylmniejszyIcon', iconUrl: 'ikony/kanczyl.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kitankalisiaIcon', iconUrl: 'ikony/kitanka.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'rudawkanilowaIcon', iconUrl: 'ikony/rudawka nilowa.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kinkazuIcon', iconUrl: 'ikony/kinkażu.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'galagosenegalskiIcon', iconUrl: 'ikony/galago.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kanguroszczurnikpedzloogonowyIcon', iconUrl: 'ikony/kanguroszczurnik.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'liscionosmniejszyIcon', iconUrl: 'ikony/liscionos.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'wosopuklerznikkosmatyIcon', iconUrl: 'ikony/wlosopuklerznik.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'nietoperzwampirIcon', iconUrl: 'ikony/nietoperzwampir.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kowariIcon', iconUrl: 'ikony/kowari.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'akrobatkakarliczaIcon', iconUrl: 'ikony/akrobatka.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'antylopaindyjskaIcon', iconUrl: 'ikony/jelenindyjski.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'emuzwyczajneIcon', iconUrl: 'ikony/emuzywczajne.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kazuarhemiastyIcon', iconUrl: 'ikony/kazuar.svg', iconSize: [45, 45], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'aksisbaweanskiIcon', iconUrl: 'ikony/aksis.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kangurolbrzymiIcon', iconUrl: 'ikony/kangur.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'jelenalfredaIcon', iconUrl: 'ikony/jelenafreda.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'swiniawisajskaIcon', iconUrl: 'ikony/swiniawisajska.svg', iconSize: [30, 30], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'uszaksiwyIcon', iconUrl: 'ikony/uszak.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'ptasiagrypazwierzetaschowaneIcon', iconUrl: null, iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kisciecsrebrzystyIcon', iconUrl: 'ikony/kisciecsrebny.svg', iconSize: [60, 60], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'tragopansatyrIcon', iconUrl: 'ikony/tragopan.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kisciecannamskiIcon', iconUrl: 'ikony/kisciecannamski.svg', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'ekspozycjanieczynnaIcon', iconUrl: null, iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'papuzkanimfaIcon', iconUrl: 'ikony/nimfa.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'papuzkafalistaIcon', iconUrl: 'ikony/papugafalista.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kozakarowataIcon', iconUrl: 'ikony/koza.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'alpakaIcon', iconUrl: 'ikony/alpaka.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'osiodomowyIcon', iconUrl: 'ikony/osiol.svg', iconSize: [50, 50], iconAnchor: [20, 40], popupAnchor: [0, -40] },
  { name: 'kucszetlandzkiIcon', iconUrl: 'ikony/kuc.svg', iconSize: [55, 55], iconAnchor: [20, 40], popupAnchor: [0, -40] }
];

// ▪️ Automatyczne tworzenie ikon z tablicy definicji
const icons = {};
iconDefinitions.forEach(function(def) {
  var config = {
    iconSize: def.iconSize,
    iconAnchor: def.iconAnchor,
    popupAnchor: def.popupAnchor
  };
  if (def.iconUrl) {
    config.iconUrl = def.iconUrl;
  }
  icons[def.name] = L.icon(config);
});

// ▪️ Przypisanie ikon do zmiennych globalnych dla kompatybilności wstecznej
//    (pozostawiono `var`, aby wystawić je w zasięgu globalnym tak jak w starszej wersji kodu)
var kolejkaIcon = icons.kolejkaIcon;
var busIcon = icons.busIcon;
var dyrIcon = icons.dyrIcon;
var fortIcon = icons.fortIcon;
var miceIcon = icons.miceIcon;
var bugIcon = icons.bugIcon;
var batIcon = icons.batIcon;
var parkIcon = icons.parkIcon;
var restIcon = icons.restIcon;
var iceIcon = icons.iceIcon;
var ToiletIcon = icons.ToiletIcon;
var pustypingwinyIcon = icons.pustypingwinyIcon;
var papugipatagonskaIcon = icons.papugipatagonskaIcon;
var pawilonzwierzatnocnychIcon = icons.pawilonzwierzatnocnychIcon;
var leniuchowiecdwupalczastyIcon = icons.leniuchowiecdwupalczastyIcon;
var bolitapoudniowaIcon = icons.bolitapoudniowaIcon;
var lemurczerwonobrzuchyIcon = icons.lemurczerwonobrzuchyIcon;
var lispolarnyIcon = icons.lispolarnyIcon;
var lemurkattaIcon = icons.lemurkattaIcon;
var warirudyIcon = icons.warirudyIcon;
var orosepbrodatyIcon = icons.orosepbrodatyIcon;
var flamingibrakIcon = icons.flamingibrakIcon;
var strusIcon = icons.strusIcon;
var zebrapregowanaIcon = icons.zebrapregowanaIcon;
var gnubrunatneIcon = icons.gnubrunatneIcon;
var kobsniadyIcon = icons.kobsniadyIcon;
var adamapustynnyIcon = icons.adamapustynnyIcon;
var nanduszareIcon = icons.nanduszareIcon;
var kapibarawielkaIcon = icons.kapibarawielkaIcon;
var tapirantaIcon = icons.tapirantaIcon;
var wikuniaandyjskaIcon = icons.wikuniaandyjskaIcon;
var marapatagonskaIcon = icons.marapatagonskaIcon;
var czepiakczarnorekiIcon = icons.czepiakczarnorekiIcon;
var ostronosbiaonosyIcon = icons.ostronosbiaonosyIcon;
var niedzwiedzbrunatnyIcon = icons.niedzwiedzbrunatnyIcon;
var wilkszaryIcon = icons.wilkszaryIcon;
var tygryssyberyjskiIcon = icons.tygryssyberyjskiIcon;
var sonafrykanskiIcon = icons.sonafrykanskiIcon;
var sonindyjskiIcon = icons.sonindyjskiIcon;
var nosorozecczarnyIcon = icons.nosorozecczarnyIcon;
var zyrafaponocaIcon = icons.zyrafaponocaIcon;
var susemoregowanyIcon = icons.susemoregowanyIcon;
var orykspoudniowyIcon = icons.orykspoudniowyIcon;
var tamanduapoludniowaIcon = icons.tamanduapoludniowaIcon;
var mrowkojadwielkiIcon = icons.mrowkojadwielkiIcon;
var wielbaddwugarbnyIcon = icons.wielbaddwugarbnyIcon;
var lewIcon = icons.lewIcon;
var ursonamerykanskiIcon = icons.ursonamerykanskiIcon;
var bizonlesnyIcon = icons.bizonlesnyIcon;
var makakjaponskiIcon = icons.makakjaponskiIcon;
var pelikanrozowyIcon = icons.pelikanrozowyIcon;
var pelikankedzierzawyIcon = icons.pelikankedzierzawyIcon;
var puchoczubIcon = icons.puchoczubIcon;
var kacykochrowyIcon = icons.kacykochrowyIcon;
var karaczanolbrzymiIcon = icons.karaczanolbrzymiIcon;
var karaczanmadagaskarskiIcon = icons.karaczanmadagaskarskiIcon;
var straszykolbrzymiIcon = icons.straszykolbrzymiIcon;
var patyczakistraszykiIcon = icons.patyczakistraszykiIcon;
var zukafrykanskiIcon = icons.zukafrykanskiIcon;
var lisciecIcon = icons.lisciecIcon;
var modliszkapatyczakowataIcon = icons.modliszkapatyczakowataIcon;
var szaranczafioletowaIcon = icons.szaranczafioletowaIcon;
var skorpionIcon = icons.skorpionIcon;
var pajakptasznikIcon = icons.pajakptasznikIcon;
var ptasznikczerwonokolanowyIcon = icons.ptasznikczerwonokolanowyIcon;
var wijeIcon = icons.wijeIcon;
var kolczakseszelskiIcon = icons.kolczakseszelskiIcon;
var modliszkalisciogowaIcon = icons.modliszkalisciogowaIcon;
var modliszkaIcon = icons.modliszkaIcon;
var slimakolbrzymiIcon = icons.slimakolbrzymiIcon;
var pachnicadebowaIcon = icons.pachnicadebowaIcon;
var kruszczyceIcon = icons.kruszczyceIcon;
var pawindyjskiIcon = icons.pawindyjskiIcon;
var uszyksiwyIcon = icons.uszyksiwyIcon;
var zurawbiaoszyiIcon = icons.zurawbiaoszyiIcon;
var puszczyjuralskiIcon = icons.puszczyjuralskiIcon;
var puszczykmszarnyIcon = icons.puszczykmszarnyIcon;
var zubreuropejskiIcon = icons.zubreuropejskiIcon;
var bielikolbrzymiIcon = icons.bielikolbrzymiIcon;
var bielikamerykanskiIcon = icons.bielikamerykanskiIcon;
var kondorwielkiIcon = icons.kondorwielkiIcon;
var bielikIcon = icons.bielikIcon;
var puchaczIcon = icons.puchaczIcon;
var pustukazwyczajnaIcon = icons.pustukazwyczajnaIcon;
var syczkizimowiskoIcon = icons.syczkizimowiskoIcon;
var karakarafalklandzkaIcon = icons.karakarafalklandzkaIcon;
var zbikeuropejskiIcon = icons.zbikeuropejskiIcon;
var manulIcon = icons.manulIcon;
var surykatkaIcon = icons.surykatkaIcon;
var kotekamurskiIcon = icons.kotekamurskiIcon;
var badylarkapospolitaIcon = icons.badylarkapospolitaIcon;
var nornikwschodniIcon = icons.nornikwschodniIcon;
var myszkarowataIcon = icons.myszkarowataIcon;
var myszakkaktusowyIcon = icons.myszakkaktusowyIcon;
var suwakmongolskiIcon = icons.suwakmongolskiIcon;
var kolomyszarabskaIcon = icons.kolomyszarabskaIcon;
var myszoskoczokazayIcon = icons.myszoskoczokazayIcon;
var kururoniebieskawyIcon = icons.kururoniebieskawyIcon;
var karakalstepowyIcon = icons.karakalstepowyIcon;
var jaugarundiIcon = icons.jaugarundiIcon;
var otocjonwielkouchyIcon = icons.otocjonwielkouchyIcon;
var binturongorientalnyIcon = icons.binturongorientalnyIcon;
var zanetatygrysiaIcon = icons.zanetatygrysiaIcon;
var mangustakarowataIcon = icons.mangustakarowataIcon;
var asicasyberyjskaIcon = icons.asicasyberyjskaIcon;
var takinzotyIcon = icons.takinzotyIcon;
var ocelotnadrzewnyIcon = icons.ocelotnadrzewnyIcon;
var nandiniapalmowaIcon = icons.nandiniapalmowaIcon;
var gerezabiaobrodaIcon = icons.gerezabiaobrodaIcon;
var koziorozecnubijskiIcon = icons.koziorozecnubijskiIcon;
var pandkarudaIcon = icons.pandkarudaIcon;
var nilgauindyjskiIcon = icons.nilgauindyjskiIcon;
var antylopowiecszablorogiIcon = icons.antylopowiecszablorogiIcon;
var wydraeuropejskaIcon = icons.wydraeuropejskaIcon;
var nosorozecbiayIcon = icons.nosorozecbiayIcon;
var ryseuropejskiIcon = icons.ryseuropejskiIcon;
var miluchinskiIcon = icons.miluchinskiIcon;
var sitatungasawannowaIcon = icons.sitatungasawannowaIcon;
var jelenwietnamskiIcon = icons.jelenwietnamskiIcon;
var dzioborozecbiaodziobyIcon = icons.dzioborozecbiaodziobyIcon;
var sambarsundajskiIcon = icons.sambarsundajskiIcon;
var jezatkaafrykanskaIcon = icons.jezatkaafrykanskaIcon;
var lorimayIcon = icons.lorimayIcon;
var kanczylmniejszyIcon = icons.kanczylmniejszyIcon;
var kitankalisiaIcon = icons.kitankalisiaIcon;
var rudawkanilowaIcon = icons.rudawkanilowaIcon;
var kinkazuIcon = icons.kinkazuIcon;
var galagosenegalskiIcon = icons.galagosenegalskiIcon;
var kanguroszczurnikpedzloogonowyIcon = icons.kanguroszczurnikpedzloogonowyIcon;
var liscionosmniejszyIcon = icons.liscionosmniejszyIcon;
var wosopuklerznikkosmatyIcon = icons.wosopuklerznikkosmatyIcon;
var nietoperzwampirIcon = icons.nietoperzwampirIcon;
var kowariIcon = icons.kowariIcon;
var akrobatkakarliczaIcon = icons.akrobatkakarliczaIcon;
var antylopaindyjskaIcon = icons.antylopaindyjskaIcon;
var emuzwyczajneIcon = icons.emuzwyczajneIcon;
var kazuarhemiastyIcon = icons.kazuarhemiastyIcon;
var aksisbaweanskiIcon = icons.aksisbaweanskiIcon;
var kangurolbrzymiIcon = icons.kangurolbrzymiIcon;
var jelenalfredaIcon = icons.jelenalfredaIcon;
var swiniawisajskaIcon = icons.swiniawisajskaIcon;
var uszaksiwyIcon = icons.uszaksiwyIcon;
var ptasiagrypazwierzetaschowaneIcon = icons.ptasiagrypazwierzetaschowaneIcon;
var kisciecsrebrzystyIcon = icons.kisciecsrebrzystyIcon;
var tragopansatyrIcon = icons.tragopansatyrIcon;
var kisciecannamskiIcon = icons.kisciecannamskiIcon;
var ekspozycjanieczynnaIcon = icons.ekspozycjanieczynnaIcon;
var papuzkanimfaIcon = icons.papuzkanimfaIcon;
var papuzkafalistaIcon = icons.papuzkafalistaIcon;
var kozakarowataIcon = icons.kozakarowataIcon;
var alpakaIcon = icons.alpakaIcon;
var osiodomowyIcon = icons.osiodomowyIcon;
var kucszetlandzkiIcon = icons.kucszetlandzkiIcon;

// ============================================================================
// 10. Inicjalizacja warstw punktowych (zwierzęta, toalety, gastronomia, obiekty)
// ============================================================================
showAnimal("Pawilon zwierząt nocnych", batIcon,18, 14, 19);
showAnimal("Małe gryzonie", miceIcon,18, 14, 19);
showAnimal("Insektarium", bugIcon, 18, 14, 19);
showAnimal("Żubr europejski", zubreuropejskiIcon);
showAnimal("Pusty - pingwiny", pustypingwinyIcon);
showAnimal("Papugi patagońska", papugipatagonskaIcon);
showAnimal("Pawilon zwierząt nocnych", pawilonzwierzatnocnychIcon);
showAnimal("Leniuchowiec dwupalczasty", leniuchowiecdwupalczastyIcon);
showAnimal("Bolita południowa", bolitapoudniowaIcon);
showAnimal("Lemur czerwonobrzuchy", lemurczerwonobrzuchyIcon);
showAnimal("Lis polarny", lispolarnyIcon);
showAnimal("Lemur katta", lemurkattaIcon);
showAnimal("Wari rudy", warirudyIcon);
showAnimal("Orłosęp brodaty", orosepbrodatyIcon);
showAnimal("Flamingi - brak", flamingibrakIcon);
showAnimal("Struś", strusIcon);
showAnimal("Zebra pręgowana", zebrapregowanaIcon);
showAnimal("Gnu brunatne", gnubrunatneIcon);
showAnimal("Kob śniady", kobsniadyIcon);
showAnimal("Adama pustynny", adamapustynnyIcon);
showAnimal("Nandu szare", nanduszareIcon);
showAnimal("Kapibara wielka", kapibarawielkaIcon);
showAnimal("Tapir anta", tapirantaIcon);
showAnimal("Wikunia andyjska", wikuniaandyjskaIcon);
showAnimal("Mara patagońska", marapatagonskaIcon);
showAnimal("Czepiak czarnoręki", czepiakczarnorekiIcon);
showAnimal("Ostronos białonosy", ostronosbiaonosyIcon);
showAnimal("Niedźwiedź brunatny", niedzwiedzbrunatnyIcon);
showAnimal("Wilk szary", wilkszaryIcon);
showAnimal("Tygrys syberyjski", tygryssyberyjskiIcon);
showAnimal("Słoń afrykański", sonafrykanskiIcon);
showAnimal("Słoń indyjski", sonindyjskiIcon);
showAnimal("Nosorożec czarny", nosorozecczarnyIcon);
showAnimal("Żyrafa północa", zyrafaponocaIcon);
showAnimal("Suseł moręgowany", susemoregowanyIcon);
showAnimal("Oryks południowy", orykspoudniowyIcon);
showAnimal("Tamandua poludniowa", tamanduapoludniowaIcon);
showAnimal("Mrówkojad wielki", mrowkojadwielkiIcon);
showAnimal("Wielbłąd dwugarbny", wielbaddwugarbnyIcon);
showAnimal("Lew", lewIcon);
showAnimal("Urson amerykański", ursonamerykanskiIcon);
showAnimal("Bizon leśny", bizonlesnyIcon);
showAnimal("Makak japoński", makakjaponskiIcon);
showAnimal("Pelikan różowy", pelikanrozowyIcon);
showAnimal("Pelikan kędzierzawy", pelikankedzierzawyIcon);
showAnimal("Puchoczub", puchoczubIcon);
showAnimal("Kacyk ochrowy", kacykochrowyIcon);
showAnimal("Karaczan olbrzymi", karaczanolbrzymiIcon, 21, 20, 23);
showAnimal("Karaczan madagaskarski", karaczanmadagaskarskiIcon, 21, 20, 23);
showAnimal("Straszyk olbrzymi", straszykolbrzymiIcon, 21, 20, 23);
showAnimal("Żuk afrykański", zukafrykanskiIcon, 21, 20, 23);
showAnimal("Liściec", lisciecIcon, 21, 20, 23);
showAnimal("Modliszka patyczakowata", modliszkapatyczakowataIcon, 20, 20, 23);
showAnimal("Szarańcza fioletowa", szaranczafioletowaIcon, 21, 20, 23);
showAnimal("Skorpion", skorpionIcon, 21, 20, 23);
showAnimal("Pająk ptasznik", pajakptasznikIcon, 21, 20, 23);
showAnimal("Ptasznik czerwonokolanowy", ptasznikczerwonokolanowyIcon, 21, 20, 23);
showAnimal("Wije", wijeIcon, 21, 20, 23);
showAnimal("Kolczak seszelski", kolczakseszelskiIcon, 21, 20, 23);
showAnimal("Modliszka liściogłowa", modliszkalisciogowaIcon, 21, 20, 23);
showAnimal("Modliszka", modliszkaIcon, 21, 20, 23);
showAnimal("Ślimak olbrzymi", slimakolbrzymiIcon, 21, 20,23);
showAnimal("Pachnica dębowa", pachnicadebowaIcon, 21, 20, 23);
showAnimal("Kruszczyce", kruszczyceIcon, 21, 20);
showAnimal("Paw indyjski", pawindyjskiIcon);
showAnimal("Żuraw białoszyi", zurawbiaoszyiIcon);
showAnimal("Puszczyj uralski", puszczyjuralskiIcon);
showAnimal("Puszczyk mszarny", puszczykmszarnyIcon);
showAnimal("Bielik olbrzymi", bielikolbrzymiIcon);
showAnimal("Bielik amerykański", bielikamerykanskiIcon);
showAnimal("Kondor wielki", kondorwielkiIcon);
showAnimal("Bielik", bielikIcon);
showAnimal("Puchacz", puchaczIcon);
showAnimal("Pustułka zwyczajna", pustukazwyczajnaIcon);
showAnimal("Syczki - zimowisko", syczkizimowiskoIcon);
showAnimal("Karakara falklandzka", karakarafalklandzkaIcon);
showAnimal("Żbik europejski", zbikeuropejskiIcon);
showAnimal("Manul", manulIcon);
showAnimal("Surykatka", surykatkaIcon);
showAnimal("Kotek amurski", kotekamurskiIcon);
showAnimal("Badylarka pospolita", badylarkapospolitaIcon, 21, 20, 23);
showAnimal("Nornik wschodni", nornikwschodniIcon, 21, 20, 23);
showAnimal("Mysz karłowata", myszkarowataIcon, 21, 20, 23);
showAnimal("Myszak kaktusowy", myszakkaktusowyIcon, 21, 20, 23);
showAnimal("Suwak mongolski", suwakmongolskiIcon, 21, 20, 23);
showAnimal("Kolomysz arabska", kolomyszarabskaIcon, 21, 20, 23);
showAnimal("Myszoskocz okazały", myszoskoczokazayIcon, 21, 20, 23);
showAnimal("Kururo niebieskawy", kururoniebieskawyIcon, 21, 20, 23);
showAnimal("Karakal stepowy", karakalstepowyIcon);
showAnimal("Jaugarundi", jaugarundiIcon);
showAnimal("Otocjon wielkouchy", otocjonwielkouchyIcon);
showAnimal("Binturong orientalny", binturongorientalnyIcon);
showAnimal("Żaneta tygrysia", zanetatygrysiaIcon);
showAnimal("Mangusta karłowata", mangustakarowataIcon);
showAnimal("Łasica syberyjska", asicasyberyjskaIcon);
showAnimal("Takin złoty", takinzotyIcon);
showAnimal("Ocelot nadrzewny", ocelotnadrzewnyIcon);
showAnimal("Nandinia palmowa", nandiniapalmowaIcon);
showAnimal("Gereza białobroda", gerezabiaobrodaIcon);
showAnimal("Koziorożec nubijski", koziorozecnubijskiIcon);
showAnimal("Pandka ruda", pandkarudaIcon);
showAnimal("Nilgau indyjski", nilgauindyjskiIcon);
showAnimal("Antylopowiec szablorogi", antylopowiecszablorogiIcon);
showAnimal("Wydra europejska", wydraeuropejskaIcon);
showAnimal("Nosorożec biały", nosorozecbiayIcon);
showAnimal("Rys europejski", ryseuropejskiIcon);
showAnimal("Milu chiński", miluchinskiIcon);
showAnimal("Sitatunga sawannowa", sitatungasawannowaIcon);
showAnimal("Jeleń wietnamski", jelenwietnamskiIcon);
showAnimal("Dzioborożec białodzioby", dzioborozecbiaodziobyIcon);
showAnimal("Sambar sundajski", sambarsundajskiIcon);
showAnimal("Jeżatka afrykańska", jezatkaafrykanskaIcon, 21, 20);
showAnimal("Lori mały", lorimayIcon, 21, 20);
showAnimal("Kanczyl mniejszy", kanczylmniejszyIcon, 21, 20);
showAnimal("Kitanka lisia", kitankalisiaIcon, 21, 20);
showAnimal("Rudawka nilowa", rudawkanilowaIcon, 21, 20);
showAnimal("Kinkażu", kinkazuIcon, 21, 20);
showAnimal("Galago senegalski", galagosenegalskiIcon, 21, 20);
showAnimal("Kanguroszczurnik pędzloogonowy", kanguroszczurnikpedzloogonowyIcon, 21, 20);
showAnimal("Liścionos mniejszy", liscionosmniejszyIcon, 21, 20);
showAnimal("Włosopuklerznik kosmaty", wosopuklerznikkosmatyIcon, 21, 20);
showAnimal("Nietoperz wampir", nietoperzwampirIcon, 21, 20);
showAnimal("Kowari", kowariIcon, 21, 20);
showAnimal("Akrobatka karlicza", akrobatkakarliczaIcon, 21, 20);
showAnimal("Antylopa indyjska", antylopaindyjskaIcon);
showAnimal("Emu zwyczajne", emuzwyczajneIcon);
showAnimal("Kazuar hełmiasty", kazuarhemiastyIcon);
showAnimal("Aksis baweański", aksisbaweanskiIcon);
showAnimal("Kangur olbrzymi", kangurolbrzymiIcon);
showAnimal("Jeleń Alfreda", jelenalfredaIcon);
showAnimal("Świnia wisajska", swiniawisajskaIcon);
showAnimal("Uszak siwy", uszaksiwyIcon);
showAnimal("Ptasia grypa zwierzęta schowane", ptasiagrypazwierzetaschowaneIcon);
showAnimal("Kiściec srebrzysty", kisciecsrebrzystyIcon);
showAnimal("Tragopan satyr", tragopansatyrIcon);
showAnimal("Kiściec annamski", kisciecannamskiIcon);
showAnimal("Ekspozycja nieczynna", ekspozycjanieczynnaIcon);
showAnimal("Papużka nimfa", papuzkanimfaIcon);
showAnimal("Papużka falista", papuzkafalistaIcon);
showAnimal("Koza karłowata", kozakarowataIcon);
showAnimal("Alpaka", alpakaIcon);
showAnimal("Osioł domowy", osiodomowyIcon);
showAnimal("Kuc szetlandzki", kucszetlandzkiIcon);
showToilet(27, ToiletIcon);
showToilet(36, ToiletIcon);
showToilet(39, ToiletIcon);
showToilet(43, ToiletIcon);
showToilet(84, ToiletIcon);
showToilet(128, ToiletIcon);
showToilet(163, ToiletIcon);
showRestaurant(11, restIcon);
showRestaurant(18, iceIcon);
showRestaurant(19, restIcon);
showRestaurant(32, restIcon);
showRestaurant(33, iceIcon);
showRestaurant(37, restIcon);
showRestaurant(38, iceIcon);
showRestaurant(41, restIcon);
showRestaurant(53, restIcon);
showRestaurant(56, iceIcon);
showRestaurant(83, iceIcon);
showAnimal("Zoolandia - Park linowy", parkIcon)
showRestaurant(133, iceIcon);
showRestaurant(162, restIcon);
showRestaurant(127, restIcon);
showObjects(7, dyrIcon);
showObjects(1, fortIcon);
showObjects(3, busIcon);
showObjects(4, busIcon);
showObjects(5, busIcon);
showObjects(6, busIcon);
showObjects(2, busIcon);
showObjects(8, kolejkaIcon);
