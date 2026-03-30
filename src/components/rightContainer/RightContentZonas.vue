<template>
  <v-card class="pa-4 bg-background" elevation="2">
    <v-progress-linear v-if="loading" indeterminate />

    <template v-if="route.query.zona">
      <v-card-title class="d-flex justify-space-between align-start">
        <div>
          <div class="text-h6 font-weight-bold">
            {{ route.query.zona }}
          </div>
        </div>

        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDrawer" />
      </v-card-title>

      <v-divider class="my-3" />

      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6">
            <MapDetail type="zonasexpl" />
          </v-col>
        </v-row>
      </v-card-text>
    </template>
  </v-card>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import MapDetail from './MapDetail.vue'

  const route = useRoute()
  const router = useRouter()

  const loading = ref(false)

  function closeDrawer() {
    if (!route.query.zona) return

    const query = { ...route.query }
    delete query.zona

    router.replace({ query })
  }
</script>
