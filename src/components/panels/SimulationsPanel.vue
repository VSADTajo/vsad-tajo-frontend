<template>
  <div class="d-flex flex-column">
    <v-row class="flex-grow-1">
      <v-col cols="12">
        <h2 class="pl-4 pt-4">Simluaciones</h2>
        <v-autocomplete
          clearable
          label="Buscar Embalse"
          variant="outlined"
          bg-color="primary"
          hide-details
          class="px-3 pt-2"
          density="compact"
          rounded
          prepend-inner-icon="mdi-magnify"
        ></v-autocomplete>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12"></v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup></script>
