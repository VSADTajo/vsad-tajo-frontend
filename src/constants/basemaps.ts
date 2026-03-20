export const basemapsLayers = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    preview: 'https://tile.openstreetmap.org/10/511/340.png',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  {
    id: 'esri',
    name: 'Satélite',
    preview:
      'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/10/340/511',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  {
    id: 'carto-dark',
    name: 'Oscuro',
    preview: 'https://a.basemaps.cartocdn.com/dark_all/10/511/340.png',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  },
  {
    id: 'carto-light',
    name: 'Claro',
    preview: 'https://a.basemaps.cartocdn.com/light_all/10/511/340.png',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  },
  {
    id: 'wikimedia',
    name: 'Wikimedia',
    preview: 'https://maps.wikimedia.org/osm-intl/10/511/340.png',
    url: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png',
    attribution: '&copy; Wikimedia',
  },
]
