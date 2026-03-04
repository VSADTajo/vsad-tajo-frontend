<template>
  <div class="d-flex flex-column">
    <v-row class="flex-grow-1">
      <v-col cols="12">
        <h2 class="pl-4 pt-4">Predicciones</h2>
        <v-autocomplete
          clearable
          label="Buscar Estación"
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
      <v-col cols="12">
        <h3 class="pl-4 pt-2">Caudales</h3>
        <v-expansion-panels color="primary" class="pt-2 px-2">
          <v-expansion-panel>
            <v-expansion-panel-title>Estaciones de Aforo</v-expansion-panel-title>
            <v-expansion-panel-text></v-expansion-panel-text>
          </v-expansion-panel>
          <v-expansion-panel class="mt-2">
            <v-expansion-panel-title>Embalses</v-expansion-panel-title>
            <v-expansion-panel-text></v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <h3 class="pl-4 pt-2">Precipitaciones</h3>
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title>Pluviómetros</v-expansion-panel-title>
            <v-expansion-panel-text></v-expansion-panel-text>
          </v-expansion-panel>
          <v-expansion-panel class="mt-2">
            <v-expansion-panel-title>Precipitaciones sobre SubCuencas</v-expansion-panel-title>
            <v-expansion-panel-text></v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup></script>
