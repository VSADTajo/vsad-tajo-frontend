<template>
  <v-navigation-drawer
    :model-value="drawerOpen"
    location="right"
    :width="drawerWidth"
    transition="slide-x-reverse-transition"
    :scrim="true"
    temporary
    @update:model-value="onDrawerUpdate"
  >
    <template v-if="selectedFeatureId">
      <right-content-card />
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { useFeatureSelection } from '@/stores/features'
  import RightContentCard from './RightContentCard.vue'

  const route = useRoute()
  const router = useRouter()

  const { mdAndUp } = useDisplay()

  const featureStore = useFeatureSelection()

  const selectedFeatureId = computed(() => route.query.station)

  const drawerOpen = computed({
    get: () => !!route.query.station,
    set: (val: boolean) => {
      if (!val) {
        router.replace({
          query: {
            ...route.query,
            station: undefined,
          },
        })
      }
    },
  })

  const onDrawerUpdate = () => {
    if (!featureStore.selected) {
      console.log('PPPPPPPPPPPPPPP')
      router.replace({
        query: {
          ...route.query,
          station: undefined,
        },
      })
    }
  }

  const drawerWidth = computed(() => {
    return mdAndUp.value ? window.innerWidth * 0.8 : window.innerWidth
  })
</script>
