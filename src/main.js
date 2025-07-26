import './style.css'
import './modal.css'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { point as turfPoint, booleanPointInPolygon } from '@turf/turf';
import Alpine from 'alpinejs';
import poligonos from './data/poligonos.json'

// window.Alpine = Alpine;

Alpine.start();

let geoLayer = null;

const bairros = new Set();

for (const feature of poligonos.features) {
  bairros.add(feature.properties.localidade);
}

const seletorBairros = document.getElementById('bairros');

for (const bairro of bairros) {
  const option = document.createElement('option');
  option.value = bairro;
  option.textContent = bairro;
  seletorBairros.appendChild(option);
}

const onChangeSeletorBairros = (event) => {
  const bairroSelecionado = event.target.value;

  // agora, para cada polígono, checar se o ponto está dentro do seu bounds
  geoLayer.eachLayer(layer => {
    const feature = layer.feature;
    const nomeBairro = feature.properties.localidade;

    if (nomeBairro === bairroSelecionado) {
      // se o nome do bairro for igual ao selecionado, destacar
      layer.setStyle({ color: 'red' });
      map.flyToBounds(layer.getBounds(), {
        padding: [150, 150],
      });
    } else {
      // caso contrário, resetar o estilo
      geoLayer.resetStyle(layer);
    }
  });
}

// inicializa o mapa
const map = L.map('map').setView([-21.861884, -47.4787214], 12);

// adiciona um tile layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
}).addTo(map);

// adiciona ao mapa
geoLayer = L.geoJSON(poligonos, {
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

  // reseta o seletor de bairros
  seletorBairros.value = '';

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

seletorBairros.addEventListener('change', onChangeSeletorBairros);
