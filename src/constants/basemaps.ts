export const basemapsLayers = [
  {
    id: '2',
    name: 'Open Street Map',
    preview: 'https://tile.openstreetmap.org/10/511/340.png',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  {
    id: '3',
    name: 'Satélite',
    preview:
      'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/10/340/511',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  {
    id: '4',
    name: 'Modo Oscuro',
    preview: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/10/511/340.png',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png',
    attribution: '&copy; Stadia Maps',
  },
]
