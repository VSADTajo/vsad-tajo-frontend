<template>
  <v-app :theme="theme">
    <router-view />
  </v-app>
</template>

<script setup lang="ts">
  import { useStorage } from '@vueuse/core'
  import { type Theme } from './types/config'

  const theme = useStorage<Theme>('theme', 'light')
</script>
