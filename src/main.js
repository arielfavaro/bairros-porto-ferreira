import './style.css'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { point as turfPoint, booleanPointInPolygon } from '@turf/turf';

// inicializa o mapa
const map = L.map('map').setView([-23.5505, -46.6333], 12);
// aqui, view inicial em São Paulo; ajuste conforme seus dados

// adiciona um tile layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
}).addTo(map);

// carrega o GeoJSON
fetch('/poligonos.geojson')
  .then(res => {
    if (!res.ok) throw new Error('Falha ao carregar GeoJSON');
    return res.json();
  })
  .then(geojson => {
    // adiciona ao mapa
    const geoLayer = L.geoJSON(geojson, {
      style: feature => ({
        color: '#3388ff',
        weight: 2,
        fillOpacity: 0.3
      }),
      onEachFeature: (feature, layer) => {
        // popup opcional com propriedades
        // if (feature.properties && feature.properties.localidade) {
        //   layer.bindPopup(feature.properties.localidade);
        // }
      }
    }).addTo(map);

    // ajusta o mapa para o bounds do GeoJSON
    map.fitBounds(geoLayer.getBounds());

    // adiciona o listener de clique no mapa
    map.on('click', e => {
      const clickedLocalidades = [];

      // ponto GeoJSON para o Turf (lng, lat)
      const pontoClicado = turfPoint([e.latlng.lng, e.latlng.lat]);

      // Resetar estilo de todos os polígonos
      geoLayer.eachLayer(layer => {
        geoLayer.resetStyle(layer);
      });

      // agora, para cada polígono, checar se o ponto está dentro do seu bounds
      geoLayer.eachLayer(layer => {
        const feature = layer.feature;
        if (booleanPointInPolygon(pontoClicado, feature)) {
          layer.setStyle({ color: 'red' });
          const loc = feature.properties.localidade;
          if (loc != null) clickedLocalidades.push(loc);
        }
      });

      // se encontrou algum, mostra popup
      if (clickedLocalidades.length) {
        L.popup({ maxWidth: 300 })
          .setLatLng(e.latlng)
          .setContent(
            `<strong>Bairros:</strong><br><br>` +
            clickedLocalidades.join('<br>')
          )
          .openOn(map);
      }
    });

  })
  .catch(err => console.error(err));
