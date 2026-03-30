<template>
  <div ref="mapContainerDetail" class="map-container border-md"></div>
</template>

<script lang="ts" setup>
  import { useBasemap } from '@/composables/useBasemaps'
  import L from 'leaflet'
  import { center, defaultZoom, minZoom } from '@/constants/mapConfig'
  import { onMounted, ref } from 'vue'
  import { createMapPanes } from '@/config/panes/mapPanes'
  import { basemapsLayers } from '@/constants/basemaps'
  import { dynamicLayersConfig } from '@/config/layers.config'
  import { createLayer, getWFSFeatureById } from '@/services/geoserver'
  import { subcuencasStyle, sistemas10Style, zonasexplStyle } from '@/config/styles/layerStyles'
  import { useRoute } from 'vue-router'
  import simplify from '@turf/simplify'
  import { geojsonToWKT } from '@terraformer/wkt'
  import type { WFSLayerConfig } from '@/types/Layers'

  const props = defineProps<{
    type: 'subcuencas' | 'sistemas10' | 'zonasexpl'
  }>()

  const route = useRoute()

  const mapContainerDetail = ref<HTMLElement | null>(null)
  let map: L.Map
  let currentTileLayer: L.TileLayer

  const { selectedBasemap } = useBasemap()

  onMounted(async () => {
    if (!mapContainerDetail.value) return

    map = L.map(mapContainerDetail.value, {
      zoomControl: true,
      minZoom,
    }).setView(center, defaultZoom)

    createMapPanes(map)

    const basemap = basemapsLayers.find((b) => b.id === selectedBasemap.value[0])

    if (basemap) {
      currentTileLayer = L.tileLayer(basemap.url, {
        attribution: basemap.attribution,
      }).addTo(map)
    }

    const configSPolygon = dynamicLayersConfig.find(
      (conf) => conf.id === props.type
    ) as WFSLayerConfig

    const configSAIH = dynamicLayersConfig.find((conf) => conf.id === 'saih')

    if (!configSPolygon) return

    const routeQueryKey =
      props.type === 'subcuencas' ? 'subcuenca' : props.type === 'sistemas10' ? 'sistema' : 'zona'

    const fieldName =
      props.type === 'subcuencas'
        ? 'code'
        : props.type === 'sistemas10'
          ? 'sistema'
          : props.type === 'zonasexpl'
            ? 'ogc_fid'
            : 'code'

    const featurePolygon = await getWFSFeatureById(
      configSPolygon,
      fieldName,
      String(route.query[routeQueryKey])
    )

    if (featurePolygon) {
      let styleOptions: L.PathOptions | undefined
      if (props.type === 'subcuencas') styleOptions = subcuencasStyle.normal
      else if (props.type === 'sistemas10') styleOptions = sistemas10Style.normal
      else if (props.type === 'zonasexpl') styleOptions = zonasexplStyle.normal

      const layer = L.geoJSON(featurePolygon, {
        style: styleOptions,
      })

      map.fitBounds(layer.getBounds())
      layer?.addTo(map)

      const simple = simplify(featurePolygon, {
        tolerance: 0.001,
        highQuality: false,
      })

      const wkt = geojsonToWKT(simple.geometry)

      if (!configSAIH) return

      const saihLayer = await createLayer(configSAIH, {
        CQL_FILTER: `INTERSECTS(geom, ${wkt})`,
      })

      saihLayer?.addTo(map)
    }

    // Resize map
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(mapContainerDetail.value)
  })
</script>

<style lang="scss" scoped>
  .map-container {
    height: 500px;
    width: 100%;
  }
</style>
