<template>
  <v-container fluid class="fill-height pa-0" :style="pageBackgroundStyle">
    <v-row no-gutters class="fill-height">
      <!-- Mitad izquierda -->
      <v-col
        cols="12"
        md="8"
        class="d-flex align-center justify-center text-white left-side"
      ></v-col>

      <!-- Mitad derecha (login) -->
      <v-col cols="12" md="4" class="d-flex align-center justify-end pa-8">
        <v-card flat class="pa-4" min-width="400" max-width="600">
          <v-card-title class="text-h5">Iniciar sesión</v-card-title>
          <v-card-text>
            <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
              {{ error }}
            </v-alert>

            <v-form @submit.prevent="login">
              <v-text-field
                v-model="email"
                label="Correo electrónico"
                type="email"
                required
                variant="outlined"
              ></v-text-field>

              <v-text-field
                v-model="password"
                label="Contraseña"
                type="password"
                required
                variant="outlined"
                class="mt-4"
              ></v-text-field>

              <v-btn
                type="submit"
                color="primary"
                block
                class="mt-6"
                :loading="loading"
                :disabled="!password || !email"
                @click="login"
              >
                Entrar
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
  import router from '@/router'
  import { loginService } from '@/services/auth'
  import { ref } from 'vue'
  import loginBackground from '@/assets/img/portada.png'

  const email = ref('')
  const password = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const pageBackgroundStyle = {
    backgroundImage: `url(${loginBackground})`,
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }

  async function login() {
    error.value = null
    loading.value = true

    try {
      await loginService(email.value, password.value)
      router.push({ name: 'dashboard' })
    } catch (e) {
      error.value = 'Usuario o contraseña incorrectos'
      console.error(e)
    } finally {
      loading.value = false
    }
  }
</script>
