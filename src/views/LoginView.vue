<template>
  <v-container fluid class="fill-height pa-0">
    <v-row no-gutters class="fill-height">
      <!-- Mitad izquierda -->
      <v-col cols="12" md="8" class="d-flex align-center justify-center text-white left-side">
        <div class="text-center text-primary">
          <h1 class="text-h3 font-weight-bold">VSAD TAJO</h1>
          <h1 class="text-h3 font-weight-bold">Bienvenido</h1>
        </div>
      </v-col>

      <!-- Mitad derecha (login) -->
      <v-col cols="12" md="4" class="d-flex align-center justify-center bg-primary">
        <v-card flat class="pa-4" min-width="500" max-width="800">
          <v-card-title class="text-h5">Iniciar sesión</v-card-title>
          <v-card-text>
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

              <v-btn type="submit" color="primary" block class="mt-6" @click="login">Entrar</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import router from '@/router'
  import { ref } from 'vue'

  const email = ref('')
  const password = ref('')

  function login() {
    localStorage.setItem('auth', 'true')
    router.push('/')
  }
</script>

<style scoped>
  .left-side {
    background-image: url('');
    background-size: cover;
    background-position: center;
  }
</style>
