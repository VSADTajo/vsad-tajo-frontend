<template>
  <v-menu location="bottom end" transition="scale-transition">
    <template #activator="{ props }">
      <v-btn v-bind="props" icon variant="text">
        <v-avatar size="36" color="white">
          <v-icon>mdi-account-circle</v-icon>
        </v-avatar>
      </v-btn>
    </template>

    <v-card min-width="260">
      <!-- USER INFO -->
      <v-card-text class="d-flex align-center">
        <v-avatar size="40" class="mr-3">
          <v-icon size="40">mdi-account</v-icon>
        </v-avatar>
        <div>
          <div class="font-weight-bold">{{ userName }}</div>
        </div>
      </v-card-text>

      <v-divider />

      <!-- DARK MODE -->
      <v-list density="compact">
        <v-list-item>
          <template #prepend>
            <v-icon>
              {{ theme === 'dark' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}
            </v-icon>
          </template>

          <v-list-item-title>Modo oscuro</v-list-item-title>

          <template #append>
            <v-switch v-model="isDark" inset hide-details />
          </template>
        </v-list-item>

        <v-divider class="my-2" />

        <!-- LOGOUT -->
        <v-list-item prepend-icon="mdi-logout" title="Cerrar sesión" @click="logout" />
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useStorage } from '@vueuse/core'
  import type { Theme } from '@/types/config'

  const router = useRouter()

  // 🔹 Nombre del usuario (puedes traerlo del login o localStorage)
  const userName = useStorage('userName', 'Usuario')

  // 🔹 Theme (el mismo que usas en App.vue)
  const theme = useStorage<Theme>('theme', 'light')

  const isDark = computed({
    get: () => theme.value === 'dark',
    set: (val: boolean) => {
      theme.value = val ? 'dark' : 'light'
    },
  })

  function logout() {
    localStorage.removeItem('auth')
    router.push('/login')
  }
</script>
