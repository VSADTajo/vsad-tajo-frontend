<template>
  <div class="h-100 d-flex flex-column">
    <v-row class="flex-grow-1">
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <h2 class="pl-4 pt-4">Avisos</h2>

        <v-btn icon class="mr-4 mt-4" color="primary" density="comfortable" @click="goBack">
          <v-icon>{{ mdAndUp ? 'mdi-arrow-left' : 'mdi-arrow-down' }}</v-icon>
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup>
  import { useDisplay } from 'vuetify'
  import { useNavigation } from '@/composables/useNavigation'

  const { mdAndUp } = useDisplay()
  const { closeSection } = useNavigation()

  const goBack = () => {
    closeSection()
  }
</script>
