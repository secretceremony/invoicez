<script setup>
import { ref } from 'vue';
import { RouterView, RouterLink } from 'vue-router';

const drawer = ref(false);
</script>

<template>
  <v-app>
    <v-navigation-drawer v-model="drawer">
      <v-list>
        <v-list-item
          prepend-icon="mdi-home"
          title="Home"
          :to="{ name: 'home' }"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-account-group"
          title="Clients"
          :to="{ name: 'clients' }"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-palette"
          title="Staff"
          :to="{ name: 'staff' }"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-tag" title="Products & Services" :to="{ name: 'products-services' }" ></v-list-item>
        <v-list-item
          prepend-icon="mdi-file-document-plus"
          title="Create Invoice"
          :to="{ name: 'create-invoice' }"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-format-list-bulleted"
          title="Invoice List"
          :to="{ name: 'invoice-list' }"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app color="primary" dark>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>Invoice Manager</v-toolbar-title>
      <v-spacer></v-spacer>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <router-view />
      </v-container>
    </v-main>

    <v-footer app>
      <span>&copy; {{ new Date().getFullYear() }} Invoice Manager</span>
    </v-footer>
  </v-app>
</template>

<style scoped>
</style>